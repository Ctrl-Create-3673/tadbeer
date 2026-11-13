import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, IconButton, Modal, Select } from '../components/ui';
import { useCalendar, useToday } from '../hooks/useCalendar';
import { useMedia } from '../hooks/useMedia';
import { addDaysIso } from '../services/hijri/engine';
import { MONTH_AR, MONTH_EN, WEEKDAY_AR, WEEKDAY_EN } from '../services/hijri/names';
import { useSettings } from '../services/storage/settings';
import { CorrectionDialog } from '../features/calendar/CorrectionDialog';
import { DayPanel } from '../features/calendar/DayPanel';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { gregRange } from '../features/calendar/range';
import { getDay, useDayIndex } from '../features/calendar/useDayIndex';
import { cx, num, weekdayName } from '../utils/format';

type View = 'month' | 'year' | 'week' | 'day';

export function CalendarPage() {
  const cal = useCalendar(); const today = useToday(); const [s] = useSettings(); const wide = useMedia('(min-width: 1024px)'); const idx = useDayIndex();
  const [view, setView] = useState<View>(s.defaultView); const [anchor, setAnchor] = useState(today); const [selected, setSelected] = useState<string | null>(null);
  const [fix, setFix] = useState(false);
  const h = cal.fromIso(anchor); const days = cal.monthDays(h.year, h.month);
  const goMonth = (n: number) => { const t = h.year * 12 + (h.month - 1) + n; const y = Math.floor(t / 12), m = (t % 12) + 1; setAnchor(cal.toIso({ year: y, month: m, day: Math.min(h.day, cal.monthLength(y, m)) })); };
  const step = (dir: 1 | -1) => view === 'month' ? goMonth(dir) : view === 'year' ? goMonth(12 * dir) : setAnchor(addDaysIso(anchor, (view === 'week' ? 7 : 1) * dir));
  const pick = (iso: string) => { setSelected(iso); setAnchor(iso); };
  const week = Array.from({ length: 7 }, (_, i) => addDaysIso(anchor, i - ((cal.fromIso(anchor).weekday - s.weekStart + 7) % 7)));
  const confirmed = cal.monthIsConfirmed(h.year, h.month);
  const panelIso = view === 'day' ? anchor : selected;

  return <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
    <div className="min-w-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">{view === 'year' ? <span className="num-ar">{num(h.year, s)}</span> : MONTH_EN[h.month - 1]}</h1>
            {view !== 'year' && <span className="ar text-2xl text-brand sm:text-3xl">{MONTH_AR[h.month - 1]}</span>}
            {view !== 'year' && <span className="text-xl text-burgundy"><span className="num-ar">{num(h.year, s)}</span> H</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">{gregRange(days[0].iso, days[days.length - 1].iso, s)}
            {view !== 'year' && <><Badge color={confirmed ? 'var(--brand)' : undefined}>{confirmed ? 'Confirmed' : 'Calculated'}</Badge>
              <button className="inline-flex items-center gap-1 text-brand underline" onClick={() => setFix(true)}><Wrench size={12} />Correct start</button></>}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-line">
            <IconButton label="Previous" onClick={() => step(-1)}><ChevronLeft size={18} className="flip-rtl" /></IconButton>
            <Button className="border-0" onClick={() => setAnchor(today)}>Today</Button>
            <IconButton label="Next" onClick={() => step(1)}><ChevronRight size={18} className="flip-rtl" /></IconButton>
          </div>
          <div role="tablist" aria-label="View" className="flex rounded-lg border border-line p-0.5">
            {(['month', 'year', 'week', 'day'] as View[]).map((v) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx('rounded-md px-3 py-1.5 text-sm capitalize', view === v ? 'bg-brand text-bg' : 'hover:bg-brand-soft')}>{v}</button>)}
          </div>
          <Select aria-label="Jump to Hijri month" className="w-auto" value={h.month} onChange={(e) => setAnchor(cal.toIso({ year: h.year, month: +e.target.value, day: 1 }))}>{MONTH_EN.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
        </div>
      </header>

      {view === 'month' && <MonthGrid year={h.year} month={h.month} selected={selected} onSelect={pick} />}
      {view === 'year' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) =>
        <Card key={m} className="p-3"><button className="mb-2 flex w-full items-baseline justify-between" onClick={() => { setAnchor(cal.toIso({ year: h.year, month: m, day: 1 })); setView('month'); }}><span className="font-semibold">{MONTH_EN[m - 1]}</span><span className="ar text-brand">{MONTH_AR[m - 1]}</span></button>
          <MonthGrid year={h.year} month={m} compact selected={selected} onSelect={pick} /></Card>)}</div>}
      {view === 'week' && <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-7">{week.map((iso) => {
        const d = cal.fromIso(iso); const it = getDay(idx, iso);
        return <button key={iso} onClick={() => pick(iso)} className={cx('min-h-32 bg-surface p-2 text-start hover:bg-brand-soft md:min-h-72', iso === selected && 'bg-brand-soft')}>
          <div className="-mx-2 -mt-2 mb-2 bg-brand-soft px-2 py-1 text-sm text-ink">{weekdayName(d.weekday, 'en')} <span className="ar float-end">{WEEKDAY_AR[d.weekday]}</span></div>
          <div className="flex items-baseline justify-between"><span className={cx('text-sm', iso === today && 'font-bold text-burgundy')}>{iso.slice(8)}/{iso.slice(5, 7)}</span><span className="num-ar text-2xl text-brand">{num(d.day, s)}</span></div>
          <ul className="mt-2 grid gap-1">{[...it.events.map((e) => ({ k: e.id, t: e.title, c: e.color })), ...it.tasks.map((t) => ({ k: t.id, t: t.title, c: 'var(--brand)' }))].map((e) => <li key={e.k} className="writing truncate rounded px-1 text-xs text-white" style={{ background: e.c }}>{e.t}</li>)}</ul></button>; })}</div>}
      {view === 'day' && !wide && <DayPanel iso={anchor} />}
      {view === 'day' && wide && <Card className="min-h-64"><div className="text-sm text-muted">{WEEKDAY_EN[h.weekday]}</div><p className="mt-2 text-sm text-muted">Details for the day are shown in the panel on the right.</p></Card>}
    </div>

    {wide && panelIso && <aside className="lg:sticky lg:top-4 lg:self-start"><Card><DayPanel iso={panelIso} onClose={view === 'day' ? undefined : () => setSelected(null)} /></Card></aside>}
    {!wide && selected && view !== 'day' && <Modal title="Day details" onClose={() => setSelected(null)}><DayPanel iso={selected} /></Modal>}
    {fix && <CorrectionDialog year={h.year} month={h.month} onClose={() => setFix(false)} />}
  </div>;
}
