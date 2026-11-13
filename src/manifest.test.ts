import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards installability: every icon the manifest names must exist (a tool once rewrote it with missing icons).
describe('web app manifest', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  it('has existing 192 and 512 icons', () => {
    for (const i of m.icons) expect(existsSync(`public/${i.src}`), i.src).toBe(true);
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  });
});
