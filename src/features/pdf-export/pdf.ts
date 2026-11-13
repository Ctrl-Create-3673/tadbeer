import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFHexString, beginText, endText, rgb, setFillingColor, setFontAndSize, setTextMatrix, showText, type PDFFont, type PDFPage } from 'pdf-lib';
import { toArabicDigits, type HijriCalendar } from '../../services/hijri/engine';
import { GREG_MONTH_EN, MONTH_AR, MONTH_EN, WEEKDAY_AR, WEEKDAY_EN } from '../../services/hijri/names';
import { fontById, type FontDef } from '../../styles/fonts.config';
import type { CalEvent, FontRole, Task } from '../../types';
import { WEEKDAY_COLORS } from '../../utils/theme';

export interface PdfOptions {
  cal: HijriCalendar; year: number; month: number | null; // month null = whole year
  includeTasks: boolean; includeEvents: boolean; finalPage: boolean; weekStart: number;
  tasks: Task[]; events: CalEvent[]; fonts: Record<FontRole, string>;
  loadFont: (def: FontDef) => Promise<ArrayBuffer>;
}
export interface PdfResult { bytes: Uint8Array; warnings: string[]; pages: number }

const W = 841.89, H = 595.28, M = 28;
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex('#12142a'), BRAND = hex('#3547d6'), BURG = hex('#d9503a'), GOLD = hex('#7b5cf0'), LINE = hex('#d5d8e8'), SOFT = hex('#f1f2fa'), MUTED = hex('#5c617c');

type Kind = 'latin' | 'arabic' | 'digits';
type Style = Record<Kind, FontRole>;
const S_UI: Style = { latin: 'ui', arabic: 'arabic', digits: 'numerals' };
const S_USER: Style = { latin: 'writing', arabic: 'writing', digits: 'writing' };

const AR_LETTER = '\\u0600-\\u065F\\u066A-\\u06FF\\u0750-\\u077F\\uFB50-\\uFEFF';
const AR_DIGIT = '\\u0660-\\u0669\\u06F0-\\u06F9';
const TOKEN = new RegExp(`([${AR_LETTER}]+(?:[ \\u00A0]+[${AR_LETTER}]+)*)|([${AR_DIGIT}]+)|([^${AR_LETTER}${AR_DIGIT}]+)`, 'g');
const startsRtl = (t: string) => new RegExp(`^[^A-Za-z${AR_LETTER}${AR_DIGIT}]*[${AR_LETTER}${AR_DIGIT}]`).test(t);

/** HarfBuzz font handle + the embedded PDF font. HarfBuzz does the shaping (joins, ligatures, marks), exactly like a browser. */
interface Face { pdf: PDFFont; hb: HbFont; upem: number; def: FontDef }
type HbFont = InstanceType<(typeof import('harfbuzzjs'))['Font']>;
type Token = { text: string; kind: Kind };
interface Run { gid: number; xa: number; xo: number; yo: number }

class Writer {
  warnings = new Set<string>();
  private memo = new Map<string, { runs: Run[]; width: number }>();
  constructor(private hbm: typeof import('harfbuzzjs'), private faces: Map<string, Face>, private fonts: Record<FontRole, string>) {}
  private face(role: FontRole) { return this.faces.get(this.fonts[role])!; }
  private tokens(text: string): Token[] {
    const out: Token[] = [];
    for (const m of text.matchAll(TOKEN)) {
      if (m[1]) out.push({ text: m[1], kind: 'arabic' });
      else if (m[2]) out.push({ text: m[2], kind: 'digits' });
      else for (const part of m[3].split(/(\d+)/)) if (part) out.push({ text: part, kind: /^\d+$/.test(part) ? 'digits' : 'latin' });
    }
    return out;
  }
  /** Shape one run. Characters the font lacks are removed and REPORTED — never silently substituted. */
  private shape(text: string, role: FontRole, dir: 'rtl' | 'ltr'): { runs: Run[]; width: number } {
    const f = this.face(role); const key = `${role}|${dir}|${text}`; const hit = this.memo.get(key); if (hit) return hit;
    let t = text;
    for (let pass = 0; pass < 2; pass++) {
      const buf = new this.hbm.Buffer(); buf.addText(t); buf.setDirection(dir === 'rtl' ? this.hbm.Direction.RTL : this.hbm.Direction.LTR); buf.guessSegmentProperties(); this.hbm.shape(f.hb, buf);
      const infos = buf.getGlyphInfos(), pos = buf.getGlyphPositions();
      const bad = new Set(infos.filter((g) => g.codepoint === 0).map((g) => g.cluster));
      if (bad.size && pass === 0) {
        const chars = [...t]; let u = 0; const drop = new Set<number>();
        chars.forEach((ch, i) => { if (bad.has(u)) { drop.add(i); const cp = ch.codePointAt(0)!; this.warnings.add(`${f.def.label} has no glyph for “${ch}” (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`); } u += ch.length; });
        t = chars.filter((_, i) => !drop.has(i)).join(''); continue;
      }
      const runs = infos.map((g, i) => ({ gid: g.codepoint, xa: pos[i].xAdvance, xo: pos[i].xOffset, yo: pos[i].yOffset }));
      const res = { runs, width: runs.reduce((a, r) => a + r.xa, 0) / f.upem };
      this.memo.set(key, res); return res;
    }
    return { runs: [], width: 0 };
  }
  private tok(t: Token, style: Style) { return this.shape(t.text, style[t.kind], t.kind === 'arabic' ? 'rtl' : 'ltr'); }
  width(text: string, size: number, style: Style = S_UI) { return this.tokens(text).reduce((a, t) => a + this.tok(t, style).width * size, 0); }
  fit(text: string, size: number, max: number, style: Style = S_UI) {
    let t = text;
    while (t.length > 1 && this.width(t, size, style) > max) t = t.slice(0, -1);
    return t === text ? t : t.slice(0, -1) + '…';
  }
  draw(page: PDFPage, text: string, o: { x: number; y: number; size: number; style?: Style; color?: ReturnType<typeof rgb>; align?: 'left' | 'center' | 'right' }) {
    const style = o.style ?? S_UI; const toks = this.tokens(text); const shaped = toks.map((t) => this.tok(t, style));
    const total = shaped.reduce((a, s) => a + s.width * o.size, 0);
    const left = o.align === 'right' ? o.x - total : o.align === 'center' ? o.x - total / 2 : o.x;
    const rtl = startsRtl(text); let cur = rtl ? left + total : left;
    toks.forEach((t, i) => {
      const f = this.face(style[t.kind]); const w = shaped[i].width * o.size; const x0 = rtl ? cur - w : cur;
      const fontKey = page.node.newFontDictionary(f.pdf.name, f.pdf.ref); let gx = x0;
      for (const g of shaped[i].runs) {
        page.pushOperators(beginText(), setFillingColor(o.color ?? INK), setFontAndSize(fontKey, o.size), setTextMatrix(1, 0, 0, 1, gx + (g.xo / f.upem) * o.size, o.y + (g.yo / f.upem) * o.size),
          showText(PDFHexString.of(g.gid.toString(16).padStart(4, '0'))), endText());
        gx += (g.xa / f.upem) * o.size;
      }
      cur = rtl ? x0 : cur + w;
    });
  }
}

const gregCellLabel = (iso: string, first: boolean) => { const [, m, d] = iso.split('-').map(Number); return first || d === 1 ? `${d} ${GREG_MONTH_EN[m - 1].slice(0, 3)}` : String(d); };
const gregSpan = (a: string, b: string) => {
  const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number);
  return y1 === y2 ? (m1 === m2 ? `${GREG_MONTH_EN[m1 - 1]} ${y1}` : `${GREG_MONTH_EN[m1 - 1]} – ${GREG_MONTH_EN[m2 - 1]} ${y1}`) : `${GREG_MONTH_EN[m1 - 1]} ${y1} – ${GREG_MONTH_EN[m2 - 1]} ${y2}`;
};

export async function generatePdf(o: PdfOptions): Promise<PdfResult> {
  const hbm = await import('harfbuzzjs');
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  doc.setTitle(o.month ? `${MONTH_EN[o.month - 1]} ${o.year} H` : `Hijri year ${o.year}`); doc.setCreator('Tadbeer');
  const faces = new Map<string, Face>();
  for (const id of new Set(Object.values(o.fonts))) {
    const def = fontById(id); const buf = await o.loadFont(def); // throws a clear error if the file is missing
    // full embed (not subset): fontkit's subsetter drops glyphs for some of the supplied fonts (e.g. Kanz al-Lulu)
    const face = new hbm.Face(new hbm.Blob(buf));
    faces.set(id, { pdf: await doc.embedFont(buf, { subset: false }), hb: new hbm.Font(face), upem: face.upem, def });
  }
  const w = new Writer(hbm, faces, o.fonts);
  const months: [number, number][] = o.month ? [[o.year, o.month]] : Array.from({ length: 12 }, (_, i) => [o.year, i + 1]);
  const total = months.length + (o.finalPage ? 1 : 0);
  const y = (t: number) => H - t; // top-based coordinate helper

  const footer = (page: PDFPage, label: string, n: number) => {
    const bandW = (W - 2 * M) / 7;
    for (let i = 0; i < 7; i++) page.drawRectangle({ x: M + i * bandW, y: 30, width: bandW, height: 5, color: hex(WEEKDAY_COLORS[i]) });
    w.draw(page, 'Tadbeer', { x: M, y: 16, size: 8, color: MUTED });
    w.draw(page, label, { x: W / 2, y: 16, size: 8, color: MUTED, align: 'center' });
    w.draw(page, `Page ${n} of ${total}`, { x: W - M, y: 16, size: 8, color: MUTED, align: 'right' });
  };

  months.forEach(([yr, mo], pi) => {
    const page = doc.addPage([W, H]); const days = o.cal.monthDays(yr, mo);
    const range = gregSpan(days[0].iso, days[days.length - 1].iso);
    // header
    page.drawRectangle({ x: M, y: y(70), width: 3, height: 40, color: BURG });
    w.draw(page, MONTH_EN[mo - 1], { x: M + 12, y: y(52), size: 24, color: INK });
    w.draw(page, range, { x: M + 12, y: y(68), size: 10, color: MUTED });
    w.draw(page, MONTH_AR[mo - 1], { x: W / 2, y: y(58), size: 30, color: BRAND, align: 'center', style: S_UI });
    page.drawRectangle({ x: W - M - 62, y: y(78), width: 62, height: 50, color: BURG });
    w.draw(page, toArabicDigits(yr), { x: W - M - 31, y: y(58), size: 22, color: rgb(1, 1, 1), align: 'center' });
    w.draw(page, `${yr} H`, { x: W - M - 31, y: y(72), size: 9, color: rgb(1, 1, 1), align: 'center' });
    // weekday header
    const colW = (W - 2 * M) / 7, headTop = 88, headH = 26;
    // blocks first, labels after, so calligraphic glyph overhang is never painted over by the next block
    for (let i = 0; i < 7; i++) page.drawRectangle({ x: M + i * colW, y: y(headTop + headH), width: colW, height: headH, color: hex(WEEKDAY_COLORS[(o.weekStart + i) % 7]) });
    for (let i = 0; i < 7; i++) {
      const wd = (o.weekStart + i) % 7; const x = M + i * colW;
      w.draw(page, WEEKDAY_EN[wd], { x: x + 8, y: y(headTop + 17), size: 10, color: rgb(1, 1, 1) });
      w.draw(page, WEEKDAY_AR[wd], { x: x + colW - 14, y: y(headTop + 17), size: 11.5, color: rgb(1, 1, 1), align: 'right' });
    }
    // grid
    const lead = (days[0].weekday - o.weekStart + 7) % 7; const rows = Math.ceil((lead + days.length) / 7);
    const gridTop = headTop + headH, gridBottom = 46, rowH = (y(gridTop) - gridBottom) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 7; c++) {
      const i = r * 7 + c - lead; const x = M + c * colW, top = y(gridTop) - r * rowH;
      const d = days[i];
      page.drawRectangle({ x, y: top - rowH, width: colW, height: rowH, borderColor: LINE, borderWidth: 0.5, color: d ? undefined : SOFT });
      if (!d) continue;
      const first = i === 0;
      w.draw(page, gregCellLabel(d.iso, first), { x: x + 5, y: top - 12, size: 8, color: MUTED });
      w.draw(page, toArabicDigits(d.day), { x: x + colW - 6, y: top - 20, size: 17, color: d.day === 1 ? BURG : BRAND, align: 'right' });
      // user entries (optional)
      const lines: { text: string; color: ReturnType<typeof rgb> }[] = [];
      if (o.includeEvents) for (const e of o.events) {
        const end = e.endDate ?? e.date;
        if (d.iso >= e.date && d.iso <= end) lines.push({ text: `${e.allDay || d.iso !== e.date ? '' : e.startTime + ' '}${e.title}`, color: hex(e.color) });
      }
      if (o.includeTasks) for (const t of o.tasks) if (t.dueDate === d.iso) lines.push({ text: `${t.status === 'completed' ? '[x]' : '[ ]'} ${t.title}`, color: INK });
      const maxLines = Math.max(0, Math.floor((rowH - 30) / 9.5));
      lines.slice(0, maxLines).forEach((ln, k) => {
        const yy = top - 30 - k * 9.5;
        page.drawRectangle({ x: x + 4, y: yy - 1, width: 2, height: 7.5, color: ln.color });
        w.draw(page, w.fit(ln.text, 7, colW - 16, S_USER), { x: x + 9, y: yy, size: 7, style: S_USER, color: INK });
      });
      if (lines.length > maxLines && maxLines > 0) w.draw(page, `+${lines.length - maxLines} more`, { x: x + 9, y: top - 30 - maxLines * 9.5, size: 6.5, color: MUTED });
    }
    footer(page, `${MONTH_EN[mo - 1]} ${yr} H | ${range}`, pi + 1);
  });

  if (o.finalPage) {
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: M, y: y(62), width: 3, height: 34, color: BURG });
    w.draw(page, 'IMPORTANT NOTES, EVENTS & REMINDERS', { x: M + 12, y: y(52), size: 17, color: INK });
    const colGap = 18, colW = (W - 2 * M - 2 * colGap) / 3;
    ['Notes', 'Events', 'Reminders'].forEach((title, c) => {
      const x = M + c * (colW + colGap);
      page.drawRectangle({ x, y: y(94), width: colW, height: 4, color: hex(WEEKDAY_COLORS[[0, 1, 5][c]]) });
      w.draw(page, title, { x, y: y(110), size: 10, color: MUTED });
      for (let ly = 122; ly < H - 52; ly += 22) page.drawLine({ start: { x, y: y(ly) }, end: { x: x + colW, y: y(ly) }, thickness: 0.4, color: LINE, dashArray: [1.5, 2] });
    });
    footer(page, 'Notes', total);
  }
  const bytes = await doc.save();
  return { bytes, warnings: [...w.warnings], pages: total };
}
