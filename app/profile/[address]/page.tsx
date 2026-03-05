'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { getAddress } from 'viem';
import { and, eq } from '@arkiv-network/sdk/query';
import {
  publicClient,
  parseEvent,
  parseProfile,
  parseCommunity,
  parseSubscription,
  parseAttendance,
  parseRSVP,
  fetchRSVPsByEvent,
  shortAddress,
  type ArkivEvent,
  type ArkivProfile,
  type ArkivCommunity,
  type ArkivSubscription,
  type ArkivAttendance,
  type ArkivRSVP,
} from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import { deslugify } from '@/lib/utils';

const GRADIENTS: [string, string][] = [
  ['#E8491C', '#C8C0B4'],
  ['#0247E2', '#F2EDE4'],
  ['#1A1614', '#E8491C'],
  ['#D4E84C', '#E8491C'],
  ['#3D72F5', '#F2EDE4'],
];

function gradientFor(title: string): string {
  if (!title.trim()) return 'linear-gradient(135deg, #C8C0B4, #F2EDE4)';
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff;
  const [a, b] = GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function fmtDate(d: string) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    full: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EventThumbnail({ event }: { event: ArkivEvent }) {
  const [imgError, setImgError] = useState(false);
  if (event.coverImageUrl && !imgError) {
    return (
      <img
        src={event.coverImageUrl}
        alt={`${event.title} cover`}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }
  return <div className="w-full h-full" style={{ background: gradientFor(event.title) }} />;
}

function EventRow({ event, muted = false }: { event: ArkivEvent; muted?: boolean }) {
  const d = fmtDate(event.date);
  return (
    <Link
      href={`/event/${event.entityKey}`}
      className={`flex gap-4 group ${muted ? 'opacity-50 hover:opacity-70' : 'hover:opacity-90'} transition-opacity`}
    >
      <div className="w-24 h-[68px] shrink-0 overflow-hidden relative">
        <EventThumbnail event={event} />
        {d && (
          <div className="absolute bottom-0.5 left-0.5 bg-cream/90 backdrop-blur-sm px-1.5 py-0.5 flex items-center gap-0.5">
            <span className="text-xs font-bold text-ink font-[family-name:var(--font-kode-mono)] leading-none">{d.day}</span>
            <span className="text-[7px] font-bold tracking-wider text-ink/80 uppercase">{d.month}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <h3 className="text-sm font-semibold text-ink group-hover:text-cobalt transition-colors truncate font-[family-name:var(--font-kode-mono)]">
          {event.title || 'Untitled'}
        </h3>
        {event.location && (
          <p className="text-xs text-ink/80 mt-1 truncate">
            <span className="mr-1">📍</span>{event.location}
          </p>
        )}
        {event.community && (
          <p className="text-xs text-cobalt/70 mt-0.5 truncate">{event.community}</p>
        )}
      </div>
    </Link>
  );
}

function SmallEventCard({ event }: { event: ArkivEvent }) {
  const d = fmtDate(event.date);
  return (
    <Link href={`/event/${event.entityKey}`} className="flex-shrink-0 w-40 group">
      <div className="w-40 h-28 overflow-hidden">
        <EventThumbnail event={event} />
      </div>
      <p className="text-xs font-semibold text-ink group-hover:text-cobalt mt-1.5 truncate font-[family-name:var(--font-kode-mono)] transition-colors">
        {event.title || 'Untitled'}
      </p>
      {d && <p className="text-[10px] text-ink/80 mt-0.5">{d.full}</p>}
    </Link>
  );
}

function CommunityCard({ slug, community }: { slug: string; community?: ArkivCommunity }) {
  const name = community?.name || deslugify(slug);
  const logo = community?.logoUrl;
  return (
    <Link
      href={`/community/${slug}`}
      className="flex items-center gap-3 p-3 border border-warm-gray/20 hover:border-warm-gray/40 transition-colors group"
    >
      {logo ? (
        <img src={logo} alt={`${name} logo`} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-cobalt/10 flex items-center justify-center shrink-0">
          <span className="text-cobalt font-bold text-sm font-[family-name:var(--font-kode-mono)]">
            {name.charAt(0)}
          </span>
        </div>
      )}
      <span className="text-sm font-medium text-ink group-hover:text-cobalt transition-colors truncate font-[family-name:var(--font-geist-sans)]">
        {name}
      </span>
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-4">
      {children}
    </h2>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink py-16 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start gap-6 animate-pulse">
          <div className="w-[120px] h-[120px] rounded-full bg-warm-gray/20 shrink-0" />
          <div className="flex-1 space-y-3 pt-2 w-full">
            <div className="h-8 bg-warm-gray/20 rounded w-1/3" />
            <div className="h-4 bg-warm-gray/20 rounded w-1/4" />
            <div className="h-3 bg-warm-gray/20 rounded w-2/3 mt-4" />
            <div className="h-3 bg-warm-gray/20 rounded w-1/2" />
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 animate-pulse space-y-6">
        <div className="h-5 bg-warm-gray/20 rounded w-1/5" />
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-4">
            <div className="w-24 h-[68px] bg-warm-gray/15" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-warm-gray/15 rounded w-2/3" />
              <div className="h-3 bg-warm-gray/15 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const params = useParams();
  const raw = params?.address;
  const address = (Array.isArray(raw) ? raw[0] : raw ?? '').toLowerCase();

  const { address: connectedAddress } = useAccount();

  const [profile, setProfile] = useState<ArkivProfile | null>(null);
  const [events, setEvents] = useState<ArkivEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<ArkivSubscription[]>([]);
  const [communities, setCommunities] = useState<Map<string, ArkivCommunity>>(new Map());
  const [commonEvents, setCommonEvents] = useState<ArkivEvent[]>([]);
  const [attendances, setAttendances] = useState<ArkivAttendance[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<ArkivEvent[]>([]);
  const [rsvps, setRsvps] = useState<ArkivRSVP[]>([]);
  const [goingEvents, setGoingEvents] = useState<ArkivEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isOwner = !!connectedAddress && connectedAddress.toLowerCase() === address;
  const isOtherUser = !!connectedAddress && !isOwner;

  // ── Main data fetch ──────────────────────────────────────────────────────────
  //
  // Old entities stored the checksummed (EIP-55 mixed-case) address in their
  // attributes; new entities use lowercase. We query with BOTH formats and
  // merge/deduplicate so the profile works regardless of when the data was written.

  useEffect(() => {
    if (!address) return;

    async function load() {
      setLoading(true);
      try {
        // Compute the checksummed form so we can also match old entities
        let checksumAddr: string | null = null;
        try {
          const cs = getAddress(address as `0x${string}`);
          if (cs !== address) checksumAddr = cs;
        } catch { /* invalid address — skip */ }

        // Run all queries in parallel
        const [profileRes, eventsLower, eventsChecksum, subsLower, subsChecksum, attendLower, attendChecksum, rsvpLower, rsvpChecksum] = await Promise.all([
          // Profile — always stored with lowercase address
          publicClient.buildQuery()
            .where(and([eq('type', 'profile'), eq('address', address)]))
            .withPayload(true).limit(1).fetch().catch(() => null),
          // Events by organizer — lowercase (new data)
          publicClient.buildQuery()
            .where(and([eq('type', 'event'), eq('organizer', address)]))
            .withPayload(true).fetch().catch(() => null),
          // Events by organizer — checksummed (old data)
          checksumAddr
            ? publicClient.buildQuery()
                .where(and([eq('type', 'event'), eq('organizer', checksumAddr)]))
                .withPayload(true).fetch().catch(() => null)
            : Promise.resolve(null),
          // Subscriptions — lowercase (new data)
          publicClient.buildQuery()
            .where(and([eq('type', 'subscription'), eq('subscriber', address)]))
            .withPayload(true).fetch().catch(() => null),
          // Subscriptions — checksummed (old data)
          checksumAddr
            ? publicClient.buildQuery()
                .where(and([eq('type', 'subscription'), eq('subscriber', checksumAddr)]))
                .withPayload(true).fetch().catch(() => null)
            : Promise.resolve(null),
          // Attendance records — lowercase
          publicClient.buildQuery()
            .where(and([eq('type', 'attendance'), eq('attendee', address)]))
            .withPayload(true).fetch().catch(() => null),
          // Attendance records — checksummed
          checksumAddr
            ? publicClient.buildQuery()
                .where(and([eq('type', 'attendance'), eq('attendee', checksumAddr)]))
                .withPayload(true).fetch().catch(() => null)
            : Promise.resolve(null),
          // RSVPs — lowercase
          publicClient.buildQuery()
            .where(and([eq('type', 'rsvp'), eq('attendee', address)]))
            .withPayload(true).fetch().catch(() => null),
          // RSVPs — checksummed
          checksumAddr
            ? publicClient.buildQuery()
                .where(and([eq('type', 'rsvp'), eq('attendee', checksumAddr)]))
                .withPayload(true).fetch().catch(() => null)
            : Promise.resolve(null),
        ]);

        setProfile(profileRes?.entities?.[0] ? parseProfile(profileRes.entities[0]) : null);

        // Merge events from both queries, deduplicate by entityKey
        const eventMap = new Map<string, ArkivEvent>();
        for (const res of [eventsLower, eventsChecksum]) {
          for (const entity of res?.entities ?? []) {
            const parsed = parseEvent(entity);
            if (parsed.entityKey) eventMap.set(parsed.entityKey, parsed);
          }
        }
        setEvents([...eventMap.values()]);

        // Merge subscriptions from both queries, deduplicate by entityKey
        const subMap = new Map<string, ArkivSubscription>();
        for (const res of [subsLower, subsChecksum]) {
          for (const entity of res?.entities ?? []) {
            const parsed = parseSubscription(entity);
            if (parsed.entityKey) subMap.set(parsed.entityKey, parsed);
          }
        }
        setSubscriptions([...subMap.values()]);

        // Merge attendance records
        const attendMap = new Map<string, ArkivAttendance>();
        for (const res of [attendLower, attendChecksum]) {
          for (const entity of res?.entities ?? []) {
            const parsed = parseAttendance(entity);
            if (parsed.entityKey) attendMap.set(parsed.entityKey, parsed);
          }
        }
        setAttendances([...attendMap.values()]);

        // Merge RSVPs
        const rsvpMap = new Map<string, ArkivRSVP>();
        for (const res of [rsvpLower, rsvpChecksum]) {
          for (const entity of res?.entities ?? []) {
            const parsed = parseRSVP(entity);
            if (parsed.entityKey) rsvpMap.set(parsed.entityKey, parsed);
          }
        }
        setRsvps([...rsvpMap.values()]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [address]);

  // ── Fetch community details for subscriptions ────────────────────────────────

  useEffect(() => {
    if (subscriptions.length === 0) {
      setCommunities(new Map());
      return;
    }

    async function loadCommunities() {
      const slugs = [...new Set(subscriptions.map(s => s.communitySlug).filter(Boolean))];
      const results = await Promise.all(
        slugs.map(slug =>
          publicClient.buildQuery()
            .where(and([eq('type', 'community'), eq('slug', slug)]))
            .withPayload(true).limit(1).fetch().catch(() => null)
        )
      );
      const map = new Map<string, ArkivCommunity>();
      results.forEach((res, i) => {
        const entity = res?.entities?.[0];
        if (entity) map.set(slugs[i], parseCommunity(entity));
      });
      setCommunities(map);
    }

    loadCommunities();
  }, [subscriptions]);

  // ── Fetch event details for attendance records ─────────────────────────────

  useEffect(() => {
    if (attendances.length === 0) {
      setAttendedEvents([]);
      return;
    }

    async function loadAttendedEvents() {
      const eventIds = [...new Set(attendances.map(a => a.eventId).filter(Boolean))];
      const results = await Promise.all(
        eventIds.map(eid =>
          publicClient.getEntity(eid as `0x${string}`)
            .then(parseEvent)
            .catch(() => null)
        )
      );
      setAttendedEvents(results.filter((e): e is ArkivEvent => e !== null && !!e.entityKey));
    }

    loadAttendedEvents();
  }, [attendances]);

  // ── Fetch event details for RSVPs ("Going") ────────────────────────────────

  useEffect(() => {
    if (rsvps.length === 0) {
      setGoingEvents([]);
      return;
    }

    async function loadGoingEvents() {
      const eventIds = [...new Set(rsvps.map(r => r.eventId).filter(Boolean))];
      const results = await Promise.all(
        eventIds.map(eid =>
          publicClient.getEntity(eid as `0x${string}`)
            .then(parseEvent)
            .catch(() => null)
        )
      );
      const fetched = results.filter((e): e is ArkivEvent => e !== null && !!e.entityKey);

      // Only upcoming/live events, exclude events this user organized
      const going = fetched.filter(e => {
        const status = e.status === 'cancelled' ? 'cancelled' : getEventStatus(e.date ?? '');
        if (status !== 'upcoming' && status !== 'live') return false;
        if ((e.organizer?.toLowerCase() ?? '') === address) return false;
        return true;
      });

      going.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setGoingEvents(going);
    }

    loadGoingEvents();
  }, [rsvps, address]);

  // ── Events in common (lazy, only for other users) ────────────────────────────

  useEffect(() => {
    if (!isOtherUser || events.length === 0 || !connectedAddress) {
      setCommonEvents([]);
      return;
    }

    async function loadCommon() {
      const viewerAddr = connectedAddress!.toLowerCase();
      // Check RSVPs for profile user's events to find viewer in attendees
      const eventsToCheck = events.slice(0, 10);
      const rsvpResults = await Promise.all(
        eventsToCheck.map(e => fetchRSVPsByEvent(e.entityKey).catch(() => []))
      );

      const common: ArkivEvent[] = [];
      rsvpResults.forEach((rsvps, i) => {
        if (rsvps.some(r => r.attendee.toLowerCase() === viewerAddr)) {
          common.push(eventsToCheck[i]);
        }
      });
      setCommonEvents(common);
    }

    loadCommon();
  }, [events, isOtherUser, connectedAddress]);

  // ── Copy address to clipboard ────────────────────────────────────────────────

  function copyAddress() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  // ── Derived data ─────────────────────────────────────────────────────────────

  const displayName = profile?.nickname || shortAddress(address);
  const avatar = profile?.avatarUrl || `https://effigy.im/a/${address}.svg`;

  const upcoming = events
    .filter(e => {
      const status = e.status === 'cancelled' ? 'cancelled' : getEventStatus(e.date ?? '');
      return status !== 'ended' && status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events
    .filter(e => {
      const status = e.status === 'cancelled' ? 'cancelled' : getEventStatus(e.date ?? '');
      return status === 'ended' || status === 'cancelled';
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Profile Header ──────────────────────────────────────────────────── */}
      <section className="bg-ink px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* Avatar */}
            <img
              src={avatar}
              alt={displayName}
              width={120}
              height={120}
              className="w-[120px] h-[120px] rounded-full ring-2 ring-cream/15 shrink-0 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://effigy.im/a/${address}.svg`;
              }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-cream font-[family-name:var(--font-kode-mono)] leading-tight">
                    {displayName}
                  </h1>

                  {/* Wallet address — clickable to copy */}
                  <button
                    onClick={copyAddress}
                    className="text-warm-gray font-mono text-sm mt-1.5 hover:text-cream transition-colors inline-flex items-center gap-1.5 group"
                  >
                    {shortAddress(address)}
                    <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    {copied && <span className="text-[#D4E84C] text-xs font-[family-name:var(--font-geist-sans)]">Copied!</span>}
                  </button>
                </div>

                {/* Edit profile — owner only */}
                {isOwner && (
                  <Link
                    href="/profile"
                    className="shrink-0 self-center sm:self-start px-4 py-2 text-xs font-semibold border border-cream/30 text-cream/70 hover:bg-cream/10 hover:text-cream transition-colors uppercase tracking-wide"
                  >
                    Edit profile
                  </Link>
                )}
              </div>

              {/* Location */}
              {profile?.location && (
                <p className="text-warm-gray/70 text-sm mt-3 inline-flex items-center gap-1.5">
                  <span aria-hidden="true">📍</span>{profile.location}
                </p>
              )}

              {/* Bio */}
              {profile?.bio && (
                <p className="text-cream/70 text-sm mt-3 leading-relaxed max-w-lg font-[family-name:var(--font-geist-sans)]">
                  {profile.bio}
                </p>
              )}

              {/* Social links */}
              {(profile?.twitter || profile?.discord || profile?.farcaster) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                  {profile.twitter && (
                    <a
                      href={profile.twitter.startsWith('http') ? profile.twitter : `https://x.com/${profile.twitter.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-cream transition-colors"
                    >
                      <span className="font-bold">𝕏</span>
                      <span>{profile.twitter.startsWith('@') ? profile.twitter : `@${profile.twitter}`}</span>
                    </a>
                  )}
                  {profile.discord && (
                    <a
                      href={profile.discord.startsWith('http') ? profile.discord : `https://discord.com/users/${profile.discord}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-cream transition-colors"
                    >
                      <span aria-hidden="true">💬</span>
                      <span>{profile.discord}</span>
                    </a>
                  )}
                  {profile.farcaster && (
                    <a
                      href={profile.farcaster.startsWith('http') ? profile.farcaster : `https://warpcast.com/${profile.farcaster.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-cream transition-colors"
                    >
                      <span aria-hidden="true">🟣</span>
                      <span>{profile.farcaster.startsWith('@') ? profile.farcaster : `@${profile.farcaster}`}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-5 mt-5 text-sm text-cream/60 font-[family-name:var(--font-geist-sans)]">
                <span>
                  <strong className="text-cream">{events.length}</strong> Events organized
                </span>
                <span className="text-cream/50">·</span>
                <span>
                  <strong className="text-cream">{attendances.length}</strong> Events attended
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">

        {/* Events in common */}
        {commonEvents.length > 0 && (
          <section>
            <SectionTitle>Events in common</SectionTitle>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {commonEvents.slice(0, 4).map(e => (
                <SmallEventCard key={e.entityKey} event={e} />
              ))}
              {commonEvents.length > 4 && (
                <div className="flex-shrink-0 w-28 flex items-center justify-center">
                  <span className="text-sm text-cobalt font-semibold font-[family-name:var(--font-geist-sans)]">
                    +{commonEvents.length - 4} more
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 1: Organizing — upcoming events */}
        <section>
          <SectionTitle>Organizing</SectionTitle>
          {upcoming.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {upcoming.map(e => (
                <SmallEventCard key={e.entityKey} event={e} />
              ))}
            </div>
          ) : (
            <p className="text-ink/80 text-sm font-[family-name:var(--font-geist-sans)]">
              No upcoming events
            </p>
          )}
        </section>

        {/* Section 2: Going — upcoming RSVPs (not organized by this user) */}
        <section>
          <SectionTitle>Going</SectionTitle>
          {goingEvents.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {goingEvents.map(e => (
                <SmallEventCard key={e.entityKey} event={e} />
              ))}
            </div>
          ) : (
            <p className="text-ink/80 text-sm font-[family-name:var(--font-geist-sans)]">
              No upcoming events
            </p>
          )}
        </section>

        {/* Section 3: Past events */}
        <section>
          <SectionTitle>Past events</SectionTitle>
          {past.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {past.map(e => (
                <SmallEventCard key={e.entityKey} event={e} />
              ))}
            </div>
          ) : (
            <p className="text-ink/80 text-sm font-[family-name:var(--font-geist-sans)]">
              No past events
            </p>
          )}
        </section>

        {/* Section 4: Attended */}
        <section>
          <SectionTitle>Attended</SectionTitle>
          {attendedEvents.length > 0 ? (
            <div className="space-y-4">
              {attendedEvents.map(e => (
                <EventRow key={e.entityKey} event={e} muted={getEventStatus(e.date ?? '') === 'ended'} />
              ))}
            </div>
          ) : (
            <p className="text-ink/80 text-sm font-[family-name:var(--font-geist-sans)]">
              No attended events yet
            </p>
          )}
        </section>

        {/* Communities */}
        {subscriptions.length > 0 && (
          <section>
            <SectionTitle>Communities</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subscriptions
                .filter((sub, i, arr) => arr.findIndex(s => s.communitySlug === sub.communitySlug) === i)
                .map(sub => (
                <CommunityCard
                  key={sub.entityKey}
                  slug={sub.communitySlug}
                  community={communities.get(sub.communitySlug)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
