import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { Button, Field, Input, Modal, Select } from '../../components/ui';
import { getAll, getOne, remove, save } from '../../services/storage/db';
import { nowLocal } from '../../services/notifications/scheduler';
import { useSettings } from '../../services/storage/settings';
import type { CalEvent, Reminder, Task } from '../../types';
import { validateReminder } from '../../utils/validate';

export function ReminderForm({ id, date }: { id?: string; date?: string }) {
  const { closeEditor, toast, confirm } = useApp(); const [s] = useSettings();
  const [r, setR] = useState(() => id ? { ...getOne<Reminder>('reminders', id)! } : {
    title: '', at: `${date ?? nowLocal(s.timezone).slice(0, 10)}T${date ? '09:00' : nowLocal(s.timezone).slice(11)}`, recurrence: 'none', customDays: 1, basis: 'gregorian',
    linkedType: null, linkedId: null, completed: false, lastFiredAt: null } as Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Reminder>(k: K, v: Reminder[K]) => setR((x) => ({ ...x, [k]: v }));
  const options = [...getAll<Task>('tasks').map((t) => ({ k: `task:${t.id}`, l: `Task — ${t.title}` })), ...getAll<CalEvent>('events').map((e) => ({ k: `event:${e.id}`, l: `Event — ${e.title}` }))];
  const link = r.linkedType ? `${r.linkedType}:${r.linkedId}` : '';
  const submit = async () => {
    const e1 = validateReminder(r); if (e1) return setErr(e1);
    await save<Reminder>('reminders', { ...r, lastFiredAt: id && getOne<Reminder>('reminders', id)?.at === r.at ? r.lastFiredAt : null });
    toast(id ? 'Reminder updated' : 'Reminder set'); closeEditor();
  };
  const del = async () => { if (await confirm({ title: 'Delete reminder?', message: `“${r.title}” will be deleted.`, confirmLabel: 'Delete', danger: true })) { await remove('reminders', id!); toast('Reminder deleted'); closeEditor(); } };
  return <Modal title={id ? 'Edit reminder' : 'New reminder'} onClose={closeEditor} footer={<>
    {id && <Button variant="danger" className="me-auto" onClick={del}><Trash2 size={15} />Delete</Button>}
    <Button onClick={closeEditor}>Cancel</Button><Button variant="primary" onClick={submit}>Save reminder</Button></>}>
    <div className="grid gap-3">
      {err && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{err}</p>}
      <Field label="Title"><Input className="writing" value={r.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label={`Date & time (${s.timezone})`}><Input type="datetime-local" value={r.at} onChange={(e) => set('at', e.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Repeat"><Select value={r.recurrence} onChange={(e) => set('recurrence', e.target.value as Reminder['recurrence'])}>
          <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="custom">Custom (every N days)</option></Select></Field>
        {r.recurrence === 'custom' && <Field label="Every N days"><Input type="number" min={1} value={r.customDays} onChange={(e) => set('customDays', +e.target.value)} /></Field>}
        {(r.recurrence === 'monthly' || r.recurrence === 'yearly') && <Field label="Repeat by"><Select value={r.basis} onChange={(e) => set('basis', e.target.value as Reminder['basis'])}><option value="gregorian">Gregorian date</option><option value="hijri">Hijri date</option></Select></Field>}
      </div>
      <Field label="Linked to"><Select value={link} onChange={(e) => { const [t, ...i] = e.target.value.split(':'); setR((x) => ({ ...x, linkedType: (t || null) as Reminder['linkedType'], linkedId: i.join(':') || null })); }}>
        <option value="">Nothing</option>{options.map((o) => <option key={o.k} value={o.k}>{o.l}</option>)}</Select></Field>
    </div></Modal>;
}
