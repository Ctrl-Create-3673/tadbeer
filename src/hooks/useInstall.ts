import { useEffect, useState } from 'react';

interface BIPEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; subs.forEach((f) => f()); });
if (typeof window !== 'undefined') window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()); });

const standalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Install-as-app state: `canPrompt` on Chrome/Edge/Android, `ios` shows the Share → Add to Home Screen hint. */
export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return {
    installed: standalone(), canPrompt: !!deferred, ios: isIos() && !standalone(),
    install: async () => { if (!deferred) return; await deferred.prompt(); await deferred.userChoice; deferred = null; tick((n) => n + 1); },
  };
}
