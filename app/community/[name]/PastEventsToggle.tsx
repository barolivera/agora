'use client';

import { useState } from 'react';

export default function PastEventsToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-ink/80 hover:text-ink transition-colors font-[family-name:var(--font-kode-mono)]"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {open ? 'Hide past events' : 'Show past events'}
      </button>
      {open && children}
    </div>
  );
}
