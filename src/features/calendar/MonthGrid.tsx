import { NotebookPen } from 'lucide-react';
import { useCalendar, useToday } from '../../hooks/useCalendar';
import { toArabicDigits } from '../../services/hijri/engine';
import { WEEKDAY_AR, WEEKDAY_EN } from '../../services/hijri/names';
import { useSettings } from '../../services/storage/settings';
import { cx } from '../../utils/format';
import { getDay, useDayIndex } from './useDayIndex';
import { GREG_MONTH_EN } from '../../services/hijri/names';
import { occasionsFor } from '../../data/occasions';

export function WeekdayHeader({ compact }: { compact?: boolean }) {
  const [s] = useSettings();
  return <div className="grid grid-cols-7 border-b border-line bg-brand-soft text-center text-ink" role="row">
    {Array.from({ length: 7 }, (_, i) => (s.weekStart + i) % 7).map((wd) =>
      <div key={wd} role="columnheader" className={cx('flex flex-col items-center justify-center leading-tight', compact ? 'py-1 text-[10px]' : 'py-2 text-xs sm:text-sm')}>
        <span>{compact ? WEEKDAY_EN[wd].slice(0, 2) : <><span className="hidden sm:inline">{WEEKDAY_EN[wd]}</span><span className="sm:hidden">{WEEKDAY_EN[wd].slice(0, 3)}</span></>}</span>
        {!compact && <span className="ar text-[11px] opacity-90 sm:text-sm">{WEEKDAY_AR[wd]}</span>}
      </div>)}
  </div>;
}

interface Props { year: number; month: number; selected?: string | null; onSelect?: (iso: string) => void; compact?: boolean; tall?: boolean }
export function MonthGrid({ year, month, selected, onSelect, compact, tall }: Props) {
  const cal = useCalendar(); const today = useToday(); const idx = useDayIndex(); const [s] = useSettings();
  const days = cal.monthDays(year, month);
  const lead = (days[0].weekday - s.weekStart + 7) % 7;
  const cells = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const hijriFirst = s.calendarDisplay === 'hijri-first';
  return <div role="grid" aria-label={`Hijri month ${month} ${year}`} className="overflow-hidden rounded-xl border border-line bg-surface">
    <WeekdayHeader compact={compact} />
    <div className="grid grid-cols-7" role="rowgroup">
      {cells.map((d, i) => {
        if (!d) return <div key={i} role="gridcell" className={cx('border-e border-t border-line bg-bg/60', compact ? 'h-8' : tall ? 'min-h-36' : 'min-h-16 sm:min-h-28')} />;
        const items = getDay(idx, d.iso); const isToday = d.iso === today, isSel = d.iso === selected;
        const [, gm, gd] = d.iso.split('-').map(Number);
        const occ = s.showOccasions ? occasionsFor(month, d.day) : [];
        const gLabel = gd === 1 || d === days[0] ? `${gd} ${GREG_MONTH_EN[gm - 1].slice(0, 3)}` : String(gd);
        const entries = [...items.events.map((e) => ({ k: e.id, t: e.title, c: e.color })), ...items.tasks.map((t) => ({ k: t.id, t: t.title, c: 'var(--brand)', done: t.status === 'completed' }))];
        if (compact) return <button key={d.iso} role="gridcell" aria-selected={isSel} aria-current={isToday ? 'date' : undefined} onClick={() => onSelect?.(d.iso)}
          className={cx('relative h-9 border-e border-t border-line text-center text-xs hover:bg-brand-soft', isSel && 'bg-brand-soft', isToday && 'font-bold text-burgundy')}>
          <span className="num-ar">{s.numerals === 'arabic' ? toArabicDigits(d.day) : d.day}</span>
          <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">{items.tasks.length > 0 && <i className="h-1 w-1 rounded-full bg-brand" />}{items.events.length > 0 && <i className="h-1 w-1 rounded-full bg-gold" />}{items.notes.length > 0 && <i className="h-1 w-1 rounded-full bg-burgundy" />}{occ.length > 0 && <i className="h-1 w-1 rounded-full bg-ink" />}</span></button>;
        return <button key={d.iso} role="gridcell" aria-selected={isSel} aria-current={isToday ? 'date' : undefined} onClick={() => onSelect?.(d.iso)}
          aria-label={`${d.day} Hijri, ${d.iso}${items.tasks.length ? `, ${items.tasks.length} tasks` : ''}${items.events.length ? `, ${items.events.length} events` : ''}${occ.length ? `, ${occ.join('; ')}` : ''}`}
          title={d.confirmed ? 'Confirmed by correction' : 'Calculated'}
          className={cx('relative flex flex-col items-stretch border-e border-t border-line p-1 text-start transition-colors hover:bg-brand-soft sm:p-1.5', tall ? 'min-h-36' : 'min-h-16 sm:min-h-28', isSel && 'bg-brand-soft', isToday && 'ring-2 ring-inset ring-burgundy')}>
          <div className="flex items-start justify-between gap-1">
            <span className={cx(hijriFirst ? 'text-[11px] text-muted' : 'text-lg font-semibold')}>{hijriFirst ? gLabel : <span className="num-ar">{d.day}</span>}</span>
            <span className="flex flex-col items-end leading-none">
              <span className={cx('num-ar text-xl sm:text-2xl', isToday ? 'text-burgundy' : 'text-brand')}>{hijriFirst ? toArabicDigits(d.day) : gLabel}</span>
              {hijriFirst && <span className="text-[10px] text-muted">{d.day}</span>}
              {!hijriFirst && <span className="num-ar text-[10px] text-muted">{toArabicDigits(d.day)}</span>}
            </span>
          </div>
          <div className="mt-1 hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
            {occ.length > 0 && <span title={occ.join('\n')} className="truncate border-s-2 border-burgundy ps-1 text-[10px] leading-4 text-muted">{occ[0]}{occ.length > 1 ? ` +${occ.length - 1}` : ''}</span>}
            {entries.slice(0, tall ? 6 : 2).map((e) => <span key={e.k} className="writing truncate rounded px-1 text-[11px] leading-4 text-white" style={{ background: e.c, opacity: 'done' in e && e.done ? 0.5 : 1 }}>{e.t}</span>)}
            {entries.length > (tall ? 6 : 2) && <span className="text-[10px] text-muted">+{entries.length - (tall ? 6 : 2)} more</span>}
          </div>
          <div className="mt-auto flex items-center gap-1 pt-1">
            {items.tasks.length > 0 && <i title="Task" className="h-2 w-2 rounded-full bg-brand" />}
            {items.events.length > 0 && <i title="Event" className="h-2 w-2 rotate-45 bg-gold" />}
            {items.notes.length > 0 && <NotebookPen size={11} className="text-burgundy" aria-label="Note" />}
          </div>
        </button>;
      })}
    </div>
  </div>;
}
