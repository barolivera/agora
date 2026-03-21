'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PastEventsToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="text-xs tracking-[0.15em] uppercase text-ink/80 hover:text-ink font-[family-name:var(--font-kode-mono)] px-0"
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
      </Button>
      {open && children}
    </div>
  );
}
