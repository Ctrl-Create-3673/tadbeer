import { useCalendar } from '../hooks/useCalendar';
import { useSettings } from '../services/storage/settings';
import { hijriMonthName } from '../utils/format';
import { Input, Select } from './ui';

/** Dual date input: edit either the Gregorian or the Hijri date and the other follows. */
export function DateField({ value, onChange, required }: { value: string | null; onChange: (iso: string | null) => void; required?: boolean }) {
  const cal = useCalendar(); const [s] = useSettings();
  const h = value ? cal.fromIso(value) : null;
  const setHijri = (patch: Partial<{ year: number; month: number; day: number }>) => {
    if (!h) return;
    const y = patch.year ?? h.year, m = patch.month ?? h.month;
    if (!(y >= 1 && y <= 9999)) return;
    const d = Math.min(patch.day ?? h.day, cal.monthLength(y, m));
    onChange(cal.toIso({ year: y, month: m, day: Math.max(1, d) }));
  };
  return <div className="grid gap-2 sm:grid-cols-2">
    <div><span className="mb-1 block text-xs text-muted">Gregorian</span>
      <Input type="date" aria-label="Gregorian date" value={value ?? ''} required={required} onChange={(e) => onChange(e.target.value || null)} /></div>
    <div><span className="mb-1 block text-xs text-muted">Hijri</span>
      <div className="grid grid-cols-[3.5rem_1fr_4.5rem] gap-1">
        <Input type="number" aria-label="Hijri day" min={1} max={30} disabled={!h} value={h?.day ?? ''} onChange={(e) => setHijri({ day: Math.max(1, +e.target.value || 1) })} />
        <Select aria-label="Hijri month" disabled={!h} value={h?.month ?? ''} onChange={(e) => setHijri({ month: +e.target.value })}>
          {!h && <option value="">—</option>}
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{hijriMonthName(i + 1, s.language)}</option>)}
        </Select>
        <Input type="number" aria-label="Hijri year" disabled={!h} value={h?.year ?? ''} onChange={(e) => setHijri({ year: +e.target.value })} />
      </div>
      {!h && <button type="button" className="mt-1 text-xs text-brand underline" onClick={() => onChange(new Date().toISOString().slice(0, 10))}>Pick a date</button>}
    </div>
  </div>;
}
