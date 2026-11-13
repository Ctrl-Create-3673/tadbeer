import type { BackupFile } from '../types';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const isIso = (s: unknown): s is string => typeof s === 'string' && ISO.test(s) && !Number.isNaN(Date.parse(s));
export const isLocalDateTime = (s: unknown): s is string => typeof s === 'string' && DT.test(s);

/** Returns an error message or null. */
export function validateTask(t: { title: string; dueDate: string | null; reminderAt: string | null }) {
  if (!t.title.trim()) return 'Title is required.';
  if (t.dueDate && !isIso(t.dueDate)) return 'Due date is not valid.';
  if (t.reminderAt && !isLocalDateTime(t.reminderAt)) return 'Reminder time is not valid.';
  return null;
}
export function validateEvent(e: { title: string; date: string; endDate: string | null; allDay: boolean; startTime: string; endTime: string }) {
  if (!e.title.trim()) return 'Title is required.';
  if (!isIso(e.date)) return 'Date is required.';
  if (e.endDate && (!isIso(e.endDate) || e.endDate < e.date)) return 'End date must not be before the start date.';
  if (!e.allDay && e.startTime && e.endTime && (e.endDate ?? e.date) === e.date && e.endTime < e.startTime) return 'End time must not be before the start time.';
  return null;
}
export const validateNote = (n: { title: string; html: string }) => (!n.title.trim() && !n.html.replace(/<[^>]*>/g, '').trim() ? 'A note needs a title or some text.' : null);
export function validateReminder(r: { title: string; at: string; customDays: number; recurrence: string }) {
  if (!r.title.trim()) return 'Title is required.';
  if (!isLocalDateTime(r.at)) return 'Date and time are required.';
  if (r.recurrence === 'custom' && !(r.customDays >= 1)) return 'Custom interval must be at least 1 day.';
  return null;
}

export function parseBackup(text: string): BackupFile {
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  const b = j as BackupFile;
  if (!b || b.app !== 'hijri-life-planner' || b.version !== 1 || typeof b.data !== 'object') throw new Error('This is not a Hijri Life Planner backup.');
  for (const [store, rows] of Object.entries(b.data))
    if (!Array.isArray(rows) || rows.some((r) => !r || typeof r.id !== 'string')) throw new Error(`Backup section "${store}" is malformed.`);
  return b;
}
