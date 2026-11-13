/**
 * Central typography config. ONLY the font files in src/assets/fonts/ are used.
 * To add a font: drop the file there and add one entry to FONTS.
 * Coverage flags below come from an audit of the supplied files (cmap check).
 * Where a font lacks a glyph, the UI falls back to the browser's generic sans-serif (visible as a
 * different style) and the PDF exporter REPORTS the missing characters instead of substituting.
 */
import type { FontRole } from '../types';

export interface FontDef {
  id: string; label: string; file: string;
  latin: boolean; westernDigits: boolean; arabic: boolean; arabicIndicDigits: boolean;
  note?: string;
}
export const FONTS: FontDef[] = [
  { id: 'kanz-al-marjaan', label: 'Kanz al-Marjaan', file: 'Kanz-al-Marjaan.ttf', latin: true, westernDigits: true, arabic: true, arabicIndicDigits: true },
  { id: 'kanz-al-yaqoot', label: 'Kanz al-Yaqoot', file: 'Kanz-al-Yaqoot.ttf', latin: true, westernDigits: true, arabic: true, arabicIndicDigits: true, note: 'Marjaan variant with i‘raab marks' },
  { id: 'kanz-al-lulu', label: 'Kanz al-Lulu', file: 'KanzalLulu-Regular.ttf', latin: true, westernDigits: true, arabic: true, arabicIndicDigits: true },
  { id: 'saifee', label: 'Saifee', file: 'Saifee.ttf', latin: true, westernDigits: true, arabic: true, arabicIndicDigits: true },
  { id: 'me-quran', label: 'me_quran', file: 'me_quran-Regular.ttf', latin: false, westernDigits: false, arabic: true, arabicIndicDigits: true, note: 'Quranic font: no English letters or Western digits' },
];
export const ROLE_LABELS: Record<FontRole, string> = {
  ui: 'Interface & English text', arabic: 'Arabic text (month & weekday names)',
  numerals: 'Hijri numerals', writing: 'Writing (notes, tasks, events, PDF user text)',
};
/** Starting assignment — change it in Settings → Fonts. */
export const DEFAULT_ROLES: Record<FontRole, string> = {
  ui: 'kanz-al-marjaan', arabic: 'kanz-al-marjaan', numerals: 'kanz-al-marjaan', writing: 'kanz-al-marjaan',
};

const urls = import.meta.glob('../assets/fonts/*.{ttf,otf,woff,woff2}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
export const fontUrl = (f: FontDef): string | undefined => urls[`../assets/fonts/${f.file}`];
export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];
export const missingFontFiles = () => FONTS.filter((f) => !fontUrl(f));
const family = (id: string) => `"HLP ${id}"`;

export function applyFonts(roles: Record<FontRole, string>) {
  let el = document.getElementById('hlp-fonts') as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = 'hlp-fonts'; document.head.appendChild(el); }
  const faces = FONTS.filter(fontUrl).map((f) => `@font-face{font-family:${family(f.id)};src:url("${fontUrl(f)}");font-display:swap}`).join('\n');
  const vars = (Object.keys(roles) as FontRole[]).map((r) => `--font-${r}:${family(roles[r])},sans-serif;`).join('');
  el.textContent = `${faces}\n:root{${vars}}`;
}
