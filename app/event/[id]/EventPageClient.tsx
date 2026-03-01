'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { createWalletClient, custom, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eventExpiresAt, secondsUntilExpiry, formatExpiryDate, getEventStatus } from '@/lib/expiration';
import StatusBadge, { type EventStatus } from '@/app/components/StatusBadge';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { friendlyError } from '@/lib/errorUtils';
import { eq } from '@arkiv-network/sdk/query';
import {
  publicClient,
  parseEvent,
  parseRSVP,
  parseAttendance,
  parseWaitlist,
  type ArkivEvent,
  type ArkivRSVP,
  type ArkivAttendance,
  type ArkivWaitlist,
} from '@/lib/arkiv';

const KAOLIN_CHAIN_ID = 60138453025;

// Gradient combos keyed to the new editorial palette
const CARD_GRADIENTS: [string, string][] = [
  ['#E8491C', '#C8C0B4'], // orange → warm-gray
  ['#0247E2', '#F2EDE4'], // cobalt → cream
  ['#1A1614', '#E8491C'], // ink → orange
  ['#D4E84C', '#E8491C'], // yellow → orange
  ['#3D72F5', '#F2EDE4'], // cobalt-light → cream
];

function titleGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff;
  }
  const [from, to] = CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function formatDay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return t === '12:00 AM' ? '' : t;
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div>
      <div className="h-64 sm:h-72 bg-warm-gray/30 animate-pulse" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 bg-warm-gray/30 rounded w-1/4" />
            <div className="h-4 bg-warm-gray/30 rounded w-full" />
            <div className="h-4 bg-warm-gray/30 rounded w-5/6" />
            <div className="h-4 bg-warm-gray/30 rounded w-4/6" />
            <div className="h-4 bg-warm-gray/30 rounded w-full mt-2" />
            <div className="h-4 bg-warm-gray/30 rounded w-3/4" />
          </div>
          <div className="h-72 bg-warm-gray/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Attendee row ──────────────────────────────────────────────────────────────

function AttendeeRow({ rsvp, verified }: { rsvp: ArkivRSVP; verified: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <img
        src={`https://effigy.im/a/${rsvp?.attendee}.svg`}
        alt=""
        width={24}
        height={24}
        className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="text-sm text-ink font-mono truncate flex-1">
        {shortAddress(rsvp?.attendee ?? '')}
      </span>
      {verified && (
        <span className="text-xs font-semibold text-green-600 flex items-center gap-1 shrink-0">
          ✓ Verified
        </span>
      )}
    </li>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventPageClient() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? '';

  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const chainId = useChainId();

  const [event, setEvent] = useState<ArkivEvent | null>(null);
  const [rsvps, setRsvps] = useState<ArkivRSVP[]>([]);
  const [attendances, setAttendances] = useState<ArkivAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Organizer verify panel state
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [checkedAttendees, setCheckedAttendees] = useState<Set<string>>(new Set());
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);

  // Waitlist
  const [waitlist, setWaitlist] = useState<ArkivWaitlist[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Cancel attendance
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelledWithWaitlist, setCancelledWithWaitlist] = useState(false);

  // Cancel event (organizer)
  const [showCancelEventConfirm, setShowCancelEventConfirm] = useState(false);
  const [cancelEventLoading, setCancelEventLoading] = useState(false);
  const [cancelEventStatus, setCancelEventStatus] = useState('');
  const [rawEventData, setRawEventData] = useState<Record<string, unknown>>({});

  const fetchAttendees = useCallback(async () => {
    if (!id) return;
    const result = await publicClient
      .buildQuery()
      .where([eq('type', 'rsvp'), eq('eventId', id)])
      .withPayload(true)
      .fetch();
    setRsvps(result?.entities?.map(parseRSVP) ?? []);
  }, [id]);

  const fetchAttendances = useCallback(async () => {
    if (!id) return;
    const result = await publicClient
      .buildQuery()
      .where([eq('type', 'attendance'), eq('eventId', id)])
      .withPayload(true)
      .fetch();
    setAttendances(result?.entities?.map(parseAttendance) ?? []);
  }, [id]);

  const fetchWaitlist = useCallback(async () => {
    if (!id) return;
    const result = await publicClient
      .buildQuery()
      .where([eq('type', 'waitlist'), eq('eventId', id)])
      .withPayload(true)
      .fetch();
    setWaitlist(result?.entities?.map(parseWaitlist) ?? []);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const entity = await publicClient.getEntity(id as Hex);
        setRawEventData((entity.toJson() as Record<string, unknown>) ?? {});
        setEvent(parseEvent(entity));
        await Promise.all([fetchAttendees(), fetchAttendances(), fetchWaitlist()]);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, fetchAttendees, fetchAttendances, fetchWaitlist]);

  async function handleRSVP() {
    if (!address || !wagmiWalletClient || !id || !event) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    setRsvpLoading(true);
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
          eventId: id,
          attendee: address,
          confirmedAt: new Date().toISOString(),
          // Embed the organizer address so each RSVP carries the full
          // 3-way relationship: organizer → event → rsvp
          eventOrganizer: event.organizer,
        }),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'rsvp' },
          { key: 'eventId', value: id },
        ],
        expiresIn: secondsUntilExpiry(eventExpiresAt(event.date)),
      });

      await fetchAttendees();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleWaitlist() {
    if (!address || !wagmiWalletClient || !id || !event) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    setWaitlistLoading(true);
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
          eventId: id,
          attendee: address,
          joinedAt: new Date().toISOString(),
        }),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'waitlist' },
          { key: 'eventId', value: id },
        ],
        expiresIn: secondsUntilExpiry(eventExpiresAt(event.date)),
      });

      await fetchWaitlist();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setWaitlistLoading(false);
    }
  }

  async function handleCancelRSVP() {
    if (!address || !wagmiWalletClient || !event) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    const myRsvp = (rsvps ?? []).find(
      (r) => (r?.attendee?.toLowerCase() ?? '') === address.toLowerCase()
    );
    const myRsvpKey = myRsvp?.entityKey;

    console.log('myRsvpKey:', myRsvpKey);

    if (!myRsvpKey) {
      console.error('No RSVP entity key found');
      return;
    }

    const capacity = event.capacity ?? 0;
    const wasAtCapacity = capacity > 0 && (rsvps?.length ?? 0) >= capacity;
    const hasWaitlist = (waitlist?.length ?? 0) > 0;

    setCancelLoading(true);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      await arkivWalletClient.deleteEntity({ entityKey: myRsvpKey as Hex });
      setRsvps(prev => prev.filter(r => r.entityKey !== myRsvpKey));

      // Clean up waitlist entry if the user had one.
      const myWaitlistEntry = (waitlist ?? []).find(
        (w) => (w?.attendee?.toLowerCase() ?? '') === address.toLowerCase()
      );
      if (myWaitlistEntry?.entityKey) {
        await arkivWalletClient.deleteEntity({ entityKey: myWaitlistEntry.entityKey as Hex });
        setWaitlist(prev => prev.filter(w => w.entityKey !== myWaitlistEntry.entityKey));
      }

      // Guard: remove verified attendance record if one exists.
      const myAttendance = (attendances ?? []).find(
        (a) => (a?.attendee?.toLowerCase() ?? '') === address.toLowerCase()
      );
      if (myAttendance?.entityKey) {
        await arkivWalletClient.deleteEntity({ entityKey: myAttendance.entityKey as Hex });
        setAttendances(prev => prev.filter(a => a.entityKey !== myAttendance.entityKey));
      }

      if (wasAtCapacity && hasWaitlist) {
        setCancelledWithWaitlist(true);
      }
      setShowCancelConfirm(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleVerifyAttendance() {
    if (!address || !wagmiWalletClient || !id) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    setVerifyLoading(true);
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      for (const attendee of checkedAttendees) {
        await arkivWalletClient.createEntity({
          payload: jsonToPayload({
            eventId: id,
            attendee,
            verified: true,
            verifiedAt: new Date().toISOString(),
          }),
          contentType: 'application/json',
          attributes: [
            { key: 'type', value: 'attendance' },
            { key: 'eventId', value: id },
            { key: 'attendee', value: attendee },
            { key: 'verified', value: 'true' },
          ],
          expiresIn: ExpirationTime.fromDays(3650),
        });
      }

      await fetchAttendances();
      setVerifyDone(true);
      setShowVerifyPanel(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleCancelEvent() {
    if (!address || !wagmiWalletClient || !id || !event) return;
    if (chainId !== KAOLIN_CHAIN_ID) {
      setError('Please switch to Arkiv Kaolin to continue.');
      return;
    }

    const rsvpCount = rsvps?.length ?? 0;
    const waitlistCount = waitlist?.length ?? 0;
    const totalChildren = rsvpCount + waitlistCount;
    setCancelEventLoading(true);
    setCancelEventStatus(
      totalChildren > 0
        ? `Cancelling event and updating ${totalChildren} record${totalChildren !== 1 ? 's' : ''}...`
        : 'Cancelling event...'
    );
    setError('');

    try {
      const arkivWalletClient = createWalletClient({
        account: wagmiWalletClient.account,
        chain: kaolin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(wagmiWalletClient as any),
      });

      // 1. Update the event entity to cancelled
      const payload: Record<string, unknown> = { ...rawEventData, status: 'cancelled' };

      const attributes: { key: string; value: string }[] = [
        { key: 'type', value: 'event' },
        { key: 'organizer', value: event.organizer },
        { key: 'date', value: new Date(event.date).getTime().toString() },
        { key: 'status', value: 'cancelled' },
      ];
      if (event.community) {
        attributes.push({ key: 'community', value: event.community });
      }

      await arkivWalletClient.updateEntity({
        entityKey: id as Hex,
        payload: jsonToPayload(payload),
        contentType: 'application/json',
        attributes,
        expiresIn: secondsUntilExpiry(eventExpiresAt(event.date)),
      });

      // 2. Propagate cancellation to all child RSVPs — maintains referential
      //    integrity so children reflect parent state changes.
      for (const rsvp of (rsvps ?? [])) {
        if (!rsvp?.entityKey) continue;
        await arkivWalletClient.updateEntity({
          entityKey: rsvp.entityKey as Hex,
          payload: jsonToPayload({
            eventId: rsvp.eventId,
            attendee: rsvp.attendee,
            confirmedAt: rsvp.confirmedAt,
            eventOrganizer: event.organizer,
            status: 'cancelled',
          }),
          contentType: 'application/json',
          attributes: [
            { key: 'type', value: 'rsvp' },
            { key: 'eventId', value: rsvp.eventId },
            { key: 'status', value: 'cancelled' },
          ],
          expiresIn: secondsUntilExpiry(eventExpiresAt(event.date)),
        });
      }

      // 3. Propagate cancellation to waitlist entries.
      for (const entry of (waitlist ?? [])) {
        if (!entry?.entityKey) continue;
        await arkivWalletClient.updateEntity({
          entityKey: entry.entityKey as Hex,
          payload: jsonToPayload({
            eventId: entry.eventId,
            attendee: entry.attendee,
            joinedAt: entry.joinedAt,
            status: 'cancelled',
          }),
          contentType: 'application/json',
          attributes: [
            { key: 'type', value: 'waitlist' },
            { key: 'eventId', value: entry.eventId },
            { key: 'status', value: 'cancelled' },
          ],
          expiresIn: secondsUntilExpiry(eventExpiresAt(event.date)),
        });
      }

      setEvent((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      setShowCancelEventConfirm(false);
      setCancelEventStatus('');
    } catch (err) {
      setError(friendlyError(err));
      setCancelEventStatus('');
    } finally {
      setCancelEventLoading(false);
    }
  }

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  }

  if (loading) return <PageSkeleton />;

  if (!event) {
    return (
      <main className="max-w-2xl mx-auto py-20 px-6 text-center">
        <p className="text-3xl mb-4">🏛️</p>
        <p className="text-warm-gray font-[family-name:var(--font-fraunces)] text-lg mb-2">
          Event not found
        </p>
        {error && <p className="text-sm text-warm-gray/70">{error}</p>}
      </main>
    );
  }

  const normalizedAddress = address?.toLowerCase() ?? '';
  const alreadyRsvpd =
    isConnected &&
    !!normalizedAddress &&
    (rsvps ?? []).some((r) => (r?.attendee?.toLowerCase() ?? '') === normalizedAddress);
  const atCapacity = (event?.capacity ?? 0) > 0 && (rsvps?.length ?? 0) >= (event?.capacity ?? 0);
  const alreadyOnWaitlist =
    isConnected &&
    !!normalizedAddress &&
    (waitlist ?? []).some((w) => (w?.attendee?.toLowerCase() ?? '') === normalizedAddress);
  const canRsvp = isConnected && !alreadyRsvpd && !atCapacity;

  const isOrganizer =
    isConnected &&
    !!address &&
    !!event?.organizer &&
    address.toLowerCase() === event.organizer.toLowerCase();

  const eventPassed = event?.date ? new Date(event.date) < new Date() : false;

  const displayStatus: EventStatus =
    event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');

  const verifiedAddresses = new Set(
    (attendances ?? []).map((a) => a?.attendee?.toLowerCase() ?? '')
  );

  const day = formatDay(event?.date ?? '');
  const time = formatTime(event?.date ?? '');
  const gradient = titleGradient(event?.title ?? '');

  const capacityPct =
    (event?.capacity ?? 0) > 0
      ? Math.min(100, Math.round(((rsvps?.length ?? 0) / (event?.capacity ?? 1)) * 100))
      : null;

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero / Poster ──────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: gradient }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 flex flex-col gap-6">
          <div>
            <StatusBadge status={displayStatus} />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-cream max-w-2xl leading-tight font-[family-name:var(--font-fraunces)] drop-shadow-sm">
            {event?.title || 'Untitled Event'}
          </h1>

          {/* Date / time / location row */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-cream/85 text-sm sm:text-base">
            {day && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 opacity-75" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{day}</span>
              </div>
            )}
            {time && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 opacity-75" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{time}</span>
              </div>
            )}
            {event?.location && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 opacity-75" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {/* Organizer row */}
          {event?.organizer && (
            <Link
              href={`/profile/${event.organizer}`}
              className="flex items-center gap-2.5 mt-1 group w-fit"
            >
              <img
                src={`https://effigy.im/a/${event.organizer}.svg`}
                alt=""
                width={28}
                height={28}
                className="rounded-full ring-2 ring-cream/30 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-sm text-cream/70 font-mono group-hover:text-cream transition-colors">
                {shortAddress(event.organizer)}
              </span>
            </Link>
          )}

          {/* Community badge */}
          {event?.community && (
            <div>
              <Link
                href={`/community/${event.community}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cream rounded-full"
                style={{ backgroundColor: '#0247E2' }}
              >
                Part of {deslugify(event.community)}
              </Link>
            </div>
          )}

          {/* Share buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              style={{ backgroundColor: '#0247E2' }}
              className="px-4 py-2 text-xs font-semibold text-cream tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              {copied ? 'Copied!' : 'Share event'}
            </button>
            <a
              href={`/event/${id}/opengraph-image`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-cream tracking-widest uppercase border border-cream/40 hover:border-cream/80 transition-colors"
            >
              View poster
            </a>
          </div>
        </div>
      </section>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">

          {/* Left: description + organizer controls */}
          <div>
            {event?.description ? (
              <>
                <h2 className="text-xl font-semibold text-ink mb-4 font-[family-name:var(--font-fraunces)]">
                  About this event
                </h2>
                <p className="text-ink leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </>
            ) : (
              <p className="text-warm-gray italic">No description provided.</p>
            )}

            {/* Expiry notice */}
            {event?.date && (
              <p className="mt-6 text-xs text-warm-gray font-[family-name:var(--font-dm-sans)]">
                This event page expires on {formatExpiryDate(eventExpiresAt(event.date))}
              </p>
            )}

            {/* ── Organizer Controls ────────────────────────── */}
            {isOrganizer && (
              <div className="mt-10 pt-8 border-t border-warm-gray/30">
                <h2 className="text-xl font-semibold text-ink mb-4 font-[family-name:var(--font-fraunces)]">
                  Organizer Controls
                </h2>

                <div className="mb-5 flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/event/edit/${id}`}
                    className="inline-block px-4 py-2 text-sm font-semibold border border-warm-gray text-warm-gray hover:border-ink hover:text-ink transition-colors"
                  >
                    Edit event
                  </Link>
                </div>

                {/* Status management */}
                <div className="mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-warm-gray">Status:</span>
                    <StatusBadge status={displayStatus} />
                  </div>
                  {(displayStatus === 'upcoming' || displayStatus === 'live') && (
                    showCancelEventConfirm ? (
                      <div className="border border-red-200 p-4 flex flex-col gap-3">
                        <p className="text-sm font-semibold text-ink">Cancel this event?</p>
                        <p className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)]">
                          Are you sure? This cannot be undone.
                          {(rsvps?.length ?? 0) > 0 && (
                            <> All {rsvps.length} RSVP{rsvps.length !== 1 ? 's' : ''} will be marked cancelled.</>
                          )}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancelEvent}
                            disabled={cancelEventLoading}
                            className="px-3 py-1.5 bg-red-600 text-cream text-xs font-semibold disabled:opacity-60 hover:bg-red-700 transition-colors"
                          >
                            {cancelEventLoading ? 'Cancelling…' : 'Yes, cancel event'}
                          </button>
                          <button
                            onClick={() => setShowCancelEventConfirm(false)}
                            disabled={cancelEventLoading}
                            className="px-3 py-1.5 text-xs text-warm-gray border border-warm-gray/40 hover:text-ink hover:border-warm-gray transition-colors disabled:opacity-40"
                          >
                            Keep event
                          </button>
                        </div>
                        {cancelEventStatus && (
                          <p className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)]">
                            {cancelEventStatus}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCancelEventConfirm(true)}
                        className="self-start px-4 py-1.5 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Cancel event
                      </button>
                    )
                  )}
                </div>

                {atCapacity && (
                  <div className="mb-6 p-4 border border-warm-gray/30">
                    <p className="text-sm font-semibold text-ink mb-3">
                      Waitlist{(waitlist?.length ?? 0) > 0 ? ` (${waitlist?.length ?? 0})` : ''}
                    </p>
                    {(waitlist?.length ?? 0) > 0 ? (
                      <ul className="space-y-2.5 mb-3">
                        {(waitlist ?? []).map((entry) => (
                          <li key={entry?.entityKey} className="flex items-center gap-2.5">
                            <img
                              src={`https://effigy.im/a/${entry?.attendee}.svg`}
                              alt=""
                              width={20}
                              height={20}
                              className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="text-sm text-ink font-mono truncate">
                              {shortAddress(entry?.attendee ?? '')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-warm-gray italic mb-3">No one on the waitlist yet.</p>
                    )}
                    <p className="text-xs text-warm-gray/70 font-[family-name:var(--font-dm-sans)] leading-snug">
                      Waitlist members are stored on-chain and expire with the event — no abandoned data.
                    </p>
                  </div>
                )}

                {verifyDone ? (
                  <p className="text-sm font-medium text-ink">
                    Event closed. Attendance verified on-chain.
                  </p>
                ) : eventPassed ? (
                  <>
                    {!showVerifyPanel ? (
                      <button
                        onClick={() => setShowVerifyPanel(true)}
                        className="px-4 py-2.5 bg-ink text-cream text-sm font-semibold hover:bg-ink/80 transition-colors"
                      >
                        Close event &amp; verify attendance
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-warm-gray">
                          Select who actually attended:
                        </p>
                        {(rsvps?.length ?? 0) === 0 ? (
                          <p className="text-sm text-warm-gray italic">No RSVPs to verify.</p>
                        ) : (
                          <ul className="space-y-2.5">
                            {(rsvps ?? []).map((rsvp) => {
                              const addr = rsvp?.attendee ?? '';
                              const addrLower = addr.toLowerCase();
                              const checked = checkedAttendees.has(addrLower);
                              return (
                                <li key={rsvp?.entityKey} className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    id={`verify-${addrLower}`}
                                    checked={checked}
                                    onChange={(e) => {
                                      setCheckedAttendees((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(addrLower);
                                        else next.delete(addrLower);
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4 accent-orange shrink-0"
                                  />
                                  <label
                                    htmlFor={`verify-${addrLower}`}
                                    className="text-sm text-ink font-mono cursor-pointer"
                                  >
                                    {shortAddress(addr)}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={handleVerifyAttendance}
                            disabled={verifyLoading || checkedAttendees.size === 0}
                            className="px-4 py-2.5 bg-orange text-cream text-sm font-semibold hover:bg-orange-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {verifyLoading
                              ? 'Verifying…'
                              : `Confirm attendance (${checkedAttendees.size})`}
                          </button>
                          <button
                            onClick={() => setShowVerifyPanel(false)}
                            className="text-sm text-warm-gray hover:text-ink transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-warm-gray/70 italic">
                    The &quot;Close event &amp; verify attendance&quot; option will appear after
                    the event date has passed.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: attendee card */}
          <div className="lg:sticky lg:top-6">
            <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">

              {/* Count + capacity bar */}
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-ink font-[family-name:var(--font-fraunces)]">
                    {rsvps?.length ?? 0}
                  </span>
                  {(event?.capacity ?? 0) > 0 ? (
                    <span className="text-warm-gray text-sm">
                      / {event?.capacity} attending
                    </span>
                  ) : (
                    <span className="text-warm-gray text-sm">attending</span>
                  )}
                </div>
                {capacityPct !== null && (
                  <div className="h-1.5 bg-warm-gray/30 overflow-hidden">
                    <div
                      className="h-full bg-orange transition-all duration-500"
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Attendees list */}
              {(rsvps?.length ?? 0) === 0 ? (
                <p className="text-sm text-warm-gray">No attendees yet — be the first!</p>
              ) : (
                <ul className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {(rsvps ?? []).map((rsvp) => (
                    <AttendeeRow
                      key={rsvp?.entityKey}
                      rsvp={rsvp}
                      verified={verifiedAddresses.has(rsvp?.attendee?.toLowerCase() ?? '')}
                    />
                  ))}
                </ul>
              )}

              {/* Public attendees note */}
              <p className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)] leading-snug">
                Attendance is public and verifiable on-chain by anyone.
              </p>

              {/* Waitlist count + list */}
              {(waitlist?.length ?? 0) > 0 && (
                <div className="border-t border-warm-gray/20 pt-4 flex flex-col gap-3">
                  <p className="text-sm text-warm-gray font-[family-name:var(--font-dm-sans)]">
                    {waitlist?.length ?? 0} {(waitlist?.length ?? 0) === 1 ? 'person' : 'people'} on the waitlist
                  </p>
                  <ul className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {(waitlist ?? []).map((entry) => (
                      <li key={entry?.entityKey} className="flex items-center gap-2.5">
                        <img
                          src={`https://effigy.im/a/${entry?.attendee}.svg`}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="text-sm text-ink font-mono truncate flex-1">
                          {shortAddress(entry?.attendee ?? '')}
                        </span>
                        <span
                          className="text-xs font-semibold shrink-0"
                          style={{ color: '#0247E2' }}
                        >
                          Waitlist
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* On-chain verification info */}
              <p className="text-xs text-warm-gray/70 font-[family-name:var(--font-dm-sans)] leading-snug">
                Verified attendance is stored permanently on-chain and can be used for POAPs,
                community access, and on-chain credentials.
              </p>

              {/* Error */}
              {error && <ErrorMessage message={error} />}

              {/* CTA */}
              {displayStatus === 'cancelled' ? (
                <div className="p-4 bg-warm-gray/10 border border-warm-gray/30 text-center">
                  <p className="text-sm text-warm-gray font-[family-name:var(--font-dm-sans)]">
                    This event has been cancelled
                  </p>
                </div>
              ) : !isConnected ? (
                <p
                  className="text-center text-sm font-semibold py-3 font-[family-name:var(--font-dm-sans)]"
                  style={{ color: '#0247E2' }}
                >
                  Connect wallet to RSVP
                </p>
              ) : alreadyRsvpd ? (
                <div className="flex flex-col gap-2">
                  <button
                    disabled
                    className="w-full py-3 text-sm font-semibold bg-ink/10 text-ink border border-ink/20 cursor-default"
                  >
                    Attendance Confirmed ✓
                  </button>
                  {showCancelConfirm ? (
                    <div className="border border-warm-gray/30 p-3 flex flex-col gap-2.5">
                      <p className="text-sm text-ink">
                        Are you sure you want to cancel? This will remove your RSVP from the blockchain.
                      </p>
                      <p className="text-xs text-warm-gray font-[family-name:var(--font-dm-sans)] leading-snug">
                        Your RSVP will be deleted from Arkiv immediately.
                      </p>
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={handleCancelRSVP}
                          disabled={cancelLoading}
                          className="px-3 py-1.5 bg-red-600 text-cream text-xs font-semibold disabled:opacity-60 hover:bg-red-700 transition-colors"
                        >
                          {cancelLoading ? 'Cancelling…' : 'Yes, cancel'}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="px-3 py-1.5 text-xs text-warm-gray border border-warm-gray/40 hover:text-ink hover:border-warm-gray transition-colors"
                        >
                          Keep RSVP
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-xs text-warm-gray underline text-center font-[family-name:var(--font-dm-sans)] hover:text-ink transition-colors"
                    >
                      Cancel attendance
                    </button>
                  )}
                </div>
              ) : atCapacity ? (
                alreadyOnWaitlist ? (
                  <button
                    disabled
                    className="w-full py-3 text-sm font-semibold border cursor-default"
                    style={{ color: '#0247E2', borderColor: '#0247E2', backgroundColor: '#0247E210' }}
                  >
                    You&apos;re on the waitlist
                  </button>
                ) : (
                  <button
                    onClick={handleWaitlist}
                    disabled={waitlistLoading}
                    className="w-full py-3 text-sm font-semibold text-cream transition-colors disabled:opacity-60 disabled:cursor-wait"
                    style={{ backgroundColor: '#0247E2' }}
                  >
                    {waitlistLoading ? 'Joining…' : 'Join Waitlist'}
                  </button>
                )
              ) : (
                <button
                  onClick={handleRSVP}
                  disabled={rsvpLoading || !canRsvp}
                  className="w-full py-3 text-sm font-semibold bg-orange text-cream hover:bg-orange-light transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {rsvpLoading ? 'Confirming…' : 'Confirm Attendance'}
                </button>
              )}

              {/* Freed-spot notice after cancellation */}
              {cancelledWithWaitlist && (
                <p
                  className="text-xs text-center font-[family-name:var(--font-dm-sans)] leading-snug"
                  style={{ color: '#0247E2' }}
                >
                  Your spot has been freed. Waitlisted attendees can now join.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Toast */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-ink text-cream text-sm font-mono shadow-xl whitespace-nowrap">
          Link copied! Share it anywhere — the preview will show your event poster
        </div>
      )}
    </div>
  );
}
