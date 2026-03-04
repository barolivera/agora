import Link from 'next/link';
import type { ArkivEvent } from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import StatusBadge from '@/app/components/StatusBadge';

const POSTER_BG = ['#E8491C', '#0247E2', '#D4E84C'] as const;

function parseEventDate(dateStr: string): { day: string; month: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function formatCardTime(dateStr: string, endTime?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (t === '12:00 AM') return '';
  if (endTime) {
    const [h, m] = endTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const endDate = new Date(d);
      endDate.setHours(h, m, 0, 0);
      const et = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${t} — ${et}`;
    }
  }
  return t;
}

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function EventCard({
  event,
  index,
  showIndependentBadge = false,
}: {
  event: ArkivEvent;
  index: number;
  showIndependentBadge?: boolean;
}) {
  const bg = POSTER_BG[index % 3];
  const parsedDate = parseEventDate(event?.date ?? '');
  const status = event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');
  const timeRange = formatCardTime(event?.date ?? '', event?.endTime);

  return (
    <Link
      href={`/event/${event?.entityKey}`}
      className="group flex flex-col overflow-clip transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{ aspectRatio: '357 / 476' }}
    >
      {/* Poster area */}
      <div
        className="relative flex-1 min-h-0 pl-5 py-5"
        style={{ backgroundColor: bg }}
      >
        {/* Date badge */}
        {parsedDate && (
          <div className="relative bg-ink/90 inline-flex items-center justify-center px-2 py-1.5 rounded-lg">
            <div className="flex flex-col gap-1 w-[58px]">
              <span className="text-[48px] font-bold leading-[48px] text-cream font-[family-name:var(--font-kode-mono)]">
                {parsedDate.day}
              </span>
              <span className="text-[10px] font-bold tracking-[1px] uppercase text-cream font-[family-name:var(--font-geist-sans)]">
                {parsedDate.month}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info strip */}
      <div className="bg-[#191919] border-t border-[rgba(128,128,128,0.2)] h-[142px] shrink-0 px-5 flex items-center">
        <div className="flex flex-col gap-2.5 w-[318px] max-w-full">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {event?.community ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream/90 bg-cobalt/80 font-[family-name:var(--font-geist-sans)] truncate max-w-[140px]">
                {deslugify(event.community)}
              </span>
            ) : showIndependentBadge ? (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream/50 border border-cream/20 font-[family-name:var(--font-geist-sans)]">
                Independent
              </span>
            ) : null}
          </div>
          <p className="text-xl font-bold leading-[1.1] text-cream font-[family-name:var(--font-kode-mono)] truncate">
            {event?.title || 'Untitled Event'}
          </p>
          {timeRange && (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0 text-cream/70" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-cream/70 leading-4">
                {timeRange}
              </span>
            </div>
          )}
          {event?.location && (
            <div className="flex items-start gap-0.5">
              <svg className="w-4 h-4 shrink-0 text-cream" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.33A4.67 4.67 0 003.33 6C3.33 9.5 8 14.67 8 14.67S12.67 9.5 12.67 6A4.67 4.67 0 008 1.33zm0 6.34a1.67 1.67 0 110-3.34 1.67 1.67 0 010 3.34z" fill="currentColor" />
              </svg>
              <span className="text-xs text-cream leading-4 truncate">
                {event.location}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CardSkeleton({ index }: { index: number }) {
  return (
    <div className="flex flex-col overflow-clip" style={{ aspectRatio: '357 / 476' }}>
      <div
        className="flex-1 min-h-0 animate-pulse"
        style={{ background: POSTER_BG[index % 3], opacity: 0.3 }}
      />
      <div className="bg-[#191919] h-[142px] shrink-0 animate-pulse" style={{ opacity: 0.5 }} />
    </div>
  );
}
