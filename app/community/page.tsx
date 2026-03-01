import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, parseCommunity, type ArkivCommunity } from '@/lib/arkiv';

export const metadata: Metadata = {
  title: 'Communities — Agora',
  description: 'Discover communities hosting events on Agora',
  openGraph: {
    title: 'Communities on Agora',
    description: 'Discover communities hosting events on Agora',
  },
};

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

export default async function CommunitiesPage() {
  let communities: CommunityEntry[] = [];

  try {
    // Fetch events and community profiles in parallel
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

    // Build slug → event count map
    const events = eventsResult?.entities?.map(parseEvent) ?? [];
    const groups = new Map<string, number>();
    for (const event of events) {
      if (event?.community) {
        groups.set(event.community, (groups.get(event.community) ?? 0) + 1);
      }
    }

    // Build slug → most-recent profile map
    const profilesBySlug = new Map<string, ArkivCommunity>();
    for (const entity of profilesResult?.entities ?? []) {
      const profile = parseCommunity(entity);
      if (profile.slug && !profilesBySlug.has(profile.slug)) {
        profilesBySlug.set(profile.slug, profile);
      }
    }

    // Merge: all slugs that appear in events OR have a profile
    const allSlugs = new Set([...groups.keys(), ...profilesBySlug.keys()]);

    communities = Array.from(allSlugs)
      .map((slug) => ({
        slug,
        count: groups.get(slug) ?? 0,
        profile: profilesBySlug.get(slug),
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    // render with empty state
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Header ────────────────────────────────────────── */}
      <section className="bg-ink py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold text-cream font-[family-name:var(--font-fraunces)] mb-4">
              Communities on Agora
            </h1>
            <p className="text-warm-gray text-base max-w-lg">
              Events owned by communities — decentralized and on-chain.
            </p>
          </div>
          <Link
            href="/community/create"
            className="shrink-0 bg-orange text-cream px-5 py-3 text-sm font-semibold hover:bg-orange-light transition-colors"
          >
            + Create a community
          </Link>
        </div>
      </section>

      {/* ── Grid ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        {communities.length === 0 ? (
          <div className="flex flex-col items-center text-center py-28 border border-dashed border-warm-gray/50">
            <p className="text-5xl mb-6" role="img" aria-label="columns">🏛️</p>
            <p className="text-2xl text-ink font-[family-name:var(--font-fraunces)] mb-3">
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((entry) => (
              <CommunityCard key={entry.slug} entry={entry} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
