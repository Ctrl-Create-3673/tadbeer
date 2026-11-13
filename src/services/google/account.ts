import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { useSyncExternalStore } from 'react';
import type { GoogleUser } from './google';

// Public web config (not a secret). Access is controlled by Firebase "Authorized domains".
const app = initializeApp({
  apiKey: 'AIzaSyBn6zcdzia-vk9_hzkyUIq5SCAhT-9ASE4', authDomain: 'tadbeer-edb8b.firebaseapp.com',
  projectId: 'tadbeer-edb8b', appId: '1:82450598863:web:20f628e60b6e027b5360ba',
});
const auth = getAuth(app);

/** Step 1: who the user is. Name + email only, so Google shows no Calendar warning. Persists across visits. */
let account: GoogleUser | null = null;
const listeners = new Set<() => void>();
onAuthStateChanged(auth, (u) => {
  account = u ? { email: u.email ?? '', name: u.displayName ?? '', picture: u.photoURL ?? '' } : null;
  listeners.forEach((l) => l());
});
export const useAccount = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => account);

export const signInAccount = async () => { await signInWithPopup(auth, new GoogleAuthProvider()); };
export const signOutAccount = () => fbSignOut(auth);

/** Step 2: asks Google for the Calendar permission on top of the account. Returns a ~1 h access token. */
export async function requestCalendarToken(): Promise<{ token: string; user: GoogleUser }> {
  const p = new GoogleAuthProvider(); p.addScope('https://www.googleapis.com/auth/calendar.events');
  const r = await signInWithPopup(auth, p);
  const token = GoogleAuthProvider.credentialFromResult(r)?.accessToken;
  if (!token) throw new Error('Google did not give Calendar access.');
  return { token, user: { email: r.user.email ?? '', name: r.user.displayName ?? '', picture: r.user.photoURL ?? '' } };
}
