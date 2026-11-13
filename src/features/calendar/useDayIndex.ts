import { useMemo } from 'react';
import { addDaysIso, isoToJdn } from '../../services/hijri/engine';
import { useCollection } from '../../services/storage/db';
import type { CalEvent, Note, Reminder, Task } from '../../types';

export interface DayItems { tasks: Task[]; events: CalEvent[]; notes: Note[]; reminders: Reminder[] }
const empty = (): DayItems => ({ tasks: [], events: [], notes: [], reminders: [] });

/** All user data bucketed by Gregorian ISO date. Multi-day events appear on each day (max 62 days). */
export function useDayIndex() {
  const tasks = useCollection<Task>('tasks'), events = useCollection<CalEvent>('events');
  const notes = useCollection<Note>('notes'), reminders = useCollection<Reminder>('reminders');
  return useMemo(() => {
    const m = new Map<string, DayItems>();
    const at = (d: string) => { let x = m.get(d); if (!x) m.set(d, (x = empty())); return x; };
    for (const t of tasks) if (t.dueDate) at(t.dueDate).tasks.push(t);
    for (const e of events) {
      const span = e.endDate ? Math.min(62, isoToJdn(e.endDate) - isoToJdn(e.date)) : 0;
      for (let i = 0; i <= span; i++) at(addDaysIso(e.date, i)).events.push(e);
    }
    for (const n of notes) if (n.date && !n.archived) at(n.date).notes.push(n);
    for (const r of reminders) if (!r.completed) at(r.at.slice(0, 10)).reminders.push(r);
    for (const x of m.values()) x.events.sort((a, b) => (a.allDay ? '' : a.startTime).localeCompare(b.allDay ? '' : b.startTime));
    return m;
  }, [tasks, events, notes, reminders]);
}
export const getDay = (idx: Map<string, DayItems>, iso: string) => idx.get(iso) ?? empty();
