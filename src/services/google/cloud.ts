import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, initializeFirestore, onSnapshot, persistentLocalCache, setDoc, type Unsubscribe } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import type { Base } from '../../types';
import { STORES, applyRemote, loaded, getAll, getOne, setSyncHook, type StoreName } from '../storage/db';
import { app, auth } from './account';

/**
 * Cloud sync (Firestore). Each record is one document users/{uid}/items/{store}~{id}.
 * Newest updatedAt wins; deletions are kept as tombstones so they reach every device.
 * Settings stay per device. Firestore's offline cache queues writes made while offline.
 */
const SYNCED = STORES.filter((s) => s !== 'settings');
export const fs = initializeFirestore(app, { localCache: persistentLocalCache() }, 'default');

export interface CloudState { phase: 'off' | 'syncing' | 'ok' | 'error'; at?: string; error?: string; calendarFlag?: boolean }
let state: CloudState = { phase: 'off' };
const ls = new Set<() => void>();
const setState = (p: Partial<CloudState>) => { state = { ...state, ...p }; ls.forEach((l) => l()); };
export const useCloud = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state);

let uid: string | null = null; let unsub: Unsubscribe[] = [];
const items = () => collection(fs, 'users', uid!, 'items');
const key = (n: string, id: string) => `${n}~${id}`;
const fail = (e: unknown) => setState({ phase: 'error', error: (e as Error).message.includes('permission') || (e as Error).message.includes('not-found') ? 'Cloud database is not set up yet.' : (e as Error).message });
const push = (n: StoreName, row: Base) => { if (uid) setDoc(doc(items(), key(n, row.id)), { store: n, id: row.id, json: JSON.stringify(row), updatedAt: row.updatedAt, deleted: false }).then(() => setState({ phase: 'ok', at: new Date().toISOString() }), fail); };

setSyncHook({
  save: (n, row) => { if ((SYNCED as readonly string[]).includes(n)) push(n, row); },
  remove: (n, id) => { if (uid && (SYNCED as readonly string[]).includes(n)) setDoc(doc(items(), key(n, id)), { store: n, id, json: '', updatedAt: new Date().toISOString(), deleted: true }).catch(fail); },
});

async function start(u: string) {
  uid = u; setState({ phase: 'syncing', error: undefined });
  await loaded; if (uid !== u) return;
  let first = true;
  unsub.push(onSnapshot(items(), (snap) => {
    const remote = new Set<string>();
    for (const c of snap.docChanges()) {
      const d = c.doc.data() as { store: StoreName; id: string; json: string; updatedAt: string; deleted: boolean };
      if (!(SYNCED as readonly string[]).includes(d.store)) continue;
      remote.add(key(d.store, d.id));
      const local = getOne<Base>(d.store, d.id);
      if (d.deleted) { if (local && local.updatedAt <= d.updatedAt) void applyRemote(d.store, d.id, null); }
      else if (!local || local.updatedAt < d.updatedAt) void applyRemote(d.store, d.id, JSON.parse(d.json) as Base);
      else if (local.updatedAt > d.updatedAt) push(d.store, local);
    }
    if (first) { // first load: upload everything this device has that the cloud does not
      first = false;
      for (const n of SYNCED) for (const r of getAll<Base>(n)) if (!remote.has(key(n, r.id))) push(n, r);
    }
    if (!snap.metadata.hasPendingWrites) setState({ phase: 'ok', at: new Date().toISOString() });
  }, fail));
  unsub.push(onSnapshot(doc(fs, 'users', u, 'meta', 'profile'), (d) => setState({ calendarFlag: !!d.data()?.calendarConnected }), () => undefined));
}
export const setCalendarFlag = (v: boolean) => { if (uid) void setDoc(doc(fs, 'users', uid, 'meta', 'profile'), { calendarConnected: v }, { merge: true }); };

onAuthStateChanged(auth, (u) => { unsub.forEach((f) => f()); unsub = []; uid = null; if (u) void start(u.uid); else setState({ phase: 'off', calendarFlag: false, error: undefined }); });
