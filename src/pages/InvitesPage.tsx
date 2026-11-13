import { Check, Mail, Trash2, Users, X } from 'lucide-react';
import { useApp } from '../components/AppContext';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { useGoogleLogin } from '../features/google/GoogleCard';
import { useAccount } from '../services/google/account';
import { answerInvite, deleteInvite, useInvites, type Invite } from '../services/google/invites';

const what = (i: Invite) => { const x = JSON.parse(i.json) as { title: string; date?: string; dueDate?: string | null }; return { title: x.title, when: x.date ?? x.dueDate ?? '' }; };
const APP = 'https://ctrl-create-3673.github.io/tadbeer/';

export function InvitesPage() {
  const me = useAccount(); const gl = useGoogleLogin(); const { incoming, sent, error } = useInvites(); const { toast } = useApp();
  const run = (f: () => Promise<unknown>, ok: string) => f().then(() => toast(ok), (e) => toast((e as Error).message, 'error'));
  if (!me) return <div className="mx-auto max-w-xl"><EmptyState icon={<Users size={32} />} title="Collaborate with friends" hint="Sign in with Google to share events and tasks with colleagues and receive theirs." action={<Button variant="primary" onClick={() => void gl.login()}>Sign in with Google</Button>} /></div>;
  const kind = (i: Invite) => (i.store === 'events' ? 'Event' : 'Task');
  return <div className="mx-auto grid max-w-3xl gap-6">
    <h1 className="text-2xl font-semibold">Invites</h1>
    {error && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{error}</p>}
    <section className="grid gap-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Received</h2>
      {incoming.length === 0 ? <p className="text-sm text-muted">Nothing yet. Ask a friend to share an event or task with {me.email}.</p>
        : incoming.map((i) => { const w = what(i); return <Card key={i.id} className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><div className="writing font-medium">{w.title}</div><div className="text-xs text-muted">{kind(i)}{w.when && ` · ${w.when}`} · from {i.fromName || i.fromEmail}</div></div>
          {i.status === 'pending' ? <><Button variant="primary" size="sm" onClick={() => run(() => answerInvite(i, true), 'Added to your planner')}><Check size={14} />Accept</Button>
            <Button size="sm" onClick={() => run(() => answerInvite(i, false), 'Declined')}><X size={14} />Decline</Button></>
            : <><Badge color={i.status === 'accepted' ? 'var(--brand)' : undefined}>{i.status}</Badge><Button size="sm" aria-label="Remove" onClick={() => run(() => deleteInvite(i.id), 'Removed')}><Trash2 size={14} /></Button></>}</Card>; })}</section>
    <section className="grid gap-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sent</h2>
      {sent.length === 0 ? <p className="text-sm text-muted">Open any event or task and press Share.</p>
        : sent.map((i) => { const w = what(i); const mail = `mailto:${i.toEmail}?subject=${encodeURIComponent(`${w.title} (shared on Tadbeer)`)}&body=${encodeURIComponent(`I shared "${w.title}" with you. Sign in with this email to accept it: ${APP}`)}`;
          return <Card key={i.id} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1"><div className="writing font-medium">{w.title}</div><div className="text-xs text-muted">{kind(i)} · to {i.toEmail}</div></div>
            <Badge color={i.status === 'accepted' ? 'var(--brand)' : undefined}>{i.status}</Badge>
            {i.status === 'pending' && <a href={mail} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-brand-soft"><Mail size={14} />Tell them</a>}
            <Button size="sm" aria-label="Delete invite" onClick={() => run(() => deleteInvite(i.id), 'Removed')}><Trash2 size={14} /></Button></Card>; })}</section>
  </div>;
}
