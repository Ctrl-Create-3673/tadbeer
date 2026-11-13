import { CalendarPlus, MapPin, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../components/AppContext';
import { useCategories } from '../components/CategorySelect';
import { DateBadge } from '../components/DateBadge';
import { Badge, Button, EmptyState, Input, Select } from '../components/ui';
import { useToday } from '../hooks/useCalendar';
import { useCollection } from '../services/storage/db';
import type { CalEvent } from '../types';

export function EventsPage() {
  const { openEditor } = useApp(); const today = useToday(); const events = useCollection<CalEvent>('events'); const cats = useCategories('event');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const n = q.trim().toLowerCase();
  const rows = events.filter((e) => (!cat || e.categoryId === cat) && (!n || `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(n))
    && (when === 'all' || (when === 'upcoming' ? (e.endDate ?? e.date) >= today : (e.endDate ?? e.date) < today)))
    .sort((a, b) => (when === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.startTime.localeCompare(b.startTime));
  return <div className="mx-auto grid max-w-4xl gap-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Events</h1><Button variant="primary" onClick={() => openEditor({ kind: 'event' })}><Plus size={16} />New event</Button></div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
      <div className="relative"><Search size={14} className="pointer-events-none absolute start-3 top-3 text-muted" /><Input className="ps-8" placeholder="Search events" aria-label="Search events" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Select aria-label="Time range" value={when} onChange={(e) => setWhen(e.target.value as typeof when)}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All</option></Select>
      <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Any category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
    {rows.length === 0 ? <EmptyState icon={<CalendarPlus size={32} />} title={events.length ? 'No events match' : 'No events yet'} hint={events.length ? 'Change the time range or filters.' : 'This list starts empty — every event here is one you create.'} action={!events.length ? <Button variant="primary" onClick={() => openEditor({ kind: 'event' })}>Add event</Button> : undefined} />
      : <ul className="grid gap-2">{rows.map((e) => { const c = cats.find((x) => x.id === e.categoryId); return <li key={e.id}>
        <button className="w-full rounded-xl border border-line bg-surface p-3 text-start hover:bg-brand-soft" style={{ borderInlineStart: `5px solid ${e.color}` }} onClick={() => openEditor({ kind: 'event', id: e.id })}>
          <div className="writing font-medium">{e.title}</div><DateBadge iso={e.date} className="text-sm" />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted"><span>{e.allDay ? 'All day' : `${e.startTime}–${e.endTime}`}</span>{e.location && <span className="writing flex items-center gap-1"><MapPin size={12} />{e.location}</span>}{c && <Badge color={c.color}>{c.name}</Badge>}</div></button></li>; })}</ul>}
  </div>;
}
