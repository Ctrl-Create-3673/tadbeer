import { Bold, Heading2, Heading3, Italic, List, ListChecks, ListOrdered } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { IconButton } from './ui';

/** Strip scripts, handlers and unsafe URLs from stored/imported HTML before it reaches the DOM. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach((n) => n.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      if (a.name.startsWith('on') || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
    }
  });
  return doc.body.innerHTML;
}

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = sanitizeHtml(value); /* initial only */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const emit = () => onChange(ref.current?.innerHTML ?? '');
  const cmd = (c: string, arg?: string) => { ref.current?.focus(); document.execCommand(c, false, arg); emit(); };
  const checklist = () => {
    ref.current?.focus();
    document.execCommand('insertUnorderedList');
    const sel = window.getSelection(); const ul = (sel?.anchorNode instanceof Element ? sel.anchorNode : sel?.anchorNode?.parentElement)?.closest('ul');
    if (ul) ul.toggleAttribute('data-checklist'); emit();
  };
  const click = (e: React.MouseEvent) => { // toggle a checklist item when its box is clicked
    const li = (e.target as HTMLElement).closest('li');
    if (!li || !li.parentElement?.hasAttribute('data-checklist')) return;
    const x = e.clientX - li.getBoundingClientRect().left;
    const rtl = getComputedStyle(li).direction === 'rtl';
    if ((!rtl && x < 26) || (rtl && li.getBoundingClientRect().width - x < 26)) { li.toggleAttribute('data-done'); emit(); }
  };
  return <div className="rounded-lg border border-line bg-surface">
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-line p-1">
      <IconButton label="Heading" onClick={() => cmd('formatBlock', 'h2')}><Heading2 size={16} /></IconButton>
      <IconButton label="Subheading" onClick={() => cmd('formatBlock', 'h3')}><Heading3 size={16} /></IconButton>
      <IconButton label="Bold" onClick={() => cmd('bold')}><Bold size={16} /></IconButton>
      <IconButton label="Italic" onClick={() => cmd('italic')}><Italic size={16} /></IconButton>
      <IconButton label="Bulleted list" onClick={() => cmd('insertUnorderedList')}><List size={16} /></IconButton>
      <IconButton label="Numbered list" onClick={() => cmd('insertOrderedList')}><ListOrdered size={16} /></IconButton>
      <IconButton label="Checklist" onClick={checklist}><ListChecks size={16} /></IconButton>
    </div>
    <div ref={ref} className="rte writing p-3" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Note text" dir="auto" onInput={emit} onClick={click} />
  </div>;
}
