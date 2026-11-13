/**
 * Mumineen (Fatimid tabular) Hijri calendar.
 *
 * Ported from mygulamali/mumineen_calendar_js (MIT, © Murtaza Gulamali) — see
 * LICENSE-THIRD-PARTY-mumineen_calendar_js.txt. The arithmetic (30-year cycle, kabisa years
 * 2,5,8,10,13,16,19,21,24,27,29, odd months 30 days / even months 29, Zilhaj 30 in kabisa years)
 * is identical; this version works on integer Julian Day Numbers and ISO date strings so it is
 * immune to timezone/DST/float issues. It is NOT Umm al-Qura.
 *
 * Corrections: officially announced month starts override the calculation. A correction is
 * "Hijri month (y,m) begins on Gregorian date X"; day numbering then follows from that.
 */

const KABISA = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
const DAYS_IN_YEAR = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325]; // cumulative, months 1..11
const DAYS_IN_30_YEARS = [
  354, 708, 1063, 1417, 1771, 2126, 2480, 2834, 3189, 3543, 3898, 4252, 4606, 4961, 5315,
  5669, 6024, 6378, 6732, 7087, 7441, 7796, 8150, 8504, 8859, 9213, 9567, 9922, 10276, 10631,
];
const EPOCH_JDN = 1948085; // JDN of 1 Moharram, year 0 (matches the reference implementation)

export interface HijriDate { year: number; month: number; day: number } // month 1..12
export interface HijriDay extends HijriDate { jdn: number; iso: string; weekday: number; confirmed: boolean }
/** Key `${year}-${month}` → ISO date on which that Hijri month begins. */
export type MonthStartOverrides = Record<string, string>;

// ---- Gregorian <-> JDN (proleptic Gregorian) ----
export function isoToJdn(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export function jdnToIso(jdn: number): string {
  const a = jdn + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1, month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export const weekdayOfJdn = (jdn: number) => (jdn + 1) % 7; // 0 = Sunday
export const weekdayOfIso = (iso: string) => weekdayOfJdn(isoToJdn(iso));
export const addDaysIso = (iso: string, n: number) => jdnToIso(isoToJdn(iso) + n);
export function todayIso(timeZone?: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// ---- pure calculated calendar ----
export const isKabisa = (year: number) => KABISA.includes(((year % 30) + 30) % 30);
export const calcMonthLength = (year: number, month: number) =>
  (month === 12 && isKabisa(year)) || month % 2 === 1 ? 30 : 29;

function calcYearStart(year: number): number {
  const c = Math.floor(year / 30), r = year - c * 30;
  return EPOCH_JDN + c * 10631 + (r ? DAYS_IN_30_YEARS[r - 1] : 0);
}
export const calcMonthStart = (year: number, month: number) =>
  calcYearStart(year) + (month === 1 ? 0 : DAYS_IN_YEAR[month - 2]);

function calcFromJdn(jdn: number): HijriDate {
  let left = jdn - EPOCH_JDN + 1;
  const y30 = Math.floor(left / 10631);
  left -= y30 * 10631;
  let i = 0;
  while (left > DAYS_IN_30_YEARS[i]) i++;
  const year = y30 * 30 + i;
  if (i > 0) left -= DAYS_IN_30_YEARS[i - 1];
  let m = 0;
  while (left > DAYS_IN_YEAR[m]) m++;
  return { year, month: m + 1, day: m > 0 ? left - DAYS_IN_YEAR[m - 1] : left };
}

// ---- calendar with corrections ----
const idx = (y: number, m: number) => y * 12 + (m - 1);
const fromIdx = (i: number): [number, number] => [Math.floor(i / 12), (((i % 12) + 12) % 12) + 1];

export function createCalendar(overrides: MonthStartOverrides = {}) {
  const monthStart = (y: number, m: number): number => {
    const o = overrides[`${y}-${m}`];
    return o ? isoToJdn(o) : calcMonthStart(y, m);
  };
  const monthIsConfirmed = (y: number, m: number) => {
    const [ny, nm] = fromIdx(idx(y, m) + 1);
    return `${y}-${m}` in overrides || `${ny}-${nm}` in overrides;
  };
  const monthLength = (y: number, m: number) => {
    const [ny, nm] = fromIdx(idx(y, m) + 1);
    return monthStart(ny, nm) - monthStart(y, m);
  };
  function fromJdn(jdn: number): HijriDay {
    const est = calcFromJdn(jdn);
    const base = idx(est.year, est.month);
    for (let d = -2; d <= 2; d++) {
      const [y, m] = fromIdx(base + d);
      const start = monthStart(y, m);
      if (jdn >= start && jdn < start + monthLength(y, m))
        return { year: y, month: m, day: jdn - start + 1, jdn, iso: jdnToIso(jdn), weekday: weekdayOfJdn(jdn), confirmed: monthIsConfirmed(y, m) };
    }
    return { ...est, jdn, iso: jdnToIso(jdn), weekday: weekdayOfJdn(jdn), confirmed: false };
  }
  return {
    monthStart, monthLength, monthIsConfirmed,
    fromIso: (iso: string) => fromJdn(isoToJdn(iso)),
    toIso: (h: HijriDate) => jdnToIso(monthStart(h.year, h.month) + h.day - 1),
    monthDays(year: number, month: number): HijriDay[] {
      const s = monthStart(year, month);
      return Array.from({ length: monthLength(year, month) }, (_, i) => fromJdn(s + i));
    },
    /** Validate a proposed correction; returns an error message or null. */
    validateMonthStart(year: number, month: number, iso: string): string | null {
      const j = isoToJdn(iso);
      if (Math.abs(j - calcMonthStart(year, month)) > 2) return 'A correction may differ from the calculated start by at most 2 days.';
      const next = { ...overrides, [`${year}-${month}`]: iso };
      const cal = createCalendar(next);
      const [py, pm] = fromIdx(idx(year, month) - 1);
      for (const [y, m] of [[py, pm], [year, month]]) {
        const len = cal.monthLength(y, m);
        if (len < 29 || len > 30) return `That would make month ${m}/${y} ${len} days long (must be 29 or 30). Correct the neighbouring month first.`;
      }
      return null;
    },
  };
}
export type HijriCalendar = ReturnType<typeof createCalendar>;

// ---- numerals ----
export const toArabicDigits = (n: number | string) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
