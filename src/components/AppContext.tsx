import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button, Modal } from './ui';
import { cx, } from '../utils/format';

export type EditorKind = 'task' | 'event' | 'note' | 'reminder';
export interface EditorState { kind: EditorKind; id?: string; date?: string }
interface Ctx {
  toast: (msg: string, kind?: 'ok' | 'error') => void;
  confirm: (o: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
  editor: EditorState | null; openEditor: (e: EditorState) => void; closeEditor: () => void;
}
const C = createContext<Ctx>(null!);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const [dlg, setDlg] = useState<{ o: Parameters<Ctx['confirm']>[0]; res: (v: boolean) => void } | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random(); setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);
  const confirm = useCallback<Ctx['confirm']>((o) => new Promise((res) => setDlg({ o, res })), []);
  const value = useMemo(() => ({ toast, confirm, editor, openEditor: setEditor, closeEditor: () => setEditor(null) }), [toast, confirm, editor]);
  const close = (v: boolean) => { dlg?.res(v); setDlg(null); };
  return <C.Provider value={value}>{children}
    {dlg && <Modal title={dlg.o.title} onClose={() => close(false)} footer={<><Button onClick={() => close(false)}>Cancel</Button><Button variant={dlg.o.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{dlg.o.confirmLabel ?? 'Confirm'}</Button></>}><p className="text-sm">{dlg.o.message}</p></Modal>}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={cx('fade-in pointer-events-auto max-w-md rounded-xl border px-4 py-2 text-sm shadow-lg', t.kind === 'error' ? 'border-burgundy bg-surface text-burgundy' : 'border-line bg-ink text-bg')}>{t.msg}</div>)}
    </div>
  </C.Provider>;
}
