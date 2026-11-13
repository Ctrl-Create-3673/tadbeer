import { addDoc, collection } from 'firebase/firestore';
import { Angry, CalendarDays, Frown, Heart, Laugh, Lightbulb, Meh, MessageSquareWarning, NotebookPen, Printer, Send, Smile, Bell, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../components/AppContext';
import { Button, Card, Textarea, Input } from '../components/ui';
import { useAccount } from '../services/google/account';
import { fs } from '../services/google/cloud';
import { cx } from '../utils/format';

const MOODS = [[Angry, 'Frustrated'], [Frown, 'Not great'], [Meh, 'Okay'], [Smile, 'Good'], [Laugh, 'Love it']] as const;
const KINDS = [[Heart, 'love', 'I love something', 'What made you smile?'], [Lightbulb, 'idea', 'I have an idea', 'What should Tadbeer do?'], [MessageSquareWarning, 'problem', 'Something is wrong', 'What happened? What did you expect?']] as const;
const AREAS = [[CalendarDays, 'Calendar'], [ListChecks, 'Tasks'], [NotebookPen, 'Notes'], [Bell, 'Reminders'], [Printer, 'PDF planner']] as const;

/** Feedback goes to the owner's cloud database (no third-party form). Write-only: nobody can read it from the app. */
export function FeedbackPage() {
  const acc = useAccount(); const { toast } = useApp();
  const [mood, setMood] = useState(0); const [kind, setKind] = useState('love'); const [used, setUsed] = useState<string[]>([]);
  const [message, setMessage] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const toggle = (a: string) => setUsed((u) => (u.includes(a) ? u.filter((x) => x !== a) : [...u, a]));
  const prompt = KINDS.find((k) => k[1] === kind)![3];

  const send = async () => {
    if (!mood) { toast('Pick a face first. It tells us how Tadbeer feels to you.', 'error'); return; }
    setBusy(true);
    try {
      await addDoc(collection(fs, 'feedback'), { mood, kind, used, message: message.trim().slice(0, 2000), email: (email || acc?.email || '').trim().slice(0, 200), at: new Date().toISOString(), app: 'tadbeer-1.1' });
      setSent(true);
    } catch { toast('Could not send. Check your internet connection and try again.', 'error'); } finally { setBusy(false); }
  };

  if (sent) return <div className="mx-auto grid max-w-xl justify-items-center gap-3 py-16 text-center">
    <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand"><Heart size={28} aria-hidden /></div>
    <h1 className="text-2xl font-semibold">Thank you</h1>
    <p className="text-muted">Your note reached the person building Tadbeer. Good ideas often become the next update.</p>
    <Button onClick={() => { setSent(false); setMood(0); setMessage(''); setUsed([]); }}>Send another</Button>
  </div>;

  return <div className="mx-auto grid max-w-2xl gap-5">
    <header className="rounded-2xl bg-brand-soft p-6">
      <h1 className="text-2xl font-semibold">Help shape Tadbeer</h1>
      <p className="mt-1 text-sm text-muted">Tadbeer grows from what people ask for. One minute, no sign-up needed.</p>
    </header>
    <Card><h2 className="mb-3 font-semibold">How does Tadbeer feel so far?</h2>
      <div className="flex justify-between gap-1 sm:justify-start sm:gap-3" role="group" aria-label="Mood">
        {MOODS.map(([Icon, label], i) => <button key={label} type="button" aria-pressed={mood === i + 1} onClick={() => setMood(i + 1)}
          className={cx('grid min-w-14 justify-items-center gap-1 rounded-xl border px-2 py-2 text-xs transition', mood === i + 1 ? 'border-brand bg-brand text-bg' : 'border-line text-muted hover:bg-brand-soft')}>
          <Icon size={26} aria-hidden />{label}</button>)}
      </div></Card>
    <Card><h2 className="mb-3 font-semibold">What would you like to tell us?</h2>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Type of note">
        {KINDS.map(([Icon, k, label]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
          className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', kind === k ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-brand-soft')}><Icon size={14} aria-hidden />{label}</button>)}
      </div>
      <Textarea rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={prompt} aria-label={prompt} />
      <div className="mt-3"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Which part is this about? (optional)</div>
        <div className="flex flex-wrap gap-2">{AREAS.map(([Icon, a]) => <button key={a} type="button" aria-pressed={used.includes(a)} onClick={() => toggle(a)}
          className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm', used.includes(a) ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-brand-soft')}><Icon size={13} aria-hidden />{a}</button>)}</div></div>
    </Card>
    <Card><h2 className="mb-1 font-semibold">Want a reply?</h2>
      <p className="mb-2 text-sm text-muted">Optional. Leave an email only if you would like an answer.</p>
      <Input type="email" value={email || acc?.email || ''} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email for a reply" /></Card>
    <Button variant="primary" className="justify-self-start rounded-full px-6 py-3" disabled={busy} onClick={send}><Send size={15} />{busy ? 'Sending…' : 'Send my feedback'}</Button>
  </div>;
}
