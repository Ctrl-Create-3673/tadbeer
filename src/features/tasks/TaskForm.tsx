import { Plus, Trash2 } from 'lucide-react';
import { ShareButton } from '../google/ShareButton';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { CategorySelect } from '../../components/CategorySelect';
import { DateField } from '../../components/DateField';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { getOne, remove, save } from '../../services/storage/db';
import type { Task } from '../../types';
import { uid } from '../../utils/ids';
import { validateTask } from '../../utils/validate';
import { removeLinkedReminders, syncLinkedReminder } from '../reminders/linked';

export const blankTask = (dueDate: string | null = null): Omit<Task, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '', description: '', priority: 'medium', status: 'pending', dueDate, categoryId: null, tags: [], checklist: [], reminderAt: null, completedAt: null,
});

export function TaskForm({ id, date }: { id?: string; date?: string }) {
  const { closeEditor, toast, confirm } = useApp();
  const [t, setT] = useState(() => (id ? { ...getOne<Task>('tasks', id)! } : blankTask(date ?? null)));
  const [tags, setTags] = useState(t.tags.join(', ')); const [item, setItem] = useState(''); const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((x) => ({ ...x, [k]: v }));
  const addItem = () => { if (item.trim()) { set('checklist', [...t.checklist, { id: uid(), text: item.trim(), done: false }]); setItem(''); } };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e1 = validateTask(t); if (e1) return setErr(e1);
    const row = { ...t, tags: tags.split(',').map((x) => x.trim()).filter(Boolean), completedAt: t.status === 'completed' ? t.completedAt ?? new Date().toISOString() : null };
    const saved = await save<Task>('tasks', row);
    await syncLinkedReminder('task', saved.id, saved.title, saved.reminderAt);
    toast(id ? 'Task updated' : 'Task added'); closeEditor();
  };
  const del = async () => {
    if (!(await confirm({ title: 'Delete task?', message: `“${t.title}” will be deleted permanently.`, confirmLabel: 'Delete', danger: true }))) return;
    await removeLinkedReminders('task', id!); await remove('tasks', id!); toast('Task deleted'); closeEditor();
  };
  return <Modal title={id ? 'Edit task' : 'New task'} onClose={closeEditor} footer={<>
    {id && <Button variant="danger" className="me-auto" onClick={del}><Trash2 size={15} />Delete</Button>}
    {id && <ShareButton store="tasks" id={id} title={t.title} />}<Button onClick={closeEditor}>Cancel</Button><Button variant="primary" onClick={(e) => submit(e as never)}>Save task</Button></>}>
    <form onSubmit={submit} className="grid gap-3">
      {err && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{err}</p>}
      <Field label="Title"><Input value={t.title} onChange={(e) => set('title', e.target.value)} className="writing" required /></Field>
      <Field label="Description"><Textarea rows={3} className="writing" value={t.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Priority"><Select value={t.priority} onChange={(e) => set('priority', e.target.value as Task['priority'])}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
        <Field label="Status"><Select value={t.status} onChange={(e) => set('status', e.target.value as Task['status'])}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></Select></Field>
      </div>
      <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Due date</span><DateField value={t.dueDate} onChange={(v) => set('dueDate', v)} />
        {t.dueDate && <button type="button" className="mt-1 text-xs text-brand underline" onClick={() => set('dueDate', null)}>Clear due date</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category"><CategorySelect kind="task" value={t.categoryId} onChange={(v) => set('categoryId', v)} /></Field>
        <Field label="Tags" hint="Comma separated"><Input value={tags} onChange={(e) => setTags(e.target.value)} className="writing" /></Field>
      </div>
      <Field label="Reminder" hint={`Uses your timezone; shows in Reminders.`}><Input type="datetime-local" value={t.reminderAt ?? ''} onChange={(e) => set('reminderAt', e.target.value || null)} /></Field>
      <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Subtasks / checklist</span>
        <ul className="mb-2 grid gap-1">{t.checklist.map((c) => <li key={c.id} className="flex items-center gap-2">
          <input type="checkbox" aria-label={`Done: ${c.text}`} checked={c.done} onChange={(e) => set('checklist', t.checklist.map((x) => x.id === c.id ? { ...x, done: e.target.checked } : x))} />
          <span className={`writing flex-1 text-sm ${c.done ? 'text-muted line-through' : ''}`}>{c.text}</span>
          <button type="button" aria-label={`Remove ${c.text}`} className="text-muted hover:text-burgundy" onClick={() => set('checklist', t.checklist.filter((x) => x.id !== c.id))}><Trash2 size={14} /></button></li>)}</ul>
        <div className="flex gap-1"><Input className="writing" placeholder="Add an item" aria-label="New checklist item" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} /><Button aria-label="Add item" onClick={addItem}><Plus size={16} /></Button></div></div>
      <button type="submit" hidden />
    </form></Modal>;
}
