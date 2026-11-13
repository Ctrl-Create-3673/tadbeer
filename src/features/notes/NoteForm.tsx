import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { CategorySelect } from '../../components/CategorySelect';
import { DateField } from '../../components/DateField';
import { RichEditor } from '../../components/RichEditor';
import { Button, Field, Input, Modal } from '../../components/ui';
import { getOne, remove, save } from '../../services/storage/db';
import type { Note } from '../../types';
import { validateNote } from '../../utils/validate';

export function NoteForm({ id, date }: { id?: string; date?: string }) {
  const { closeEditor, toast, confirm } = useApp();
  const [n, setN] = useState(() => (id ? { ...getOne<Note>('notes', id)! } : { title: '', html: '', categoryId: null, tags: [], pinned: false, archived: false, date: date ?? null } as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>));
  const [tags, setTags] = useState(n.tags.join(', ')); const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Note>(k: K, v: Note[K]) => setN((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const e1 = validateNote(n); if (e1) return setErr(e1);
    await save<Note>('notes', { ...n, tags: tags.split(',').map((x) => x.trim()).filter(Boolean) });
    toast(id ? 'Note saved' : 'Note added'); closeEditor();
  };
  const del = async () => {
    if (!(await confirm({ title: 'Delete note?', message: 'This note will be deleted permanently. Consider archiving it instead.', confirmLabel: 'Delete', danger: true }))) return;
    await remove('notes', id!); toast('Note deleted'); closeEditor();
  };
  return <Modal wide title={id ? 'Edit note' : 'New note'} onClose={closeEditor} footer={<>
    {id && <Button variant="danger" className="me-auto" onClick={del}><Trash2 size={15} />Delete</Button>}
    <Button onClick={closeEditor}>Cancel</Button><Button variant="primary" onClick={submit}>Save note</Button></>}>
    <div className="grid gap-3">
      {err && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{err}</p>}
      <Field label="Title"><Input className="writing" value={n.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <RichEditor value={n.html} onChange={(h) => set('html', h)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category"><CategorySelect kind="note" value={n.categoryId} onChange={(v) => set('categoryId', v)} /></Field>
        <Field label="Tags" hint="Comma separated"><Input className="writing" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      </div>
      <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Linked date (optional)</span><DateField value={n.date} onChange={(v) => set('date', v)} />
        {n.date && <button type="button" className="mt-1 text-xs text-brand underline" onClick={() => set('date', null)}>Remove link</button>}</div>
      <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={n.pinned} onChange={(e) => set('pinned', e.target.checked)} />Pinned</label><label className="flex items-center gap-2"><input type="checkbox" checked={n.archived} onChange={(e) => set('archived', e.target.checked)} />Archived</label></div>
    </div></Modal>;
}
