import { DownloadBanner } from '../components/DownloadBanner';
import { Bell, LayoutGrid, CalendarPlus, CheckSquare, NotebookPen, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../components/AppContext';
import { useState } from 'react';
import { Button, Card, EmptyState, Modal } from '../components/ui';
import { DateBadge } from '../components/DateBadge';
import { useCalendar, useToday } from '../hooks/useCalendar';
import { MONTH_AR, MONTH_EN } from '../services/hijri/names';
import { useCollection } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { taskState } from '../features/tasks/taskUtils';
import type { CalEvent, Note, Task } from '../types';
import { gregLabel, hijriLabel, num, weekdayName } from '../utils/format';
import { nowLocal } from '../services/notifications/scheduler';

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) =>
  <div className="rounded-xl bg-bg p-3 text-center"><div className={`text-2xl font-semibold ${tone ?? ''}`}>{value}</div><div className="text-xs text-muted">{label}</div></div>;

export function Dashboard() {
  const [widgetHelp, setWidgetHelp] = useState(false);
  const nav = useNavigate(); const cal = useCalendar(); const today = useToday(); const [s] = useSettings(); const { openEditor } = useApp();
  const tasks = useCollection<Task>('tasks'), events = useCollection<CalEvent>('events'), notes = useCollection<Note>('notes');
  const h = cal.fromIso(today); const month = cal.monthDays(h.year, h.month);
  const [m0, m1] = [month[0].iso, month[month.length - 1].iso];
  const hour = +nowLocal(s.timezone).slice(11, 13);
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const overdue = tasks.filter((t) => taskState(t, today) === 'overdue');
  const upcoming = events.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).slice(0, 5);
  const monthTasks = tasks.filter((t) => t.dueDate && t.dueDate >= m0 && t.dueDate <= m1);
  const monthUpcoming = events.filter((e) => e.date >= today && e.date <= m1);
  const recent = notes.filter((n) => !n.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  return <div className="grid gap-4">
    <div className="rounded-2xl bg-brand p-4 text-bg">
      <div className="text-sm opacity-80">{greeting}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1"><h1 className="text-2xl font-semibold sm:text-3xl">{weekdayName(h.weekday, s.language)}, {hijriLabel(h, s)}</h1></div>
      <div className="mt-1 text-sm opacity-90">{gregLabel(today, s)} · {MONTH_EN[h.month - 1]} <span className="ar">{MONTH_AR[h.month - 1]}</span> <span className="num-ar">{num(h.year, s)}</span> H {h.confirmed ? '· confirmed date' : ''}</div>
    </div>
    <DownloadBanner />
    <div className="flex flex-wrap gap-2">
      <Button variant="soft" onClick={() => openEditor({ kind: 'task' })}><CheckSquare size={16} />Add task</Button>
      <Button variant="soft" onClick={() => openEditor({ kind: 'event' })}><CalendarPlus size={16} />Add event</Button>
      <Button variant="soft" onClick={() => openEditor({ kind: 'note' })}><NotebookPen size={16} />Add note</Button>
      <Button variant="soft" onClick={() => openEditor({ kind: 'reminder' })}><Bell size={16} />Set reminder</Button>
      <Button variant="soft" onClick={() => setWidgetHelp(true)}><LayoutGrid size={16} />Open widget</Button>
      {widgetHelp && <Modal title="Open the widget" onClose={() => setWidgetHelp(false)} footer={<Button variant="primary" onClick={() => setWidgetHelp(false)}>Got it</Button>}>
        {window.tadbeerDesktop
          ? <ol className="list-decimal space-y-2 ps-5 text-sm"><li>Find the Tadbeer icon: in the Dock (Mac) or the tray near the clock (Windows). On Mac the top menu bar has one too.</li><li>Right-click it (Mac: also click the menu-bar icon).</li><li>Choose <b>Show / hide widget</b>.</li><li>The widget shows today's Hijri date, tasks and events, and updates when you change things in Tadbeer.</li></ol>
          : <p className="text-sm">The widget is part of the desktop app for Mac and Windows. Install it from <Link className="font-medium text-brand underline" to="/download" onClick={() => setWidgetHelp(false)}>Get the app</Link>, then right-click the Tadbeer icon in the Dock or tray and choose <b>Show / hide widget</b>.</p>}
      </Modal>}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card><h2 className="mb-3 font-semibold">Today’s tasks</h2>
        <div className="grid grid-cols-4 gap-2"><Stat label="Total" value={todayTasks.length} /><Stat label="Done" value={todayTasks.filter((t) => t.status === 'completed').length} tone="text-brand" /><Stat label="Pending" value={todayTasks.filter((t) => t.status !== 'completed').length} /><Stat label="Overdue" value={overdue.length} tone={overdue.length ? 'text-burgundy' : ''} /></div>
        <Link to="/tasks" className="mt-3 block text-sm text-brand underline">Open tasks</Link></Card>
      <Card><h2 className="mb-3 font-semibold">Monthly overview <span className="ar text-brand">{MONTH_AR[h.month - 1]}</span></h2>
        <div className="grid grid-cols-3 gap-2"><Stat label="Tasks" value={monthTasks.length} /><Stat label="Completed" value={monthTasks.filter((t) => t.status === 'completed').length} tone="text-brand" /><Stat label="Upcoming events" value={monthUpcoming.length} /></div></Card>
      <Card><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Quick notes</h2><Button size="sm" onClick={() => openEditor({ kind: 'note' })}><Plus size={14} />New</Button></div>
        {recent.length === 0 ? <p className="text-sm text-muted">No notes yet.</p> : <ul className="grid gap-1.5">{recent.map((n) => <li key={n.id}><button className="writing w-full truncate rounded-lg border border-line p-2 text-start text-sm hover:bg-brand-soft" onClick={() => openEditor({ kind: 'note', id: n.id })}>{n.title || n.html.replace(/<[^>]*>/g, ' ').trim().slice(0, 60) || 'Untitled note'}</button></li>)}</ul>}</Card>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="mb-3 font-semibold">Upcoming events</h2>
        {upcoming.length === 0 ? <EmptyState icon={<CalendarPlus />} title="No upcoming events" hint="Events you add will appear here." action={<Button variant="primary" onClick={() => openEditor({ kind: 'event' })}>Add event</Button>} /> :
          <ul className="grid gap-2">{upcoming.map((e) => <li key={e.id}><button className="w-full rounded-lg border border-line p-2 text-start hover:bg-brand-soft" style={{ borderInlineStart: `4px solid ${e.color}` }} onClick={() => openEditor({ kind: 'event', id: e.id })}><div className="writing font-medium">{e.title}</div><DateBadge iso={e.date} className="text-xs" /></button></li>)}</ul>}</Card>
      <Card><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Calendar</h2><Link to="/calendar" className="text-sm text-brand underline">Open</Link></div>
        <MonthGrid year={h.year} month={h.month} compact selected={today} onSelect={() => nav('/calendar')} /></Card>
    </div>
  </div>;
}
