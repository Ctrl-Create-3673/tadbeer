import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useCalendar, useToday } from '../hooks/useCalendar';
import { loadAll, useCollection } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import { applyFonts } from '../styles/fonts.config';
import { MONTH_AR } from '../services/hijri/names';
import { taskState } from '../features/tasks/taskUtils';
import type { CalEvent, Task } from '../types';
import { gregLabel, hijriLabel, weekdayName } from '../utils/format';

declare global { interface Window { tadbeerDesktop?: { openApp(): void; closeWidget(): void } } }
const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties, noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

// Desktop-only mini window (Electron). Transparent so the OS glass/acrylic shows through; follows the system light/dark setting.
export function WidgetPage() {
  const cal = useCalendar(), today = useToday(), [s] = useSettings();
  const tasks = useCollection<Task>('tasks'), events = useCollection<CalEvent>('events');
  const solid = location.hash.includes('solid') || !window.tadbeerDesktop; // OS has no blur material: use an opaque panel
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const set = () => { document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light'; };
    set(); mq.addEventListener('change', set);
    document.body.style.background = 'transparent';
    // The main window writes to IndexedDB; this window has its own memory cache, so re-read it.
    const t = setInterval(() => { void loadAll(); }, 15_000);
    const f = () => { void loadAll(); }; addEventListener('focus', f);
    return () => { mq.removeEventListener('change', set); clearInterval(t); removeEventListener('focus', f); };
  }, []);
  useEffect(() => { applyFonts(s.fonts); }, [s.fonts]);
  const h = cal.fromIso(today);
  const due = tasks.filter((t) => t.status !== 'completed' && (t.dueDate === today || taskState(t, today) === 'overdue')).slice(0, 4);
  const next = events.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).slice(0, 4);
  return <div style={drag} className={`flex h-full select-none flex-col gap-3 overflow-hidden rounded-2xl border border-white/20 p-4 text-ink ${solid ? 'bg-surface' : 'bg-bg/40'}`}>
    <div className="flex items-start justify-between">
      <div><div className="text-xs font-medium uppercase tracking-wide text-muted">{weekdayName(h.weekday, s.language)}</div>
        <div className="text-2xl font-semibold leading-tight">{hijriLabel(h, s)}</div>
        <div className="ar text-brand">{MONTH_AR[h.month - 1]}</div>
        <div className="text-sm text-muted">{gregLabel(today, s)}</div></div>
      <div style={noDrag} className="flex gap-1">
        <button aria-label="Open Tadbeer" title="Open Tadbeer" className="rounded-lg p-1.5 text-muted hover:bg-brand-soft" onClick={() => (window.tadbeerDesktop ? window.tadbeerDesktop.openApp() : window.open(location.pathname, '_blank'))}><ExternalLink size={16} /></button>
        <button aria-label="Close widget" title="Close widget" className="rounded-lg p-1.5 text-muted hover:bg-brand-soft" onClick={() => (window.tadbeerDesktop ? window.tadbeerDesktop.closeWidget() : window.close())}><X size={16} /></button>
      </div>
    </div>
    <Section title="Tasks">{due.length === 0 ? <p className="text-sm text-muted">Nothing due today.</p> : due.map((t) => <li key={t.id} className="writing truncate text-sm">• {t.title}</li>)}</Section>
    <Section title="Upcoming">{next.length === 0 ? <p className="text-sm text-muted">No upcoming events.</p> : next.map((e) => <li key={e.id} className="writing truncate text-sm" style={{ borderInlineStart: `3px solid ${e.color}`, paddingInlineStart: 6 }}>{e.title} <span className="text-xs text-muted">{gregLabel(e.date, s)}{e.startTime ? ` ${e.startTime}` : ''}</span></li>)}</Section>
  </div>;
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <div><h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2><ul className="grid gap-1">{children}</ul></div>;
