import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import {
  publicClient,
  parseEvent,
  parseCommunity,
  type ArkivEvent,
  type ArkivCommunity,
} from '@/lib/arkiv';

// ── Helpers ───────────────────────────────────────────────────────────────────

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const displayName = deslugify(name);
  return {
    title: `${displayName} — Agora`,
    description: `Events from the ${displayName} community on Agora`,
    openGraph: {
      title: `${displayName} on Agora`,
      description: `Discover ${displayName} community events`,
    },
  };
}

// ── Event card (server-safe) ───────────────────────────────────────────────────

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

  return (
    <Link
      href={`/event/${event?.entityKey}`}
      className="flex flex-col aspect-[3/4] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{ background: bg, color: fg }}
    >
      <div className="flex-1 flex flex-col p-5">
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
        <h3 className="text-xl font-bold leading-snug font-[family-name:var(--font-fraunces)] mt-6 line-clamp-3">
          {event?.title || 'Untitled Event'}
        </h3>
      </div>

      <div
        className="px-5 py-3 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid rgba(128,128,128,0.2)' }}
      >
        {event?.location ? (
          <span className="text-xs truncate" style={{ opacity: 0.70 }}>
            {event.location}
          </span>
        ) : (
          <span />
        )}
        {event?.organizer && (
          <img
            src={`https://effigy.im/a/${event.organizer}.svg`}
            alt=""
            width={22}
            height={22}
            className="rounded-full shrink-0"
            style={{ opacity: 0.75 }}
          />
        )}
      </div>
    </Link>
  );
}

// ── Profile header ────────────────────────────────────────────────────────────

function ProfileHeader({
  profile,
  name,
  eventCount,
  totalAttendees,
}: {
  profile: ArkivCommunity;
  name: string;
  eventCount: number;
  totalAttendees: number;
}) {
  const displayName = profile.name || deslugify(name);
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <section className="bg-ink py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-warm-gray/50 mb-8">
          <Link href="/community" className="hover:text-warm-gray transition-colors">
            Communities
          </Link>
          {' '}/ {name}
        </p>

        {/* Logo + name + description row */}
        <div className="flex items-start gap-6 mb-6">
          {/* Logo */}
          <div className="shrink-0">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={displayName}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 flex items-center justify-center text-3xl font-bold text-cream font-[family-name:var(--font-fraunces)]"
                style={{ backgroundColor: '#0247E2' }}
              >
                {firstLetter}
              </div>
            )}
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl sm:text-5xl font-bold text-cream font-[family-name:var(--font-fraunces)] mb-3 leading-tight">
              {displayName}
            </h1>
            {profile.description && (
              <p className="text-warm-gray text-base max-w-2xl leading-relaxed font-[family-name:var(--font-dm-sans)]">
                {profile.description}
              </p>
            )}
          </div>
        </div>

        {/* Social links */}
        {(profile.website || profile.twitter || profile.discord) && (
          <div className="flex items-center gap-5 mb-6">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-cream transition-colors"
              >
                <span aria-hidden="true">🌐</span>
                <span>Website</span>
              </a>
            )}
            {profile.twitter && (
              <a
                href={
                  profile.twitter.startsWith('http')
                    ? profile.twitter
                    : `https://x.com/${profile.twitter.replace(/^@/, '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-cream transition-colors"
              >
                <span aria-hidden="true" className="font-bold">𝕏</span>
                <span>{profile.twitter.startsWith('@') ? profile.twitter : `@${profile.twitter}`}</span>
              </a>
            )}
            {profile.discord && (
              <a
                href={profile.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-cream transition-colors"
              >
                <span aria-hidden="true">💬</span>
                <span>Discord</span>
              </a>
            )}
          </div>
        )}

        {/* Actions + stats row */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/community/edit/${name}`}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold border border-cobalt text-cobalt hover:bg-cobalt hover:text-cream transition-colors tracking-wide uppercase"
          >
            Edit community
          </Link>
          <p className="text-warm-gray/70 text-sm">
            {eventCount} {eventCount === 1 ? 'event' : 'events'}
            {' · '}
            {totalAttendees} total {totalAttendees === 1 ? 'attendee' : 'attendees'}
          </p>
        </div>

        {/* Created by */}
        {profile.createdBy && (
          <p className="text-warm-gray/50 text-xs mt-4">
            Created by{' '}
            <Link
              href={`/profile/${profile.createdBy}`}
              className="font-mono hover:text-warm-gray transition-colors underline underline-offset-2"
            >
              {shortAddress(profile.createdBy)}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

// ── Basic header (no profile) ─────────────────────────────────────────────────

function BasicHeader({
  name,
  eventCount,
  totalAttendees,
}: {
  name: string;
  eventCount: number;
  totalAttendees: number;
}) {
  const displayName = deslugify(name);
  return (
    <section className="bg-ink py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-warm-gray/50 mb-3">
          <Link href="/community" className="hover:text-warm-gray transition-colors">
            Communities
          </Link>
          {' '}/ {name}
        </p>
        <h1 className="text-5xl sm:text-6xl font-bold text-cream font-[family-name:var(--font-fraunces)] mb-4">
          {displayName}
        </h1>
        <p className="text-warm-gray text-base mb-8">
          {eventCount} {eventCount === 1 ? 'event' : 'events'}
          {' · '}
          {totalAttendees} total {totalAttendees === 1 ? 'attendee' : 'attendees'}
        </p>

        {/* Claim CTA */}
        <div className="inline-flex flex-col gap-3 p-5 border border-warm-gray/20 bg-white/5">
          <p className="text-sm text-warm-gray max-w-sm">
            No community profile yet. Add a description, logo, and social links.
          </p>
          <Link
            href={`/community/create?slug=${name}&name=${name}`}
            className="inline-flex items-center self-start bg-orange text-cream px-5 py-2.5 text-sm font-semibold hover:bg-orange-light transition-colors"
          >
            Claim this community page →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  let events: ArkivEvent[] = [];
  let totalAttendees = 0;
  let communityProfile: ArkivCommunity | null = null;

  try {
    // Fetch community profile and events in parallel
    const [profileResult, eventsResult] = await Promise.all([
      publicClient
        .buildQuery()
        .where([eq('type', 'community'), eq('slug', name)])
        .withPayload(true)
        .limit(1)
        .fetch()
        .catch(() => null),
      publicClient
        .buildQuery()
        .where([eq('type', 'event'), eq('community', name)])
        .withPayload(true)
        .fetch()
        .catch(() => null),
    ]);

    const profileEntity = profileResult?.entities?.[0];
    if (profileEntity) {
      communityProfile = parseCommunity(profileEntity);
    }

    events = eventsResult?.entities?.map(parseEvent) ?? [];

    if (events.length > 0) {
      const rsvpCounts = await Promise.all(
        events.map(async (event) => {
          try {
            const r = await publicClient
              .buildQuery()
              .where([eq('type', 'rsvp'), eq('eventId', event.entityKey)])
              .fetch();
            return r?.entities?.length ?? 0;
          } catch {
            return 0;
          }
        })
      );
      totalAttendees = rsvpCounts.reduce((sum, n) => sum + n, 0);
    }
  } catch {
    // render with empty state
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Header ────────────────────────────────────────── */}
      {communityProfile ? (
        <ProfileHeader
          profile={communityProfile}
          name={name}
          eventCount={events.length}
          totalAttendees={totalAttendees}
        />
      ) : (
        <BasicHeader
          name={name}
          eventCount={events.length}
          totalAttendees={totalAttendees}
        />
      )}

      {/* ── Events grid ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        {events.length === 0 ? (
          <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
            <p className="text-5xl mb-6" role="img" aria-label="columns">🏛️</p>
            <p className="text-2xl text-ink font-[family-name:var(--font-fraunces)] mb-3">
              No events yet.
            </p>
            <p className="text-warm-gray text-sm mb-8 max-w-xs leading-relaxed">
              Be the first to create an event for this community.
            </p>
            <Link
              href="/create-event"
              className="bg-orange text-cream px-6 py-3 text-sm font-semibold hover:bg-orange-light transition-colors"
            >
              Create an event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, i) => (
              <EventCard key={event?.entityKey} event={event} index={i} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
