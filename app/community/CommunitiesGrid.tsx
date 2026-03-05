'use client';

import Link from 'next/link';
import { type ArkivCommunity } from '@/lib/arkiv';
import SubscribeButton from '@/app/community/[name]/SubscribeButton';

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

function CommunityCard({ entry }: { entry: CommunityEntry }) {
  const { slug, profile } = entry;
  const name = profile?.name || deslugify(slug);
  const firstLetter = name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/community/${slug}`}
      className="group relative flex flex-col gap-4 p-6 border border-warm-gray/40 bg-cream hover:border-cobalt transition-colors"
    >
      {/* Subscribe button */}
        <div
          className="absolute top-4 right-4 z-10"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <SubscribeButton slug={slug} compact />
        </div>

        {/* Logo / placeholder */}
        <div className="flex items-center gap-4 pr-24">
        {profile?.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt={name}
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
          {name}
        </h2>
      </div>

      {/* Description */}
      {profile?.description && (
        <p className="text-sm text-ink/60 line-clamp-2 leading-relaxed font-[family-name:var(--font-geist-sans)]">
          {profile.description}
        </p>
      )}
    </Link>
  );
}

export default function CommunitiesGrid({ communities }: { communities: CommunityEntry[] }) {
  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
        <p className="text-5xl mb-6" role="img" aria-label="columns">🏛️</p>
        <p className="text-2xl text-ink font-[family-name:var(--font-kode-mono)] mb-3">
          No communities yet.
        </p>
        <p className="text-ink/60 text-sm mb-8 max-w-xs leading-relaxed">
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
        <CommunityCard key={entry.slug} entry={entry} />
      ))}
    </div>
  );
}
