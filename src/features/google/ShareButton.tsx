import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { Button, Field, Input, Modal } from '../../components/ui';
import { useAccount } from '../../services/google/account';
import { sendInvite, type ShareStore } from '../../services/google/invites';
import { useGoogleLogin } from './GoogleCard';

export function ShareButton({ store, id, title }: { store: ShareStore; id: string; title: string }) {
  const { toast } = useApp(); const me = useAccount(); const gl = useGoogleLogin();
  const [open, setOpen] = useState(false); const [to, setTo] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await sendInvite(store, id, to); toast(`Invite sent to ${to.trim()}`); setOpen(false); setTo(''); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return <>
    <Button type="button" onClick={() => setOpen(true)}><Share2 size={15} />Share</Button>
    {open && <Modal title={`Share “${title}”`} onClose={() => setOpen(false)} footer={me ? <><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={busy || !to} onClick={go}>Send invite</Button></> : undefined}>
      {me ? <div className="grid gap-3">
        <Field label="Friend’s Google email" hint="They will see it under Invites after signing in with this email, and can add it to their own planner."><Input type="email" autoFocus value={to} onChange={(x) => setTo(x.target.value)} placeholder="friend@gmail.com" /></Field>
        {err && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{err}</p>}</div>
        : <div className="grid gap-3 text-sm"><p>Sign in with Google to invite friends.</p><Button variant="primary" onClick={() => void gl.login()}>Sign in with Google</Button></div>}
    </Modal>}
  </>;
}
