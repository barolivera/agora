'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, parseCommunity, type ArkivEvent, type ArkivCommunity } from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import { EventCard, CardSkeleton } from '@/app/components/EventCard';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';

const CATEGORY_OPTIONS = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference',
  'Study Group', 'Social', 'Online', 'Other',
] as const;

// ── Search input ─────────────────────────────────────────────────────────────

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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink/60">
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
        className="w-full bg-cream border border-warm-gray text-ink placeholder:text-ink/60 text-sm pl-9 pr-9 py-2.5 font-[family-name:var(--font-geist-sans)] focus:outline-none focus:border-ink"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink transition-colors"
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

// ── Community types & card ────────────────────────────────────────────────────

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type CommunityEntry = {
  slug: string;
  count: number;
  profile?: ArkivCommunity;
};

function CommunityCard({ entry }: { entry: CommunityEntry }) {
  const { slug, count, profile } = entry;
  const displayName = profile?.name || deslugify(slug);
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <Link
      href={`/community/${slug}`}
      className="group flex flex-col gap-4 p-6 border border-warm-gray/40 bg-cream hover:border-cobalt transition-colors"
    >
      {/* Logo / placeholder */}
      <div className="flex items-center gap-4">
        {profile?.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt={displayName}
            width={48}
            height={48}
            className="object-cover shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 flex items-center justify-center text-xl font-bold text-cream font-[family-name:var(--font-kode-mono)] shrink-0"
            style={{ backgroundColor: '#0247E2' }}
          >
            {firstLetter}
          </div>
        )}
        <h2 className="text-xl font-bold text-ink font-[family-name:var(--font-kode-mono)] group-hover:text-cobalt transition-colors leading-snug">
          {displayName}
        </h2>
      </div>

      {/* Description */}
      {profile?.description && (
        <p className="text-sm text-ink/60 line-clamp-2 leading-relaxed">
          {profile.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <p className="text-xs text-ink/60">
          {count} {count === 1 ? 'event' : 'events'}
        </p>
        <span className="text-xs font-semibold text-cobalt tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [events, setEvents] = useState<ArkivEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [homeCommunities, setHomeCommunities] = useState<CommunityEntry[]>([]);
  const [homeCommunitiesLoading, setHomeCommunitiesLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'soonest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchRecentEvents() {
      try {
        const result = await publicClient
          .buildQuery()
          .where(eq('type', 'event'))
          .withPayload(true)
          .limit(50)
          .fetch();

        const entities = result?.entities;
        if (!entities) {
          setEvents([]);
          return;
        }
        setEvents(entities.map(parseEvent));
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
      }
    }

    fetchRecentEvents();
  }, []);

  useEffect(() => {
    async function fetchHomeCommunities() {
      try {
        const [eventsResult, profilesResult] = await Promise.all([
          publicClient
            .buildQuery()
            .where(eq('type', 'event'))
            .withPayload(true)
            .limit(200)
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

        const evts = eventsResult?.entities?.map(parseEvent) ?? [];
        const groups = new Map<string, number>();
        for (const evt of evts) {
          if (evt?.community) {
            groups.set(evt.community, (groups.get(evt.community) ?? 0) + 1);
          }
        }

        const profilesBySlug = new Map<string, ArkivCommunity>();
        for (const entity of profilesResult?.entities ?? []) {
          const profile = parseCommunity(entity);
          if (profile.slug && !profilesBySlug.has(profile.slug)) {
            profilesBySlug.set(profile.slug, profile);
          }
        }

        const allSlugs = new Set([...groups.keys(), ...profilesBySlug.keys()]);
        const result = Array.from(allSlugs)
          .map((slug) => ({
            slug,
            count: groups.get(slug) ?? 0,
            profile: profilesBySlug.get(slug),
          }))
          .sort((a, b) => b.count - a.count);

        setHomeCommunities(result.slice(0, 3));
      } catch {
        // render empty state
      } finally {
        setHomeCommunitiesLoading(false);
      }
    }

    fetchHomeCommunities();
  }, []);

  // Derived: filtered + sorted events (client-side)
  const filteredEvents = (() => {
    let result = [...(events ?? [])];

    // Always filter out junk: must have valid community tag + valid date + not pending approval
    const beforeCount = result.length;
    result = result.filter((e) => {
      const hasCommunity = e?.community && e.community.trim() !== '';
      const hasDate = e?.date && e.date.trim() !== '';
      const notPending = e?.status !== 'pending';
      return hasCommunity && hasDate && notPending;
    });
    console.log(`[Home] Total events: ${beforeCount}, After filter: ${result.length}`);

    if (statusFilter !== 'all') {
      result = result.filter((e) => {
        if (!e) return false;
        const s = e.status === 'cancelled' ? 'cancelled' : getEventStatus(e.date ?? '');
        return s === statusFilter;
      });
    }

    if (categoryFilter) {
      result = result.filter((e) => e?.category === categoryFilter);
    }

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

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative bg-[#211f24] overflow-hidden" style={{ minHeight: '605px' }}>

        {/* Full-bleed background image */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" style={{ width: '1512px', height: '605px' }} aria-hidden="true">
          <img
            src="https://www.figma.com/api/mcp/asset/34d3f32d-8ca5-4f14-95f3-7b7793941ec0"
            alt=""
            className="absolute block max-w-none size-full pointer-events-none select-none"
          />
        </div>

        {/* Content — sits directly on background */}
        <div className="relative z-10 max-w-6xl mx-auto px-6" style={{ paddingTop: '149px', paddingBottom: '80px' }}>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6">
              <h1
                className="font-bold leading-[1.1] font-[family-name:var(--font-kode-mono)] text-ink"
                style={{ fontSize: 'clamp(2.5rem, 4.75vw, 4.5rem)', letterSpacing: '-2.4px', maxWidth: '743px' }}
              >
                <span className="block">The public square,</span>
                <span className="block text-orange">decentralized.</span>
              </h1>
              <p
                className="text-[18px] text-ink leading-[1.625] font-[family-name:var(--font-geist-sans)]"
                style={{ maxWidth: '472px' }}
              >
                Events owned by their communities. RSVPs on-chain. No platform in between.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-[13px]">
              <Link
                href="/create-event"
                className="bg-orange text-cream flex items-center justify-center h-[50px] w-[163px] text-sm font-semibold hover:bg-orange-light transition-colors font-[family-name:var(--font-geist-sans)] whitespace-nowrap"
              >
                Create an event
              </Link>
              <a
                href="#events"
                className="border-2 border-ink text-ink flex items-center justify-center h-[50px] w-[156px] text-sm font-semibold hover:bg-ink hover:text-cream transition-colors font-[family-name:var(--font-geist-sans)] whitespace-nowrap"
              >
                Explore events
              </a>
            </div>
          </div>
        </div>

      </section>

      {/* ── Upcoming Events ──────────────────────────────── */}
      <section id="events" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">
            Upcoming Events
          </h2>
          <Link
            href="/create-event"
            className="text-sm text-cobalt hover:text-cobalt-light font-medium transition-colors"
          >
            + Add yours
          </Link>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* ── Search input ── */}
        <SearchInput value={searchQuery} onChange={setSearchQuery} />

        {/* ── Filters ── */}
        {!loading && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="bg-ink text-cream rounded-full px-4 py-2 text-sm font-[family-name:var(--font-geist-sans)] appearance-none cursor-pointer pr-8 focus:outline-none"
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
                  className="bg-ink text-cream rounded-full px-4 py-2 text-sm font-[family-name:var(--font-geist-sans)] appearance-none cursor-pointer pr-8 focus:outline-none"
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
                    className={`px-4 py-2 text-sm transition-all duration-200 font-[family-name:var(--font-geist-sans)] ${
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
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
            <p className="text-5xl mb-6" role="img" aria-label="columns">🏛️</p>
            <p className="text-2xl text-ink font-[family-name:var(--font-kode-mono)] mb-3">
              The agora awaits.
            </p>
            <p className="text-ink/60 text-sm mb-8 max-w-xs leading-relaxed">
              No events yet — be the first to gather your community.
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
            <p className="text-ink/60 text-sm mb-4">
              {searchQuery.trim()
                ? 'No events match your search.'
                : 'No events match your filters.'}
            </p>
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter(''); setSortOrder('newest'); setSearchQuery(''); }}
              className="text-xs font-semibold text-cobalt underline underline-offset-2 hover:text-cobalt-light transition-colors font-[family-name:var(--font-geist-sans)]"
            >
              Clear {searchQuery.trim() ? 'search' : 'filters'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.slice(0, 6).map((event, i) => (
                <EventCard key={event?.entityKey} event={event} index={i} />
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <Link
                href="/events"
                className="text-[14px] font-semibold text-cobalt hover:text-cobalt-light transition-colors font-[family-name:var(--font-geist-sans)]"
              >
                View all events →
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ── Communities on Agora ─────────────────────────── */}
      {!homeCommunitiesLoading && homeCommunities.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-16 border-t border-warm-gray/30">
          <h2 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-8">
            Communities on Agora
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {homeCommunities.map((entry) => (
              <CommunityCard key={entry.slug} entry={entry} />
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/community"
              className="inline-block px-6 py-3 border border-cobalt text-cobalt text-sm font-semibold hover:bg-cobalt hover:text-cream transition-colors"
            >
              View all communities →
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-ink mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-cream/60 text-sm font-[family-name:var(--font-kode-mono)]">
            Agora — Decentralized events for Web3 communities
          </p>
          <Link
            href="/create-event"
            className="text-sm text-orange hover:text-orange-light transition-colors font-medium"
          >
            Create an event →
          </Link>
        </div>
      </footer>

    </div>
  );
}
