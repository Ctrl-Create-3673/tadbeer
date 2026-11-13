import type { HijriCalendar } from '../../services/hijri/engine';
import { addDaysIso } from '../../services/hijri/engine';
import { addMinutesLocal } from '../../services/notifications/scheduler';
import type { CalEvent, Reminder, Settings, Task } from '../../types';
import { hijriLabel } from '../../utils/format';

/** The subset of a Google Calendar event body this app writes. */
export interface GBody {
  id: string; summary: string; description: string; location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string }; end: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
  reminders: { useDefault: false; overrides: { method: 'email' | 'popup'; minutes: number }[] };
  extendedProperties: { private: { hlp: '1'; hlpHash: string } };
}
export interface MapInput { tasks: Task[]; events: CalEvent[]; reminders: Reminder[]; cal: HijriCalendar; settings: Settings; now: string /* local yyyy-mm-ddThh:mm */ }

// Google event ids: base32hex characters only → hex-encode our ids (always valid, collision-free).
const gid = (kind: 't' | 'e' | 'r', id: string) => `hlp${kind}` + [...id].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const hash = (o: unknown) => { let h = 5381; for (const c of JSON.stringify(o)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
const rules: Record<string, string> = { daily: 'RRULE:FREQ=DAILY', weekly: 'RRULE:FREQ=WEEKLY', monthly: 'RRULE:FREQ=MONTHLY', yearly: 'RRULE:FREQ=YEARLY' };

/**
 * Everything in `desired` gets an email (+ popup) reminder from Google Calendar:
 *  - items with no time of their own are placed at settings.google.defaultTime on their date;
 *  - only upcoming items are kept in Google Calendar (past ones are removed on sync).
 */
export function buildEvents({ tasks, events, reminders, cal, settings, now }: MapInput): Map<string, GBody> {
  const tz = settings.timezone, def = settings.google.defaultTime || '09:00', out = new Map<string, GBody>();
  const hijri = (iso: string) => hijriLabel(cal.fromIso(iso), { language: 'en', numerals: 'western' });
  const add = (id: string, b: Omit<GBody, 'id' | 'extendedProperties'>) => out.set(id, { id, ...b, extendedProperties: { private: { hlp: '1', hlpHash: hash(b) } } });
  const timed = (start: string, mins: number) => ({ start: { dateTime: `${start}:00`, timeZone: tz }, end: { dateTime: `${addMinutesLocal(start, mins)}:00`, timeZone: tz } });
  const rem = (m: number) => ({ useDefault: false as const, overrides: [{ method: 'email' as const, minutes: m }, { method: 'popup' as const, minutes: m }] });

  for (const t of tasks) {
    if (t.status === 'completed' || (!t.dueDate && !t.reminderAt)) continue;
    if (!t.reminderAt && !settings.google.emailAll) continue;
    const start = t.reminderAt ?? `${t.dueDate}T${def}`;
    if (start < now) continue;
    const lines = [t.description, t.checklist.length ? t.checklist.map((c) => `${c.done ? '[x]' : '[ ]'} ${c.text}`).join('\n') : '', `Priority: ${t.priority}`, t.dueDate ? `Due: ${hijri(t.dueDate)} (${t.dueDate})` : ''].filter(Boolean);
    add(gid('t', t.id), { summary: `Task: ${t.title}`, description: lines.join('\n\n'), ...timed(start, 30), reminders: rem(0) });
  }
  for (const e of events) {
    if (e.reminderMinutes === null && !settings.google.emailAll) continue;
    const span = e.endDate && e.endDate > e.date;
    const desc = [e.description, `${hijri(e.date)} (${e.date})`].filter(Boolean).join('\n\n');
    const base = { summary: e.title, description: desc, location: e.location || undefined };
    if (e.allDay && span) { // multi-day all-day: a true all-day span, reminder at its start
      if (addDaysIso(e.endDate!, 1) <= now.slice(0, 10)) continue;
      add(gid('e', e.id), { ...base, start: { date: e.date }, end: { date: addDaysIso(e.endDate!, 1) }, reminders: rem(e.reminderMinutes ?? 0) });
      continue;
    }
    const start = `${e.date}T${e.allDay ? def : e.startTime || def}`;
    const endDate = e.endDate ?? e.date, end = e.allDay || !e.endTime ? addMinutesLocal(start, 30) : `${endDate}T${e.endTime}`;
    if (start < now && end < now) continue;
    add(gid('e', e.id), { ...base, start: { dateTime: `${start}:00`, timeZone: tz }, end: { dateTime: `${end > start ? end : addMinutesLocal(start, 30)}:00`, timeZone: tz }, reminders: rem(e.reminderMinutes ?? (e.allDay ? 0 : 10)) });
  }
  for (const r of reminders) {
    if (r.completed || r.linkedType) continue; // linked reminders ride on their task/event
    const recur = r.recurrence !== 'none' && !(r.basis === 'hijri' && (r.recurrence === 'monthly' || r.recurrence === 'yearly'));
    if (r.at < now && !recur) continue; // Hijri-basis repeats are synced as their next occurrence only
    const rrule = !recur ? undefined : r.recurrence === 'custom' ? [`RRULE:FREQ=DAILY;INTERVAL=${Math.max(1, r.customDays)}`] : [rules[r.recurrence]];
    add(gid('r', r.id), { summary: `Reminder: ${r.title}`, description: `${hijri(r.at.slice(0, 10))} (${r.at.slice(0, 10)})`, ...timed(r.at, 15), recurrence: rrule, reminders: rem(0) });
  }
  return out;
}
