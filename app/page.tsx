'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, parseCommunity, type ArkivEvent, type ArkivCommunity } from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import StatusBadge from '@/app/components/StatusBadge';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';

// Poster color rotation: orange, cobalt, ink, yellow
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

// ── Constructivist crowd silhouette ───────────────────────────────────────────

function CrowdSilhouette() {
  return (
    <svg
      viewBox="0 0 520 420"
      fill="#E8491C"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-full max-w-xl select-none"
    >
      {/* === BACKGROUND FIGURES (ghostly, small) === */}

      {/* BG-1: tiny, far left */}
      <g opacity="0.22">
        <circle cx="24" cy="176" r="8" />
        <polygon points="16,184 32,184 35,238 13,238" />
        <polygon points="16,224 24,224 20,274 12,274" />
        <polygon points="24,224 32,224 34,272 27,272" />
        <polygon points="32,188 42,186 44,148 34,150" />
      </g>

      {/* BG-2: tiny, upper-center background */}
      <g opacity="0.18">
        <circle cx="184" cy="162" r="7" />
        <polygon points="177,169 191,169 193,216 175,216" />
        <polygon points="177,202 184,202 181,246 173,246" />
        <polygon points="184,202 191,202 193,244 186,244" />
      </g>

      {/* BG-3: tiny, far right background */}
      <g opacity="0.22">
        <circle cx="498" cy="170" r="8" />
        <polygon points="490,178 506,178 508,234 488,234" />
        <polygon points="490,220 498,220 494,272 486,272" />
        <polygon points="498,220 506,220 508,270 501,270" />
        <polygon points="506,182 516,179 518,138 508,141" />
      </g>

      {/* BG-4: small, peeking behind main figures */}
      <g opacity="0.26">
        <circle cx="202" cy="248" r="9" />
        <polygon points="193,257 211,257 213,308 191,308" />
        <polygon points="193,294 202,294 198,344 190,344" />
        <polygon points="202,294 211,294 213,342 205,342" />
      </g>

      {/* === MID-GROUND FIGURES === */}

      {/* MID-1: left, striding forward with arm extended */}
      <g opacity="0.48">
        <circle cx="76" cy="108" r="14" />
        <polygon points="62,122 90,122 95,206 58,206" />
        {/* left leg strides forward */}
        <polygon points="62,184 76,184 68,306 50,306" />
        {/* right leg pushes back */}
        <polygon points="76,184 91,184 97,298 79,298" />
        {/* left arm reaches forward */}
        <polygon points="62,128 46,125 28,183 47,186" />
        {/* right arm drives back */}
        <polygon points="90,128 106,132 120,180 102,184" />
      </g>

      {/* MID-2: right of center, arm raised high */}
      <g opacity="0.44">
        <circle cx="312" cy="98" r="13" />
        <polygon points="299,111 325,111 330,193 294,193" />
        {/* legs */}
        <polygon points="299,173 312,173 305,290 287,290" />
        <polygon points="312,173 326,173 330,284 314,284" />
        {/* left arm raised */}
        <polygon points="299,116 282,112 270,56 288,60" />
        {/* right arm out to side */}
        <polygon points="325,116 340,120 356,168 340,172" />
      </g>

      {/* === FOREGROUND FIGURES (large, bold) === */}

      {/* FG-1: LARGE center-left — powerful forward stride */}
      <g opacity="0.86">
        <circle cx="155" cy="34" r="22" />
        {/* torso, slight forward lean */}
        <polygon points="133,56 177,56 184,176 126,176" />
        {/* left leg takes big stride */}
        <polygon points="133,153 153,153 140,320 114,320" />
        {/* right leg drives off */}
        <polygon points="153,153 176,153 186,314 162,314" />
        {/* left arm swings aggressively forward */}
        <polygon points="133,64 110,62 84,126 110,130" />
        {/* right arm drives back */}
        <polygon points="177,64 198,68 218,128 196,132" />
      </g>

      {/* FG-2: LARGE right of center — FIST RAISED to sky */}
      <g opacity="0.92">
        <circle cx="355" cy="26" r="21" />
        <polygon points="334,47 376,47 384,162 326,162" />
        {/* legs, solid stance */}
        <polygon points="334,140 353,140 345,298 320,298" />
        <polygon points="353,140 376,140 382,294 356,294" />
        {/* LEFT arm thrust straight up */}
        <polygon points="334,54 316,49 298,2 317,7" />
        {/* raised fist block */}
        <rect x="292" y="0" width="22" height="16" />
        {/* right arm wide out */}
        <polygon points="376,54 394,58 420,110 400,114" />
      </g>

      {/* FG-3: right — both arms in victory V */}
      <g opacity="0.70">
        <circle cx="440" cy="50" r="18" />
        <polygon points="422,68 458,68 464,156 416,156" />
        {/* legs */}
        <polygon points="422,134 440,134 432,262 410,262" />
        <polygon points="440,134 458,134 462,258 441,258" />
        {/* left arm raised */}
        <polygon points="422,74 404,70 392,18 410,23" />
        {/* right arm raised — forms V with left */}
        <polygon points="458,68 476,65 486,14 468,18" />
      </g>
    </svg>
  );
}

// ── Poster event card ──────────────────────────────────────────────────────────

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
      {/* Main poster area */}
      <div className="flex-1 flex flex-col p-5">
        {/* Date — large Fraunces numerals at top */}
        {parsedDate ? (
          <div className="mb-auto">
            <div
              className="text-7xl font-bold leading-none font-[family-name:var(--font-fraunces)]"
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

        {/* Title — anchored to bottom of main area */}
        <h3 className="text-xl font-bold leading-snug font-[family-name:var(--font-fraunces)] mt-6 line-clamp-3">
          {event?.title || 'Untitled Event'}
        </h3>
      </div>

      {/* Bottom info strip */}
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
            className="w-12 h-12 flex items-center justify-center text-xl font-bold text-cream font-[family-name:var(--font-fraunces)] shrink-0"
            style={{ backgroundColor: '#0247E2' }}
          >
            {firstLetter}
          </div>
        )}
        <h2 className="text-xl font-bold text-ink font-[family-name:var(--font-fraunces)] group-hover:text-cobalt transition-colors leading-snug">
          {displayName}
        </h2>
      </div>

      {/* Description */}
      {profile?.description && (
        <p className="text-sm text-warm-gray line-clamp-2 leading-relaxed">
          {profile.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <p className="text-xs text-warm-gray/70">
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

    if (statusFilter !== 'all') {
      result = result.filter((e) => {
        if (!e) return false;
        const s = e.status === 'cancelled' ? 'cancelled' : getEventStatus(e.date ?? '');
        return s === statusFilter;
      });
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
      <section className="bg-ink overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center min-h-[600px] py-20">

          {/* Left: typography + CTAs */}
          <div className="flex flex-col gap-8 max-w-2xl">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-cream leading-[0.92] font-[family-name:var(--font-fraunces)]">
              The public square,{' '}
              <span className="text-orange">decentralized.</span>
            </h1>
            <p className="text-lg text-warm-gray max-w-lg leading-relaxed">
              Events owned by their communities. RSVPs on-chain.
              No platform in between.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/create-event"
                className="bg-orange text-cream px-7 py-3.5 text-sm font-semibold hover:bg-orange-light transition-colors"
              >
                Create an event
              </Link>
              <a
                href="#events"
                className="border border-cobalt text-cobalt px-7 py-3.5 text-sm font-semibold hover:bg-cobalt hover:text-cream transition-colors"
              >
                Explore events
              </a>
            </div>
          </div>

          {/* Right: constructivist crowd SVG */}
          <div className="hidden lg:flex items-center justify-end pr-0">
            <CrowdSilhouette />
          </div>

        </div>
      </section>

      {/* ── Upcoming Events ──────────────────────────────── */}
      <section id="events" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-bold text-ink font-[family-name:var(--font-fraunces)]">
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

        {/* ── Filter bar ── */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-y-1 mb-8 pb-4 border-b border-warm-gray/30">
            {/* Status */}
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

            {/* Divider */}
            <span className="w-px h-4 bg-warm-gray/40 self-center mx-3 hidden sm:block" aria-hidden="true" />

            {/* Sort */}
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
            <p className="text-2xl text-ink font-[family-name:var(--font-fraunces)] mb-3">
              The agora awaits.
            </p>
            <p className="text-warm-gray text-sm mb-8 max-w-xs leading-relaxed">
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
            <p className="text-warm-gray text-sm mb-4">
              {searchQuery.trim()
                ? 'No events match your search.'
                : 'No events match your filters.'}
            </p>
            <button
              onClick={() => { setStatusFilter('all'); setSortOrder('newest'); setSearchQuery(''); }}
              className="text-xs font-semibold text-cobalt underline underline-offset-2 hover:text-cobalt-light transition-colors font-[family-name:var(--font-dm-sans)]"
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
                className="text-sm font-semibold text-cobalt hover:text-cobalt-light transition-colors"
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
          <h2 className="text-4xl font-bold text-ink font-[family-name:var(--font-fraunces)] mb-8">
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
          <p className="text-cream/40 text-sm font-[family-name:var(--font-fraunces)]">
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
