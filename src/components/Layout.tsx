import { Bell, MessageSquare, CalendarDays, CalendarRange, CheckSquare, FileDown, LayoutDashboard, Menu, NotebookPen, Plus, Search, Settings as Cog, Star, X, CalendarPlus, Download, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { missingFontFiles } from '../styles/fonts.config';
import { useCollection } from '../services/storage/db';
import type { CalEvent, Note, Reminder, Task } from '../types';
import { useReminderScheduler } from '../features/reminders/useScheduler';
import { useAutoSync } from '../features/google/useAutoSync';
import { useInvites } from '../services/google/invites';
import { useAccount } from '../services/google/account';
import { useGoogleLogin } from '../features/google/GoogleCard';
import { useApp, type EditorKind } from './AppContext';
import { Button, IconButton, Input, Modal } from './ui';
import { Tour } from './Tour';
import { InstallButton } from './InstallButton';
import { cx } from '../utils/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare }, { to: '/events', label: 'Events', icon: Star },
  { to: '/notes', label: 'Notes', icon: NotebookPen }, { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/planner', label: 'Planner', icon: CalendarRange }, { to: '/print', label: 'Print PDF', icon: FileDown },
  { to: '/invites', label: 'Invites', icon: Users },
  { to: '/download', label: 'Get the app', icon: Download },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Cog },
];

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState(''); const nav = useNavigate(); const { openEditor } = useApp();
  const tasks = useCollection<Task>('tasks'), events = useCollection<CalEvent>('events'), notes = useCollection<Note>('notes'), reminders = useCollection<Reminder>('reminders');
  const n = q.trim().toLowerCase();
  const rows = n ? [
    ...tasks.filter((t) => `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase().includes(n)).map((t) => ({ k: t.id, kind: 'task' as EditorKind, label: t.title, type: 'Task' })),
    ...events.filter((e) => `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(n)).map((e) => ({ k: e.id, kind: 'event' as EditorKind, label: e.title, type: 'Event' })),
    ...notes.filter((x) => `${x.title} ${x.html.replace(/<[^>]*>/g, ' ')} ${x.tags.join(' ')}`.toLowerCase().includes(n)).map((x) => ({ k: x.id, kind: 'note' as EditorKind, label: x.title || 'Untitled note', type: 'Note' })),
    ...reminders.filter((r) => r.title.toLowerCase().includes(n)).map((r) => ({ k: r.id, kind: 'reminder' as EditorKind, label: r.title, type: 'Reminder' })),
  ].slice(0, 30) : [];
  return <Modal title="Search" onClose={onClose}>
    <Input autoFocus placeholder="Search tasks, events, notes, reminders…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} className="writing" />
    <ul className="mt-3 grid gap-1">{rows.map((r) => <li key={r.type + r.k}><button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start hover:bg-brand-soft" onClick={() => { onClose(); nav(`/${r.kind === 'reminder' ? 'reminders' : r.kind + 's'}`); openEditor({ kind: r.kind, id: r.k }); }}><span className="writing">{r.label}</span><span className="text-xs text-muted">{r.type}</span></button></li>)}</ul>
    {n && !rows.length && <p className="mt-3 text-sm text-muted">No matches.</p>}
  </Modal>;
}

export function Layout() {
  const [menu, setMenu] = useState(false), [search, setSearch] = useState(false), [quick, setQuick] = useState(false);
  const { openEditor } = useApp(); useReminderScheduler(); useAutoSync(); const me = useAccount(); const gLogin = useGoogleLogin(); const nav = useNavigate();
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const missing = missingFontFiles(); const pending = useInvites().incoming.filter((i) => i.status === 'pending').length;
  const link = ({ isActive }: { isActive: boolean }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm', isActive ? 'bg-brand text-bg' : 'hover:bg-brand-soft');
  const navList = <nav aria-label="Main" className="grid gap-1">{NAV.map(({ to, label, icon: I }) => <NavLink key={to} to={to} end={to === '/'} data-tour={`nav-${to}`} className={link} onClick={() => setMenu(false)}><I size={18} />{label}{to === '/invites' && pending > 0 && <span className="ms-auto rounded-full bg-burgundy px-1.5 text-xs text-white">{pending}</span>}</NavLink>)}</nav>;
  return <div className="flex min-h-full">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-surface focus:p-2">Skip to content</a>
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-4 border-e border-line bg-surface p-4 md:flex">
      <div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}tadbeer-mark.svg`} alt="" width={36} height={36} /><div><div className="text-lg font-bold leading-tight tracking-wide text-brand">TADBEER</div><div className="ar text-sm leading-tight text-muted">تدبير</div></div></div>
      {navList}
      <InstallButton className="mt-auto" />
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-3 py-2 backdrop-blur md:px-6">
        <IconButton label="Open menu" className="md:hidden" onClick={() => setMenu(true)}><Menu size={20} /></IconButton>
        <button data-tour="search" onClick={() => setSearch(true)} className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-start text-sm text-muted md:max-w-md"><Search size={16} />Search…<kbd className="ms-auto hidden text-xs sm:block">Ctrl K</kbd></button>
        <InstallButton compact />
        <button data-tour="google" onClick={() => { if (me) { nav('/settings'); setTimeout(() => document.getElementById('google')?.scrollIntoView(), 150); } else void gLogin.login(); }} className="ms-auto flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-sm hover:bg-brand-soft" title={me ? `Signed in as ${me.email}` : 'Sign in with Google for email reminders'}>
          {me?.picture ? <img src={me.picture} alt="" referrerPolicy="no-referrer" className="h-5 w-5 rounded-full" /> : <Bell size={15} />}<span className="hidden sm:inline">{me ? me.email : 'Sign in with Google'}</span></button>
        <div className="relative">
          <Button data-tour="quick-add" variant="primary" aria-haspopup="menu" aria-expanded={quick} onClick={() => setQuick(!quick)}><Plus size={16} /><span className="hidden sm:inline">Quick add</span></Button>
          {quick && <div role="menu" className="fade-in absolute end-0 top-full z-40 mt-1 grid w-44 gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lg">
            {([['task', 'Task', CheckSquare], ['event', 'Event', CalendarPlus], ['note', 'Note', NotebookPen], ['reminder', 'Reminder', Bell]] as const).map(([k, l, I]) =>
              <button key={k} role="menuitem" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-soft" onClick={() => { setQuick(false); openEditor({ kind: k }); }}><I size={16} />{l}</button>)}</div>}
        </div>
      </header>
      {missing.length > 0 && <div role="alert" className="border-b border-burgundy/30 bg-burgundy/10 px-6 py-2 text-sm text-burgundy">Font files not found in src/assets/fonts/: {missing.map((f) => f.file).join(', ')}. The browser’s generic sans-serif is being used for them.</div>}
      <main id="main" className="flex-1 p-3 pb-6 md:p-6 md:pb-6"><Outlet /></main>
      <footer className="mb-16 border-t border-line px-3 py-5 text-center text-sm text-muted md:mb-0 md:px-6">
        <div className="font-semibold text-ink">Tadbeer <span className="ar">تدبير</span></div>
        <div className="mt-1">Developed by Burhanuddin Saylawala - Ctrl + Create</div>
        <div className="mt-1">© 2026 <a className="underline hover:text-brand" href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">Privacy</a></div>
      </footer>
    </div>
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface md:hidden">
      {NAV.slice(0, 4).map(({ to, label, icon: I }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-brand' : 'text-muted')}><I size={20} />{label}</NavLink>)}
      <button className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted" onClick={() => setMenu(true)}><Menu size={20} />More</button>
    </nav>
    {menu && <div className="fixed inset-0 z-50 md:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}><div className="absolute inset-0 bg-black/40" /><div role="dialog" aria-label="Menu" className="fade-in absolute inset-y-0 start-0 w-72 bg-surface p-4"><div className="mb-4 flex items-center justify-between"><b className="tracking-wide text-brand">TADBEER</b><IconButton label="Close menu" onClick={() => setMenu(false)}><X size={18} /></IconButton></div>{navList}<InstallButton className="mt-4" /></div></div>}
    {search && <GlobalSearch onClose={() => setSearch(false)} />}
  </div>;
}
