import Link from 'next/link';
import type { ArkivEvent } from '@/lib/arkiv';
import { deslugify } from '@/lib/utils';
import { getEventStatus } from '@/lib/expiration';
import StatusBadge from '@/components/demos/StatusBadge';
import { Badge } from '@/components/ui/badge';

const POSTER_BG = ['#E8491C', '#0247E2', '#D4E84C'] as const;

function formatEventDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
  const formattedDate = formatEventDate(event?.date ?? '');
  const status = event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');

  return (
    <Link
      href={`/event/${event?.entityKey}`}
      className="group bg-[#fafafa] border-t border-[rgba(128,128,128,0.2)] flex flex-col gap-6 justify-center p-3 overflow-clip transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
    >
      {/* Cover image with status badge overlay */}
      <div
        className="relative w-full shrink-0 flex flex-col items-end p-3 overflow-hidden"
        style={{ aspectRatio: '1 / 1', backgroundColor: bg }}
      >
        {event?.coverImageUrl && (
          <img
            src={event.coverImageUrl}
            alt={`${event.title} cover`}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
        <div className="relative">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Info section */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* Tag badges */}
        <div className="flex items-center gap-3">
          {event?.category && (
            <Badge className="rounded-none px-[11px] py-1 h-[25px] text-[10px] font-bold tracking-[1px] uppercase text-[#fafafa] bg-[#191919] border border-[rgba(25,25,25,0.8)] font-[family-name:var(--font-geist-sans)]">
              {event.category}
            </Badge>
          )}
          {event?.community && (
            <Badge className="rounded-none px-[11px] py-1 h-[25px] text-[10px] font-bold tracking-[1px] uppercase text-[#fafafa] bg-[#191919] border border-[rgba(25,25,25,0.8)] font-[family-name:var(--font-geist-sans)] truncate max-w-[140px]">
              {deslugify(event.community)}
            </Badge>
          )}
          {showIndependentBadge && !event?.community && (
            <Badge variant="outline" className="rounded-none px-[11px] py-1 h-[25px] text-[10px] font-bold tracking-[1px] uppercase text-[#191919]/50 border-[#191919]/20 font-[family-name:var(--font-geist-sans)]">
              Independent
            </Badge>
          )}
        </div>

        {/* Date + Title */}
        <div className="flex flex-col gap-1.5 min-w-0 w-full">
          {formattedDate && (
            <p className="text-[12px] font-semibold leading-4 text-[#191919] font-[family-name:var(--font-geist-sans)] truncate">
              {formattedDate}
            </p>
          )}
          <p className="text-[16px] font-bold leading-[1.1] text-[#191919] font-[family-name:var(--font-kode-mono)] truncate">
            {event?.title || 'Untitled Event'}
          </p>
        </div>

        {/* Location */}
        {event?.location && (
          <div className="flex items-start gap-0.5">
            <svg className="w-4 h-4 shrink-0 text-[#191919]" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.33A4.67 4.67 0 003.33 6C3.33 9.5 8 14.67 8 14.67S12.67 9.5 12.67 6A4.67 4.67 0 008 1.33zm0 6.34a1.67 1.67 0 110-3.34 1.67 1.67 0 010 3.34z" fill="currentColor" />
            </svg>
            <span className="text-[10px] text-[#191919] leading-4 truncate">
              {event.location}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function CardSkeleton({ index }: { index: number }) {
  return (
    <div className="bg-[#fafafa] border-t border-[rgba(128,128,128,0.2)] flex flex-col gap-6 p-3 overflow-clip">
      <div
        className="w-full animate-pulse"
        style={{ aspectRatio: '1 / 1', background: POSTER_BG[index % 3], opacity: 0.3 }}
      />
      <div className="h-[100px] animate-pulse" style={{ opacity: 0.5 }} />
    </div>
  );
}
