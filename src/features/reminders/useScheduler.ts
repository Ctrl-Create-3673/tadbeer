import { useEffect, useRef } from 'react';
import { useApp } from '../../components/AppContext';
import { useCalendar } from '../../hooks/useCalendar';
import { getAll, save } from '../../services/storage/db';
import { completedPatch, nextOccurrence, nowLocal, notify } from '../../services/notifications/scheduler';
import { getSettings } from '../../services/storage/settings';
import type { Reminder } from '../../types';

/** Checks every 15s while the app is open; fires each due reminder once. */
export function useReminderScheduler() {
  const { toast } = useApp(); const cal = useCalendar(); const calRef = useRef(cal); calRef.current = cal;
  useEffect(() => {
    const tick = async () => {
      const s = getSettings(); const now = nowLocal(s.timezone);
      for (const r of getAll<Reminder>('reminders')) {
        if (r.completed || r.at > now || r.lastFiredAt === r.at) continue;
        toast(`Reminder: ${r.title}`);
        if (s.notifications) notify('Hijri Life Planner', r.title);
        // recurring: roll forward past "now" (skipping missed occurrences); one-off: remember it fired
        if (r.recurrence === 'none') await save<Reminder>('reminders', { ...r, lastFiredAt: r.at });
        else { let next = r; for (let i = 0; i < 400 && next.at <= now; i++) next = { ...next, at: nextOccurrence(next, calRef.current) }; await save<Reminder>('reminders', { ...r, at: next.at, lastFiredAt: null }); }
      }
    };
    tick(); const t = setInterval(tick, 15_000); return () => clearInterval(t);
  }, [toast]);
}
export { completedPatch };
