'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, type ArkivCommunity } from '@/lib/arkiv';

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type CommunityEntry = {
  slug: string;
  count: number;
  profile?: ArkivCommunity;
  subscriberCount: number;
};

function CommunityCard({
  entry,
  isSubscribed,
}: {
  entry: CommunityEntry;
  isSubscribed: boolean;
}) {
  const { slug, count, profile, subscriberCount } = entry;
  const displayName = profile?.name || deslugify(slug);
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <Link
      href={`/community/${slug}`}
      className="group relative flex flex-col gap-4 p-6 border border-warm-gray/40 bg-cream hover:border-cobalt transition-colors"
    >
      {/* Subscribed badge */}
      {isSubscribed && (
        <span
          className="absolute top-3 right-3 text-xs font-semibold text-cobalt border border-cobalt px-1.5 py-0.5"
          title="Subscribed"
        >
          ✓
        </span>
      )}

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
        <p className="text-sm text-warm-gray line-clamp-2 leading-relaxed">
          {profile.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <p className="text-xs text-warm-gray/70">
          {count} {count === 1 ? 'event' : 'events'}
          {subscriberCount > 0 && (
            <span>
              {' · '}
              {subscriberCount} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
            </span>
          )}
        </p>
        <span className="text-xs font-semibold text-cobalt tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      </div>
    </Link>
  );
}

export default function CommunitiesGrid({ communities }: { communities: CommunityEntry[] }) {
  const { address, isConnected } = useAccount();
  const [subscribedSlugs, setSubscribedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!address || !isConnected) {
      setSubscribedSlugs(new Set());
      return;
    }

    const currentAddress = address;

    async function fetchSubscribedSlugs() {
      try {
        const result = await publicClient
          .buildQuery()
          .where([eq('type', 'subscription'), eq('subscriber', currentAddress)])
          .withPayload(true)
          .fetch();
        const slugs = new Set<string>();
        for (const entity of result?.entities ?? []) {
          const data = entity.toJson();
          const slug = (data?.communitySlug as string) ?? '';
          if (slug) slugs.add(slug);
        }
        setSubscribedSlugs(slugs);
      } catch {
        // ignore — badges won't show, non-critical
      }
    }

    fetchSubscribedSlugs();
  }, [address, isConnected]);

  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
        <p className="text-5xl mb-6" role="img" aria-label="columns">🏛️</p>
        <p className="text-2xl text-ink font-[family-name:var(--font-kode-mono)] mb-3">
          No communities yet.
        </p>
        <p className="text-warm-gray text-sm mb-8 max-w-xs leading-relaxed">
          Create a community or tag an event with a community name to get started.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/community/create"
            className="bg-orange text-cream px-6 py-3 text-sm font-semibold hover:bg-orange-light transition-colors"
          >
            Create a community
          </Link>
          <Link
            href="/create-event"
            className="border border-cobalt text-cobalt px-6 py-3 text-sm font-semibold hover:bg-cobalt hover:text-cream transition-colors"
          >
            Create an event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {communities.map((entry) => (
        <CommunityCard
          key={entry.slug}
          entry={entry}
          isSubscribed={subscribedSlugs.has(entry.slug)}
        />
      ))}
    </div>
  );
}
