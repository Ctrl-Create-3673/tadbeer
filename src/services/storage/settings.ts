import { useMemo } from 'react';
import type { Settings } from '../../types';
import { DEFAULT_ROLES } from '../../styles/fonts.config';
import { getOne, save, useCollection } from './db';

export const defaultSettings = (): Settings => ({
  id: 'main', createdAt: '', updatedAt: '',
  language: 'en', numerals: 'western', calendarDisplay: 'hijri-first', weekStart: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  defaultView: 'month', notifications: false,
  google: { clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '', autoSync: true, emailAll: true, defaultTime: '09:00', email: '', name: '', lastSync: '' }, showOccasions: true, tourDone: false, theme: 'dark', fonts: { ...DEFAULT_ROLES },
});
export const getSettings = (): Settings => { const d = defaultSettings(); const r = getOne<Settings>('settings', 'main'); return { ...d, ...r, google: { ...d.google, ...r?.google } }; };
export function useSettings() {
  const rows = useCollection<Settings>('settings');
  const settings = useMemo(() => { const d = defaultSettings(); return { ...d, ...rows[0], google: { ...d.google, ...rows[0]?.google } }; }, [rows]);
  const update = (patch: Partial<Settings>) => save<Settings>('settings', { ...settings, ...patch, id: 'main' });
  return [settings, update] as const;
}
