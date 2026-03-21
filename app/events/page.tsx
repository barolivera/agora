'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, parseApproval, parseCommunity, isEventApproved, fetchEventsByStatus, type ArkivEvent, type ArkivApproval } from '@/lib/arkiv';
import { EventCard, CardSkeleton } from '@/components/demos/EventCard';
import { ErrorMessage } from '@/components/demos/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink/80">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
      </span>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search events by title or location..."
        className="pl-9 pr-9 font-[family-name:var(--font-geist-sans)]"
      />
      {/* Clear button */}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/80 hover:text-ink"
          aria-label="Clear search"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </Button>
      )}
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<ArkivEvent[]>([]);
  const [approvals, setApprovals] = useState<Map<string, ArkivApproval>>(new Map());
  const [communityCreators, setCommunityCreators] = useState<Map<string, string>>(new Map());
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
        const [eventsResult, approvalsResult, communitiesResult] = await Promise.all([
          statusFilter === 'all'
            ? publicClient
                .buildQuery()
                .where(eq('type', 'event'))
                .withPayload(true)
                .limit(500)
                .fetch()
            : null,
          publicClient
            .buildQuery()
            .where(eq('type', 'approval'))
            .withPayload(true)
            .limit(500)
            .fetch()
            .catch(() => null),
          publicClient
            .buildQuery()
            .where(eq('type', 'community'))
            .withPayload(true)
            .limit(500)
            .fetch()
            .catch(() => null),
        ]);

        let fetched: ArkivEvent[];
        if (statusFilter === 'all') {
          fetched = eventsResult?.entities?.map(parseEvent) ?? [];
        } else {
          fetched = await fetchEventsByStatus(statusFilter);
        }

        if (!cancelled) {
          setEvents(fetched);

          const approvalMap = new Map<string, ArkivApproval>();
          for (const entity of approvalsResult?.entities ?? []) {
            const a = parseApproval(entity);
            approvalMap.set(a.eventId, a);
          }
          setApprovals(approvalMap);

          const creatorsMap = new Map<string, string>();
          for (const entity of communitiesResult?.entities ?? []) {
            const c = parseCommunity(entity);
            if (c.slug && c.createdBy && !creatorsMap.has(c.slug)) {
              creatorsMap.set(c.slug, c.createdBy);
            }
          }
          setCommunityCreators(creatorsMap);
        }
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

    // Always filter out junk: must have valid community tag + valid date + approved
    result = result.filter((e) => {
      const hasCommunity = e?.community && e.community.trim() !== '';
      const hasDate = e?.date && e.date.trim() !== '';
      const approved = isEventApproved(e, approvals, communityCreators);
      return hasCommunity && hasDate && approved;
    });
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
          <Button
            key={f}
            variant={feedFilter === f ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFeedFilter(f)}
            className={`text-[11px] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-kode-mono)] ${
              feedFilter === f
                ? 'bg-ink text-cream hover:bg-ink/90'
                : 'text-ink/80 hover:text-ink'
            }`}
          >
            {f === 'community' ? 'Community Events' : 'All Events'}
          </Button>
        ))}
        {feedFilter === 'all' && (
          <span className="ml-2 text-[10px] text-ink/80 font-[family-name:var(--font-geist-sans)]">
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-50"
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-50"
          >
            <option value="">All Types</option>
            {CATEGORY_OPTIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex">
          {(['newest', 'soonest'] as const).map((s) => (
            <Button
              key={s}
              variant={sortOrder === s ? 'default' : 'outline'}
              size="default"
              onClick={() => setSortOrder(s)}
              className={`font-[family-name:var(--font-geist-sans)] ${
                s === 'newest' ? 'rounded-l-full rounded-r-none' : 'rounded-r-full rounded-l-none'
              } ${
                sortOrder === s
                  ? 'bg-ink text-cream hover:bg-ink/90'
                  : 'bg-transparent border-ink/20 text-ink/80 hover:text-ink hover:border-ink/40'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : events.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
          <p className="text-2xl text-ink font-[family-name:var(--font-kode-mono)] mb-3">
            No events yet.
          </p>
          <p className="text-ink/80 text-sm mb-8">
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
          <p className="text-ink/80 text-sm mb-4">
            {searchQuery.trim()
              ? 'No events match your search.'
              : 'No events match your filters.'}
          </p>
          <Button
            variant="link"
            onClick={clearAll}
            className="text-xs font-semibold text-cobalt hover:text-cobalt-light font-[family-name:var(--font-geist-sans)]"
          >
            Clear {searchQuery.trim() ? 'search' : 'filters'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredEvents.map((event, i) => (
            <EventCard key={event?.entityKey} event={event} index={i} showIndependentBadge={feedFilter === 'all'} />
          ))}
        </div>
      )}

    </main>
  );
}
