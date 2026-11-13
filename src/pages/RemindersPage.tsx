import { Bell, Check, Clock, Plus, Repeat } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../components/AppContext';
import { DateBadge } from '../components/DateBadge';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { useCalendar } from '../hooks/useCalendar';
import { addMinutesLocal, completedPatch, nowLocal } from '../services/notifications/scheduler';
import { save, useCollection } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import type { Reminder } from '../types';

export function RemindersPage() {
  const { openEditor, toast } = useApp(); const cal = useCalendar(); const [s, update] = useSettings(); const list = useCollection<Reminder>('reminders');
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const now = nowLocal(s.timezone);
  const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
  const due = sorted.filter((r) => !r.completed && r.at <= now), upcoming = sorted.filter((r) => !r.completed && r.at > now), done = sorted.filter((r) => r.completed).reverse();
  const snooze = (r: Reminder, mins: number) => { const at = addMinutesLocal(nowLocal(s.timezone), mins); save<Reminder>('reminders', { ...r, at, lastFiredAt: null }); toast(`Snoozed until ${at.replace('T', ' ')}`); };
  const complete = (r: Reminder) => save<Reminder>('reminders', { ...r, ...completedPatch(r, cal) });
  const enable = async () => {
    if (!('Notification' in window)) return toast('This browser does not support notifications.', 'error');
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === 'granted') { await update({ notifications: true }); toast('Notifications enabled'); } else toast('Permission was not granted. You can allow it in the browser’s site settings.', 'error');
  };
  const item = (r: Reminder, isDue: boolean) => <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3" style={isDue ? { borderColor: 'var(--burgundy)' } : undefined}>
    <button className="min-w-0 flex-1 text-start" onClick={() => openEditor({ kind: 'reminder', id: r.id })}>
      <div className="writing font-medium">{r.title}</div><div className="text-xs text-muted"><DateBadge iso={r.at.slice(0, 10)} /> · {r.at.slice(11)}</div>
      <div className="mt-1 flex gap-1">{r.recurrence !== 'none' && <Badge><Repeat size={11} />{r.recurrence === 'custom' ? `every ${r.customDays} d` : r.recurrence}</Badge>}{r.linkedType && <Badge>{r.linkedType}</Badge>}</div></button>
    {!r.completed && <div className="flex gap-1"><Button size="sm" onClick={() => snooze(r, 10)}><Clock size={13} />10 min</Button><Button size="sm" onClick={() => snooze(r, 60)}>1 h</Button><Button size="sm" variant="soft" onClick={() => complete(r)}><Check size={13} />Done</Button></div>}
    {r.completed && <Button size="sm" onClick={() => save<Reminder>('reminders', { ...r, completed: false })}>Reopen</Button>}</li>;
  return <div className="mx-auto grid max-w-3xl gap-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Reminders</h1><Button variant="primary" onClick={() => openEditor({ kind: 'reminder' })}><Plus size={16} />New reminder</Button></div>
    <Card className="text-sm"><b>Browser notifications</b>
      <p className="mt-1 text-muted">Times use your timezone ({s.timezone}). Reminders fire only while this app is open in a browser tab (this app has no server to wake your device). Anything missed shows as “due” when you next open it. Background tabs can delay checks by up to a minute, and some mobile browsers only show in-app alerts.</p>
      <div className="mt-2 flex items-center gap-2">{perm === 'granted' ? <Badge color="var(--brand)">Notifications allowed</Badge> : perm === 'denied' ? <Badge color="var(--burgundy)">Blocked in browser settings</Badge> : perm === 'unsupported' ? <Badge>Not supported here</Badge> : <Button size="sm" variant="primary" onClick={enable}><Bell size={13} />Enable notifications</Button>}</div></Card>
    {list.length === 0 && <EmptyState icon={<Bell size={32} />} title="No reminders yet" hint="Set a reminder, or add one to a task or event." />}
    {due.length > 0 && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-burgundy">Due now</h2><ul className="grid gap-2">{due.map((r) => item(r, true))}</ul></section>}
    {upcoming.length > 0 && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Upcoming</h2><ul className="grid gap-2">{upcoming.map((r) => item(r, false))}</ul></section>}
    {done.length > 0 && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Completed</h2><ul className="grid gap-2 opacity-70">{done.map((r) => item(r, false))}</ul></section>}
  </div>;
}
