import type { Reminder } from '../../types';
import { getAll, remove, save } from '../../services/storage/db';

/** Keep (at most) one reminder in sync with a task or event; pass at=null to drop it. */
export async function syncLinkedReminder(type: 'task' | 'event', id: string, title: string, at: string | null) {
  const cur = getAll<Reminder>('reminders').find((r) => r.linkedType === type && r.linkedId === id);
  if (!at) { if (cur) await remove('reminders', cur.id); return; }
  const changedTime = !cur || cur.at !== at;
  await save<Reminder>('reminders', {
    ...(cur ?? { recurrence: 'none', customDays: 1, basis: 'gregorian', completed: false, lastFiredAt: null }),
    title, at, linkedType: type, linkedId: id,
    ...(changedTime ? { completed: false, lastFiredAt: null } : {}),
  } as Reminder);
}
export async function removeLinkedReminders(type: 'task' | 'event', id: string) {
  for (const r of getAll<Reminder>('reminders').filter((r) => r.linkedType === type && r.linkedId === id)) await remove('reminders', r.id);
}
