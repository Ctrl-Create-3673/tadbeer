import { Download, Share } from 'lucide-react';
import { useInstall } from '../hooks/useInstall';
import { Button } from './ui';

/** Install Tadbeer as an app: one tap on Chrome/Edge/Android, a hint on iPhone/iPad (Safari has no install prompt). */
export function InstallButton({ className = '' }: { className?: string }) {
  const { installed, canPrompt, ios, install } = useInstall();
  if (installed) return null;
  if (canPrompt) return <Button className={className} onClick={install}><Download size={15} />Install app</Button>;
  if (ios) return <p className={`flex items-start gap-2 text-xs text-muted ${className}`}><Share size={14} className="mt-0.5 shrink-0" />To install: tap Share, then “Add to Home Screen”.</p>;
  return null;
}
