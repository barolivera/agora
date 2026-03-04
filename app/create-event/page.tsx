'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { createWalletClient, custom } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { jsonToPayload } from '@arkiv-network/sdk/utils';
import { eventExpiresAt, secondsUntilExpiry } from '@/lib/expiration';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';
import { shortAddress } from '@/lib/arkiv';
import { useDisplayNames, displayName } from '@/lib/useDisplayNames';
import type { AIEnrichment } from '@/lib/types/luma';

const KAOLIN_CHAIN_ID = 60138453025;

const EVENT_CATEGORIES = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference',
  'Study Group', 'Social', 'Online', 'Other',
] as const;

// ── Gradient helper ────────────────────────────────────────────────────────────

const CARD_GRADIENTS: [string, string][] = [
  ['#E8491C', '#C8C0B4'], // orange → warm-gray
  ['#0247E2', '#F2EDE4'], // cobalt → cream
  ['#1A1614', '#E8491C'], // ink → orange
  ['#D4E84C', '#E8491C'], // yellow → orange
  ['#3D72F5', '#F2EDE4'], // cobalt-light → cream
];

function titleGradient(title: string): string {
  if (!title.trim()) return 'linear-gradient(135deg, #C8C0B4, #F2EDE4)';
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff;
  }
  const [from, to] = CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function parsePreviewDate(dateStr: string): { day: string; month: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

// ── Community helpers ──────────────────────────────────────────────────────────

const COMMUNITY_SUGGESTIONS = [
  'SheFi',
  'ETHArgentina',
  'Developer DAO',
  'Ethereum BA',
  'BuidlGuidl',
];

function normalizeCommunity(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '-').trim();
}

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-warm-gray/50 px-4 py-3 text-sm bg-cream text-ink ' +
  'placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-cobalt/40 ' +
  'focus:border-cobalt transition-colors';

// ── AI badge ─────────────────────────────────────────────────────────────────

function AIBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-cobalt/15 text-cobalt rounded-sm font-[family-name:var(--font-dm-sans)]">
      AI
    </span>
  );
}

// ── Live preview card ─────────────────────────────────────────────────────────

function PreviewCard({
  title,
  date,
  location,
  capacity,
  organizer,
  coverImageUrl,
  names,
}: {
  title: string;
  date: string;
  location: string;
  capacity: string;
  organizer: string;
  coverImageUrl: string;
  names: Map<string, string | null>;
}) {
  const parsedDate = parsePreviewDate(date);
  const gradient = titleGradient(title);
  const hasImage = !!coverImageUrl.trim();
  const capNum = parseInt(capacity, 10);
  const showCap = !isNaN(capNum) && capNum > 0;

  return (
    <div className="flex flex-col overflow-hidden border border-warm-gray/40 bg-cream shadow-sm">

      {/* Header — gradient base, image overlaid if provided */}
      <div className="h-28 relative flex items-end px-4 pb-3">
        <div className="absolute inset-0" style={{ background: gradient }} />
        {hasImage && (
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Date chip */}
        {parsedDate ? (
          <div className="relative flex flex-col items-center bg-cream/90 backdrop-blur-sm px-3 py-1.5 min-w-[3.25rem]">
            <span className="text-2xl font-bold leading-none text-ink font-[family-name:var(--font-kode-mono)]">
              {parsedDate.day}
            </span>
            <span className="text-[9px] font-bold tracking-widest text-warm-gray uppercase mt-0.5">
              {parsedDate.month}
            </span>
          </div>
        ) : (
          <div className="relative flex items-center justify-center bg-cream/30 backdrop-blur-sm px-3 py-2 min-w-[3.25rem]">
            <span className="text-xs text-cream/60">Date</span>
          </div>
        )}

        {/* Capacity badge */}
        {showCap && (
          <span className="absolute top-2.5 right-3 bg-cream/80 backdrop-blur-sm text-ink text-[11px] font-semibold px-2 py-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {capNum}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-semibold leading-snug font-[family-name:var(--font-kode-mono)] min-h-[1.4em]">
          {title.trim() ? (
            <span className="text-ink">{title}</span>
          ) : (
            <span className="text-ink/30 font-normal italic">Your event title</span>
          )}
        </h3>

        <div className="flex items-center gap-1.5 text-sm min-h-[1.25rem]">
          <svg
            className={`w-3.5 h-3.5 shrink-0 ${location.trim() ? 'text-orange' : 'text-warm-gray/40'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className={`truncate ${location.trim() ? 'text-warm-gray' : 'text-ink/30 italic'}`}>
            {location.trim() || 'Location'}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-warm-gray/40">
          <img
            src={`https://effigy.im/a/${organizer}.svg`}
            alt=""
            width={20}
            height={20}
            className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="truncate min-w-0">
            <span className="text-xs text-warm-gray font-mono truncate block">
              {displayName(organizer, names).name}
            </span>
            {displayName(organizer, names).isResolved && (
              <span className="text-xs text-warm-gray/60 font-mono truncate block">
                {shortAddress(organizer)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CreateEventContent() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const chainId = useChainId();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const searchParams = useSearchParams();
  const [communityTag, setCommunityTag] = useState(searchParams.get('community') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoImportDone, setAutoImportDone] = useState(false);

  // Luma import state
  const [lumaUrl, setLumaUrl] = useState('');
  const [lumaLoading, setLumaLoading] = useState(false);
  const [lumaError, setLumaError] = useState('');
  const [importedFromLuma, setImportedFromLuma] = useState(false);

  // AI enrichment state
  const [aiData, setAiData] = useState<AIEnrichment | null>(null);
  const [aiEnriched, setAiEnriched] = useState(false);
  const [importPhase, setImportPhase] = useState<'idle' | 'scraping' | 'analyzing' | 'done'>('idle');
  const [tags, setTags] = useState<string[]>([]);

  const names = useDisplayNames(address ? [address] : []);

  // Auto-import from luma_url query param (e.g. from AI Agent page)
  useEffect(() => {
    const lumaParam = searchParams.get('luma_url');
    if (lumaParam && !autoImportDone) {
      setLumaUrl(lumaParam);
      setAutoImportDone(true);
    }
  }, [searchParams, autoImportDone]);

  // Trigger import once lumaUrl is set from query param
  useEffect(() => {
    if (autoImportDone && lumaUrl && !lumaLoading && !importedFromLuma) {
      handleLumaImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoImportDone]);

  async function handleLumaImport() {
    if (!lumaUrl.trim()) return;
    setLumaLoading(true);
    setLumaError('');
    setAiData(null);
    setAiEnriched(false);
    setTags([]);
    setImportPhase('scraping');

    // After 1.5s switch to "analyzing" phase if still loading
    const phaseTimer = setTimeout(() => {
      setImportPhase((prev) => (prev === 'scraping' ? 'analyzing' : prev));
    }, 1500);

    try {
      const res = await fetch('/api/import-luma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: lumaUrl.trim() }),
      });
      clearTimeout(phaseTimer);
      const data = await res.json();
      if (!res.ok) {
        setLumaError(data.error || 'Could not import this event. Check the link and try again.');
        setImportPhase('idle');
        return;
      }

      // Auto-fill form fields from scraped data
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.date) setDate(data.date);
      if (data.location) setLocation(data.location);
      if (data.coverImageUrl) setCoverImageUrl(data.coverImageUrl);
      setImportedFromLuma(true);

      // Handle AI enrichment
      if (data.ai) {
        if (data.ai.category && !category) {
          setCategory(data.ai.category);
        }
        if (data.ai.tags?.length) {
          setTags(data.ai.tags);
        }
        setAiData(data.ai);
        setAiEnriched(true);
      }

      setImportPhase('done');
    } catch {
      clearTimeout(phaseTimer);
      setLumaError('Could not import this event. Check the link and try again.');
      setImportPhase('idle');
    } finally {
      setLumaLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <main className="max-w-lg mx-auto py-24 px-6 text-center">
        <div className="w-12 h-12 bg-warm-gray/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-warm-gray" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6m18 0V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25V6" />
          </svg>
        </div>
        <p className="text-xl font-[family-name:var(--font-kode-mono)] text-ink mb-2">
          Connect your wallet to continue
        </p>
        <p className="text-sm text-warm-gray">
          You need a wallet to publish events on Arkiv.
        </p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !wagmiWalletClient) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      const payload: Record<string, unknown> = {
        title,
        description,
        date,
        location,
        capacity: Number(capacity) || 0,
        organizer: address.toLowerCase(),
        status: 'upcoming',
      };
      if (category) {
        payload.category = category;
      }
      if (coverImageUrl.trim()) {
        payload.coverImageUrl = coverImageUrl.trim();
      }
      if (lumaUrl.trim()) {
        payload.lumaUrl = lumaUrl.trim();
      }
      const normalizedCommunity = normalizeCommunity(communityTag);
      if (normalizedCommunity) {
        payload.community = normalizedCommunity;
      }
      if (tags.length) {
        payload.tags = tags;
      }

      const expiryDate = eventExpiresAt(date);

      const attributes: { key: string; value: string }[] = [
        { key: 'type', value: 'event' },
        { key: 'organizer', value: address.toLowerCase() },
        { key: 'date', value: new Date(date).getTime().toString() },
        { key: 'status', value: 'upcoming' },
      ];
      if (category) {
        attributes.push({ key: 'category', value: category });
      }
      if (normalizedCommunity) {
        attributes.push({ key: 'community', value: normalizedCommunity });
      }

      const { entityKey } = await arkivWalletClient.createEntity({
        payload: jsonToPayload(payload),
        contentType: 'application/json',
        attributes,
        expiresIn: Math.floor(secondsUntilExpiry(expiryDate)),
      });

      router.push(`/event/${entityKey}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">

          {/* ── Left: form ────────────────────────────────── */}
          <div>
            <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
              Create your event
            </h1>
            <p className="text-warm-gray mb-10">
              Your event lives on Arkiv — owned by you, forever.
            </p>

            {/* ── Luma import ─────────────────────────────── */}
            <div className="mb-8 border border-orange/40 bg-cream p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-orange" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-sm font-semibold text-ink font-[family-name:var(--font-kode-mono)]">
                  Import from Luma
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste a lu.ma or luma.com event link..."
                  value={lumaUrl}
                  onChange={(e) => { setLumaUrl(e.target.value); setLumaError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLumaImport(); } }}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleLumaImport}
                  disabled={lumaLoading || !lumaUrl.trim()}
                  className="px-5 py-3 bg-orange text-cream text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-light transition-colors flex items-center gap-2"
                >
                  {lumaLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {importPhase === 'analyzing' ? 'AI Agent is analyzing…' : 'Reading event from Luma…'}
                    </>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
              {lumaError && (
                <p className="mt-2 text-sm text-red-600">{lumaError}</p>
              )}
            </div>

            {importedFromLuma && (
              <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-cobalt/10 border border-cobalt/20 text-sm text-cobalt font-[family-name:var(--font-dm-sans)]">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {aiEnriched
                  ? 'AI Agent enhanced this event — review suggestions before publishing'
                  : 'Imported from Luma — review and edit before publishing'}
              </div>
            )}

            {error && (
              <div className="mb-6">
                <ErrorMessage message={error} onRetry={() => setError('')} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Title <span className="text-orange">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ETH Athens Summer Meetup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                />
                {aiData?.translatedTitle && (
                  <p className="mt-1.5 text-xs text-warm-gray flex items-center gap-1.5 font-[family-name:var(--font-dm-sans)]">
                    <AIBadge /> ES: {aiData.translatedTitle}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Description <span className="text-orange">*</span>
                </label>
                <textarea
                  required
                  placeholder="Tell people what to expect…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
                {aiData?.summary && (
                  <p className="mt-1.5 text-xs text-warm-gray flex items-center gap-1.5 font-[family-name:var(--font-dm-sans)]">
                    <AIBadge /> Resumen: {aiData.summary}
                  </p>
                )}
                {aiData?.translatedDescription && (
                  <details className="mt-1.5">
                    <summary className="text-xs text-warm-gray flex items-center gap-1.5 cursor-pointer font-[family-name:var(--font-dm-sans)]">
                      <AIBadge /> Ver traducción al español
                    </summary>
                    <p className="mt-1 text-xs text-warm-gray/80 pl-5 font-[family-name:var(--font-dm-sans)]">
                      {aiData.translatedDescription}
                    </p>
                  </details>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Category <span className="text-orange">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors font-[family-name:var(--font-dm-sans)] flex items-center gap-1 ${
                        category === cat
                          ? 'bg-ink text-cream'
                          : 'border border-warm-gray/40 text-warm-gray hover:text-ink hover:border-ink/30'
                      }`}
                    >
                      {cat}
                      {aiData?.category === cat && <AIBadge />}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="category" value={category} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Date & time <span className="text-orange">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-xs text-warm-gray/60 font-[family-name:var(--font-dm-sans)] leading-snug">
                    This event will be automatically removed from Agora 30 days after it takes place — just like in real life.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Capacity <span className="text-orange">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="50"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Location <span className="text-orange">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monastiraki Square, Athens"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Cover image URL
                  <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Community tag
                  <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
                </label>
                <input
                  type="text"
                  list="community-suggestions"
                  placeholder="e.g. SheFi, ETHArgentina, Developer DAO"
                  value={communityTag}
                  onChange={(e) => setCommunityTag(e.target.value)}
                  className={inputCls}
                />
                <datalist id="community-suggestions">
                  {COMMUNITY_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {communityTag.trim() && (
                  <p className="mt-1.5 text-xs text-cobalt font-[family-name:var(--font-dm-sans)] leading-snug">
                    Your event will appear at{' '}
                    <span className="font-mono">
                      agora.xyz/community/{normalizeCommunity(communityTag)}
                    </span>
                  </p>
                )}
                {aiData?.suggestedCommunities && aiData.suggestedCommunities.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-warm-gray flex items-center gap-1 font-[family-name:var(--font-dm-sans)]">
                      <AIBadge /> Suggested:
                    </span>
                    {aiData.suggestedCommunities.map((comm) => (
                      <button
                        key={comm}
                        type="button"
                        onClick={() => setCommunityTag(comm)}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors font-[family-name:var(--font-dm-sans)] ${
                          communityTag === comm
                            ? 'bg-cobalt text-cream'
                            : 'bg-cobalt/10 text-cobalt hover:bg-cobalt/20'
                        }`}
                      >
                        {comm}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5 flex items-center gap-1.5">
                    Tags <AIBadge />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-warm-gray/20 text-ink font-[family-name:var(--font-dm-sans)]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                          className="text-warm-gray hover:text-ink ml-0.5"
                          aria-label={`Remove tag ${tag}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange text-cream py-3.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-light transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Publishing to Arkiv…
                    </>
                  ) : (
                    'Publish event'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── Right: live preview ───────────────────────── */}
          <div className="lg:sticky lg:top-6">
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-warm-gray/60 mb-3">
              Preview
            </p>
            <PreviewCard
              title={title}
              date={date}
              location={location}
              capacity={capacity}
              organizer={address ?? ''}
              coverImageUrl={coverImageUrl}
              names={names}
            />
            <p className="mt-3 text-xs text-warm-gray/50 text-center">
              Updates as you type
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense>
      <CreateEventContent />
    </Suspense>
  );
}
