import { useEffect, useLayoutEffect, useState } from 'react';
import { useSettings } from '../services/storage/settings';
import { Button } from './ui';

interface Step { target?: string; title: string; text: string }
const STEPS: Step[] = [
  { title: 'Welcome to Tadbeer', text: 'A quick tour (about a minute). You can skip it now and replay it any time from Settings.' },
  { target: 'nav-/calendar', title: 'Hijri calendar', text: 'The calendar shows the Hijri date first, with the Gregorian date beside it. Tap a day to see its occasions and add things to it.' },
  { target: 'quick-add', title: 'Add anything fast', text: 'Quick add creates a task, event, note or reminder. Reminders pop up while the app is open, and by email if you sign in with Google.' },
  { target: 'nav-/tasks', title: 'Tasks, events and notes', text: 'Tasks have due dates and priorities. Events can be all-day or timed. Notes keep your longer writing, and you can choose the font you write in.' },
  { title: 'Write in Lisan ud-Dawat', text: 'Type in Lisan ud-Dawat or any Arabic-script text in titles, notes and planner boxes. It flows right to left by itself, and you can pick your writing font (for example Saifee) in Settings → Fonts.' },
  { target: 'search', title: 'Search everything', text: 'Press Ctrl K (or tap here) to find any task, event, note or reminder.' },
  { target: 'google', title: 'Email reminders', text: 'Sign in with Google and your upcoming items go to your own Google Calendar, so Google emails you the reminder.' },
  { target: 'nav-/print', title: 'Print a planner', text: 'Print PDF makes an A4 landscape planner for any Hijri month or the whole year, with your tasks and events on the right days.' },
  { target: 'nav-/settings', title: 'Make it yours', text: 'Settings holds theme, language, numerals, fonts, backup and restore. Your data stays on this device. You can also install Tadbeer as an app.' },
];

const find = (key?: string) => {
  if (!key) return null;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return el; }
  return null;
};

export function Tour() {
  const [s, update] = useSettings();
  const [i, setI] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const done = () => { setI(null); void update({ tourDone: true }); };

  useEffect(() => { if (!s.tourDone) { const t = setTimeout(() => setI(0), 4800); return () => clearTimeout(t); } }, [s.tourDone]);
  useEffect(() => { const f = () => setI(0); window.addEventListener('tadbeer:tour', f); return () => window.removeEventListener('tadbeer:tour', f); }, []);
  useLayoutEffect(() => {
    if (i === null) return;
    const measure = () => { const el = find(STEPS[i].target); if (el) { el.scrollIntoView({ block: 'nearest' }); setRect(el.getBoundingClientRect()); } else setRect(null); };
    measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure);
  }, [i]);
  useEffect(() => { if (i === null) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') done(); if (e.key === 'ArrowRight') setI((n) => Math.min((n ?? 0) + 1, STEPS.length - 1)); if (e.key === 'ArrowLeft') setI((n) => Math.max((n ?? 0) - 1, 0)); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); });
  if (i === null) return null;

  const st = STEPS[i], last = i === STEPS.length - 1, pad = 6;
  const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(340, vw - 24);
  let left = (vw - cw) / 2, top = vh / 2 - 90;
  if (rect) {
    left = Math.min(Math.max(12, rect.left), vw - cw - 12);
    top = rect.bottom + 12 + 190 > vh ? Math.max(12, rect.top - 190 - 12) : rect.bottom + 12;
    if (rect.width > vw * 0.5) top = Math.min(rect.bottom + 12, vh - 200);
  }
  return <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Tour">
    {rect ? <div className="pointer-events-none fixed rounded-xl ring-2 ring-brand transition-all" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad, boxShadow: '0 0 0 9999px rgba(0,0,0,.6)' }} /> : <div className="fixed inset-0 bg-black/60" />}
    <div className="fade-in fixed rounded-2xl border border-line bg-surface p-4 shadow-2xl" style={{ left, top, width: cw }}>
      <div className="mb-1 text-xs text-muted">Step {i + 1} of {STEPS.length}</div>
      <h2 className="text-base font-semibold">{st.title}</h2>
      <p className="mt-1 text-sm text-muted">{st.text}</p>
      <div className="mt-3 flex items-center gap-2">
        <button className="text-sm text-muted underline hover:text-ink" onClick={done}>Skip tour</button>
        <span className="ms-auto flex gap-2">
          {i > 0 && <Button size="sm" onClick={() => setI(i - 1)}>Back</Button>}
          <Button size="sm" variant="primary" onClick={() => (last ? done() : setI(i + 1))}>{last ? 'Done' : 'Next'}</Button>
        </span>
      </div>
    </div>
  </div>;
}
