import { openDB, type IDBPDatabase } from 'idb';
import { useSyncExternalStore } from 'react';
import type { BackupFile, Base } from '../../types';
import { nowIso, uid } from '../../utils/ids';

/**
 * Persistence: IndexedDB, with an in-memory cache so the UI reads synchronously.
 * Everything goes through this file, so a cloud-sync adapter can replace it later.
 */
export const STORES = ['tasks', 'events', 'notes', 'reminders', 'categories', 'corrections', 'planner', 'settings'] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBPDatabase> | null = null;
const getDb = () => (dbp ??= openDB('hijri-life-planner', 1, { upgrade(db) { for (const s of STORES) db.createObjectStore(s, { keyPath: 'id' }); } }));

const cache = new Map<StoreName, Map<string, Base>>(STORES.map((s) => [s, new Map()]));
const snapshots = new Map<StoreName, Base[]>();
const listeners = new Set<() => void>();
const emit = (name: StoreName) => { snapshots.delete(name); listeners.forEach((l) => l()); };

export async function loadAll() {
  const db = await getDb();
  for (const s of STORES) {
    const m = cache.get(s)!; m.clear();
    for (const r of (await db.getAll(s)) as Base[]) m.set(r.id, r);
    emit(s);
  }
  // ask the browser not to evict our data under storage pressure (best effort)
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
}

export function getAll<T extends Base>(name: StoreName): T[] {
  let s = snapshots.get(name);
  if (!s) { s = [...cache.get(name)!.values()]; snapshots.set(name, s); }
  return s as T[];
}
export const getOne = <T extends Base>(name: StoreName, id: string) => cache.get(name)!.get(id) as T | undefined;

/** Create or update. New records get id + createdAt; every save refreshes updatedAt. */
export async function save<T extends Base>(name: StoreName, item: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Base>): Promise<T> {
  const existing = item.id ? cache.get(name)!.get(item.id) : undefined;
  const row = { ...item, id: item.id ?? uid(), createdAt: existing?.createdAt ?? item.createdAt ?? nowIso(), updatedAt: nowIso() } as T;
  await (await getDb()).put(name, row);
  cache.get(name)!.set(row.id, row); emit(name);
  return row;
}
export async function remove(name: StoreName, id: string) {
  await (await getDb()).delete(name, id);
  cache.get(name)!.delete(id); emit(name);
}

export function useCollection<T extends Base>(name: StoreName): T[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => getAll<T>(name)) as T[];
}

// ---------- backup / restore ----------
export function exportAll(): BackupFile {
  return { app: 'hijri-life-planner', version: 1, exportedAt: nowIso(), data: Object.fromEntries(STORES.map((s) => [s, getAll(s)])) };
}
export interface ImportPlan { added: number; identical: number; conflicts: number; unknownStores: string[] }
export function planImport(b: BackupFile): ImportPlan {
  const p: ImportPlan = { added: 0, identical: 0, conflicts: 0, unknownStores: Object.keys(b.data).filter((k) => !(STORES as readonly string[]).includes(k)) };
  for (const s of STORES) for (const r of b.data[s] ?? []) {
    const cur = cache.get(s)!.get(r.id);
    if (!cur) p.added++; else if (JSON.stringify(cur) === JSON.stringify(r)) p.identical++; else p.conflicts++;
  }
  return p;
}
/** Never overwrites silently: callers show planImport() first and choose whether conflicts are replaced. */
export async function applyImport(b: BackupFile, replaceConflicts: boolean) {
  const db = await getDb();
  for (const s of STORES) {
    for (const r of b.data[s] ?? []) {
      const cur = cache.get(s)!.get(r.id);
      if (cur && !replaceConflicts) continue;
      await db.put(s, r); cache.get(s)!.set(r.id, r);
    }
    emit(s);
  }
}
export async function clearAll() {
  const db = await getDb();
  for (const s of STORES) { await db.clear(s); cache.get(s)!.clear(); emit(s); }
}
