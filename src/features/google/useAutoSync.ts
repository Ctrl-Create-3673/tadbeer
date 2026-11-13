import { useEffect, useRef } from 'react';
import { useApp } from '../../components/AppContext';
import { isSignedIn, useGoogleSession } from '../../services/google/google';
import { useCollection } from '../../services/storage/db';
import { useSettings } from '../../services/storage/settings';
import { syncToGoogle } from './sync';

/** While signed in, re-sync a few seconds after tasks/events/reminders/corrections/settings change. */
export function useAutoSync() {
  const [s] = useSettings(); const me = useGoogleSession(); const { toast } = useApp();
  const tasks = useCollection('tasks'), events = useCollection('events'), reminders = useCollection('reminders'), corrections = useCollection('corrections');
  const first = useRef(true); const key = `${s.timezone}|${s.google.defaultTime}|${s.google.emailAll}`;
  useEffect(() => {
    if (!me || !s.google.autoSync) return;
    if (first.current) { first.current = false; return; } // sign-in itself doesn't sync; "Sync now" does
    const t = setTimeout(() => { if (isSignedIn()) syncToGoogle().catch((e) => toast(`Google sync failed: ${(e as Error).message}`, 'error')); }, 4000);
    return () => clearTimeout(t);
  }, [tasks, events, reminders, corrections, key, !!me, s.google.autoSync]); // eslint-disable-line react-hooks/exhaustive-deps
}
