import { GREG_MONTH_AR, GREG_MONTH_EN } from '../../services/hijri/names';
import { num } from '../../utils/format';
import type { Settings } from '../../types';

/** "June – July 2026" for the Gregorian span of a Hijri month. */
export function gregRange(firstIso: string, lastIso: string, s: Pick<Settings, 'language' | 'numerals'>) {
  const [y1, m1] = firstIso.split('-').map(Number), [y2, m2] = lastIso.split('-').map(Number);
  const names = s.language === 'ar' ? GREG_MONTH_AR : GREG_MONTH_EN;
  if (y1 === y2 && m1 === m2) return `${names[m1 - 1]} ${num(y1, s)}`;
  return y1 === y2 ? `${names[m1 - 1]} – ${names[m2 - 1]} ${num(y1, s)}` : `${names[m1 - 1]} ${num(y1, s)} – ${names[m2 - 1]} ${num(y2, s)}`;
}
