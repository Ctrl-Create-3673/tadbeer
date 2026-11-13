import { X } from 'lucide-react';
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from '../utils/format';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; size?: 'sm' | 'md' };
export function Button({ variant = 'ghost', size = 'md', className, ...p }: BtnProps) {
  return <button type="button" {...p} className={cx(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
    size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-3.5 py-2 text-sm',
    variant === 'primary' && 'bg-brand text-bg hover:opacity-90',
    variant === 'soft' && 'bg-brand-soft text-brand hover:opacity-80',
    variant === 'ghost' && 'border border-line hover:bg-brand-soft',
    variant === 'danger' && 'border border-burgundy/40 text-burgundy hover:bg-burgundy/10', className)} />;
}
export const IconButton = ({ label, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) =>
  <button type="button" aria-label={label} title={label} {...p} className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-brand-soft', className)} />;

const field = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(field, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(field, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(field, p.className)} />;
export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return <label className={cx('block', className)}><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>;
}
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p} className={cx('rounded-2xl border border-line bg-surface p-4', className)} />;
export const Badge = ({ color, children }: { color?: string; children: ReactNode }) =>
  <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs" style={color ? { borderColor: color, color } : undefined}>{children}</span>;

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-muted">
    <div className="text-brand">{icon}</div><div className="font-semibold text-ink">{title}</div>{hint && <div className="max-w-sm text-sm">{hint}</div>}{action}</div>;
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.querySelector<HTMLElement>('[data-body] input:not([type=hidden]),[data-body] textarea,[data-body] select,[data-body] [contenteditable=true]') ?? ref.current?.querySelector<HTMLElement>('[data-body] button'))?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) { // keep focus inside the dialog
        const f = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input,select,textarea,[contenteditable=true]')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('fade-in flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-xl')}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3"><h2 className="text-lg font-semibold">{title}</h2><IconButton label="Close" onClick={onClose}><X size={18} /></IconButton></div>
      <div data-body className="overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </div></div>;
}
