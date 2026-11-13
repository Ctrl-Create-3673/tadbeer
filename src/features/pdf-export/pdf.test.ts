import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createCalendar } from '../../services/hijri/engine';
import { FONTS, DEFAULT_ROLES } from '../../styles/fonts.config';
import type { CalEvent, Task } from '../../types';
import { generatePdf, type PdfOptions } from './pdf';

const fontsPresent = FONTS.filter((f) => f.id !== 'me-quran').every((f) => existsSync(`src/assets/fonts/${f.file}`));
const base = (over: Partial<PdfOptions> = {}): PdfOptions => ({
  cal: createCalendar(), year: 1448, month: 1, includeTasks: false, includeEvents: false, finalPage: true, weekStart: 0, tasks: [], events: [],
  fonts: { ...DEFAULT_ROLES }, loadFont: async (d) => { const b = readFileSync(`src/assets/fonts/${d.file}`); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; }, ...over,
});

describe.skipIf(!fontsPresent)('PDF export (needs the supplied fonts in src/assets/fonts)', () => {
  it('creates an A4-landscape month page plus the notes page', async () => {
    const r = await generatePdf(base());
    const doc = await PDFDocument.load(r.bytes);
    expect(doc.getPageCount()).toBe(2);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(841.89, 1); expect(height).toBeCloseTo(595.28, 1);
    expect(r.warnings).toEqual([]);
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, r.bytes);
  });
  it('full year = 12 pages + notes page, with user events/tasks drawn', async () => {
    const ev = { id: 'e', title: 'Family dinner عشاء', date: '2026-06-20', endDate: null, allDay: false, startTime: '19:00', endTime: '21:00', color: '#7a2e3b' } as CalEvent;
    const t = { id: 't', title: 'Task one', dueDate: '2026-06-20', status: 'pending' } as Task;
    const r = await generatePdf(base({ month: null, includeEvents: true, includeTasks: true, events: [ev], tasks: [t] }));
    expect((await PDFDocument.load(r.bytes)).getPageCount()).toBe(13);
    if (process.env.PDF_OUT_YEAR) writeFileSync(process.env.PDF_OUT_YEAR, r.bytes);
  });
  it('reports (not substitutes) characters a font cannot draw', async () => {
    const r = await generatePdf(base({ includeTasks: true, tasks: [{ id: 't', title: 'Hello', dueDate: '2026-06-20', status: 'pending' } as Task], fonts: { ...DEFAULT_ROLES, writing: 'me-quran' } }));
    expect(r.warnings.join('\n')).toContain('me_quran');
  });
});
