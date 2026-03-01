'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, fetchEventsByStatus, type ArkivEvent } from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import StatusBadge from '@/app/components/StatusBadge';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';

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

function EventCard({ event, index }: { event: ArkivEvent; index: number }) {
  const colorIdx = index % 4;
  const bg = POSTER_BG[colorIdx];
  const fg = POSTER_FG[colorIdx];
  const parsedDate = parseEventDate(event?.date ?? '');
  const status = event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');
  const dimmed = status === 'ended' || status === 'cancelled';

  return (
    <Link
      href={`/event/${event?.entityKey}`}
      className={`flex flex-col aspect-[3/4] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl${dimmed ? ' opacity-75' : ''}`}
      style={{ background: bg, color: fg }}
    >
      <div className="flex-1 flex flex-col p-5">
        {parsedDate ? (
          <div className="mb-auto">
            <div
              className="text-7xl font-bold leading-none font-[family-name:var(--font-kode-mono)]"
              style={{ opacity: 0.88 }}
            >
              {parsedDate.day}
            </div>
            <div className="text-xs font-bold tracking-[0.25em] uppercase mt-1" style={{ opacity: 0.55 }}>
              {parsedDate.month}
            </div>
          </div>
        ) : (
          <div className="mb-auto" />
        )}
        <h3 className="text-xl font-bold leading-snug font-[family-name:var(--font-kode-mono)] mt-6 line-clamp-3">
          {event?.title || 'Untitled Event'}
        </h3>
      </div>
      <div
        className="px-5 py-3 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid rgba(128,128,128,0.2)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusBadge status={status} />
          {event?.location && (
            <span className="text-xs truncate" style={{ opacity: 0.70 }}>
              {event.location}
            </span>
          )}
        </div>
        {event?.organizer && (
          <img
            src={`https://effigy.im/a/${event.organizer}.svg`}
            alt=""
            width={22}
            height={22}
            className="rounded-full shrink-0"
            style={{ opacity: 0.75 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>
    </Link>
  );
}

function CardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="aspect-[3/4] animate-pulse"
      style={{ background: POSTER_BG[index % 4], opacity: 0.3 }}
    />
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative w-full mb-6">
      {/* Magnifier icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-warm-gray">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search events by title or location..."
        className="w-full bg-cream border border-warm-gray text-ink placeholder:text-warm-gray text-sm pl-9 pr-9 py-2.5 font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-ink"
      />
      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-ink transition-colors"
          aria-label="Clear search"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<ArkivEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'soonest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-fetch whenever status filter changes.
  // When a specific status is selected, use the multi-attribute Arkiv query
  // (type="event" AND status=<status>) to demonstrate Arkiv's query model.
  // When "all" is selected, fetch all event entities.
  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setLoading(true);
      setError('');
      try {
        let fetched: ArkivEvent[];
        if (statusFilter === 'all') {
          const result = await publicClient
            .buildQuery()
            .where(eq('type', 'event'))
            .withPayload(true)
            .fetch();
          fetched = result?.entities?.map(parseEvent) ?? [];
        } else {
          // Multi-attribute Arkiv query: type="event" AND status=statusFilter
          fetched = await fetchEventsByStatus(statusFilter);
        }
        if (!cancelled) setEvents(fetched);
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const filteredEvents = (() => {
    let result = [...(events ?? [])];

    // Search filter (client-side): title or location contains query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => {
        if (!e) return false;
        return (
          (e.title ?? '').toLowerCase().includes(q) ||
          (e.location ?? '').toLowerCase().includes(q)
        );
      });
    }

    if (sortOrder === 'soonest') {
      result.sort((a, b) => {
        const da = a?.date ? new Date(a.date).getTime() : 0;
        const db = b?.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });
    }

    return result;
  })();

  function clearAll() {
    setStatusFilter('all');
    setSortOrder('newest');
    setSearchQuery('');
  }

  const hasActiveFilters = statusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">
          All Events
        </h1>
        <Link
          href="/create-event"
          className="bg-orange text-cream px-5 py-2.5 text-sm font-semibold hover:bg-orange-light transition-colors"
        >
          Create an event
        </Link>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => setStatusFilter('all')} />
        </div>
      )}

      {/* ── Search input ── */}
      <SearchInput value={searchQuery} onChange={setSearchQuery} />

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-y-1 mb-8 pb-4 border-b border-warm-gray/30">
        <div className="flex">
          {(['all', 'upcoming', 'live', 'ended'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors font-[family-name:var(--font-dm-sans)] ${
                statusFilter === s
                  ? 'bg-ink text-cream'
                  : 'text-warm-gray hover:text-ink'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <span className="w-px h-4 bg-warm-gray/40 self-center mx-3 hidden sm:block" aria-hidden="true" />

        <div className="flex">
          {(['newest', 'soonest'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortOrder(s)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors font-[family-name:var(--font-dm-sans)] ${
                sortOrder === s
                  ? 'bg-ink text-cream'
                  : 'text-warm-gray hover:text-ink'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : events.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
          <p className="text-2xl text-ink font-[family-name:var(--font-kode-mono)] mb-3">
            No events yet.
          </p>
          <p className="text-warm-gray text-sm mb-8">
            Be the first to create one.
          </p>
          <Link
            href="/create-event"
            className="bg-orange text-cream px-6 py-3 text-sm font-semibold hover:bg-orange-light transition-colors"
          >
            Create an event
          </Link>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 border border-dashed border-warm-gray/50">
          <p className="text-warm-gray text-sm mb-4">
            {searchQuery.trim()
              ? 'No events match your search.'
              : 'No events match your filters.'}
          </p>
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-cobalt underline underline-offset-2 hover:text-cobalt-light transition-colors font-[family-name:var(--font-dm-sans)]"
          >
            Clear {searchQuery.trim() ? 'search' : 'filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event, i) => (
            <EventCard key={event?.entityKey} event={event} index={i} />
          ))}
        </div>
      )}

    </main>
  );
}
