'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseCommunity, type ArkivCommunity } from '@/lib/arkiv';
import { deslugify } from '@/lib/utils';
import { inputCls } from '@/lib/constants';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditCommunityPage() {
  const params = useParams();
  const rawName = params?.name;
  const name = Array.isArray(rawName) ? rawName[0] : rawName ?? '';

  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();

  const [profileLoading, setProfileLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<ArkivCommunity | null>(null);
  const [notCreator, setNotCreator] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [youtube, setYoutube] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
          setExistingProfile(profile);
          setFormName(profile.name || deslugify(name));
          setDescription(profile.description ?? '');
          setLocation(profile.location ?? '');
          setLogoUrl(profile.logoUrl ?? '');
          setCoverUrl(profile.coverUrl ?? '');
          setWebsite(profile.website ?? '');
          setTwitter(profile.twitter ?? '');
          setDiscord(profile.discord ?? '');
          setInstagram(profile.instagram ?? '');
          setLinkedin(profile.linkedin ?? '');
          setYoutube(profile.youtube ?? '');

          // Permission check: only creator can edit
          if (
            profile.createdBy &&
            address &&
            profile.createdBy.toLowerCase() !== address.toLowerCase()
          ) {
            setNotCreator(true);
          }
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
  }, [name, address]);

  // ── Early returns ──────────────────────────────────────────────────────────

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

  if (notCreator) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4" role="img" aria-label="lock">🔒</p>
          <h1 className="text-2xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-3">
            Not authorized
          </h1>
          <p className="text-ink/80 text-sm mb-6 font-[family-name:var(--font-geist-sans)]">
            Only the community creator can edit this page.
          </p>
          <Link
            href={`/community/${name}`}
            className="text-sm text-cobalt hover:text-cobalt-light transition-colors font-[family-name:var(--font-geist-sans)]"
          >
            Back to {deslugify(name)} →
          </Link>
        </div>
      </main>
    );
  }

  // ── Submit handler ─────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !wagmiWalletClient || !name) return;

    setSaving(true);
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
      if (location.trim()) payload.location = location.trim();
      if (logoUrl.trim()) payload.logoUrl = logoUrl.trim();
      if (coverUrl.trim()) payload.coverUrl = coverUrl.trim();
      if (website.trim()) payload.website = website.trim();
      if (twitter.trim()) payload.twitter = twitter.trim();
      if (discord.trim()) payload.discord = discord.trim();
      if (instagram.trim()) payload.instagram = instagram.trim();
      if (linkedin.trim()) payload.linkedin = linkedin.trim();
      if (youtube.trim()) payload.youtube = youtube.trim();

      const communityExpiresIn = ExpirationTime.fromDays(365);
      const communityAttributes = [
        { key: 'type', value: 'community' },
        { key: 'slug', value: name },
        { key: 'createdBy', value: address.toLowerCase() },
      ];

      if (existingProfile?.entityKey) {
        await arkivWalletClient.updateEntity({
          entityKey: existingProfile.entityKey as Hex,
          payload: jsonToPayload(payload),
          contentType: 'application/json',
          attributes: communityAttributes,
          expiresIn: communityExpiresIn,
        });
      } else {
        await arkivWalletClient.createEntity({
          payload: jsonToPayload(payload),
          contentType: 'application/json',
          attributes: communityAttributes,
          expiresIn: communityExpiresIn,
        });
      }

      setSaved(true);
      setTimeout(() => router.push(`/community/${name}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-6 py-14">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-ink/80 mb-6">
          <Link href={`/community/${name}`} className="hover:text-ink transition-colors">
            ← Back to {deslugify(name)}
          </Link>
        </p>

        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
          Edit community
        </h1>
        <p className="text-ink/80 text-sm mb-10 font-[family-name:var(--font-geist-sans)]">
          Update your community profile on Agora.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Community name <span className="text-orange">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Description <span className="text-orange">*</span>
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Location
            </label>
            <input
              type="text"
              placeholder="City, Country"
              maxLength={80}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Logo URL
            </label>
            <input
              type="url"
              placeholder="https://…"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className={inputCls}
            />
            {logoUrl.trim() && (
              <div className="mt-1">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Cover image URL
            </label>
            <input
              type="url"
              placeholder="https://… (recommended: 1200×400px)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Social links section */}
          <div className="pt-2 border-t border-warm-gray/30">
            <p className="text-xs font-semibold text-ink uppercase tracking-widest mb-4">
              Social links
            </p>
            <div className="flex flex-col gap-4">
              {/* Website */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
                  Website
                </label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Twitter / X */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
                  Twitter / X
                </label>
                <input
                  type="text"
                  placeholder="@handle"
                  maxLength={100}
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Instagram */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
                  Instagram
                </label>
                <input
                  type="text"
                  placeholder="@handle"
                  maxLength={100}
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* LinkedIn */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
                  LinkedIn
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/…"
                  maxLength={200}
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* YouTube */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
                  YouTube
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/@…"
                  maxLength={200}
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Discord */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
                  Discord invite URL
                </label>
                <input
                  type="url"
                  placeholder="https://discord.gg/…"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-5 pt-2">
            <button
              type="submit"
              disabled={saving || saved}
              className="px-6 py-3 bg-orange text-cream text-sm font-semibold hover:bg-orange-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saved ? (
                'Community saved on-chain ✓'
              ) : saving ? (
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
            </button>
            <Link
              href={`/community/${name}`}
              className="text-sm text-ink/80 hover:text-ink transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>

        <p className="mt-8 text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
          Community profiles expire after 1 year and renew when you edit them.
        </p>
      </div>
    </div>
  );
}
