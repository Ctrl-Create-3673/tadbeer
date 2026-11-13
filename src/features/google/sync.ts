import { calendar } from '../../services/google/google';
import { createCalendar } from '../../services/hijri/engine';
import { nowLocal } from '../../services/notifications/scheduler';
import { getAll, save } from '../../services/storage/db';
import { getSettings } from '../../services/storage/settings';
import type { CalEvent, Correction, Reminder, Settings, Task } from '../../types';
import { buildEvents, type GBody } from './mapping';

export interface SyncResult { created: number; updated: number; removed: number; unchanged: number }
interface Listed { items?: { id: string; extendedProperties?: { private?: Record<string, string> } }[]; nextPageToken?: string }

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { for (let x = q.shift(); x !== undefined; x = q.shift()) await fn(x); }));
}

/** Make the user's primary Google Calendar match the upcoming items here. Only events this app created (tagged hlp=1) are touched. */
export async function syncToGoogle(): Promise<SyncResult> {
  const settings = getSettings();
  const cal = createCalendar(Object.fromEntries(getAll<Correction>('corrections').map((c) => [`${c.year}-${c.month}`, c.startIso])));
  const desired = buildEvents({ tasks: getAll<Task>('tasks'), events: getAll<CalEvent>('events'), reminders: getAll<Reminder>('reminders'), cal, settings, now: nowLocal(settings.timezone) });

  const existing = new Map<string, string>(); let page: string | undefined;
  do {
    const q = new URLSearchParams({ privateExtendedProperty: 'hlp=1', maxResults: '250', showDeleted: 'false', ...(page ? { pageToken: page } : {}) });
    const r = await calendar<Listed>(`/calendars/primary/events?${q}`);
    for (const e of r?.items ?? []) existing.set(e.id, e.extendedProperties?.private?.hlpHash ?? '');
    page = r?.nextPageToken;
  } while (page);

  const res: SyncResult = { created: 0, updated: 0, removed: 0, unchanged: 0 };
  const upsert = async (b: GBody) => {
    if (existing.get(b.id) === b.extendedProperties.private.hlpHash) { res.unchanged++; return; }
    const put = () => calendar(`/calendars/primary/events/${b.id}`, { method: 'PUT', body: JSON.stringify({ ...b, status: 'confirmed' }) });
    if (existing.has(b.id)) { await put(); res.updated++; return; }
    try { await calendar('/calendars/primary/events', { method: 'POST', body: JSON.stringify(b) }); res.created++; }
    catch (e) { if ((e as { status?: number }).status === 409) { await put(); res.created++; } else throw e; } // id of a previously deleted event
  };
  await pool([...desired.values()], 4, upsert);
  await pool([...existing.keys()].filter((id) => !desired.has(id)), 4, async (id) => {
    try { await calendar(`/calendars/primary/events/${id}`, { method: 'DELETE' }); res.removed++; } catch (e) { const s = (e as { status?: number }).status; if (s !== 404 && s !== 410) throw e; }
  });
  await save<Settings>('settings', { ...settings, google: { ...settings.google, lastSync: new Date().toISOString() } });
  return res;
}
