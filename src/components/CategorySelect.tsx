import { Plus } from 'lucide-react';
import { useState } from 'react';
import { save, useCollection } from '../services/storage/db';
import type { Category, CategoryKind } from '../types';
import { EVENT_COLORS } from '../utils/theme';
import { Button, Input, Select } from './ui';

export const useCategories = (kind: CategoryKind) => useCollection<Category>('categories').filter((c) => c.kind === kind);

/** Select with inline "new category" — categories are user-created and editable in Settings. */
export function CategorySelect({ kind, value, onChange }: { kind: CategoryKind; value: string | null; onChange: (id: string | null) => void }) {
  const cats = useCategories(kind); const [adding, setAdding] = useState(false); const [name, setName] = useState('');
  const add = async () => {
    if (!name.trim()) return;
    const c = await save<Category>('categories', { name: name.trim(), kind, color: EVENT_COLORS[cats.length % EVENT_COLORS.length] });
    onChange(c.id); setName(''); setAdding(false);
  };
  return adding
    ? <div className="flex gap-1"><Input autoFocus aria-label="New category name" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><Button variant="primary" onClick={add}>Add</Button></div>
    : <div className="flex gap-1"><Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}><option value="">No category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Button aria-label="New category" onClick={() => setAdding(true)}><Plus size={16} /></Button></div>;
}
