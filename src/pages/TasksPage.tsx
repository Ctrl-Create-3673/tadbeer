import { CheckSquare, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../components/AppContext';
import { DateBadge } from '../components/DateBadge';
import { useCategories } from '../components/CategorySelect';
import { Badge, Button, EmptyState, Input, Select } from '../components/ui';
import { useToday } from '../hooks/useCalendar';
import { save, useCollection } from '../services/storage/db';
import { PRIORITY_RANK, STATE_LABEL, taskState } from '../features/tasks/taskUtils';
import type { Task } from '../types';
import { cx } from '../utils/format';

const VIEWS = ['all', 'today', 'upcoming', 'completed', 'overdue', 'category'] as const;
type V = (typeof VIEWS)[number];

export function TasksPage() {
  const { openEditor } = useApp(); const today = useToday(); const tasks = useCollection<Task>('tasks'); const cats = useCategories('task');
  const [view, setView] = useState<V>('all'); const [q, setQ] = useState(''); const [prio, setPrio] = useState(''); const [cat, setCat] = useState(''); const [sort, setSort] = useState('due');
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const f = tasks.filter((t) => {
      const st = taskState(t, today);
      if (view === 'today' && t.dueDate !== today) return false;
      if (view === 'upcoming' && !(t.dueDate && t.dueDate > today && st !== 'completed')) return false;
      if (view === 'completed' && st !== 'completed') return false;
      if (view === 'overdue' && st !== 'overdue') return false;
      if (prio && t.priority !== prio) return false;
      if (cat && t.categoryId !== cat) return false;
      return !n || `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase().includes(n);
    });
    const by: Record<string, (a: Task, b: Task) => number> = {
      due: (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'), priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      created: (a, b) => b.createdAt.localeCompare(a.createdAt), title: (a, b) => a.title.localeCompare(b.title) };
    return [...f].sort(by[sort]);
  }, [tasks, view, q, prio, cat, sort, today]);
  const toggle = (t: Task) => save<Task>('tasks', { ...t, status: t.status === 'completed' ? 'pending' : 'completed', completedAt: t.status === 'completed' ? null : new Date().toISOString() });
  const catName = (id: string | null) => cats.find((c) => c.id === id);
  const row = (t: Task) => { const st = taskState(t, today); const c = catName(t.categoryId); const done = t.checklist.filter((x) => x.done).length;
    return <li key={t.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
      <input type="checkbox" className="mt-1 h-4 w-4" aria-label={st === 'completed' ? `Reopen ${t.title}` : `Complete ${t.title}`} checked={t.status === 'completed'} onChange={() => toggle(t)} />
      <button className="min-w-0 flex-1 text-start" onClick={() => openEditor({ kind: 'task', id: t.id })}>
        <div className={cx('writing font-medium', st === 'completed' && 'text-muted line-through')}>{t.title}</div>
        {t.dueDate && <DateBadge iso={t.dueDate} className="text-xs" />}
        <div className="mt-1 flex flex-wrap gap-1"><Badge color={t.priority === 'high' ? 'var(--burgundy)' : t.priority === 'medium' ? 'var(--gold)' : undefined}>{t.priority}</Badge>
          <Badge color={st === 'overdue' ? 'var(--burgundy)' : st === 'completed' ? 'var(--brand)' : undefined}>{STATE_LABEL[st]}</Badge>
          {c && <Badge color={c.color}>{c.name}</Badge>}{t.tags.map((x) => <Badge key={x}>#{x}</Badge>)}{t.checklist.length > 0 && <Badge>{done}/{t.checklist.length}</Badge>}</div></button></li>; };
  return <div className="mx-auto grid max-w-4xl gap-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Tasks</h1><Button variant="primary" onClick={() => openEditor({ kind: 'task' })}><Plus size={16} />New task</Button></div>
    <div role="tablist" aria-label="Task views" className="flex flex-wrap gap-1">{VIEWS.map((v) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx('rounded-lg px-3 py-1.5 text-sm', view === v ? 'bg-brand text-bg' : 'border border-line hover:bg-brand-soft')}>{v === 'category' ? 'By category' : v[0].toUpperCase() + v.slice(1)}</button>)}</div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="relative"><Search size={14} className="pointer-events-none absolute start-3 top-3 text-muted" /><Input className="ps-8" placeholder="Search tasks" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Select aria-label="Filter by priority" value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">Any priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>
      <Select aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Any category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="created">Sort: newest</option><option value="title">Sort: title</option></Select></div>
    {rows.length === 0 ? <EmptyState icon={<CheckSquare size={32} />} title={tasks.length ? 'No tasks match' : 'No tasks yet'} hint={tasks.length ? 'Try another view or clear the filters.' : 'Add your first task to start planning.'} action={!tasks.length ? <Button variant="primary" onClick={() => openEditor({ kind: 'task' })}>Add task</Button> : undefined} />
      : view === 'category' ? <div className="grid gap-5">{[...cats.map((c) => ({ id: c.id, name: c.name })), { id: '', name: 'Uncategorised' }].map((g) => { const list = rows.filter((t) => (t.categoryId ?? '') === g.id); return list.length ? <section key={g.id}><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{g.name}</h2><ul className="grid gap-2">{list.map(row)}</ul></section> : null; })}</div>
      : <ul className="grid gap-2">{rows.map(row)}</ul>}
  </div>;
}
