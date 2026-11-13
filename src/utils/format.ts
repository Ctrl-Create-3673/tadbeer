import { GREG_MONTH_AR, GREG_MONTH_EN, MONTH_AR, MONTH_EN, WEEKDAY_AR, WEEKDAY_EN } from '../services/hijri/names';
import { toArabicDigits, type HijriDate } from '../services/hijri/engine';
import type { Settings } from '../types';

export const num = (n: number | string, s: Pick<Settings, 'numerals'>) => (s.numerals === 'arabic' ? toArabicDigits(n) : String(n));
export function gregLabel(iso: string, s: Pick<Settings, 'language' | 'numerals'>, opts: { weekday?: boolean } = {}) {
  const [y, m, d] = iso.split('-').map(Number);
  const month = (s.language === 'ar' ? GREG_MONTH_AR : GREG_MONTH_EN)[m - 1];
  return `${num(d, s)} ${month} ${num(y, s)}`;
}
export const hijriMonthName = (m: number, lang: 'en' | 'ar') => (lang === 'ar' ? MONTH_AR : MONTH_EN)[m - 1];
export const hijriLabel = (h: HijriDate, s: Pick<Settings, 'language' | 'numerals'>) => `${num(h.day, s)} ${hijriMonthName(h.month, s.language)} ${num(h.year, s)}`;
export const weekdayName = (wd: number, lang: 'en' | 'ar') => (lang === 'ar' ? WEEKDAY_AR : WEEKDAY_EN)[wd];
export const pad = (n: number) => String(n).padStart(2, '0');
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
