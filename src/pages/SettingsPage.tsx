import { Download, Trash2, Upload, Wrench } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../components/AppContext';
import { Badge, Button, Card, Field, Input, Modal, Select } from '../components/ui';
import { CorrectionDialog } from '../features/calendar/CorrectionDialog';
import { MONTH_EN } from '../services/hijri/names';
import { applyImport, clearAll, exportAll, planImport, remove, save, useCollection, type ImportPlan } from '../services/storage/db';
import { useSettings } from '../services/storage/settings';
import { FONTS, ROLE_LABELS, fontById, fontUrl } from '../styles/fonts.config';
import type { BackupFile, Category, Correction, FontRole, Settings } from '../types';
import { download, gregLabel } from '../utils/format';
import { parseBackup } from '../utils/validate';
import { useCalendar, useToday } from '../hooks/useCalendar';
import { Link } from 'react-router-dom';
import { GoogleCard } from '../features/google/GoogleCard';
import { InstallButton } from '../components/InstallButton';

const section = (t: string) => <h2 className="mb-3 text-lg font-semibold">{t}</h2>;

function ImportDialog({ file, plan, onClose }: { file: BackupFile; plan: ImportPlan; onClose: () => void }) {
  const { toast } = useApp(); const [mode, setMode] = useState<'keep' | 'replace'>('keep');
  const run = async () => {
    if (mode === 'replace' && plan.conflicts) download(`hijri-planner-before-import-${Date.now()}.json`, JSON.stringify(exportAll(), null, 2), 'application/json'); // safety copy
    await applyImport(file, mode === 'replace'); toast(`Imported ${plan.added}${mode === 'replace' ? ` and replaced ${plan.conflicts}` : ''} item(s)`); onClose();
  };
  return <Modal title="Import backup" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={run}>Import</Button></>}>
    <div className="grid gap-3 text-sm">
      <p>Backup from {new Date(file.exportedAt).toLocaleString()} contains <b>{plan.added}</b> new item(s), <b>{plan.identical}</b> identical, and <b>{plan.conflicts}</b> that differ from what you have now.</p>
      {plan.unknownStores.length > 0 && <p className="text-burgundy">Ignoring unknown sections: {plan.unknownStores.join(', ')}</p>}
      <label className="flex gap-2"><input type="radio" checked={mode === 'keep'} onChange={() => setMode('keep')} /><span><b>Add new items only</b> — your existing items stay exactly as they are.</span></label>
      <label className="flex gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /><span><b>Add new and replace the {plan.conflicts} differing item(s)</b> — a copy of your current data downloads first.</span></label>
    </div></Modal>;
}

export function SettingsPage() {
  const [s, update] = useSettings(); const { toast, confirm } = useApp(); const cal = useCalendar(); const today = useToday();
  const cats = useCollection<Category>('categories'); const corrections = useCollection<Correction>('corrections');
  const fileRef = useRef<HTMLInputElement>(null); const [imp, setImp] = useState<{ file: BackupFile; plan: ImportPlan } | null>(null);
  const [fix, setFix] = useState<{ year: number; month: number } | null>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update({ [k]: v } as Partial<Settings>);
  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [s.timezone];
  const h = cal.fromIso(today);
  const onFile = async (f?: File) => {
    if (!f) return;
    try { const b = parseBackup(await f.text()); setImp({ file: b, plan: planImport(b) }); } catch (e) { toast((e as Error).message, 'error'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const wipe = async () => {
    if (!(await confirm({ title: 'Delete ALL data?', message: 'This permanently deletes every task, event, note, reminder, category, correction and planner entry on this device. It cannot be undone. Export a backup first if unsure.', confirmLabel: 'Delete everything', danger: true }))) return;
    await clearAll(); try { localStorage.removeItem('hlp-seeded'); } catch { /* ignore */ } toast('All data cleared');
  };
  const notif = async (on: boolean) => {
    if (on && 'Notification' in window && Notification.permission === 'default') { const p = await Notification.requestPermission(); if (p !== 'granted') return toast('Permission was not granted.', 'error'); }
    if (on && 'Notification' in window && Notification.permission === 'denied') return toast('Notifications are blocked in your browser’s site settings.', 'error');
    set('notifications', on);
  };
  return <div className="mx-auto grid max-w-3xl gap-4">
    <h1 className="text-2xl font-semibold">Settings</h1>
    <GoogleCard />
    <Card>{section('General')}<div className="grid gap-3 sm:grid-cols-2">
      <Field label="Language"><Select value={s.language} onChange={(e) => set('language', e.target.value as Settings['language'])}><option value="en">English</option><option value="ar">العربية (names &amp; right-to-left layout)</option></Select></Field>
      <Field label="Theme"><Select value={s.theme} onChange={(e) => set('theme', e.target.value as Settings['theme'])}><option value="light">Light</option><option value="dark">Dark</option></Select></Field>
      <Field label="Calendar display"><Select value={s.calendarDisplay} onChange={(e) => set('calendarDisplay', e.target.value as Settings['calendarDisplay'])}><option value="hijri-first">Hijri first</option><option value="gregorian-first">Gregorian first</option></Select></Field>
      <Field label="Numerals"><Select value={s.numerals} onChange={(e) => set('numerals', e.target.value as Settings['numerals'])}><option value="arabic">Arabic (١٢٣)</option><option value="western">Western (123)</option></Select></Field>
      <Field label="First day of the week"><Select value={s.weekStart} onChange={(e) => set('weekStart', +e.target.value)}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}</Select></Field>
      <Field label="Default calendar view"><Select value={s.defaultView} onChange={(e) => set('defaultView', e.target.value as Settings['defaultView'])}><option value="month">Month</option><option value="year">Year</option><option value="week">Week</option><option value="day">Day</option></Select></Field>
      <Field label="Timezone" hint="Used for “today” and reminder times."><Select value={s.timezone} onChange={(e) => set('timezone', e.target.value)}>{zones.map((z) => <option key={z}>{z}</option>)}</Select></Field>
      <Field label="Notifications"><label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" checked={s.notifications} onChange={(e) => notif(e.target.checked)} />Show browser notifications for due reminders</label></Field>
      <Field label="Occasions"><label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" checked={s.showOccasions} onChange={(e) => set('showOccasions', e.target.checked)} />Show built-in occasions on the calendar and in PDFs</label></Field>
      <Field label="App and help"><div className="flex flex-wrap items-center gap-2"><InstallButton /><Button onClick={() => window.dispatchEvent(new Event('tadbeer:tour'))}>Take the tour</Button></div></Field>
    </div><p className="mt-2 text-xs text-muted">Notifications work only while the app is open (see <Link className="underline" to="/reminders">Reminders</Link>).</p></Card>

    <Card>{section('Fonts')}
      <p className="mb-3 text-sm text-muted">Only the font files in <code>src/assets/fonts/</code> are used. Pick which one each part of the app uses — including the font you write with.</p>
      <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(ROLE_LABELS) as FontRole[]).map((r) => { const f = fontById(s.fonts[r]); return <Field key={r} label={ROLE_LABELS[r]}>
        <Select value={s.fonts[r]} onChange={(e) => set('fonts', { ...s.fonts, [r]: e.target.value })}>{FONTS.map((x) => <option key={x.id} value={x.id}>{x.label}{fontUrl(x) ? '' : ' (file missing)'}</option>)}</Select>
        <div className="mt-1 flex flex-wrap gap-1"><Badge color={f.latin ? undefined : 'var(--burgundy)'}>{f.latin ? 'English ✓' : 'No English letters'}</Badge><Badge color={f.westernDigits ? undefined : 'var(--burgundy)'}>{f.westernDigits ? '123 ✓' : 'No 123'}</Badge><Badge>{f.arabic ? 'Arabic ✓' : 'No Arabic'}</Badge></div></Field>; })}</div>
      <div className="mt-4 grid gap-2">{FONTS.map((f) => <div key={f.id} className="rounded-lg border border-line p-2"><div className="text-xs text-muted">{f.label}{f.note ? ` — ${f.note}` : ''}</div>
        <div style={{ fontFamily: `"HLP ${f.id}", sans-serif` }} className="flex flex-wrap items-baseline justify-between gap-4 text-xl"><span>Moharram 1448 Monday</span><span dir="rtl">شهر محرم الحرام ١٤٤٨</span></div></div>)}</div></Card>

    <Card>{section('Hijri date correction')}
      <p className="mb-3 text-sm text-muted">Dates are calculated with the Mumineen (Fatimid tabular) calendar. If an officially announced month start differs, correct it here or from the calendar header; those days then show as “Confirmed”.</p>
      <div className="mb-3 flex flex-wrap items-end gap-2"><Button onClick={() => setFix({ year: h.year, month: h.month })}><Wrench size={14} />Correct current month ({MONTH_EN[h.month - 1]})</Button></div>
      {corrections.length === 0 ? <p className="text-sm text-muted">No corrections — every date is calculated.</p> :
        <ul className="grid gap-1.5">{[...corrections].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)).map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
          <span>1 {MONTH_EN[c.month - 1]} {c.year} → {gregLabel(c.startIso, s)}{c.note && <span className="writing text-muted"> · {c.note}</span>}</span>
          <span className="flex gap-1"><Button size="sm" onClick={() => setFix({ year: c.year, month: c.month })}>Edit</Button><Button size="sm" variant="danger" onClick={() => remove('corrections', c.id)}>Remove</Button></span></li>)}</ul>}</Card>

    <Card>{section('Categories')}<p className="mb-3 text-sm text-muted">Create categories while adding a task, event or note. Rename, recolour or delete them here.</p>
      {cats.length === 0 ? <p className="text-sm text-muted">No categories yet.</p> : <ul className="grid gap-1.5">{[...cats].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)).map((c) => <li key={c.id} className="flex items-center gap-2">
        <input type="color" aria-label={`Colour of ${c.name}`} value={c.color} onChange={(e) => save<Category>('categories', { ...c, color: e.target.value })} className="h-8 w-8 rounded border border-line bg-transparent" />
        <Input defaultValue={c.name} aria-label="Category name" className="writing flex-1" onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && save<Category>('categories', { ...c, name: e.target.value.trim() })} />
        <Badge>{c.kind}</Badge>
        <Button size="sm" variant="danger" aria-label={`Delete ${c.name}`} onClick={async () => { if (await confirm({ title: 'Delete category?', message: `“${c.name}” will be removed; items using it become uncategorised.`, confirmLabel: 'Delete', danger: true })) remove('categories', c.id); }}><Trash2 size={14} /></Button></li>)}</ul>}</Card>

    <Card>{section('Your data')}
      <p className="mb-3 text-sm text-muted">Everything is stored in this browser (IndexedDB) and persists after you close it. Clearing site data removes it — export backups regularly.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { download(`hijri-planner-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportAll(), null, 2), 'application/json'); toast('Backup downloaded'); }}><Download size={14} />Export JSON</Button>
        <Button onClick={() => fileRef.current?.click()}><Upload size={14} />Import / restore JSON</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="danger" onClick={wipe}><Trash2 size={14} />Clear all data</Button></div></Card>

    <Card className="text-sm text-muted"><b className="text-ink">About the calendar</b><p className="mt-1">Hijri dates use the Mumineen calendar’s arithmetic rules (adapted from mygulamali/mumineen_calendar_js, MIT licence). This is not Umm al-Qura and can differ from it by a day or more.</p></Card>
    {imp && <ImportDialog file={imp.file} plan={imp.plan} onClose={() => setImp(null)} />}
    {fix && <CorrectionDialog year={fix.year} month={fix.month} onClose={() => setFix(null)} />}
  </div>;
}
