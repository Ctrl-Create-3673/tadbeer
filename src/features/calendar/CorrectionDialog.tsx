import { useState } from 'react';
import { useApp } from '../../components/AppContext';
import { Button, Field, Input, Modal } from '../../components/ui';
import { useCalendar } from '../../hooks/useCalendar';
import { calcMonthStart, jdnToIso } from '../../services/hijri/engine';
import { getOne, remove, save } from '../../services/storage/db';
import { useSettings } from '../../services/storage/settings';
import type { Correction } from '../../types';
import { gregLabel, hijriMonthName } from '../../utils/format';

/** Set the officially announced first day of a Hijri month (or remove an earlier correction). */
export function CorrectionDialog({ year, month, onClose }: { year: number; month: number; onClose: () => void }) {
  const cal = useCalendar(); const { toast } = useApp(); const [s] = useSettings();
  const calculated = jdnToIso(calcMonthStart(year, month));
  const existing = getOne<Correction>('corrections', `${year}-${month}`);
  const [start, setStart] = useState(existing?.startIso ?? calculated); const [note, setNote] = useState(existing?.note ?? '');
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (start === calculated) { if (existing) await remove('corrections', existing.id); toast('Back to the calculated date'); return onClose(); }
    const e = cal.validateMonthStart(year, month, start); if (e) return setErr(e);
    await save<Correction>('corrections', { id: `${year}-${month}`, year, month, startIso: start, note });
    toast('Correction saved'); onClose();
  };
  return <Modal title="Correct month start" onClose={onClose} footer={<>
    {existing && <Button variant="danger" className="me-auto" onClick={async () => { await remove('corrections', existing.id); toast('Correction removed'); onClose(); }}>Remove correction</Button>}
    <Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save</Button></>}>
    <div className="grid gap-3 text-sm">
      <p>1 {hijriMonthName(month, s.language)} {year} is <b>calculated</b> to begin on <b>{gregLabel(calculated, s)}</b>. If the official announcement differs, enter the confirmed first day. Following months keep their calculated starts unless corrected too.</p>
      {err && <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-burgundy">{err}</p>}
      <Field label="Confirmed first day (Gregorian)"><Input type="date" value={start} onChange={(e) => { setStart(e.target.value); setErr(null); }} /></Field>
      <Field label="Source / note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} className="writing" /></Field>
    </div></Modal>;
}
