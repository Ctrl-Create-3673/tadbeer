import { useEffect, useState } from 'react';

const MS = 4500;

/** Plain fade-in / fade-out splash. Sits over the app (which loads underneath) and is removed after MS. */
export function Splash() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), MS);
    const skip = () => setGone(true);
    window.addEventListener('keydown', skip);
    return () => { clearTimeout(t); window.removeEventListener('keydown', skip); };
  }, []);
  if (gone) return null;
  return (
    <div role="status" aria-label="Loading Tadbeer" onClick={() => setGone(true)} className="splash fixed inset-0 z-[100] grid place-items-center bg-[#141815]">
      <img src={`${import.meta.env.BASE_URL}tadbeer-square.svg`} alt="" width={220} height={220} className="splash-logo" />
    </div>
  );
}
