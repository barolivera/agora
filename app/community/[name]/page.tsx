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
import EditCommunityButton from './EditCommunityButton';
import EventsWithSidebar from './EventsWithSidebar';
import PendingEvents from './PendingEvents';
import { deslugify } from '@/lib/utils';

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

// ── Cover section (hero banner) ─────────────────────────────────────────────────

function CoverSection({ coverUrl, name }: { coverUrl?: string; name: string }) {
  return (
    <div className="relative z-0 h-[293px] overflow-hidden rounded-b-sm">
      <img
        src={coverUrl || '/default-community-cover.png'}
        alt={`${name} cover`}
        className="absolute inset-0 w-full h-full object-cover"
      />
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

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// ── Hero section (profile row below cover) ─────────────────────────────────────

function HeroSection({
  profile,
  name,
  subscriberCount,
  eventOrganizers,
}: {
  profile: ArkivCommunity | null;
  name: string;
  subscriberCount: number;
  eventOrganizers: string[];
}) {
  const displayName = profile?.name || deslugify(name);
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <section className="bg-ink">
      <div className="max-w-6xl mx-auto px-6">
        {/* Cover banner — contained within max-w container */}
        <CoverSection coverUrl={profile?.coverUrl} name={displayName} />

        {/* Profile section — logo overlaps cover bottom */}
        <div className="relative z-10 -mt-10 pb-8 flex flex-col gap-6">

          {/* Avatar */}
          <div className="shrink-0">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={displayName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl object-cover ring-4 ring-ink"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-cream font-[family-name:var(--font-kode-mono)] ring-4 ring-ink"
                style={{ backgroundColor: '#0247E2' }}
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
                <h1 className="text-2xl font-bold text-cream font-[family-name:var(--font-kode-mono)] leading-[30px]">
                  {displayName}
                </h1>
                {profile?.description && (
                  <p className="text-sm text-[#fafafa] leading-snug line-clamp-2 font-[family-name:var(--font-geist-sans)] max-w-lg">
                    {profile.description}
                  </p>
                )}
              </div>

              {(profile?.website || profile?.twitter || profile?.discord || profile?.instagram || profile?.linkedin || profile?.youtube) && (
                <div className="flex items-center gap-5 flex-wrap">
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <GlobeIcon />
                      <span className="font-[family-name:var(--font-geist-sans)]">
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
                      <span className="font-[family-name:var(--font-geist-sans)]">
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
                      <span className="font-[family-name:var(--font-geist-sans)]">Discord</span>
                    </a>
                  )}
                  {profile.instagram && (
                    <a
                      href={
                        profile.instagram.startsWith('http')
                          ? profile.instagram
                          : `https://instagram.com/${profile.instagram.replace(/^@/, '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <InstagramIcon />
                      <span className="font-[family-name:var(--font-geist-sans)]">
                        {profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`}
                      </span>
                    </a>
                  )}
                  {profile.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <LinkedInIcon />
                      <span className="font-[family-name:var(--font-geist-sans)]">LinkedIn</span>
                    </a>
                  )}
                  {profile.youtube && (
                    <a
                      href={profile.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-cream transition-colors"
                    >
                      <YouTubeIcon />
                      <span className="font-[family-name:var(--font-geist-sans)]">YouTube</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right: buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <EditCommunityButton slug={name} createdBy={profile?.createdBy ?? ''} eventOrganizers={eventOrganizers} />
              <SubscribeButton slug={name} />
            </div>
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
        eventOrganizers={[...new Set(events.map((e) => e.organizer).filter(Boolean))]}
      />

      {/* ── Pending Events (visible to community creator only) ── */}
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <PendingEvents
          events={events.filter((e) => e?.status === 'pending')}
          communityCreatedBy={communityProfile?.createdBy ?? ''}
        />
      </div>

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
