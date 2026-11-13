import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import type { Base } from '../../types';
import { getOne, save, type StoreName } from '../storage/db';
import { auth } from './account';
import { fs } from './cloud';

/**
 * Sharing by invite. The sender writes one invites/{id} doc addressed to a friend's Google email;
 * the friend sees it in the Invites page and Accept copies it into their own planner (each keeps their own copy).
 */
export type ShareStore = 'events' | 'tasks';
export interface Invite { id: string; fromUid: string; fromName: string; fromEmail: string; toEmail: string; store: ShareStore; json: string; at: string; status: 'pending' | 'accepted' | 'declined' }
interface S { incoming: Invite[]; sent: Invite[]; error?: string }
let state: S = { incoming: [], sent: [] };
const ls = new Set<() => void>();
const set = (p: Partial<S>) => { state = { ...state, ...p }; ls.forEach((l) => l()); };
export const useInvites = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state);

let unsub: Unsubscribe[] = [];
const watch = (field: 'toEmail' | 'fromUid', val: string, key: 'incoming' | 'sent') => onSnapshot(query(collection(fs, 'invites'), where(field, '==', val)),
  (s) => set({ [key]: s.docs.map((d) => ({ ...(d.data() as Omit<Invite, 'id'>), id: d.id })).sort((a, b) => b.at.localeCompare(a.at)), error: undefined }),
  () => set({ error: 'Invites are not available yet. Try again in a moment.' }));
onAuthStateChanged(auth, (u) => {
  unsub.forEach((f) => f()); unsub = []; set({ incoming: [], sent: [] });
  if (u?.email) unsub = [watch('toEmail', u.email.toLowerCase(), 'incoming'), watch('fromUid', u.uid, 'sent')];
});

export async function sendInvite(store: ShareStore, id: string, toEmail: string) {
  const u = auth.currentUser; if (!u?.email) throw new Error('Sign in with Google first.');
  const to = toEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(to)) throw new Error('Enter a valid email address.');
  if (to === u.email.toLowerCase()) throw new Error('That is your own email.');
  const row = getOne<Base>(store, id); if (!row) throw new Error('Item not found.');
  // strip identity and personal links (category, reminder, done-state); the friend sets their own
  const { id: _i, createdAt: _c, updatedAt: _u, categoryId: _k, ...rest } = row as unknown as Record<string, unknown>;
  const item = store === 'tasks' ? { ...rest, status: 'pending', completedAt: null, reminderAt: null } : { ...rest, reminderMinutes: null };
  await addDoc(collection(fs, 'invites'), { fromUid: u.uid, fromName: u.displayName ?? '', fromEmail: u.email, toEmail: to, store, json: JSON.stringify(item), at: new Date().toISOString(), status: 'pending' });
}
export async function answerInvite(inv: Invite, accept: boolean) {
  if (accept) await save(inv.store as StoreName, { ...JSON.parse(inv.json), categoryId: null } as never);
  await updateDoc(doc(fs, 'invites', inv.id), { status: accept ? 'accepted' : 'declined' });
}
export const deleteInvite = (id: string) => deleteDoc(doc(fs, 'invites', id));
