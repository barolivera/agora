'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { deslugify } from '@/lib/utils';
import { inputCls } from '@/lib/constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Form ──────────────────────────────────────────────────────────────────────

function CreateCommunityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get('slug') ?? '';

  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();

  const [name, setName] = useState(initialSlug ? deslugify(initialSlug) : '');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slug = slugify(name);

  if (!isConnected) {
    return (
      <main className="max-w-lg mx-auto py-24 px-6 text-center">
        <div className="w-12 h-12 bg-warm-gray/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-ink/80" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6m18 0V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25V6" />
          </svg>
        </div>
        <p className="text-xl font-[family-name:var(--font-kode-mono)] text-ink mb-2">
          Connect your wallet to continue
        </p>
        <p className="text-sm text-ink/80">
          You need a wallet to create a community on Arkiv.
        </p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !wagmiWalletClient || !slug) return;

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
        name: name.trim(),
        slug,
        description,
        createdBy: address,
        updatedAt: new Date().toISOString(),
      };
      if (logoUrl.trim()) payload.logoUrl = logoUrl.trim();
      if (coverUrl.trim()) payload.coverUrl = coverUrl.trim();
      if (website.trim()) payload.website = website.trim();
      if (twitter.trim()) payload.twitter = twitter.trim();
      if (discord.trim()) payload.discord = discord.trim();

      await arkivWalletClient.createEntity({
        payload: jsonToPayload(payload),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'community' },
          { key: 'slug', value: slug },
          { key: 'createdBy', value: address.toLowerCase() },
        ],
        // Communities expire after 1 year. They should be renewed
        // by the community when they create new events.
        // This keeps the Arkiv database clean and prevents abandoned
        // communities from living forever.
        expiresIn: ExpirationTime.fromDays(365),
      });

      router.push(`/community/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
          Create a community
        </h1>
        <p className="text-ink/80 mb-10">
          Your community lives on Arkiv — open, on-chain, and community-owned.
        </p>

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
              placeholder="e.g. ETH Argentina"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
            {slug && (
              <p className="mt-1.5 text-xs text-cobalt font-[family-name:var(--font-geist-sans)]">
                Your community page:{' '}
                <span className="font-mono">agora.xyz/community/{slug}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Description <span className="text-orange">*</span>
            </label>
            <textarea
              required
              placeholder="Tell the world what your community is about…"
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
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
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
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
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
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
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
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
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
              <span className="ml-2 text-xs font-normal text-ink/80">(optional)</span>
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
              disabled={loading || !slug}
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
                'Create community'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateCommunityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <CreateCommunityForm />
    </Suspense>
  );
}
