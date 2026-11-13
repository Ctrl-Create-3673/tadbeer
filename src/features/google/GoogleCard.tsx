import { CalendarCheck, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { Badge, Button, Card, Field, Input } from '../../components/ui';
import { GoogleAuthError, signIn, signOut, useGoogleSession } from '../../services/google/google';
import { useSettings } from '../../services/storage/settings';
import type { GoogleSettings } from '../../types';
import { syncToGoogle } from './sync';

export function GoogleCard() {
  const [s, update] = useSettings(); const g = s.google; const me = useGoogleSession(); const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<GoogleSettings>) => update({ google: { ...g, ...p } });
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast((e as Error).message + (e instanceof GoogleAuthError ? '' : ''), 'error'); } finally { setBusy(false); }
  };
  const login = () => run(async () => { const u = await signIn(g.clientId); await set({ clientId: g.clientId.trim(), email: u.email, name: u.name }); toast(`Signed in as ${u.email}`); });
  const sync = () => run(async () => { const r = await syncToGoogle(); toast(`Google Calendar updated: ${r.created} added, ${r.updated} changed, ${r.removed} removed`); });
  return <Card id="google"><h2 className="mb-1 text-lg font-semibold">Google account &amp; email reminders</h2>
    <p className="mb-3 text-sm text-muted">Optional. Signing in lets the app put your upcoming tasks, events and reminders in <b>your own Google Calendar</b> with <b>email</b> and popup reminders. Google sends the emails to your Google address — even when this app is closed. The app works fully without signing in.</p>
    {me ? <div className="mb-3 flex flex-wrap items-center gap-2">
      {me.user.picture && <img src={me.user.picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
      <div className="text-sm"><b>{me.user.name || me.user.email}</b><div className="text-muted">{me.user.email}</div></div>
      <Badge color="var(--brand)">Signed in</Badge>
      <Button size="sm" className="ms-auto" onClick={() => { signOut(); toast('Signed out'); }}><LogOut size={14} />Sign out</Button></div>
      : <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={busy || !g.clientId.trim()} onClick={login}><LogIn size={14} />Sign in with Google</Button>
        {g.email && <span className="text-sm text-muted">Last used: {g.email} — sign in again to sync.</span>}</div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Google OAuth Client ID" hint="Public, not a secret. See the README for how to create one (2 minutes)." className="sm:col-span-2">
        <Input value={g.clientId} placeholder="123456789-abc….apps.googleusercontent.com" onChange={(e) => set({ clientId: e.target.value })} /></Field>
      <Field label="Time for items without their own time" hint="A task or all-day event is placed at this time on its date, so the email arrives then.">
        <Input type="time" value={g.defaultTime} onChange={(e) => set({ defaultTime: e.target.value || '09:00' })} /></Field>
      <div className="grid content-start gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={g.emailAll} onChange={(e) => set({ emailAll: e.target.checked })} />Email me about every task and event (not only ones with a reminder)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={g.autoSync} onChange={(e) => set({ autoSync: e.target.checked })} />Sync automatically while I’m signed in</label></div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Button disabled={busy || !me} onClick={sync}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Sync now</Button>
      {g.lastSync && <span className="flex items-center gap-1 text-xs text-muted"><CalendarCheck size={13} />Last sync {new Date(g.lastSync).toLocaleString()}</span>}</div>
    <p className="mt-3 text-xs text-muted">Limits: Google’s browser sign-in lasts about an hour, so reconnect to sync again — reminders already in your calendar keep emailing. Only upcoming items are kept in Google Calendar; past and completed items are removed. The app only changes events it created and never reads your other events. Reminders repeating by Hijri date sync as their next occurrence only. Your Google email notification settings (Calendar → Settings) still apply.</p>
  </Card>;
}
