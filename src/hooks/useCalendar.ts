import { useEffect, useMemo, useState } from 'react';
import { createCalendar, todayIso } from '../services/hijri/engine';
import { useCollection } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import type { Correction } from '../types';

export function useCalendar() {
  const corrections = useCollection<Correction>('corrections');
  return useMemo(() => createCalendar(Object.fromEntries(corrections.map((c) => [`${c.year}-${c.month}`, c.startIso]))), [corrections]);
}
/** Today's ISO date in the user's timezone; refreshes at midnight rollover. */
export function useToday() {
  const [{ timezone }] = useSettings();
  const [today, setToday] = useState(() => todayIso(timezone));
  useEffect(() => {
    setToday(todayIso(timezone));
    const t = setInterval(() => setToday(todayIso(timezone)), 30_000);
    return () => clearInterval(t);
  }, [timezone]);
  return today;
}
