'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { jsonToPayload } from '@arkiv-network/sdk/utils';
import { eventExpiresAt, secondsUntilExpiry } from '@/lib/expiration';
import { publicClient } from '@/lib/arkiv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const COMMUNITY_SUGGESTIONS = [
  'SheFi',
  'ETHArgentina',
  'Developer DAO',
  'Ethereum BA',
  'BuidlGuidl',
];

const EVENT_CATEGORIES = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference',
  'Study Group', 'Social', 'Online', 'Other',
] as const;

function normalizeCommunity(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '-').trim();
}

function toDatetimeLocal(dateStr: string): string {
  if (!dateStr) return '';
  // Already in datetime-local format (YYYY-MM-DDTHH:MM)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 16);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? '';

  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();

  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [organizer, setOrganizer] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [communityTag, setCommunityTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    async function loadEvent() {
      try {
        const entity = await publicClient.getEntity(id as Hex);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = entity.toJson() as Record<string, any>;
        setOrganizer(data?.organizer ?? '');
        setTitle(data?.title ?? '');
        setDescription(data?.description ?? '');
        setDate(toDatetimeLocal(data?.date ?? ''));
        setLocation(data?.location ?? '');
        setCapacity(data?.capacity != null ? String(data.capacity) : '');
        setCoverImageUrl(data?.coverImageUrl ?? '');
        setCategory(data?.category ?? '');
        setCommunityTag(data?.community ?? '');
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoadingEvent(false);
      }
    }

    loadEvent();
  }, [id]);

  if (loadingEvent) {
    return (
      <main className="max-w-2xl mx-auto py-24 px-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-9 bg-warm-gray/30 w-1/2" />
          <div className="h-4 bg-warm-gray/30 w-full mt-6" />
          <div className="h-4 bg-warm-gray/30 w-5/6" />
          <div className="h-4 bg-warm-gray/30 w-4/6" />
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="max-w-lg mx-auto py-24 px-6 text-center">
        <p className="text-ink/80 font-[family-name:var(--font-kode-mono)] text-lg mb-2">
          Event not found
        </p>
        <p className="text-sm text-ink/80">{loadError}</p>
      </main>
    );
  }

  if (!isConnected || !address) {
    return (
      <main className="max-w-lg mx-auto py-24 px-6 text-center">
        <p className="text-xl font-[family-name:var(--font-kode-mono)] text-ink mb-2">
          Connect your wallet to continue
        </p>
        <p className="text-sm text-ink/80">
          You need a connected wallet to edit this event.
        </p>
      </main>
    );
  }

  if (organizer && address.toLowerCase() !== organizer.toLowerCase()) {
    return (
      <main className="max-w-lg mx-auto py-24 px-6 text-center">
        <p className="text-xl font-[family-name:var(--font-kode-mono)] text-ink mb-2">
          You don&apos;t have permission to edit this event
        </p>
        <p className="text-sm text-ink/80 mt-2">
          Only the event organizer can make changes.
        </p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !wagmiWalletClient || !id) return;

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
      };
      if (category) {
        payload.category = category;
      }
      payload.coverImageUrl = coverImageUrl.trim() || '';
      const normalizedCommunity = normalizeCommunity(communityTag);
      if (normalizedCommunity) {
        payload.community = normalizedCommunity;
      }

      const attributes: { key: string; value: string }[] = [
        { key: 'type', value: 'event' },
        { key: 'organizer', value: address.toLowerCase() },
        { key: 'date', value: new Date(date).getTime().toString() },
      ];
      if (category) {
        attributes.push({ key: 'category', value: category });
      }
      if (normalizedCommunity) {
        attributes.push({ key: 'community', value: normalizedCommunity });
      }

      await arkivWalletClient.updateEntity({
        entityKey: id as Hex,
        payload: jsonToPayload(payload),
        contentType: 'application/json',
        attributes,
        expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(date))),
      });

      router.push(`/event/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
          Edit event
        </h1>
        <p className="text-ink/80 mb-10">
          Changes will be saved on-chain to Arkiv.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Title <span className="text-orange">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. ETH Athens Summer Meetup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Description <span className="text-orange">*</span>
            </label>
            <Textarea
              required
              placeholder="Tell people what to expect…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Category <span className="text-orange">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant="ghost"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors font-[family-name:var(--font-geist-sans)] ${
                    category === cat
                      ? 'bg-ink text-cream'
                      : 'border border-warm-gray/40 text-ink/80 hover:text-ink hover:border-ink/30'
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Date &amp; time <span className="text-orange">*</span>
              </label>
              <Input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Capacity <span className="text-orange">*</span>
              </label>
              <Input
                type="number"
                required
                min={1}
                placeholder="50"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Location <span className="text-orange">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Monastiraki Square, Athens"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Cover image URL
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
            </label>
            <Input
              type="url"
              placeholder="https://…"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Community tag
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
            </label>
            <Input
              type="text"
              list="community-suggestions-edit"
              placeholder="e.g. SheFi, ETHArgentina, Developer DAO"
              value={communityTag}
              onChange={(e) => setCommunityTag(e.target.value)}
            />
            <datalist id="community-suggestions-edit">
              {COMMUNITY_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {communityTag.trim() && (
              <p className="mt-1.5 text-xs text-cobalt font-[family-name:var(--font-geist-sans)] leading-snug">
                Your event will appear at{' '}
                <span className="font-mono">
                  agora.xyz/community/{normalizeCommunity(communityTag)}
                </span>
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/event/${id}`)}
              className="px-5 py-3.5 text-sm text-ink/80 hover:text-ink transition-colors border border-warm-gray/40 hover:border-warm-gray"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
