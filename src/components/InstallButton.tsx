import { Download } from 'lucide-react';
import { useState } from 'react';
import { useInstall } from '../hooks/useInstall';
import { Button, Modal } from './ui';

const REL = 'https://github.com/Ctrl-Create-3673/tadbeer/releases/latest/download';

/** Desktop installers (built by the "Build desktop apps" workflow and attached to the latest GitHub release). */
export function DesktopLinks() {
  const a = 'inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-brand-soft';
  return <div className="grid gap-2"><div className="flex flex-wrap gap-2">
    <a className={a} href={`${REL}/Tadbeer-Setup.exe`}><Download size={14} />Windows (.exe)</a>
    <a className={a} href={`${REL}/Tadbeer-mac-arm64.dmg`}><Download size={14} />Mac · Apple chip (.dmg)</a>
    <a className={a} href={`${REL}/Tadbeer-mac-x64.dmg`}><Download size={14} />Mac · Intel (.dmg)</a></div>
    <p className="text-xs text-muted">The installers are not code-signed yet. Windows: click “More info” then “Run anyway”. Mac: right-click the app and choose Open the first time. The website and “Download app” need none of this.</p></div>;
}

/** Always visible until Tadbeer is installed. One tap where the browser allows it, otherwise a short how-to. */
export function InstallButton({ className = '', compact = false, primary = false }: { className?: string; compact?: boolean; primary?: boolean }) {
  const { installed, canPrompt, ios, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (installed) return null;
  return <>
    <Button variant={primary ? 'primary' : 'ghost'} className={className} onClick={() => (canPrompt ? void install() : setHelp(true))} aria-label="Download app"><Download size={15} />{compact ? <span className="hidden sm:inline">Download app</span> : 'Download app'}</Button>
    {help && <Modal title="Download Tadbeer" onClose={() => setHelp(false)}>
      <div className="grid gap-3 text-sm">
        {ios && <p><b>iPhone / iPad (Safari):</b> tap the Share button, then “Add to Home Screen”.</p>}
        <p><b>Chrome or Edge on a computer:</b> click the install icon at the right end of the address bar, or open the browser menu and choose “Install Tadbeer”.</p>
        <p><b>Android (Chrome):</b> open the menu (three dots) and choose “Install app” or “Add to Home screen”.</p>
        <div><b>Desktop app (Windows or Mac):</b><div className="mt-2"><DesktopLinks /></div></div>
        <p className="text-muted">Once installed it opens like an app and works offline. If you do not see these options, open this page in Chrome, Edge or Safari.</p>
      </div>
    </Modal>}
  </>;
}
