import { ExternalLink } from 'lucide-react';

const FORM = 'https://tally.so/r/2jaZKA';
const EMBED = 'https://tally.so/embed/2jaZKA?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';

export function FeedbackPage() {
  return <div className="mx-auto grid max-w-2xl gap-4">
    <h1 className="text-2xl font-semibold">Feedback</h1>
    <p className="text-sm text-muted">Tell us what you like and what should improve. Your answers go to the Tadbeer owner. The form is hosted by Tally, so it needs an internet connection.</p>
    <iframe src={EMBED} title="Tadbeer feedback form" loading="lazy" className="min-h-[640px] w-full rounded-xl border border-line bg-surface" />
    <a className="inline-flex items-center gap-1 text-sm text-brand underline" href={FORM} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open the form in a new tab</a>
  </div>;
}
