'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { jsonToPayload } from '@arkiv-network/sdk/utils';
import { publicClient, type ArkivEvent } from '@/lib/arkiv';
import { eventExpiresAt, secondsUntilExpiry } from '@/lib/expiration';

export default function PendingEvents({
  events: initialEvents,
  communityCreatedBy,
}: {
  events: ArkivEvent[];
  communityCreatedBy: string;
}) {
  const { address } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const [events, setEvents] = useState(initialEvents);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Only the community creator can see this section
  if (!address) return null;
  if (!communityCreatedBy) return null;
  if (address.toLowerCase() !== communityCreatedBy.toLowerCase()) return null;
  if (events.length === 0) return null;

  async function handleApprove(event: ArkivEvent) {
    if (!address || !wagmiWalletClient) return;
    setActionInProgress(event.entityKey);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      // Fetch full entity to get current payload
      const entity = await publicClient.getEntity(event.entityKey as Hex);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = entity.toJson() as Record<string, any>;

      const updatedPayload = { ...data, status: 'approved' };

      const attributes: { key: string; value: string }[] = [
        { key: 'type', value: 'event' },
        { key: 'organizer', value: event.organizer },
        { key: 'date', value: new Date(event.date).getTime().toString() },
        { key: 'status', value: 'approved' },
      ];
      if (event.category) {
        attributes.push({ key: 'category', value: event.category });
      }
      if (event.community) {
        attributes.push({ key: 'community', value: event.community });
      }

      await arkivWalletClient.updateEntity({
        entityKey: event.entityKey as Hex,
        payload: jsonToPayload(updatedPayload),
        contentType: 'application/json',
        attributes,
        expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(event.date))),
      });

      setEvents((prev) => prev.filter((e) => e.entityKey !== event.entityKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve event');
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleReject(event: ArkivEvent) {
    if (!address || !wagmiWalletClient) return;
    setActionInProgress(event.entityKey);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      await arkivWalletClient.deleteEntity({ entityKey: event.entityKey as Hex });
      setEvents((prev) => prev.filter((e) => e.entityKey !== event.entityKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject event');
    } finally {
      setActionInProgress(null);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-orange mb-4 font-[family-name:var(--font-kode-mono)]">
        Pending Events ({events.length})
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {events.map((event) => {
          const isProcessing = actionInProgress === event.entityKey;
          return (
            <div
              key={event.entityKey}
              className="flex items-center gap-4 p-4 border border-orange/30 bg-cream"
            >
              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange bg-orange/10 font-[family-name:var(--font-geist-sans)]">
                    Pending review
                  </span>
                </div>
                <Link
                  href={`/event/${event.entityKey}`}
                  className="text-base font-bold text-ink font-[family-name:var(--font-kode-mono)] hover:text-cobalt transition-colors truncate block"
                >
                  {event.title || 'Untitled Event'}
                </Link>
                <p className="text-xs text-warm-gray mt-0.5 font-[family-name:var(--font-geist-sans)]">
                  {event.date ? new Date(event.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  }) : 'No date'}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleApprove(event)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold bg-cobalt text-cream hover:bg-cobalt-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(event)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold border border-warm-gray/40 text-warm-gray hover:text-ink hover:border-ink/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
