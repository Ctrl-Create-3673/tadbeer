import { occasionsFor } from '../../data/occasions';
import { CalendarPlus, CheckSquare, Clock, MapPin, NotebookPen, Bell, X } from 'lucide-react';
import { useApp } from '../../components/AppContext';
import { Badge, Button, IconButton } from '../../components/ui';
import { useCalendar } from '../../hooks/useCalendar';
import { save } from '../../services/storage/db';
import { useSettings } from '../../services/storage/settings';
import type { Task } from '../../types';
import { gregLabel, hijriLabel, weekdayName } from '../../utils/format';
import { getDay, useDayIndex } from './useDayIndex';

export function DayPanel({ iso, onClose }: { iso: string; onClose?: () => void }) {
  const cal = useCalendar(); const idx = useDayIndex(); const [s] = useSettings(); const { openEditor } = useApp();
  const h = cal.fromIso(iso); const items = getDay(idx, iso);
  const toggle = (t: Task) => save<Task>('tasks', { ...t, status: t.status === 'completed' ? 'pending' : 'completed', completedAt: t.status === 'completed' ? null : new Date().toISOString() });
  const occ = s.showOccasions ? occasionsFor(h.month, h.day) : [];
  const none = !occ.length && !items.tasks.length && !items.events.length && !items.notes.length && !items.reminders.length;
  return <section aria-label="Selected day" className="flex flex-col gap-4">
    <div className="flex items-start justify-between gap-2">
      <div><div className="text-sm text-muted">{weekdayName(h.weekday, s.language)}</div>
        <div className="text-xl font-semibold">{hijriLabel(h, s)}</div><div className="text-sm text-muted">{gregLabel(iso, s)}</div>
        <div className="mt-1"><Badge color={h.confirmed ? 'var(--brand)' : undefined}>{h.confirmed ? 'Confirmed date' : 'Calculated date'}</Badge></div></div>
      {onClose && <IconButton label="Close panel" onClick={onClose}><X size={18} /></IconButton>}
    </div>
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="soft" onClick={() => openEditor({ kind: 'task', date: iso })}><CheckSquare size={14} />Task</Button>
      <Button size="sm" variant="soft" onClick={() => openEditor({ kind: 'event', date: iso })}><CalendarPlus size={14} />Event</Button>
      <Button size="sm" variant="soft" onClick={() => openEditor({ kind: 'note', date: iso })}><NotebookPen size={14} />Note</Button>
      <Button size="sm" variant="soft" onClick={() => openEditor({ kind: 'reminder', date: iso })}><Bell size={14} />Reminder</Button>
    </div>
    {none && <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">Nothing on this day yet.</p>}
    {occ.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Occasions</h3><ul className="grid gap-1">{occ.map((t) => <li key={t} className="rounded-lg border-s-4 border-burgundy bg-brand-soft px-3 py-2 text-sm">{t}</li>)}</ul></div>}
    {items.events.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Events</h3><ul className="grid gap-1.5">
      {items.events.map((e) => <li key={e.id}><button className="w-full rounded-lg border border-line p-2 text-start hover:bg-brand-soft" style={{ borderInlineStart: `4px solid ${e.color}` }} onClick={() => openEditor({ kind: 'event', id: e.id })}>
        <div className="writing font-medium">{e.title}</div><div className="flex flex-wrap gap-3 text-xs text-muted"><span className="flex items-center gap-1"><Clock size={12} />{e.allDay ? 'All day' : `${e.startTime}–${e.endTime}`}</span>{e.location && <span className="writing flex items-center gap-1"><MapPin size={12} />{e.location}</span>}</div></button></li>)}</ul></div>}
    {items.tasks.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Tasks due</h3><ul className="grid gap-1.5">
      {items.tasks.map((t) => <li key={t.id} className="flex items-center gap-2 rounded-lg border border-line p-2">
        <input type="checkbox" aria-label={`Complete ${t.title}`} checked={t.status === 'completed'} onChange={() => toggle(t)} />
        <button className={`writing flex-1 text-start ${t.status === 'completed' ? 'text-muted line-through' : ''}`} onClick={() => openEditor({ kind: 'task', id: t.id })}>{t.title}</button><Badge>{t.priority}</Badge></li>)}</ul></div>}
    {items.notes.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Notes</h3><ul className="grid gap-1.5">
      {items.notes.map((n) => <li key={n.id}><button className="writing w-full rounded-lg border border-line p-2 text-start hover:bg-brand-soft" onClick={() => openEditor({ kind: 'note', id: n.id })}>{n.title || 'Untitled note'}</button></li>)}</ul></div>}
    {items.reminders.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Reminders</h3><ul className="grid gap-1.5">
      {items.reminders.map((r) => <li key={r.id}><button className="writing flex w-full items-center gap-2 rounded-lg border border-line p-2 text-start hover:bg-brand-soft" onClick={() => openEditor({ kind: 'reminder', id: r.id })}><Bell size={14} />{r.at.slice(11)} · {r.title}</button></li>)}</ul></div>}
  </section>;
}
