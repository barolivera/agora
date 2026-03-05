'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, KAOLIN_CHAIN_ID } from '@/lib/arkiv';
import { friendlyError, isUserRejection } from '@/lib/errorUtils';
import { useSigningState } from '@/lib/useSigningState';


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
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const signing = useSigningState();

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

    signing.start();
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

      signing.signed();

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
      signing.done();
    } catch (err) {
      if (isUserRejection(err)) {
        signing.cancelled();
      } else {
        signing.reset();
        setError(friendlyError(err));
      }
    }
  }

  async function handleUnsubscribe() {
    if (!address || !wagmiWalletClient || !subscriptionKey) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    signing.start();
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      await arkivWalletClient.deleteEntity({ entityKey: subscriptionKey as Hex });
      signing.signed();
      setIsSubscribed(false);
      setSubscriptionKey(null);
      signing.done();
    } catch (err) {
      if (isUserRejection(err)) {
        signing.cancelled();
      } else {
        signing.reset();
        setError(friendlyError(err));
      }
    }
  }

  if (!isConnected) return null;

  const buttonLabel = signing.phase === 'waiting'
    ? 'Waiting for signature…'
    : signing.phase === 'saving'
    ? 'Confirmed! Saving…'
    : signing.phase === 'done'
    ? 'Done ✓'
    : isSubscribed
    ? 'Subscribed ✓'
    : 'Subscribe';

  const isDisabled = signing.isActive || checking;

  const subscribedCls = compact
    ? 'inline-flex items-center px-3 py-1 text-xs font-semibold border border-ink/30 text-ink/80 rounded-full hover:border-ink/50 transition-colors font-[family-name:var(--font-kode-mono)] disabled:opacity-50'
    : 'inline-flex items-center px-4 py-2 text-xs font-semibold border border-cobalt text-cobalt hover:bg-cobalt/10 transition-colors tracking-wide uppercase disabled:opacity-50';

  const unsubscribedCls = compact
    ? 'inline-flex items-center px-3 py-1 text-xs font-semibold border border-ink/30 text-ink/80 rounded-full hover:border-ink/50 hover:text-ink transition-colors font-[family-name:var(--font-kode-mono)] disabled:opacity-50'
    : 'inline-flex items-center px-4 py-2 text-xs font-semibold bg-cobalt text-cream hover:bg-cobalt-light transition-colors tracking-wide uppercase disabled:opacity-50';

  return (
    <div className="flex flex-col gap-1">
      {isSubscribed ? (
        <button
          onClick={handleUnsubscribe}
          disabled={isDisabled}
          className={subscribedCls}
        >
          {(signing.phase === 'waiting' || signing.phase === 'saving') && (
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {buttonLabel}
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          disabled={isDisabled}
          className={unsubscribedCls}
        >
          {(signing.phase === 'waiting' || signing.phase === 'saving') && (
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {buttonLabel}
        </button>
      )}
      {signing.phase === 'cancelled' && (
        <p className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
          Transaction cancelled. No worries — try again when ready.
        </p>
      )}
      {!compact && error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
