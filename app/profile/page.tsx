'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseProfile, type ArkivProfile } from '@/lib/arkiv';

export default function EditProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();

  const [existingProfile, setExistingProfile] = useState<ArkivProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [farcaster, setFarcaster] = useState('');

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    async function loadProfile() {
      setLoading(true);
      try {
        const result = await publicClient
          .buildQuery()
          .where([eq('type', 'profile'), eq('address', address!.toLowerCase())])
          .withPayload(true)
          .limit(1)
          .fetch()
          .catch(() => null);

        const entity = result?.entities?.[0];
        if (entity) {
          const profile = parseProfile(entity);
          setExistingProfile(profile);
          setNickname(profile.nickname ?? '');
          setBio(profile.bio ?? '');
          setLocation(profile.location ?? '');
          setAvatarUrl(profile.avatarUrl ?? '');
          setTwitter(profile.twitter ?? '');
          setDiscord(profile.discord ?? '');
          setFarcaster(profile.farcaster ?? '');
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [address]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !wagmiWalletClient) return;

    setSaving(true);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      const profilePayload = {
        payload: jsonToPayload({
          address: address.toLowerCase(),
          ...(nickname.trim() && { nickname: nickname.trim() }),
          ...(bio.trim() && { bio: bio.trim() }),
          ...(location.trim() && { location: location.trim() }),
          ...(avatarUrl.trim() && { avatarUrl: avatarUrl.trim() }),
          ...(twitter.trim() && { twitter: twitter.trim() }),
          ...(discord.trim() && { discord: discord.trim() }),
          ...(farcaster.trim() && { farcaster: farcaster.trim() }),
        }),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'profile' },
          { key: 'address', value: address.toLowerCase() },
        ],
        // Profile expires after 1 year, renewed on each edit
        expiresIn: ExpirationTime.fromDays(365),
      };

      if (existingProfile?.entityKey) {
        await arkivWalletClient.updateEntity({
          entityKey: existingProfile.entityKey as Hex,
          ...profilePayload,
        });
      } else {
        await arkivWalletClient.createEntity(profilePayload);
      }

      setSaved(true);
      setTimeout(() => router.push(`/profile/${address}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">👤</p>
          <h1 className="text-2xl font-bold text-ink font-[family-name:var(--font-fraunces)] mb-3">
            Connect your wallet
          </h1>
          <p className="text-warm-gray text-sm">
            Connect your wallet to set up your public profile.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream">
        <div className="max-w-xl mx-auto px-6 py-16 space-y-4 animate-pulse">
          <div className="h-8 bg-warm-gray/30 rounded w-1/3" />
          <div className="h-4 bg-warm-gray/30 rounded w-2/3" />
          <div className="h-10 bg-warm-gray/30 rounded mt-8" />
          <div className="h-24 bg-warm-gray/30 rounded" />
          <div className="h-10 bg-warm-gray/30 rounded" />
          <div className="h-10 bg-warm-gray/30 rounded" />
        </div>
      </main>
    );
  }

  const inputClass =
    'border border-warm-gray/50 bg-cream px-4 py-3 text-sm text-ink placeholder:text-warm-gray/40 focus:outline-none focus:border-ink transition-colors w-full';

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-6 py-16">

        <h1 className="text-4xl font-bold text-ink font-[family-name:var(--font-fraunces)] mb-2">
          {existingProfile ? 'Edit profile' : 'Set up your profile'}
        </h1>
        <p className="text-warm-gray text-sm mb-10 font-[family-name:var(--font-dm-sans)]">
          Your public profile on Agora — visible to anyone who views your events.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Display name
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your name or alias"
              maxLength={50}
              className={inputClass}
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description about yourself"
              rows={3}
              maxLength={300}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              maxLength={80}
              className={inputClass}
            />
          </div>

          {/* Avatar URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-widest">
              Avatar URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
            <p className="text-xs text-warm-gray/60 font-[family-name:var(--font-dm-sans)]">
              Leave blank to use your Ethereum identicon
            </p>
          </div>

          {/* Social links */}
          <div className="pt-2 border-t border-warm-gray/30">
            <p className="text-xs font-semibold text-ink uppercase tracking-widest mb-4">
              Social links
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)]">
                  𝕏 Twitter / X
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@handle"
                  maxLength={100}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)]">
                  💬 Discord
                </label>
                <input
                  type="text"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="username or server invite"
                  maxLength={100}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)]">
                  🟣 Farcaster
                </label>
                <input
                  type="text"
                  value={farcaster}
                  onChange={(e) => setFarcaster(e.target.value)}
                  placeholder="@handle"
                  maxLength={100}
                  className={inputClass}
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
              className="px-6 py-3 bg-orange text-cream text-sm font-semibold hover:bg-orange-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saved ? 'Profile saved on-chain ✓' : saving ? 'Saving…' : 'Save profile'}
            </button>
            {existingProfile && address && (
              <a
                href={`/profile/${address}`}
                className="text-sm text-warm-gray hover:text-ink transition-colors"
              >
                View public profile →
              </a>
            )}
          </div>

        </form>

        <p className="mt-8 text-xs text-warm-gray/60 font-[family-name:var(--font-dm-sans)]">
          Your profile expires after 1 year and renews when you edit it.
        </p>

      </div>
    </main>
  );
}
