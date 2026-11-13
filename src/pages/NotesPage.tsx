import { Archive, ArchiveRestore, NotebookPen, Pin, PinOff, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../components/AppContext';
import { useCategories } from '../components/CategorySelect';
import { DateBadge } from '../components/DateBadge';
import { Badge, Button, EmptyState, IconButton, Input, Select } from '../components/ui';
import { save, useCollection } from '../services/storage/db';
import type { Note } from '../types';

const plain = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function NotesPage() {
  const { openEditor, toast } = useApp(); const notes = useCollection<Note>('notes'); const cats = useCategories('note');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [archived, setArchived] = useState(false);
  const n = q.trim().toLowerCase();
  const rows = notes.filter((x) => x.archived === archived && (!cat || x.categoryId === cat) && (!n || `${x.title} ${plain(x.html)} ${x.tags.join(' ')}`.toLowerCase().includes(n)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  const patch = async (x: Note, p: Partial<Note>, msg: string) => { await save<Note>('notes', { ...x, ...p }); toast(msg); };
  return <div className="mx-auto grid max-w-5xl gap-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Notes</h1><Button variant="primary" onClick={() => openEditor({ kind: 'note' })}><Plus size={16} />New note</Button></div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
      <div className="relative"><Search size={14} className="pointer-events-none absolute start-3 top-3 text-muted" /><Input className="ps-8" placeholder="Search notes" aria-label="Search notes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Button onClick={() => setArchived(!archived)}>{archived ? 'Show active' : 'Show archived'}</Button></div>
    {rows.length === 0 ? <EmptyState icon={<NotebookPen size={32} />} title={archived ? 'No archived notes' : notes.length ? 'No notes match' : 'No notes yet'} hint="Write meeting notes, personal reminders or anything you want to keep." action={!notes.length ? <Button variant="primary" onClick={() => openEditor({ kind: 'note' })}>Create note</Button> : undefined} />
      : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((x) => { const c = cats.find((k) => k.id === x.categoryId); return <li key={x.id} className="flex flex-col rounded-2xl border border-line bg-surface p-3">
        <button className="flex-1 text-start" onClick={() => openEditor({ kind: 'note', id: x.id })}>
          <div className="writing flex items-center gap-1 font-semibold">{x.pinned && <Pin size={13} className="text-gold" />}{x.title || 'Untitled note'}</div>
          <p className="writing mt-1 line-clamp-4 text-sm text-muted" dir="auto">{plain(x.html)}</p>
          <div className="mt-2 flex flex-wrap gap-1">{c && <Badge color={c.color}>{c.name}</Badge>}{x.tags.map((t) => <Badge key={t}>#{t}</Badge>)}</div>
          {x.date && <DateBadge iso={x.date} className="mt-1 block text-xs" />}</button>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs text-muted"><span>Edited {new Date(x.updatedAt).toLocaleDateString()}</span>
          <span><IconButton label={x.pinned ? 'Unpin' : 'Pin'} onClick={() => patch(x, { pinned: !x.pinned }, x.pinned ? 'Unpinned' : 'Pinned')}>{x.pinned ? <PinOff size={15} /> : <Pin size={15} />}</IconButton>
            <IconButton label={x.archived ? 'Restore' : 'Archive'} onClick={() => patch(x, { archived: !x.archived }, x.archived ? 'Restored' : 'Archived')}>{x.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}</IconButton></span></div></li>; })}</ul>}
  </div>;
}
