import { describe, expect, it } from 'vitest';
import refSrc from './reference-hijri_date.js?raw';
import { addDaysIso, calcMonthLength, createCalendar, isKabisa, isoToJdn, jdnToIso, toArabicDigits, weekdayOfIso } from './engine';

const Ref = new Function(`${refSrc}; return HijriDate;`)();
const cal = createCalendar();

describe('Gregorian/JDN', () => {
  it('round-trips and knows weekdays', () => {
    for (let j = isoToJdn('1900-01-01'); j < isoToJdn('2200-01-01'); j += 37) expect(isoToJdn(jdnToIso(j))).toBe(j);
    expect(weekdayOfIso('2026-06-15')).toBe(1); // Monday
    expect(addDaysIso('2024-02-28', 2)).toBe('2024-03-01'); // leap year
  });
});

describe('Mumineen engine', () => {
  it('matches the supplied planner PDF anchor: 1 Moharram 1448 = 15 Jun 2026 (Monday)', () => {
    expect(cal.toIso({ year: 1448, month: 1, day: 1 })).toBe('2026-06-15');
    expect(cal.fromIso('2026-07-14')).toMatchObject({ year: 1448, month: 1, day: 30 });
  });
  it('is identical to the reference implementation for every day 1900–2100', () => {
    let refBugDays = 0;
    for (let j = isoToJdn('1900-01-01'); j <= isoToJdn('2100-12-31'); j++) {
      const iso = jdnToIso(j), [y, m, d] = iso.split('-').map(Number);
      const r = Ref.fromGregorian(new Date(y, m - 1, d));
      const h = cal.fromIso(iso);
      // The reference returns day 0 of month 0 on the last day of every 30-year cycle (its bug);
      // the port correctly gives day 30 of Zilhaj there.
      if (r.day === 0) { refBugDays++; expect([h.month, h.day]).toEqual([12, 30]); continue; }
      expect([h.year, h.month, h.day]).toEqual([r.year, r.month + 1, r.day]);
    }
    expect(refBugDays).toBeLessThanOrEqual(7);
  });
  it('month lengths and leap years', () => {
    expect(isKabisa(1447)).toBe(false); expect(isKabisa(1448)).toBe(true) /* 1448%30=8 */;
    expect(calcMonthLength(1448, 12)).toBe(30); expect(calcMonthLength(1447, 12)).toBe(29);
    expect(cal.monthDays(1448, 2)).toHaveLength(29);
    // year length = 354 / 355
    expect(cal.monthStart(1449, 1) - cal.monthStart(1448, 1)).toBe(355);
    expect(cal.monthStart(1448, 1) - cal.monthStart(1447, 1)).toBe(354);
  });
  it('hijri→gregorian→hijri round-trips across month boundaries', () => {
    for (let y = 1440; y < 1460; y++) for (let m = 1; m <= 12; m++) for (const d of [1, 29]) {
      const h = cal.fromIso(cal.toIso({ year: y, month: m, day: d }));
      expect([h.year, h.month, h.day]).toEqual([y, m, d]);
    }
  });
});

describe('corrections', () => {
  const base = cal.toIso({ year: 1448, month: 2, day: 1 });
  const earlier = addDaysIso(base, -1);
  it('rejects out-of-range and invalid-length corrections', () => {
    expect(cal.validateMonthStart(1448, 2, addDaysIso(base, 3))).toMatch(/at most 2 days/);
    // Moharram 1448 has 30 days; starting Safar a day later would make it 31
    expect(cal.validateMonthStart(1448, 2, addDaysIso(base, 1))).toMatch(/30|31/);
    expect(cal.validateMonthStart(1448, 2, earlier)).toBeNull();
  });
  it('moves a month start and flags the affected days as confirmed', () => {
    const c = createCalendar({ '1448-2': earlier });
    expect(c.fromIso(earlier)).toMatchObject({ year: 1448, month: 2, day: 1, confirmed: true });
    expect(c.fromIso(addDaysIso(earlier, -1))).toMatchObject({ month: 1, day: 29, confirmed: true });
    expect(c.monthLength(1448, 1)).toBe(29);
    expect(c.monthLength(1448, 2)).toBe(30);
    expect(cal.fromIso(earlier).confirmed).toBe(false); // calculated calendar untouched
    expect(c.fromIso(addDaysIso(earlier, 30))).toMatchObject({ month: 3, day: 1 }); // later months unchanged
  });
});

describe('numerals', () => {
  it('converts to Arabic-Indic', () => expect(toArabicDigits(1448)).toBe('١٤٤٨'));
});
