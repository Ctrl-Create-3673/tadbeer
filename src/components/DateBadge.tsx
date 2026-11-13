import { useCalendar } from '../hooks/useCalendar';
import { useSettings } from '../services/storage/settings';
import { gregLabel, hijriLabel } from '../utils/format';

/** "15 Moharram al-Haraam 1448 · 15 Jun 2026" for any ISO date. */
export function DateBadge({ iso, className }: { iso: string; className?: string }) {
  const cal = useCalendar(); const [s] = useSettings();
  const h = cal.fromIso(iso);
  const first = s.calendarDisplay === 'hijri-first';
  const a = hijriLabel(h, s), b = gregLabel(iso, s);
  return <span className={className}>{first ? a : b} <span className="text-muted">· {first ? b : a}{h.confirmed ? ' ✓' : ''}</span></span>;
}
