'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseCommunity } from '@/lib/arkiv';

// ── Helpers ───────────────────────────────────────────────────────────────────

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const inputCls =
  'w-full border border-warm-gray/50 px-4 py-3 text-sm bg-cream text-ink ' +
  'placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-cobalt/40 ' +
  'focus:border-cobalt transition-colors';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditCommunityPage() {
  const params = useParams();
  const rawName = params?.name;
  const name = Array.isArray(rawName) ? rawName[0] : rawName ?? '';

  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();

  const [profileLoading, setProfileLoading] = useState(true);
  const [existingEntityKey, setExistingEntityKey] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch existing profile to pre-fill the form
  useEffect(() => {
    async function loadProfile() {
      if (!name) {
        setProfileLoading(false);
        return;
      }
      try {
        const result = await publicClient
          .buildQuery()
          .where([eq('type', 'community'), eq('slug', name)])
          .withPayload(true)
          .limit(1)
          .fetch();

        const entity = result?.entities?.[0];
        if (entity) {
          const profile = parseCommunity(entity);
          setExistingEntityKey(profile.entityKey || null);
          setFormName(profile.name || deslugify(name));
          setDescription(profile.description ?? '');
          setLogoUrl(profile.logoUrl ?? '');
          setCoverUrl(profile.coverUrl ?? '');
          setWebsite(profile.website ?? '');
          setTwitter(profile.twitter ?? '');
          setDiscord(profile.discord ?? '');
        } else {
          setFormName(deslugify(name));
        }
      } catch {
        setFormName(deslugify(name));
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [name]);

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
          You need a wallet to edit a community on Arkiv.
        </p>
      </main>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !wagmiWalletClient || !name) return;

    setLoading(true);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      const displayName = formName.trim() || deslugify(name);

      const payload: Record<string, unknown> = {
        name: displayName,
        slug: name,
        description,
        createdBy: address,
        updatedAt: new Date().toISOString(),
      };
      if (logoUrl.trim()) payload.logoUrl = logoUrl.trim();
      if (coverUrl.trim()) payload.coverUrl = coverUrl.trim();
      if (website.trim()) payload.website = website.trim();
      if (twitter.trim()) payload.twitter = twitter.trim();
      if (discord.trim()) payload.discord = discord.trim();

      // Communities expire after 1 year. They should be renewed
      // by the community when they create new events.
      // This keeps the Arkiv database clean and prevents abandoned
      // communities from living forever.
      const communityExpiresIn = ExpirationTime.fromDays(365);
      const communityAttributes = [
        { key: 'type', value: 'community' },
        { key: 'slug', value: name },
      ];

      if (existingEntityKey) {
        console.log(`[Arkiv] Updating existing community entity: ${existingEntityKey}`);
        await arkivWalletClient.updateEntity({
          entityKey: existingEntityKey as Hex,
          payload: jsonToPayload(payload),
          contentType: 'application/json',
          attributes: communityAttributes,
          expiresIn: communityExpiresIn,
        });
      } else {
        console.log('[Arkiv] No existing entity found — creating new community entity');
        await arkivWalletClient.createEntity({
          payload: jsonToPayload(payload),
          contentType: 'application/json',
          attributes: communityAttributes,
          expiresIn: communityExpiresIn,
        });
      }

      router.push(`/community/${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-6 py-14">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-warm-gray/50 mb-6">
          <a href={`/community/${name}`} className="hover:text-warm-gray transition-colors">
            ← Back to {deslugify(name)}
          </a>
        </p>

        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
          Edit community
        </h1>
        <p className="text-warm-gray mb-6">
          agora.xyz/community/{name}
        </p>

        {/* Open editing warning */}
        <div className="mb-8 p-4 border border-warm-gray/40 bg-warm-gray/10 text-sm text-ink/70 leading-relaxed">
          <span className="font-semibold text-ink">Community profiles are open</span> — anyone can edit.
          Decentralized and community-owned.
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Community name <span className="text-orange">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Description <span className="text-orange">*</span>
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Logo URL
              <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://…"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className={inputCls}
            />
            {logoUrl.trim() && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  width={64}
                  height={64}
                  className="object-cover border border-warm-gray/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Cover image URL */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Cover image URL
              <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://… (recommended: 1200×400px)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Website
              <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://…"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Twitter */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Twitter / X
              <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="@ethargentina"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Discord */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Discord invite URL
              <span className="ml-2 text-xs font-normal text-warm-gray">(optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://discord.gg/…"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              className={inputCls}
            />
          </div>

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
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
