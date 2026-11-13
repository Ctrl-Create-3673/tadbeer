import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Card, IconButton, Select, Textarea } from '../components/ui';
import { WeekdayHeader } from '../features/calendar/MonthGrid';
import { gregRange } from '../features/calendar/range';
import { getDay, useDayIndex } from '../features/calendar/useDayIndex';
import { useCalendar, useToday } from '../hooks/useCalendar';
import { toArabicDigits } from '../services/hijri/engine';
import { MONTH_AR, MONTH_EN, monthHeadingAr } from '../services/hijri/names';
import { getOne, save, useCollection } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import type { PlannerDoc } from '../types';
import { cx, num } from '../utils/format';

function useDoc(id: string) {
  const docs = useCollection<PlannerDoc>('planner'); const doc = docs.find((d) => d.id === id);
  const put = (p: Partial<PlannerDoc>) => save<PlannerDoc>('planner', { text: '', important: false, ...getOne<PlannerDoc>('planner', id), ...p, id });
  return [doc, put] as const;
}
/** Text state that autosaves 0.6 s after typing stops, on blur, and when the component unmounts. */
function useAutosave(saved: string, put: (p: Partial<PlannerDoc>) => unknown) {
  const [text, setText] = useState(saved); useEffect(() => setText(saved), [saved]);
  const latest = useRef({ text, saved, put }); latest.current = { text, saved, put };
  const flush = () => { const l = latest.current; if (l.text !== l.saved) l.put({ text: l.text }); };
  useEffect(() => { if (text === saved) return; const t = setTimeout(flush, 600); return () => clearTimeout(t); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return [text, setText, flush] as const;
}
/** Large writing area inside a day. */
function DayCell({ iso, hijriDay, label, today }: { iso: string; hijriDay: number; label: string; today: boolean }) {
  const [doc, put] = useDoc(`day:${iso}`); const idx = useDayIndex(); const it = getDay(idx, iso); const [s] = useSettings();
  const [text, setText, flush] = useAutosave(doc?.text ?? '', put);
  return <div className={cx('flex min-h-44 flex-col border-e border-t border-line p-1.5', today && 'ring-2 ring-inset ring-burgundy', doc?.important && 'bg-gold/10')}>
    <div className="flex items-start justify-between"><span className="text-[11px] text-muted">{label}</span>
      <span className="flex items-center gap-1"><button aria-label="Mark important" aria-pressed={!!doc?.important} onClick={() => put({ important: !doc?.important, text })}><Star size={14} className={doc?.important ? 'fill-gold text-gold' : 'text-muted'} /></button><span className="num-ar text-2xl text-brand">{s.numerals === 'arabic' ? toArabicDigits(hijriDay) : hijriDay}</span></span></div>
    <div className="my-1 grid gap-0.5">{[...it.events.map((e) => ({ k: e.id, t: e.title, c: e.color })), ...it.tasks.map((t) => ({ k: t.id, t: t.title, c: 'var(--brand)' }))].map((e) => <span key={e.k} className="writing truncate rounded px-1 text-[11px] text-white" style={{ background: e.c }}>{e.t}</span>)}</div>
    <Textarea aria-label={`Notes for ${iso}`} className="writing min-h-16 flex-1 resize-none border-0 bg-transparent p-1 text-sm" dir="auto" value={text} onChange={(e) => setText(e.target.value)} onBlur={flush} />
  </div>;
}

/** Keyed by year, so switching years unmounts it and flushes any unsaved text first. */
function YearSpace({ year }: { year: number }) {
  const [doc, put] = useDoc(`year:${year}`); const [text, setText, flush] = useAutosave(doc?.text ?? '', put);
  return <Card><h2 className="mb-2 font-semibold">Personal planning space</h2><Textarea rows={8} className="writing" dir="auto" aria-label="Yearly planning notes" placeholder="Goals, intentions, things to remember this year…" value={text} onChange={(e) => setText(e.target.value)} onBlur={flush} /></Card>;
}

export function PlannerPage() {
  const cal = useCalendar(); const today = useToday(); const [s] = useSettings(); const idx = useDayIndex();
  const h0 = cal.fromIso(today); const [tab, setTab] = useState<'month' | 'year'>('month'); const [y, setY] = useState(h0.year); const [m, setM] = useState(h0.month);
  const days = cal.monthDays(y, m); const lead = (days[0].weekday - s.weekStart + 7) % 7;
  const nav = (n: number) => { const t = y * 12 + (m - 1) + n; setY(Math.floor(t / 12)); setM((t % 12) + 1); };
  const planner = useCollection<PlannerDoc>('planner');
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Planner" className="flex rounded-lg border border-line p-0.5">{(['month', 'year'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('rounded-md px-4 py-1.5 text-sm', tab === t ? 'bg-brand text-bg' : 'hover:bg-brand-soft')}>{t === 'month' ? 'Monthly planner' : 'Yearly planner'}</button>)}</div>
      <div className="flex items-center gap-1"><IconButton label="Previous" onClick={() => (tab === 'month' ? nav(-1) : setY(y - 1))}><ChevronLeft size={18} className="flip-rtl" /></IconButton>
        {tab === 'month' && <Select aria-label="Month" className="w-auto" value={m} onChange={(e) => setM(+e.target.value)}>{MONTH_EN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</Select>}
        <span className="min-w-14 text-center font-semibold"><span className="num-ar">{num(y, s)}</span></span>
        <IconButton label="Next" onClick={() => (tab === 'month' ? nav(1) : setY(y + 1))}><ChevronRight size={18} className="flip-rtl" /></IconButton></div>
    </div>
    {tab === 'month' ? <>
      <div className="flex flex-wrap items-baseline gap-x-3"><h1 className="text-2xl font-semibold">{MONTH_EN[m - 1]}</h1><span className="ar text-2xl text-brand">{monthHeadingAr(m, y)}</span><span className="text-burgundy">{y} H</span><span className="text-sm text-muted">{gregRange(days[0].iso, days[days.length - 1].iso, s)}</span>
        {cal.monthIsConfirmed(y, m) && <Badge color="var(--brand)">Confirmed</Badge>}</div>
      <div className="overflow-x-auto"><div className="min-w-[56rem] overflow-hidden rounded-xl border border-line bg-surface"><WeekdayHeader />
        <div className="grid grid-cols-7">{Array.from({ length: lead }, (_, i) => <div key={'e' + i} className="min-h-44 border-e border-t border-line bg-bg/60" />)}
          {days.map((d, i) => <DayCell key={d.iso} iso={d.iso} hijriDay={d.day} today={d.iso === today} label={gregCell(d.iso, i === 0)} />)}</div></div></div></>
    : <>
      <div className="flex flex-wrap items-baseline gap-3"><h1 className="text-2xl font-semibold">Yearly planner</h1><span className="text-burgundy"><span className="num-ar">{num(y, s)}</span> H</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
        const ds = cal.monthDays(y, mo); let tasks = 0, done = 0, ev = 0; const important: { iso: string; day: number }[] = [];
        for (const d of ds) { const it = getDay(idx, d.iso); tasks += it.tasks.length; done += it.tasks.filter((t) => t.status === 'completed').length; ev += it.events.length; if (planner.find((p) => p.id === `day:${d.iso}`)?.important) important.push({ iso: d.iso, day: d.day }); }
        const evs = ds.flatMap((d) => getDay(idx, d.iso).events.filter((e) => e.date === d.iso).map((e) => ({ id: e.id, day: d.day, t: e.title })));
        return <Card key={mo} className="p-3"><div className="flex items-baseline justify-between"><b>{MONTH_EN[mo - 1]}</b><span className="ar text-brand">{MONTH_AR[mo - 1]}</span></div>
          <div className="text-xs text-muted">{gregRange(ds[0].iso, ds[ds.length - 1].iso, s)}</div>
          <div className="mt-2 flex gap-1.5 text-xs"><Badge>{tasks ? `${done}/${tasks} tasks` : 'no tasks'}</Badge><Badge>{ev} events</Badge></div>
          {(important.length > 0 || evs.length > 0) && <ul className="mt-2 grid gap-0.5 text-xs">{important.map((x) => <li key={x.iso} className="flex items-center gap-1"><Star size={11} className="fill-gold text-gold" />{num(x.day, s)} {MONTH_EN[mo - 1]} — marked important</li>)}{evs.slice(0, 4).map((x) => <li key={x.id} className="writing truncate">{num(x.day, s)} · {x.t}</li>)}</ul>}</Card>; })}</div>
      <YearSpace key={y} year={y} /></>}
  </div>;
}
const gregCell = (iso: string, first: boolean) => { const [, mo, d] = iso.split('-').map(Number); return first || d === 1 ? `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mo - 1]}` : String(d); };
