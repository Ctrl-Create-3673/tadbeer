import { Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { useInstall } from '../hooks/useInstall';
import { InstallButton } from './InstallButton';

const KEY = 'tadbeer-download-banner';
const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** Prominent "Download app" card on the dashboard. Works on phones and computers; hides once installed or dismissed. */
export function DownloadBanner() {
  const { installed } = useInstall();
  const [hidden, setHidden] = useState(read);
  if (installed || hidden) return null;
  const close = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setHidden(true); };
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
    <Smartphone size={28} className="shrink-0 text-brand" aria-hidden />
    <div className="min-w-0 flex-1"><div className="font-semibold">Download Tadbeer</div><p className="text-sm text-muted">Keep it on your phone or computer. It opens like an app and works offline.</p></div>
    <InstallButton primary />
    <button onClick={close} aria-label="Hide this" className="rounded p-1 text-muted hover:bg-brand-soft"><X size={16} /></button>
  </div>;
}
