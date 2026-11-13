import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCalendar } from '../../services/hijri/engine';
import type { CalEvent, Reminder, Task } from '../../types';
import { defaultSettings } from '../../services/storage/settings';
import { buildEvents } from './mapping';

const settings = { ...defaultSettings(), timezone: 'Asia/Kolkata' };
const cal = createCalendar(); const now = '2026-11-13T10:00';
const task = (o: Partial<Task>) => ({ id: 't1', title: 'Pay bill', description: '', priority: 'high', status: 'pending', dueDate: '2026-11-20', categoryId: null, tags: [], checklist: [{ id: 'c', text: 'step', done: false }], reminderAt: null, completedAt: null, ...o }) as Task;
const event = (o: Partial<CalEvent>) => ({ id: 'e1', title: 'Dinner', description: '', date: '2026-11-21', endDate: null, allDay: false, startTime: '19:00', endTime: '21:00', location: 'Home', categoryId: null, color: '#000', reminderMinutes: 60, ...o }) as CalEvent;
const rem = (o: Partial<Reminder>) => ({ id: 'r1', title: 'Call', at: '2026-11-22T08:00', recurrence: 'none', customDays: 1, basis: 'gregorian', linkedType: null, linkedId: null, completed: false, lastFiredAt: null, ...o }) as Reminder;
const build = (o: Partial<Parameters<typeof buildEvents>[0]>) => buildEvents({ tasks: [], events: [], reminders: [], cal, settings, now, ...o });

describe('Google Calendar mapping', () => {
  it('puts a task at the default time with an email reminder and Hijri date in the description', () => {
    const [e] = [...build({ tasks: [task({})] }).values()];
    expect(e.summary).toBe('Task: Pay bill'); expect(e.start).toEqual({ dateTime: '2026-11-20T09:00:00', timeZone: 'Asia/Kolkata' });
    expect(e.reminders.overrides).toContainEqual({ method: 'email', minutes: 0 });
    expect(e.description).toMatch(/Jumada al-Ukhra 1448/); expect(e.description).toContain('[ ] step');
  });
  it('uses the task reminder time, and skips completed / past / no-date tasks', () => {
    expect([...build({ tasks: [task({ reminderAt: '2026-11-19T07:30' })] }).values()][0].start.dateTime).toBe('2026-11-19T07:30:00');
    expect(build({ tasks: [task({ status: 'completed' }), task({ id: 'x', dueDate: '2026-11-01' }), task({ id: 'y', dueDate: null })] }).size).toBe(0);
  });
  it('maps timed events with their reminder lead time; only emailAll controls events without a reminder', () => {
    const [e] = [...build({ events: [event({})] }).values()];
    expect(e.start.dateTime).toBe('2026-11-21T19:00:00'); expect(e.end.dateTime).toBe('2026-11-21T21:00:00'); expect(e.location).toBe('Home');
    expect(e.reminders.overrides[0]).toEqual({ method: 'email', minutes: 60 });
    const off = { ...settings, google: { ...settings.google, emailAll: false } };
    expect(buildEvents({ tasks: [], events: [event({ reminderMinutes: null })], reminders: [], cal, settings: off, now }).size).toBe(0);
    expect(build({ events: [event({ reminderMinutes: null })] }).size).toBe(1);
  });
  it('multi-day all-day events stay all-day spans', () => {
    const [e] = [...build({ events: [event({ allDay: true, endDate: '2026-11-23' })] }).values()];
    expect(e.start).toEqual({ date: '2026-11-21' }); expect(e.end).toEqual({ date: '2026-11-24' });
  });
  it('maps reminders: recurrence rules, skips linked/completed/past, Hijri-basis repeats sync once', () => {
    const r = (o: Partial<Reminder>) => [...build({ reminders: [rem(o)] }).values()][0];
    expect(r({ recurrence: 'weekly' }).recurrence).toEqual(['RRULE:FREQ=WEEKLY']);
    expect(r({ recurrence: 'custom', customDays: 3 }).recurrence).toEqual(['RRULE:FREQ=DAILY;INTERVAL=3']);
    expect(r({ recurrence: 'yearly', basis: 'hijri' }).recurrence).toBeUndefined();
    expect(build({ reminders: [rem({ linkedType: 'task', linkedId: 't1' }), rem({ id: 'b', completed: true }), rem({ id: 'c', at: '2026-11-01T08:00' })] }).size).toBe(0);
    expect(r({ at: '2026-11-01T08:00', recurrence: 'daily' })).toBeTruthy(); // past start but repeating
  });
  it('ids are valid Google ids (a-v0-9) and the hash changes with content', () => {
    const a = [...build({ tasks: [task({ id: 'new-task-1' })] }).values()][0], b = [...build({ tasks: [task({ id: 'new-task-1', title: 'Other' })] }).values()][0];
    expect(a.id).toMatch(/^[a-v0-9]{5,}$/); expect(a.extendedProperties.private.hlpHash).not.toBe(b.extendedProperties.private.hlpHash);
  });
});

// ---- sync against a fake calendar ----
const store = { tasks: [] as Task[], events: [] as CalEvent[], reminders: [] as Reminder[] };
const remote = new Map<string, Record<string, any>>(); const calls: string[] = []; let tombstones = new Set<string>();
vi.mock('../../services/storage/db', () => ({ getAll: (n: string) => (store as any)[n] ?? [], save: async () => undefined, getOne: () => undefined }));
vi.mock('../../services/google/google', () => ({
  calendar: async (path: string, init: RequestInit = {}) => {
    const m = init.method ?? 'GET'; calls.push(`${m} ${path.split('?')[0]}`);
    if (m === 'GET') return { items: [...remote.entries()].map(([id, e]) => ({ id, extendedProperties: e.extendedProperties })) };
    const body = init.body ? JSON.parse(init.body as string) : null;
    if (m === 'POST') { if (remote.has(body.id) || tombstones.has(body.id)) throw Object.assign(new Error('exists'), { status: 409 }); remote.set(body.id, body); return body; }
    const id = path.split('/').pop()!;
    if (m === 'PUT') { remote.set(id, body); tombstones.delete(id); return body; }
    if (m === 'DELETE') { if (!remote.delete(id)) throw Object.assign(new Error('gone'), { status: 410 }); return null; }
  },
}));

describe('syncToGoogle', () => {
  beforeEach(() => { remote.clear(); calls.length = 0; tombstones = new Set(); store.tasks = []; store.events = []; store.reminders = []; });
  it('creates, skips unchanged, updates, and removes only what it created', async () => {
    const { syncToGoogle } = await import('./sync');
    const future = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
    store.tasks = [task({ id: 'a', dueDate: future(3) }), task({ id: 'b', dueDate: future(4) })];
    expect(await syncToGoogle()).toEqual({ created: 2, updated: 0, removed: 0, unchanged: 0 });
    expect(await syncToGoogle()).toEqual({ created: 0, updated: 0, removed: 0, unchanged: 2 });
    store.tasks = [task({ id: 'a', dueDate: future(3), title: 'Renamed' })]; // b deleted locally
    expect(await syncToGoogle()).toEqual({ created: 0, updated: 1, removed: 1, unchanged: 0 });
    expect(remote.size).toBe(1);
  });
  it('recovers from a 409 on an id that was deleted earlier', async () => {
    const { syncToGoogle } = await import('./sync');
    store.tasks = [task({ id: 'z', dueDate: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) })];
    const { buildEvents: be } = await import('./mapping'); // find the id the sync will use
    const id = [...be({ tasks: store.tasks, events: [], reminders: [], cal, settings: defaultSettings(), now: '2000-01-01T00:00' }).keys()][0];
    tombstones.add(id);
    expect((await syncToGoogle()).created).toBe(1); expect(remote.has(id)).toBe(true);
  });
});
