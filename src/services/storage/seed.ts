import type { Category } from '../../types';
import { getOne, save } from './db';

/** Note categories requested in the spec. Task/event categories and all events start empty. */
const NOTE_CATEGORIES = [['general', 'General Notes', '#3547d6'], ['meeting', 'Meeting Notes', '#1c8fc9'], ['personal', 'Personal Notes', '#7b5cf0'], ['important', 'Important Notes', '#d9503a']];
export async function seedNoteCategories() {
  let seeded = false;
  try { seeded = !!localStorage.getItem('hlp-seeded'); } catch { /* storage blocked: fall through, ids make this idempotent */ }
  if (seeded) return;
  // fixed ids → a double run (React StrictMode, two tabs) can't create duplicates
  for (const [id, name, color] of NOTE_CATEGORIES) if (!getOne('categories', `seed-note-${id}`)) await save<Category>('categories', { id: `seed-note-${id}`, name, kind: 'note', color });
  try { localStorage.setItem('hlp-seeded', '1'); } catch { /* ignore */ }
}
