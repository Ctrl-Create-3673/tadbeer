import { Laptop, Monitor, Smartphone } from 'lucide-react';
import { DesktopLinks, InstallButton } from '../components/InstallButton';
import { Card } from '../components/ui';

/** One place for every way to get Tadbeer. */
export function DownloadPage() {
  return <div className="mx-auto grid max-w-2xl gap-5">
    <header className="rounded-2xl bg-brand-soft p-6">
      <h1 className="text-2xl font-semibold">Get Tadbeer</h1>
      <p className="mt-1 text-sm text-muted">Use it in the browser, or keep it on your phone or computer. Your data syncs when you sign in.</p>
    </header>
    <Card><div className="flex items-start gap-3"><Smartphone className="mt-1 shrink-0 text-brand" aria-hidden />
      <div className="grid gap-2"><h2 className="font-semibold">Phone and tablet</h2>
        <p className="text-sm text-muted">Open this site in Chrome (Android) or Safari (iPhone), then install it. It opens like an app and works offline.</p><div><InstallButton primary /></div></div></div></Card>
    <Card><div className="flex items-start gap-3"><Laptop className="mt-1 shrink-0 text-brand" aria-hidden />
      <div className="grid gap-2"><h2 className="font-semibold">Windows and Mac</h2>
        <p className="text-sm text-muted">A standalone desktop app. Download the installer for your computer.</p><DesktopLinks />
        <p className="text-xs text-muted">The app is not yet signed by Apple or Microsoft, so your computer may warn you. Mac: right-click Tadbeer → Open (or System Settings → Privacy &amp; Security → Open Anyway). Windows: More info → Run anyway. Prefer no warning? Use the website or install it as an app from your browser.</p></div></div></Card>
    <Card><div className="flex items-start gap-3"><Monitor className="mt-1 shrink-0 text-brand" aria-hidden />
      <div><h2 className="font-semibold">Any browser</h2><p className="text-sm text-muted">Nothing to install: just open the website and sign in.</p></div></div></Card>
  </div>;
}
