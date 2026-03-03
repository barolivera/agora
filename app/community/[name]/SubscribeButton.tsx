'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient } from '@/lib/arkiv';
import { friendlyError } from '@/lib/errorUtils';

const KAOLIN_CHAIN_ID = 60138453025;

interface Props {
  slug: string;
  compact?: boolean;
}

export default function SubscribeButton({ slug, compact }: Props) {
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const chainId = useChainId();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionKey, setSubscriptionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) {
      setIsSubscribed(false);
      setSubscriptionKey(null);
      return;
    }

    const currentAddress = address;

    async function checkSubscription() {
      setChecking(true);
      try {
        const result = await publicClient
          .buildQuery()
          .where([eq('type', 'subscription'), eq('communitySlug', slug), eq('subscriber', currentAddress.toLowerCase())])
          .withPayload(true)
          .limit(1)
          .fetch();
        const entity = result?.entities?.[0];
        if (entity) {
          setIsSubscribed(true);
          setSubscriptionKey(entity.key ?? null);
        } else {
          setIsSubscribed(false);
          setSubscriptionKey(null);
        }
      } catch {
        // ignore — button stays in unsubscribed state
      } finally {
        setChecking(false);
      }
    }

    checkSubscription();
  }, [address, slug]);

  async function handleSubscribe() {
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

      await arkivWalletClient.createEntity({
        payload: jsonToPayload({
          communitySlug: slug,
          subscriber: address.toLowerCase(),
          subscribedAt: new Date().toISOString(),
        }),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'subscription' },
          { key: 'communitySlug', value: slug },
          { key: 'subscriber', value: address.toLowerCase() },
        ],
        expiresIn: ExpirationTime.fromDays(365),
      });

      // Re-fetch to get the entity key
      const result = await publicClient
        .buildQuery()
        .where([eq('type', 'subscription'), eq('communitySlug', slug), eq('subscriber', address.toLowerCase())])
        .withPayload(true)
        .limit(1)
        .fetch();
      const entity = result?.entities?.[0];
      setIsSubscribed(true);
      setSubscriptionKey(entity?.key ?? null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!address || !wagmiWalletClient || !subscriptionKey) return;
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

      await arkivWalletClient.deleteEntity({ entityKey: subscriptionKey as Hex });
      setIsSubscribed(false);
      setSubscriptionKey(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) return null;

  const subscribedCls = compact
    ? 'inline-flex items-center px-3 py-1 text-xs font-semibold border border-ink/30 text-ink/60 rounded-full hover:border-ink/50 transition-colors font-[family-name:var(--font-kode-mono)] disabled:opacity-50'
    : 'inline-flex items-center px-4 py-2 text-xs font-semibold border border-cobalt text-cobalt hover:bg-cobalt/10 transition-colors tracking-wide uppercase disabled:opacity-50';

  const unsubscribedCls = compact
    ? 'inline-flex items-center px-3 py-1 text-xs font-semibold border border-ink/30 text-ink/60 rounded-full hover:border-ink/50 hover:text-ink transition-colors font-[family-name:var(--font-kode-mono)] disabled:opacity-50'
    : 'inline-flex items-center px-4 py-2 text-xs font-semibold bg-cobalt text-cream hover:bg-cobalt-light transition-colors tracking-wide uppercase disabled:opacity-50';

  return (
    <div className="flex flex-col gap-1">
      {isSubscribed ? (
        <button
          onClick={handleUnsubscribe}
          disabled={loading || checking}
          className={subscribedCls}
        >
          {loading ? '…' : 'Subscribed ✓'}
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          disabled={loading || checking}
          className={unsubscribedCls}
        >
          {loading ? '…' : 'Subscribe'}
        </button>
      )}
      {!compact && error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
