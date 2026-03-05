import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, parseCommunity, type ArkivCommunity } from '@/lib/arkiv';
import CommunitiesGrid, { type CommunityEntry } from './CommunitiesGrid';

export const metadata: Metadata = {
  title: 'Communities — Agora',
  description: 'Discover communities hosting events on Agora',
  openGraph: {
    title: 'Communities on Agora',
    description: 'Discover communities hosting events on Agora',
  },
};

export default async function CommunitiesPage() {
  let communities: CommunityEntry[] = [];

  try {
    // Fetch events, community profiles, and subscriptions in parallel
    const [eventsResult, profilesResult, subscriptionsResult] = await Promise.all([
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
      publicClient
        .buildQuery()
        .where(eq('type', 'subscription'))
        .withPayload(true)
        .limit(2000)
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
    const rawProfiles = profilesResult?.entities ?? [];
    for (const entity of rawProfiles) {
      const profile = parseCommunity(entity);
      if (profile.slug && !profilesBySlug.has(profile.slug)) {
        profilesBySlug.set(profile.slug, profile);
      }
    }

    // Build slug → subscriber count map
    const subCounts = new Map<string, number>();
    for (const entity of subscriptionsResult?.entities ?? []) {
      const data = entity.toJson();
      const slug = (data?.communitySlug as string) ?? '';
      if (slug) subCounts.set(slug, (subCounts.get(slug) ?? 0) + 1);
    }

    // Merge: all slugs that appear in events OR have a profile
    const allSlugs = new Set([...groups.keys(), ...profilesBySlug.keys()]);
    communities = Array.from(allSlugs)
      .map((slug) => ({
        slug,
        count: groups.get(slug) ?? 0,
        profile: profilesBySlug.get(slug),
        subscriberCount: subCounts.get(slug) ?? 0,
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
            <h1 className="text-5xl sm:text-6xl font-bold text-cream font-[family-name:var(--font-kode-mono)] mb-4">
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
        <CommunitiesGrid communities={communities} />
      </section>

    </div>
  );
}
