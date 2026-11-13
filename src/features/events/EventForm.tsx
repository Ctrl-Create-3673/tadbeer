import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { CategorySelect } from '../../components/CategorySelect';
import { DateField } from '../../components/DateField';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { getOne, remove, save } from '../../services/storage/db';
import type { CalEvent } from '../../types';
import { EVENT_COLORS } from '../../utils/theme';
import { validateEvent } from '../../utils/validate';
import { addMinutesLocal } from '../../services/notifications/scheduler';
import { ShareButton } from '../google/ShareButton';
import { removeLinkedReminders, syncLinkedReminder } from '../reminders/linked';

const blank = (date: string): Omit<CalEvent, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '', description: '', date, endDate: null, allDay: true, startTime: '09:00', endTime: '10:00', location: '', categoryId: null, color: EVENT_COLORS[0], reminderMinutes: null,
});
export const eventStart = (e: Pick<CalEvent, 'date' | 'allDay' | 'startTime'>) => `${e.date}T${e.allDay ? '09:00' : e.startTime || '09:00'}`;

export function EventForm({ id, date }: { id?: string; date?: string }) {
  const { closeEditor, toast, confirm } = useApp();
  const [e, setE] = useState(() => (id ? { ...getOne<CalEvent>('events', id)! } : blank(date ?? new Date().toISOString().slice(0, 10))));
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof CalEvent>(k: K, v: CalEvent[K]) => setE((x) => ({ ...x, [k]: v }));
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e1 = validateEvent(e); if (e1) return setErr(e1);
    const saved = await save<CalEvent>('events', e);
    await syncLinkedReminder('event', saved.id, saved.title, saved.reminderMinutes === null ? null : addMinutesLocal(eventStart(saved), -saved.reminderMinutes));
    toast(id ? 'Event updated' : 'Event added'); closeEditor();
  };
  const del = async () => {
    if (!(await confirm({ title: 'Delete event?', message: `“${e.title}” will be deleted permanently.`, confirmLabel: 'Delete', danger: true }))) return;
    await removeLinkedReminders('event', id!); await remove('events', id!); toast('Event deleted'); closeEditor();
  };
  return <Modal title={id ? 'Edit event' : 'New event'} onClose={closeEditor} footer={<>
    {id && <Button variant="danger" className="me-auto" onClick={del}><Trash2 size={15} />Delete</Button>}
    {id && <ShareButton store="events" id={id} title={e.title} />}<Button onClick={closeEditor}>Cancel</Button><Button variant="primary" onClick={(x) => submit(x as never)}>Save event</Button></>}>
    <form onSubmit={submit} className="grid gap-3">
      {err && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{err}</p>}
      <Field label="Title"><Input className="writing" value={e.title} onChange={(x) => set('title', x.target.value)} required /></Field>
      <Field label="Description"><Textarea rows={3} className="writing" value={e.description} onChange={(x) => set('description', x.target.value)} /></Field>
      <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Date</span><DateField value={e.date} required onChange={(v) => v && set('date', v)} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.allDay} onChange={(x) => set('allDay', x.target.checked)} />All-day event</label>
      {!e.allDay && <div className="grid grid-cols-2 gap-3"><Field label="Start time"><Input type="time" value={e.startTime} onChange={(x) => set('startTime', x.target.value)} /></Field><Field label="End time"><Input type="time" value={e.endTime} onChange={(x) => set('endTime', x.target.value)} /></Field></div>}
      <Field label="End date (multi-day, optional)"><Input type="date" value={e.endDate ?? ''} min={e.date} onChange={(x) => set('endDate', x.target.value || null)} /></Field>
      <Field label="Location"><Input className="writing" value={e.location} onChange={(x) => set('location', x.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category"><CategorySelect kind="event" value={e.categoryId} onChange={(v) => set('categoryId', v)} /></Field>
        <Field label="Reminder"><Select value={e.reminderMinutes ?? ''} onChange={(x) => set('reminderMinutes', x.target.value === '' ? null : +x.target.value)}>
          <option value="">None</option><option value="0">At start</option><option value="10">10 min before</option><option value="60">1 hour before</option><option value="1440">1 day before</option></Select></Field>
      </div>
      <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Colour</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Event colour">{EVENT_COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={e.color === c} aria-label={c} onClick={() => set('color', c)} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: e.color === c ? 'var(--ink)' : 'transparent' }} />)}</div></div>
      <button type="submit" hidden />
    </form></Modal>;
}
