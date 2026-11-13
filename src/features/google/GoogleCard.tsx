import { CalendarCheck, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { Badge, Button, Card, Field, Input } from '../../components/ui';
import { signInAccount, signOutAccount, useAccount } from '../../services/google/account';
import { GoogleAuthError, connectCalendar, disconnectCalendar, useGoogleSession } from '../../services/google/google';
import { useSettings } from '../../services/storage/settings';
import type { GoogleSettings } from '../../types';
import { syncToGoogle } from './sync';

const G = <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>;

/** Step 1: one-click Google sign-in (name + email only, via Firebase). */
export function useGoogleLogin() {
  const { toast } = useApp(); const [busy, setBusy] = useState(false);
  const login = async () => {
    setBusy(true);
    try { await signInAccount(); toast('Signed in'); }
    catch (e) { const m = (e as Error).message; if (!/popup-closed|cancelled-popup/.test(m)) toast(m.includes('unauthorized-domain') ? 'This site is not yet allowed for Google sign-in (add it under Firebase → Authentication → Authorized domains).' : m, 'error'); } finally { setBusy(false); }
  };
  return { login, busy };
}

export function GoogleButton({ className = '' }: { className?: string }) {
  const { login, busy } = useGoogleLogin();
  return <button type="button" onClick={login} disabled={busy} className={`inline-flex items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 py-2.5 text-sm font-medium text-[#3c4043] shadow-sm hover:bg-[#f8f9fa] disabled:opacity-60 ${className}`}>{G}{busy ? 'Signing in…' : 'Sign in with Google'}</button>;
}

export function GoogleCard() {
  const [s, update] = useSettings(); const g = s.google; const acc = useAccount(); const me = useGoogleSession(); const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<GoogleSettings>) => update({ google: { ...g, ...p } });
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast((e as Error).message + (e instanceof GoogleAuthError ? '' : ''), 'error'); } finally { setBusy(false); }
  };
  const sync = () => run(async () => { const r = await syncToGoogle(); toast(`Google Calendar updated: ${r.created} added, ${r.updated} changed, ${r.removed} removed`); });
  return <Card id="google"><h2 className="mb-1 text-lg font-semibold">Google account &amp; email reminders</h2>
    <p className="mb-3 text-sm text-muted">Optional. Connecting your calendar lets the app put your upcoming tasks, events and reminders in <b>your own Google Calendar</b> with <b>email</b> and popup reminders. Google sends the emails to your Google address — even when this app is closed. The app works fully without signing in.</p>
    {acc ? <div className="mb-3 flex flex-wrap items-center gap-2">
      {acc.picture && <img src={acc.picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
      <div className="text-sm"><b>{acc.name || acc.email}</b><div className="text-muted">{acc.email}</div></div>
      <Badge color="var(--brand)">Signed in</Badge>
      <Button size="sm" className="ms-auto" onClick={() => { disconnectCalendar(); void signOutAccount(); toast('Signed out'); }}><LogOut size={14} />Sign out</Button></div>
      : <div className="mb-3"><GoogleButton /></div>}
    {acc && <div className="mb-3 rounded-lg border border-line p-3 text-sm">
      <div className="mb-1 font-medium">Google Calendar {me ? <Badge color="var(--brand)">Connected</Badge> : <Badge color="var(--muted)">Not connected</Badge>}</div>
      <p className="mb-2 text-muted">Optional. Connect to get your tasks, events and reminders as email notifications from your own Google Calendar. Google will ask for Calendar permission only now.</p>
      {me ? <Button size="sm" onClick={() => { disconnectCalendar(); toast('Calendar disconnected'); }}>Disconnect</Button>
        : <Button size="sm" disabled={busy} onClick={() => run(async () => { await connectCalendar(); toast('Google Calendar connected'); })}><CalendarCheck size={14} />Connect Google Calendar</Button>}
    </div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Time for items without their own time" hint="A task or all-day event is placed at this time on its date, so the email arrives then.">
        <Input type="time" value={g.defaultTime} onChange={(e) => set({ defaultTime: e.target.value || '09:00' })} /></Field>
      <div className="grid content-start gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={g.emailAll} onChange={(e) => set({ emailAll: e.target.checked })} />Email me about every task and event (not only ones with a reminder)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={g.autoSync} onChange={(e) => set({ autoSync: e.target.checked })} />Sync automatically while the calendar is connected</label></div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Button disabled={busy || !me} onClick={sync}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Sync now</Button>
      {g.lastSync && <span className="flex items-center gap-1 text-xs text-muted"><CalendarCheck size={13} />Last sync {new Date(g.lastSync).toLocaleString()}</span>}</div>
    <p className="mt-3 text-xs text-muted">Limits: The calendar connection lasts about an hour, so reconnect the calendar to sync again — reminders already in your calendar keep emailing. Only upcoming items are kept in Google Calendar; past and completed items are removed. The app only changes events it created and never reads your other events. Reminders repeating by Hijri date sync as their next occurrence only. Your Google email notification settings (Calendar → Settings) still apply.</p>
  </Card>;
}
