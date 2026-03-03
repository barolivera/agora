'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { createWalletClient, custom } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { eq } from '@arkiv-network/sdk/query';
import { publicClient, parseEvent, cascadeDeleteEvent, type ArkivEvent } from '@/lib/arkiv';
import { getEventStatus } from '@/lib/expiration';
import StatusBadge from '@/app/components/StatusBadge';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';

const KAOLIN_CHAIN_ID = 60138453025;

type EventWithCount = ArkivEvent & { attendeeCount: number };

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export default function MyEventsPage() {
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const chainId = useChainId();

  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState('');

  useEffect(() => {
    if (!address) return;

    const currentAddress = address;

    async function fetchMyEvents() {
      setLoading(true);
      setError('');
      try {
        const result = await publicClient
          .buildQuery()
          .where([eq('type', 'event'), eq('organizer', currentAddress)])
          .withPayload(true)
          .fetch();

        const parsed = result.entities.map(parseEvent);

        const withCounts = await Promise.all(
          parsed.map(async (event) => {
            const attendeeCount = await publicClient
              .buildQuery()
              .where([eq('type', 'rsvp'), eq('eventId', event.entityKey)])
              .count();
            return { ...event, attendeeCount };
          }),
        );

        setEvents(withCounts);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
      }
    }

    fetchMyEvents();
  }, [address]);

  async function handleDelete(event: EventWithCount) {
    if (!address || !wagmiWalletClient) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    setDeletingId(event.entityKey);
    setDeleteStatus('Deleting event and all associated data...');
    setConfirmDeleteId(null);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      await cascadeDeleteEvent(arkivWalletClient, event.entityKey);
      setEvents(prev => prev.filter(e => e.entityKey !== event.entityKey));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setDeletingId(null);
      setDeleteStatus('');
    }
  }

  if (!isConnected) {
    return (
      <main className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-warm-gray">Connect your wallet to see your events</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">
          My Events
        </h1>
        <Link
          href="/create-event"
          className="bg-orange text-cream px-4 py-2 text-sm font-medium hover:bg-orange-light transition-colors"
        >
          + Create Event
        </Link>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => setError('')} />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-cream border border-warm-gray/40 p-5">
              <div className="h-5 bg-warm-gray/40 rounded w-1/2 mb-3" />
              <div className="h-4 bg-warm-gray/40 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-warm-gray mb-4">You haven&#39;t created any events yet</p>
          <Link
            href="/create-event"
            className="text-sm font-medium text-cobalt underline underline-offset-2 hover:text-cobalt-light"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const status = event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');
            const dimmed = status === 'ended' || status === 'cancelled';
            const canDelete = status === 'ended' || status === 'cancelled';
            const isDeleting = deletingId === event.entityKey;
            const isConfirming = confirmDeleteId === event.entityKey;

            return (
              <div
                key={event.entityKey}
                className={`group bg-cream border border-warm-gray/40 hover:border-warm-gray transition-colors${dimmed ? ' opacity-75' : ''}`}
              >
                {/* Main info — navigates to event page */}
                <Link
                  href={`/event/${event.entityKey}`}
                  className="block p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-ink truncate font-[family-name:var(--font-kode-mono)]">
                        {event.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-warm-gray">
                        {event.category && (
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-cobalt font-[family-name:var(--font-dm-sans)]">
                            {event.category}
                          </span>
                        )}
                        {formatDate(event.date) && <span>{formatDate(event.date)}</span>}
                        {event.location && <span>{event.location}</span>}
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={status} />
                      </div>
                    </div>
                    <span className="text-sm text-warm-gray whitespace-nowrap shrink-0">
                      {event.attendeeCount}{event.capacity > 0 ? ` / ${event.capacity}` : ''} attending
                    </span>
                  </div>
                </Link>

                {/* Delete controls — only for ended or cancelled events */}
                {canDelete && (
                  <div className="px-5 pb-4 pt-0 border-t border-warm-gray/10">
                    {isDeleting ? (
                      <p className="text-xs text-warm-gray pt-3 font-[family-name:var(--font-dm-sans)]">
                        {deleteStatus}
                      </p>
                    ) : isConfirming ? (
                      <div className="flex flex-wrap items-center gap-3 pt-3">
                        <p className="text-xs text-ink font-[family-name:var(--font-dm-sans)]">
                          Delete this event and all its RSVPs and attendance records?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(event)}
                            className="px-3 py-1 text-xs font-semibold text-cream bg-red-600 hover:bg-red-700 transition-colors"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-warm-gray hover:text-ink transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(event.entityKey)}
                        className="mt-3 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors font-[family-name:var(--font-dm-sans)]"
                      >
                        Delete event + data
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
