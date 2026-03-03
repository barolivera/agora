import Link from 'next/link';
import type { ArkivEvent } from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import StatusBadge from '@/app/components/StatusBadge';

const POSTER_BG = ['#E8491C', '#0247E2', '#1A1614', '#D4E84C'] as const;
const POSTER_FG = ['#F2EDE4', '#F2EDE4', '#F2EDE4', '#1A1614'] as const;

function parseEventDate(dateStr: string): { day: string; month: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

export function EventCard({ event, index }: { event: ArkivEvent; index: number }) {
  const colorIdx = index % 4;
  const bg = POSTER_BG[colorIdx];
  const fg = POSTER_FG[colorIdx];
  const parsedDate = parseEventDate(event?.date ?? '');
  const status = event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');
  const hasCover = !!event?.coverImageUrl;

  return (
    <Link
      href={`/event/${event?.entityKey}`}
      className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
    >
      {/* Cover image area */}
      <div
        className="relative aspect-[358/236] overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        {hasCover ? (
          <img
            src={event.coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-end p-5" style={{ color: fg }}>
            <h3 className="text-2xl font-bold leading-snug font-[family-name:var(--font-kode-mono)] line-clamp-3">
              {event?.title || 'Untitled Event'}
            </h3>
          </div>
        )}

        {/* Date badge overlay */}
        {parsedDate && (
          <div className="absolute top-5 left-5 bg-[#191919] p-3 rounded-[3px]">
            <div className="flex flex-col gap-1 w-[58px]">
              <span className="text-[48px] font-bold leading-[48px] text-cream font-[family-name:var(--font-kode-mono)]">
                {parsedDate.day}
              </span>
              <span className="text-[10px] font-bold tracking-[1px] uppercase text-cream font-[family-name:var(--font-dm-sans)]">
                {parsedDate.month}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info strip */}
      <div className="bg-[#191919] border-t border-white/10 px-5 flex flex-col gap-3 justify-center" style={{ minHeight: '142px' }}>
        <StatusBadge status={status} />
        <p className="text-xl font-bold leading-[1.1] text-cream font-[family-name:var(--font-kode-mono)] truncate">
          {event?.title || 'Untitled Event'}
        </p>
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
    </Link>
  );
}

export function CardSkeleton({ index }: { index: number }) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div
        className="aspect-[358/236] animate-pulse"
        style={{ background: POSTER_BG[index % 4], opacity: 0.3 }}
      />
      <div className="bg-[#191919] animate-pulse" style={{ minHeight: '142px', opacity: 0.5 }} />
    </div>
  );
}
