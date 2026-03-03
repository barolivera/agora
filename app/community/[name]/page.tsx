import type { Metadata } from 'next';
import { eq } from '@arkiv-network/sdk/query';
import {
  publicClient,
  parseEvent,
  parseCommunity,
  type ArkivEvent,
  type ArkivCommunity,
} from '@/lib/arkiv';
import SubscribeButton from './SubscribeButton';
import EventsWithSidebar from './EventsWithSidebar';

// ── Helpers ────────────────────────────────────────────────────────────────────

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Metadata ───────────────────────────────────────────────────────────────────

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

// ── Cover section (hero banner with overlaid title) ────────────────────────────

function CoverSection({
  coverUrl,
  displayName,
}: {
  coverUrl?: string;
  displayName: string;
}) {
  return (
    <div className="relative h-56 overflow-hidden">
      {/* Background: image or gradient */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1A1614 55%, #0247E2 100%)',
          }}
        />
      )}

      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-ink/55" />

      {/* Community name anchored to bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="max-w-6xl mx-auto px-6 pb-5">
          <h1
            className="text-4xl sm:text-5xl font-bold text-cream font-[family-name:var(--font-kode-mono)] leading-none"
            style={{ textShadow: '0 2px 12px rgba(26,22,20,0.6)' }}
          >
            {displayName}
          </h1>
        </div>
      </div>
    </div>
  );
}

// ── Social icon components ─────────────────────────────────────────────────────

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// ── Hero section (profile row below cover) ─────────────────────────────────────

function HeroSection({
  profile,
  name,
  subscriberCount,
}: {
  profile: ArkivCommunity | null;
  name: string;
  subscriberCount: number;
}) {
  const displayName = profile?.name || deslugify(name);
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <section className="bg-ink">
      {/* Cover banner with name overlay */}
      <CoverSection coverUrl={profile?.coverUrl} displayName={displayName} />

      {/* Profile section */}
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-6">
        <div className="flex flex-col gap-6">

          {/* Avatar */}
          <div className="shrink-0">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={displayName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl object-cover"
                style={{ border: '3px solid #F2EDE4' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-cream font-[family-name:var(--font-kode-mono)]"
                style={{ border: '3px solid #F2EDE4', backgroundColor: '#0247E2' }}
              >
                {firstLetter}
              </div>
            )}
          </div>

          {/* Info row: name + desc + links | subscribe button */}
          <div className="flex items-start gap-6">

            {/* Left: name + description + social links */}
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-bold text-cream font-[family-name:var(--font-kode-mono)] leading-tight">
                  {displayName}
                </p>
                {profile?.description && (
                  <p className="text-sm text-cream/80 leading-snug line-clamp-2 font-[family-name:var(--font-dm-sans)] max-w-lg">
                    {profile.description}
                  </p>
                )}
              </div>

              {(profile?.website || profile?.twitter || profile?.discord) && (
                <div className="flex items-center gap-5">
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <GlobeIcon />
                      <span className="font-[family-name:var(--font-dm-sans)]">
                        {profile.website.replace(/^https?:\/\//, '')}
                      </span>
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
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <XIcon />
                      <span className="font-[family-name:var(--font-dm-sans)]">
                        {profile.twitter.startsWith('@') ? profile.twitter : `@${profile.twitter}`}
                      </span>
                    </a>
                  )}
                  {profile.discord && (
                    <a
                      href={profile.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <DiscordIcon />
                      <span className="font-[family-name:var(--font-dm-sans)]">Discord</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right: subscribe button */}
            <SubscribeButton slug={name} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
// All data-fetching logic is preserved exactly as-is below.

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams?: Promise<{ tab?: string; date?: string }>;
}) {
  const { name } = await params;
  const sp = searchParams ? await searchParams : {};
  const initialTab = sp.tab === 'past' ? 'past' : 'upcoming';
  const initialDate = sp.date ?? null;

  let events: ArkivEvent[] = [];
  let communityProfile: ArkivCommunity | null = null;
  let subscriberCount = 0;
  let subscriberAddresses: string[] = [];

  try {
    const [profileResult, eventsResult, subscriptionsResult] = await Promise.all([
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
      publicClient
        .buildQuery()
        .where([eq('type', 'subscription'), eq('communitySlug', name)])
        .withPayload(true)
        .limit(20)
        .fetch()
        .catch(() => null),
    ]);

    const profileEntity = profileResult?.entities?.[0];
    if (profileEntity) {
      communityProfile = parseCommunity(profileEntity);
    }

    events = eventsResult?.entities?.map(parseEvent) ?? [];

    // Subscriber count + addresses for member avatars
    const subEntities = subscriptionsResult?.entities ?? [];
    subscriberCount = subEntities.length;
    subscriberAddresses = subEntities
      .map((e) => {
        const d = e.toJson();
        return (d?.subscriber as string) ?? '';
      })
      .filter(Boolean);

    // Total subscriber count (may exceed the 20 we fetched)
    const fullSubCount = await publicClient
      .buildQuery()
      .where([eq('type', 'subscription'), eq('communitySlug', name)])
      .count()
      .catch(() => subscriberCount);
    subscriberCount = fullSubCount ?? subscriberCount;

  } catch {
    // render with empty state
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ──────────────────────────────────────────── */}
      <HeroSection
        profile={communityProfile}
        name={name}
        subscriberCount={subscriberCount}
      />

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <EventsWithSidebar
          events={events}
          profile={communityProfile}
          name={name}
          subscriberAddresses={subscriberAddresses}
          subscriberCount={subscriberCount}
          initialTab={initialTab}
          initialDate={initialDate}
        />
      </div>
    </div>
  );
}
