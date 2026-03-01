'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { eq } from '@arkiv-network/sdk/query';
import {
  publicClient,
  parseEvent,
  parseProfile,
  type ArkivEvent,
  type ArkivProfile,
} from '@/lib/arkiv';

const POSTER_BG = ['#E8491C', '#0247E2', '#1A1614', '#D4E84C'] as const;
const POSTER_FG = ['#F2EDE4', '#F2EDE4', '#F2EDE4', '#1A1614'] as const;

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseEventDate(dateStr: string): { day: string; month: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function SmallEventCard({ event, index }: { event: ArkivEvent; index: number }) {
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
      <div className="flex-1 flex flex-col p-4">
        {parsedDate ? (
          <div className="mb-auto">
            <div
              className="text-5xl font-bold leading-none font-[family-name:var(--font-kode-mono)]"
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
        <h3 className="text-base font-bold leading-snug font-[family-name:var(--font-kode-mono)] mt-4 line-clamp-3">
          {event?.title || 'Untitled Event'}
        </h3>
      </div>
      {event?.location && (
        <div
          className="px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(128,128,128,0.2)' }}
        >
          <span className="text-xs truncate block" style={{ opacity: 0.70 }}>
            {event.location}
          </span>
        </div>
      )}
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink py-14 px-6">
        <div className="max-w-3xl mx-auto flex items-start gap-6 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-warm-gray/30 shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-7 bg-warm-gray/30 rounded w-1/3" />
            <div className="h-4 bg-warm-gray/30 rounded w-1/4" />
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 animate-pulse space-y-4">
        <div className="h-6 bg-warm-gray/30 rounded w-1/4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[3/4] bg-warm-gray/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const rawAddress = params?.address;
  const address = (Array.isArray(rawAddress) ? rawAddress[0] : rawAddress ?? '').toLowerCase();

  const { address: connectedAddress } = useAccount();

  const [profile, setProfile] = useState<ArkivProfile | null>(null);
  const [events, setEvents] = useState<ArkivEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    async function load() {
      setLoading(true);
      try {
        const [profileResult, eventsResult] = await Promise.all([
          publicClient
            .buildQuery()
            .where([eq('type', 'profile'), eq('address', address)])
            .withPayload(true)
            .limit(1)
            .fetch()
            .catch(() => null),
          publicClient
            .buildQuery()
            .where([eq('type', 'event'), eq('organizer', address)])
            .withPayload(true)
            .fetch()
            .catch(() => null),
        ]);

        const profileEntity = profileResult?.entities?.[0];
        setProfile(profileEntity ? parseProfile(profileEntity) : null);
        setEvents(eventsResult?.entities?.map(parseEvent) ?? []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [address]);

  if (loading) return <PageSkeleton />;

  const isOwner = !!connectedAddress && connectedAddress.toLowerCase() === address;
  const displayName = profile?.nickname || shortAddress(address);
  const avatarSrc = profile?.avatarUrl || `https://effigy.im/a/${address}.svg`;

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Profile header ────────────────────────────────────── */}
      <section className="bg-ink py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-6 mb-6">

            {/* Avatar */}
            <img
              src={avatarSrc}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-full ring-2 ring-cream/20 shrink-0 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://effigy.im/a/${address}.svg`;
              }}
            />

            {/* Name + address + location */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-cream font-[family-name:var(--font-kode-mono)] mb-1 leading-tight">
                {displayName}
              </h1>
              <p className="text-warm-gray font-mono text-sm">{shortAddress(address)}</p>
              {profile?.location && (
                <p className="text-warm-gray/70 text-sm mt-2 flex items-center gap-1.5">
                  <span aria-hidden="true">📍</span>
                  {profile.location}
                </p>
              )}
            </div>

            {/* Edit profile button — owner only */}
            {isOwner && (
              <Link
                href="/profile"
                className="shrink-0 px-4 py-2 text-xs font-semibold border border-cobalt text-cobalt hover:bg-cobalt hover:text-cream transition-colors uppercase tracking-wide"
              >
                Edit profile
              </Link>
            )}
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-warm-gray leading-relaxed mb-6 max-w-xl font-[family-name:var(--font-dm-sans)]">
              {profile.bio}
            </p>
          )}

          {/* Social links */}
          {(profile?.twitter || profile?.discord || profile?.farcaster) && (
            <div className="flex flex-wrap items-center gap-5">
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
                  href={
                    profile.discord.startsWith('http')
                      ? profile.discord
                      : `https://discord.com/users/${profile.discord}`
                  }
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
                  href={
                    profile.farcaster.startsWith('http')
                      ? profile.farcaster
                      : `https://warpcast.com/${profile.farcaster.replace(/^@/, '')}`
                  }
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
        </div>
      </section>

      {/* ── Events section ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-6">
          Events by {displayName}
        </h2>
        {events.length === 0 ? (
          <p className="text-warm-gray italic text-sm">No events found for this organizer.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {events.map((event, i) => (
              <SmallEventCard key={event?.entityKey} event={event} index={i} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
