'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, fetchEventsByStatus, type ArkivEvent } from '@/lib/arkiv';
import { EventCard, CardSkeleton } from '@/app/components/EventCard';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';

const CATEGORY_OPTIONS = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference',
  'Study Group', 'Social', 'Online', 'Other',
] as const;

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

  const [feedFilter, setFeedFilter] = useState<'community' | 'all'>('community');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'soonest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-fetch whenever status filter changes.
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
            .limit(500)
            .fetch();

          // Debug: log raw entities to diagnose missing community events
          console.log('[Events] Raw entities from Arkiv:', result?.entities?.length);
          result?.entities?.forEach((e, i) => {
            const json = e.toJson();
            console.log(`[Events] #${i}`, {
              key: e.key,
              title: json?.title,
              date: json?.date,
              community: json?.community,
              organizer: json?.organizer,
            });
          });

          fetched = result?.entities?.map(parseEvent) ?? [];
        } else {
          fetched = await fetchEventsByStatus(statusFilter);
        }

        console.log('[Events] Total parsed:', fetched.length,
          '| With community:', fetched.filter(e => !!e.community).length,
          '| With valid date:', fetched.filter(e => e.date && !isNaN(new Date(e.date).getTime())).length);

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

    // Always filter out junk: must have valid community tag + valid date
    const beforeCount = result.length;
    result = result.filter((e) => {
      const hasCommunity = e?.community && e.community.trim() !== '';
      const hasDate = e?.date && e.date.trim() !== '';
      return hasCommunity && hasDate;
    });
    console.log(`Total events: ${beforeCount}, After filter: ${result.length}`);

    // Category filter
    if (categoryFilter) {
      result = result.filter((e) => e?.category === categoryFilter);
    }

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

    // Sort by date: soonest first or newest first
    result.sort((a, b) => {
      const da = a?.date ? new Date(a.date).getTime() : 0;
      const db = b?.date ? new Date(b.date).getTime() : 0;
      return sortOrder === 'soonest' ? da - db : db - da;
    });

    return result;
  })();

  function clearAll() {
    setFeedFilter('community');
    setStatusFilter('all');
    setCategoryFilter('');
    setSortOrder('newest');
    setSearchQuery('');
  }

  const hasActiveFilters = feedFilter !== 'community' || statusFilter !== 'all' || categoryFilter !== '' || searchQuery.trim() !== '';

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">
          Events
        </h1>
        <Link
          href="/create-event"
          className="bg-orange text-cream px-5 py-2.5 text-sm font-semibold hover:bg-orange-light transition-colors"
        >
          Create an event
        </Link>
      </div>

      {/* ── Feed toggle: Community / All ── */}
      <div className="flex items-center gap-1 mb-6">
        {(['community', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFeedFilter(f)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors font-[family-name:var(--font-kode-mono)] ${
              feedFilter === f
                ? 'bg-ink text-cream'
                : 'text-ink/40 hover:text-ink'
            }`}
          >
            {f === 'community' ? 'Community Events' : 'All Events'}
          </button>
        ))}
        {feedFilter === 'all' && (
          <span className="ml-2 text-[10px] text-warm-gray font-[family-name:var(--font-dm-sans)]">
            Includes independent events
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => setStatusFilter('all')} />
        </div>
      )}

      {/* ── Search input ── */}
      <SearchInput value={searchQuery} onChange={setSearchQuery} />

      {/* ── Filters ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bg-ink text-cream rounded-full px-4 py-2 text-sm font-[family-name:var(--font-dm-sans)] appearance-none cursor-pointer pr-8 focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23F2EDE4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-ink text-cream rounded-full px-4 py-2 text-sm font-[family-name:var(--font-dm-sans)] appearance-none cursor-pointer pr-8 focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23F2EDE4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="">All Types</option>
            {CATEGORY_OPTIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex">
          {(['newest', 'soonest'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortOrder(s)}
              className={`px-4 py-2 text-sm transition-all duration-200 font-[family-name:var(--font-dm-sans)] ${
                s === 'newest' ? 'rounded-l-full' : 'rounded-r-full'
              } ${
                sortOrder === s
                  ? 'bg-ink text-cream'
                  : 'bg-transparent border border-ink/20 text-ink/60 hover:text-ink hover:border-ink/40'
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
            <EventCard key={event?.entityKey} event={event} index={i} showIndependentBadge={feedFilter === 'all'} />
          ))}
        </div>
      )}

    </main>
  );
}
