import { useSyncExternalStore } from 'react';
import { requestCalendarToken } from './account';

/** Calendar connection: the access token lives only in memory (~1 hour) and is never stored or committed. */
const API = 'https://www.googleapis.com/calendar/v3';

export interface GoogleUser { email: string; name: string; picture: string }
interface Session { token: string; expires: number; user: GoogleUser }
let session: Session | null = null;
const listeners = new Set<() => void>();
const set = (s: Session | null) => { session = s; snap = null; listeners.forEach((l) => l()); };
let snap: { user: GoogleUser; expires: number } | null = null;
const getSnap = () => (snap ??= session && Date.now() < session.expires ? { user: session.user, expires: session.expires } : null);
export const useGoogleSession = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getSnap);
export const isSignedIn = () => !!session && Date.now() < session.expires;

export class GoogleAuthError extends Error {}

/** Step 2: connect Google Calendar. Must be called from a click handler. */
export async function connectCalendar(): Promise<GoogleUser> {
  const { token, user } = await requestCalendarToken();
  set({ token, expires: Date.now() + 55 * 60 * 1000, user });
  return user;
}
export const disconnectCalendar = () => set(null);

export async function calendar<T = unknown>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!session || Date.now() >= session.expires) { set(null); throw new GoogleAuthError('Google session expired — sign in again.'); }
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json', ...init.headers } });
  if (r.status === 401) { set(null); throw new GoogleAuthError('Google session expired — sign in again.'); }
  if (r.status === 204) return null;
  const body = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(body?.error?.message ?? `Google Calendar error ${r.status}`), { status: r.status });
  return body as T;
}
