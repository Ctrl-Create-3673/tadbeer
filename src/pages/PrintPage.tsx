import { FileDown, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../components/AppContext';
import { Button, Card, Field, Input, Select } from '../components/ui';
import { useCalendar, useToday } from '../hooks/useCalendar';
import { MONTH_EN } from '../services/hijri/names';
import { getAll } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import { fontUrl } from '../styles/fonts.config';
import type { CalEvent, Task } from '../types';
import { download } from '../utils/format';

export function PrintPage() {
  const cal = useCalendar(); const today = useToday(); const [s] = useSettings(); const { toast } = useApp();
  const h = cal.fromIso(today);
  const [scope, setScope] = useState<'month' | 'year'>('month'); const [year, setYear] = useState(h.year); const [month, setMonth] = useState(h.month);
  const [content, setContent] = useState<'blank' | 'tasks' | 'events' | 'both'>('blank'); const [finalPage, setFinalPage] = useState(true);
  const [busy, setBusy] = useState(false); const [warnings, setWarnings] = useState<string[]>([]);
  const go = async () => {
    setBusy(true); setWarnings([]);
    try {
      const { generatePdf } = await import('../features/pdf-export/pdf');
      const r = await generatePdf({
        cal, year, month: scope === 'month' ? month : null, finalPage, weekStart: s.weekStart, fonts: s.fonts,
        includeTasks: content === 'tasks' || content === 'both', includeEvents: content === 'events' || content === 'both',
        tasks: getAll<Task>('tasks'), events: getAll<CalEvent>('events'),
        loadFont: async (def) => { const u = fontUrl(def); if (!u) throw new Error(`Font file “${def.file}” is missing from src/assets/fonts/.`); return (await fetch(u)).arrayBuffer(); },
      });
      download(scope === 'month' ? `hijri-${year}-${String(month).padStart(2, '0')}.pdf` : `hijri-${year}-full-year.pdf`, r.bytes as BlobPart, 'application/pdf');
      setWarnings(r.warnings); toast(`PDF ready — ${r.pages} page${r.pages > 1 ? 's' : ''}`);
    } catch (e) { toast(`Could not create the PDF: ${(e as Error).message}`, 'error'); } finally { setBusy(false); }
  };
  return <div className="mx-auto grid max-w-2xl gap-4">
    <h1 className="text-2xl font-semibold">Printable calendar PDF</h1>
    <Card className="grid gap-4">
      <p className="text-sm text-muted">A4 landscape, one Hijri month per page, built from your calendar data (not a screenshot) using your supplied fonts, embedded in full.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Range"><Select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="month">One month</option><option value="year">Full Hijri year (12 pages)</option></Select></Field>
        <Field label="Hijri year"><Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} /></Field>
        {scope === 'month' && <Field label="Month"><Select value={month} onChange={(e) => setMonth(+e.target.value)}>{MONTH_EN.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>}
      </div>
      <Field label="Contents"><Select value={content} onChange={(e) => setContent(e.target.value as typeof content)}>
        <option value="blank">Blank calendar</option><option value="tasks">With my tasks</option><option value="events">With my events</option><option value="both">With tasks and events</option></Select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={finalPage} onChange={(e) => setFinalPage(e.target.checked)} />Add “Important Notes, Events & Reminders” page</label>
      <Button variant="primary" disabled={busy || !(year >= 1)} onClick={go}><FileDown size={16} />{busy ? 'Creating PDF…' : 'Download PDF'}</Button>
    </Card>
    {warnings.length > 0 && <Card className="border-burgundy"><div className="flex items-center gap-2 font-semibold text-burgundy"><TriangleAlert size={16} />Characters your chosen fonts cannot draw</div>
      <p className="mt-1 text-sm">These were left out of the PDF (no other font was substituted). Pick a different font for that role in Settings → Fonts.</p>
      <ul className="mt-2 list-disc ps-5 text-sm">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></Card>}
  </div>;
}
