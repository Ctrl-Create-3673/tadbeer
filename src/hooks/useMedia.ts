import { useEffect, useState } from 'react';
export function useMedia(query: string) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const q = window.matchMedia(query); const f = () => setM(q.matches); q.addEventListener('change', f); f(); return () => q.removeEventListener('change', f); }, [query]);
  return m;
}
