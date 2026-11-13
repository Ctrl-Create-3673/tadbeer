import { ExternalLink, Heart, Lightbulb, MessageCircle } from 'lucide-react';

const FORM = 'https://tally.so/r/2jaZKA';
const EMBED = 'https://tally.so/embed/2jaZKA?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';

const WAYS = [[Heart, 'Tell us what you love'], [Lightbulb, 'Suggest an idea'], [MessageCircle, 'Report something broken']] as const;

export function FeedbackPage() {
  return <div className="mx-auto grid max-w-2xl gap-5">
    <header className="rounded-2xl bg-brand-soft p-6">
      <h1 className="text-2xl font-semibold">Help shape Tadbeer</h1>
      <p className="mt-1 text-sm text-muted">Tadbeer grows from what people ask for. Your note goes straight to the person building it. One minute, no sign-up.</p>
      <ul className="mt-4 flex flex-wrap gap-2">{WAYS.map(([Icon, label]) => <li key={label} className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm"><Icon size={14} className="text-brand" aria-hidden />{label}</li>)}</ul>
    </header>
    <iframe src={EMBED} title="Tadbeer feedback form" loading="lazy" className="min-h-[640px] w-full rounded-2xl border border-line bg-surface" />
    <a className="inline-flex items-center gap-1 text-sm text-brand underline" href={FORM} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open the form in a new tab (needs internet)</a>
  </div>;
}
