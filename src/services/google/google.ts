import { Capacitor } from '@capacitor/core';
import { useSyncExternalStore } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { google?: any } }

/**
 * Google sign-in (Google Identity Services, token flow) + Calendar REST calls. No backend:
 * the access token lives only in memory (≈1 hour) and is never stored or committed.
 */
const SCOPE = 'openid email profile https://www.googleapis.com/auth/calendar.events';
const GIS = 'https://accounts.google.com/gsi/client';
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

let gisLoaded: Promise<void> | null = null;
function loadGis() {
  return (gisLoaded ??= new Promise<void>((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = Object.assign(document.createElement('script'), { src: GIS, async: true, onload: () => res(), onerror: () => { gisLoaded = null; rej(new Error('Could not load Google sign-in (offline or blocked).')); } });
    document.head.appendChild(s);
  }));
}

/** Opens Google's consent popup. Must be called from a click handler. */
export async function signIn(clientId: string): Promise<GoogleUser> {
  if (Capacitor.isNativePlatform()) throw new Error('Google sign-in is not available inside the Android/iOS app yet. Open Tadbeer in your browser to use email reminders.');
  if (!clientId.trim()) throw new Error('Add your Google OAuth Client ID first.');
  await loadGis();
  const token = await new Promise<{ access_token: string; expires_in: number }>((res, rej) => {
    const c = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(), scope: SCOPE,
      callback: (r: { access_token?: string; expires_in?: number; error?: string; error_description?: string }) => r.access_token ? res({ access_token: r.access_token, expires_in: r.expires_in ?? 3600 }) : rej(new Error(r.error_description || r.error || 'Sign-in was cancelled.')),
      error_callback: (e: { type?: string; message?: string }) => rej(new Error(e.type === 'popup_closed' ? 'Sign-in window was closed.' : e.message || 'Sign-in failed.')),
    });
    c.requestAccessToken({ prompt: '' });
  });
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!r.ok) throw new Error('Signed in, but Google would not return your profile.');
  const u = await r.json();
  const user = { email: u.email as string, name: (u.name as string) ?? '', picture: (u.picture as string) ?? '' };
  set({ token: token.access_token, expires: Date.now() + (token.expires_in - 60) * 1000, user });
  return user;
}
export function signOut() {
  if (session) try { window.google?.accounts?.oauth2?.revoke(session.token); } catch { /* best effort */ }
  set(null);
}

export async function calendar<T = unknown>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!session || Date.now() >= session.expires) { set(null); throw new GoogleAuthError('Google session expired — sign in again.'); }
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json', ...init.headers } });
  if (r.status === 401) { set(null); throw new GoogleAuthError('Google session expired — sign in again.'); }
  if (r.status === 204) return null;
  const body = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(body?.error?.message ?? `Google Calendar error ${r.status}`), { status: r.status });
  return body as T;
}
