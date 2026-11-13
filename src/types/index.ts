export interface Base { id: string; createdAt: string; updatedAt: string }
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed'; // "overdue" is derived from dueDate
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface Task extends Base {
  title: string; description: string; priority: Priority; status: TaskStatus;
  dueDate: string | null; // ISO yyyy-mm-dd (Gregorian); Hijri is derived
  categoryId: string | null; tags: string[]; checklist: ChecklistItem[]; // subtasks / checklist items
  reminderAt: string | null; // local wall-clock yyyy-mm-ddThh:mm; mirrored into a linked Reminder
  completedAt: string | null;
}
export interface CalEvent extends Base {
  title: string; description: string; date: string; endDate: string | null; allDay: boolean;
  startTime: string; endTime: string; location: string; categoryId: string | null; color: string;
  reminderMinutes: number | null; // minutes before start; mirrored into a linked Reminder
}
export interface Note extends Base {
  title: string; html: string; categoryId: string | null; tags: string[];
  pinned: boolean; archived: boolean; date: string | null;
}
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export interface Reminder extends Base {
  title: string; at: string; // local wall-clock in settings.timezone, yyyy-mm-ddThh:mm
  recurrence: Recurrence; customDays: number; basis: 'gregorian' | 'hijri';
  linkedType: 'task' | 'event' | null; linkedId: string | null;
  completed: boolean; lastFiredAt: string | null;
}
export type CategoryKind = 'task' | 'event' | 'note';
export interface Category extends Base { name: string; kind: CategoryKind; color: string }
/** Officially announced start of a Hijri month. id = `${year}-${month}`. */
export interface Correction extends Base { year: number; month: number; startIso: string; note: string }
/** Free-writing space: id `day:<iso>` or `year:<hijriYear>`. */
export interface PlannerDoc extends Base { text: string; important: boolean }

export type FontRole = 'ui' | 'arabic' | 'numerals' | 'writing';
export interface GoogleSettings {
  clientId: string; autoSync: boolean; emailAll: boolean; defaultTime: string; // hh:mm for items without their own time
  email: string; name: string; lastSync: string;
}
export interface Settings extends Base {
  google: GoogleSettings;
  language: 'en' | 'ar'; numerals: 'arabic' | 'western'; calendarDisplay: 'hijri-first' | 'gregorian-first';
  weekStart: number; timezone: string; defaultView: 'month' | 'year' | 'week' | 'day';
  notifications: boolean; theme: 'light' | 'dark'; fonts: Record<FontRole, string>;
}
export interface BackupFile {
  app: 'hijri-life-planner'; version: 1; exportedAt: string;
  data: Record<string, Base[]>;
}
