'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseCommunity, parseEvent, type ArkivCommunity, type ArkivEvent } from '@/lib/arkiv';

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { dateStyle: 'medium' });
}

type SubscribedCommunity = {
  slug: string;
  profile: ArkivCommunity | null;
  nextEvent: ArkivEvent | null;
};

export default function MyCommunitiesPage() {
  const { address, isConnected } = useAccount();
  const [communities, setCommunities] = useState<SubscribedCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;

    const currentAddress = address;

    async function fetchSubscriptions() {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch all subscriptions for this address
        const subsResult = await publicClient
          .buildQuery()
          .where([eq('type', 'subscription'), eq('subscriber', currentAddress)])
          .withPayload(true)
          .fetch();

        const subs = subsResult?.entities ?? [];

        if (subs.length === 0) {
          setCommunities([]);
          return;
        }

        // 2. For each subscription, fetch community profile + next upcoming event in parallel
        const results = await Promise.all(
          subs.map(async (subEntity) => {
            const subData = subEntity.toJson();
            const slug = (subData?.communitySlug as string) ?? '';
            if (!slug) return null;

            const [profileResult, eventsResult] = await Promise.all([
              publicClient
                .buildQuery()
                .where([eq('type', 'community'), eq('slug', slug)])
                .withPayload(true)
                .limit(1)
                .fetch()
                .catch(() => null),
              publicClient
                .buildQuery()
                .where([eq('type', 'event'), eq('community', slug), eq('status', 'upcoming')])
                .withPayload(true)
                .fetch()
                .catch(() => null),
            ]);

            const profileEntity = profileResult?.entities?.[0];
            const profile = profileEntity ? parseCommunity(profileEntity) : null;

            // Filter to future events and take the soonest
            const now = new Date();
            const allEvents = (eventsResult?.entities ?? []).map(parseEvent);
            const nextEvent =
              allEvents
                .filter((e) => {
                  if (!e?.date) return false;
                  const d = new Date(e.date);
                  return !isNaN(d.getTime()) && d > now;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

            return { slug, profile, nextEvent };
          })
        );

        setCommunities(results.filter(Boolean) as SubscribedCommunity[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptions();
  }, [address]);

  if (!isConnected) {
    return (
      <main className="max-w-4xl mx-auto py-20 px-6 text-center">
        <p className="text-warm-gray">Connect your wallet to see your communities</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-8">
        My Communities
      </h1>

      {error && (
        <p className="mb-6 text-sm text-red-500">{error}</p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-cream border border-warm-gray/40 p-6">
              <div className="h-5 bg-warm-gray/40 rounded w-1/3 mb-3" />
              <div className="h-4 bg-warm-gray/40 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-warm-gray mb-4">
            You haven&#39;t subscribed to any communities yet.
          </p>
          <Link
            href="/community"
            className="text-sm font-medium text-cobalt underline underline-offset-2 hover:text-cobalt-light transition-colors"
          >
            Browse communities
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {communities.map(({ slug, profile, nextEvent }) => {
            const displayName = profile?.name || deslugify(slug);
            const firstLetter = displayName.charAt(0).toUpperCase();

            return (
              <Link
                key={slug}
                href={`/community/${slug}`}
                className="group flex flex-col gap-4 p-6 border border-warm-gray/40 bg-cream hover:border-cobalt transition-colors"
              >
                {/* Logo + name */}
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
                  <p className="text-sm text-warm-gray line-clamp-2 leading-relaxed">
                    {profile.description}
                  </p>
                )}

                {/* Next event */}
                {nextEvent ? (
                  <div className="mt-auto pt-3 border-t border-warm-gray/20">
                    <p className="text-xs font-semibold text-warm-gray/60 uppercase tracking-wide mb-1">
                      Next event
                    </p>
                    <span
                      className="text-sm text-cobalt hover:underline underline-offset-2"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/event/${nextEvent.entityKey}`;
                      }}
                    >
                      {nextEvent.title}
                      {nextEvent.date && (
                        <span className="text-warm-gray ml-2">
                          · {formatDate(nextEvent.date)}
                        </span>
                      )}
                    </span>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
