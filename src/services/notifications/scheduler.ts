import type { Reminder } from '../../types';
import { addDaysIso, createCalendar, type HijriCalendar } from '../hijri/engine';
import { pad } from '../../utils/format';

/** Current wall-clock time in a timezone as yyyy-mm-ddThh:mm (reminders are stored in this form). */
export function nowLocal(timeZone: string, date = new Date()): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** Pure wall-clock arithmetic (no DST involved because values are timezone-less strings). */
export function addMinutesLocal(dt: string, mins: number): string {
  const d = new Date(`${dt}:00Z`); d.setUTCMinutes(d.getUTCMinutes() + mins);
  return d.toISOString().slice(0, 16);
}
const cal0 = createCalendar();
function addMonthsGreg(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number); const t = y * 12 + (m - 1) + n; const ny = Math.floor(t / 12), nm = (t % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, last))}`;
}
/** Next occurrence after `r.at` for a recurring reminder (clamps to month length). */
export function nextOccurrence(r: Pick<Reminder, 'at' | 'recurrence' | 'customDays' | 'basis'>, cal: HijriCalendar = cal0): string {
  const [date, time] = r.at.split('T');
  let next = date;
  if (r.recurrence === 'daily') next = addDaysIso(date, 1);
  else if (r.recurrence === 'weekly') next = addDaysIso(date, 7);
  else if (r.recurrence === 'custom') next = addDaysIso(date, Math.max(1, r.customDays));
  else if (r.recurrence === 'monthly' || r.recurrence === 'yearly') {
    if (r.basis === 'gregorian') next = addMonthsGreg(date, r.recurrence === 'monthly' ? 1 : 12);
    else {
      const h = cal.fromIso(date); const idx = h.year * 12 + (h.month - 1) + (r.recurrence === 'monthly' ? 1 : 12);
      const y = Math.floor(idx / 12), m = (idx % 12) + 1;
      next = cal.toIso({ year: y, month: m, day: Math.min(h.day, cal.monthLength(y, m)) });
    }
  }
  return `${next}T${time}`;
}
/** Completing a recurring reminder rolls it to its next occurrence; a one-off is marked completed. */
export function completedPatch(r: Reminder, cal?: HijriCalendar): Partial<Reminder> {
  return r.recurrence === 'none' ? { completed: true } : { at: nextOccurrence(r, cal), lastFiredAt: null };
}

export type FireFn = (r: Reminder) => void;
/**
 * Runs while the app is open. Browsers give web apps no background wake-up without a push
 * server, so reminders cannot fire when the tab/browser is closed — they show as "due" on next open.
 */
export function notify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body }); } catch { /* some mobile browsers require a service worker */ }
  }
}
