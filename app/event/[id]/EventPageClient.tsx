'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
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
  parseCommunity,
  shortAddress,
  type ArkivEvent,
  type ArkivRSVP,
  type ArkivAttendance,
  type ArkivWaitlist,
  type ArkivCommunity,
} from '@/lib/arkiv';
import { useDisplayNames, displayName } from '@/lib/useDisplayNames';
import SubscribeButton from '@/app/community/[name]/SubscribeButton';

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

function formatTime(dateStr: string, endTime?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (t === '12:00 AM') return '';
  if (endTime) {
    const [h, m] = endTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const endDate = new Date(d);
      endDate.setHours(h, m, 0, 0);
      const et = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${t} — ${et}`;
    }
  }
  return t;
}

function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function calendarDates(event: ArkivEvent) {
  const start = new Date(event.date);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start);
  if (event.endTime) {
    const [h, m] = event.endTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      end.setHours(h, m, 0, 0);
    } else {
      end.setHours(end.getHours() + 2);
    }
  } else {
    end.setHours(end.getHours() + 2);
  }
  return { start, end };
}

function googleCalendarUrl(event: ArkivEvent): string {
  const d = calendarDates(event);
  if (!d) return '#';
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(d.start)}/${fmt(d.end)}`,
    location: event.location ?? '',
    details: event.description ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function outlookCalendarUrl(event: ArkivEvent): string {
  const d = calendarDates(event);
  if (!d) return '#';
  const params = new URLSearchParams({
    subject: event.title,
    startdt: d.start.toISOString(),
    enddt: d.end.toISOString(),
    body: event.description ?? '',
    location: event.location ?? '',
    path: '/calendar/action/compose',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function yahooCalendarUrl(event: ArkivEvent): string {
  const d = calendarDates(event);
  if (!d) return '#';
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    title: event.title,
    st: fmt(d.start),
    et: fmt(d.end),
    desc: event.description ?? '',
    in_loc: event.location ?? '',
    v: '60',
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

function downloadIcs(event: ArkivEvent) {
  const d = calendarDates(event);
  if (!d) return;
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(d.start)}`,
    `DTEND:${fmt(d.end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description ?? '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Add to calendar modal ────────────────────────────────────────────────────

function ShareModal({
  event,
  onClose,
}: {
  event: ArkivEvent;
  onClose: () => void;
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function copyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const title = encodeURIComponent(event.title ?? 'Check out this event');

  const socials = [
    {
      label: 'Twitter / X',
      href: `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(eventUrl)}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${title}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${title}%20${encodeURIComponent(eventUrl)}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70"
      onClick={onClose}
    >
      <div
        className="bg-ink border border-warm-gray/20 w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-cream font-[family-name:var(--font-kode-mono)]">
            Share this event
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-warm-gray hover:text-cream transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 hover:border-cream/40 hover:bg-cream/5 transition-colors font-[family-name:var(--font-geist-sans)]"
            >
              <span className="shrink-0 text-warm-gray">{s.icon}</span>
              {s.label}
            </a>
          ))}
          <button
            onClick={copyLink}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 hover:border-cream/40 hover:bg-cream/5 transition-colors font-[family-name:var(--font-geist-sans)]"
          >
            <span className="shrink-0 text-warm-gray">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </span>
            {linkCopied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        <input
          type="text"
          readOnly
          value={eventUrl}
          onClick={copyLink}
          className="w-full px-3 py-2 text-xs text-warm-gray bg-ink border border-warm-gray/20 cursor-pointer hover:border-cream/40 transition-colors font-[family-name:var(--font-kode-mono)] truncate"
        />
      </div>
    </div>
  );
}

function CalendarModal({
  event,
  onClose,
}: {
  event: ArkivEvent;
  onClose: () => void;
}) {
  const options = [
    { label: 'Google Calendar', href: googleCalendarUrl(event), external: true },
    { label: 'Apple / iCal', href: '#', external: false, action: () => downloadIcs(event) },
    { label: 'Outlook.com', href: outlookCalendarUrl(event), external: true },
    { label: 'Yahoo Calendar', href: yahooCalendarUrl(event), external: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70"
      onClick={onClose}
    >
      <div
        className="bg-ink border border-warm-gray/20 w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-cream font-[family-name:var(--font-kode-mono)]">
            Add to calendar
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-warm-gray hover:text-cream transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {options.map((opt) =>
            opt.external ? (
              <a
                key={opt.label}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 hover:border-cream/40 hover:bg-cream/5 transition-colors font-[family-name:var(--font-geist-sans)] text-center"
              >
                {opt.label}
              </a>
            ) : (
              <button
                key={opt.label}
                onClick={() => { opt.action?.(); onClose(); }}
                className="w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 hover:border-cream/40 hover:bg-cream/5 transition-colors font-[family-name:var(--font-geist-sans)] text-center"
              >
                {opt.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[44fr_56fr] gap-8 animate-pulse">
          <div className="space-y-6">
            <div className="w-full aspect-square bg-warm-gray/30 rounded-xl" />
            <div className="h-32 bg-warm-gray/30" />
            <div className="h-20 bg-warm-gray/30" />
          </div>
          <div className="space-y-5">
            <div className="flex gap-2.5">
              <div className="h-6 bg-warm-gray/30 w-20" />
              <div className="h-6 bg-warm-gray/30 w-16" />
            </div>
            <div className="h-9 bg-warm-gray/30 w-3/4" />
            <div className="h-5 bg-warm-gray/30 w-1/2" />
            <div className="h-5 bg-warm-gray/30 w-1/3" />
            <div className="h-5 bg-warm-gray/30 w-2/3" />
            <div className="flex gap-3 pt-2">
              <div className="h-9 bg-warm-gray/30 w-28" />
              <div className="h-9 bg-warm-gray/30 w-36" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stacked attendees ────────────────────────────────────────────────────────

/** Deterministic hue from an address string, used for fallback avatar bg. */
function addressHue(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) & 0xfff;
  return h % 360;
}

function AttendeeAvatar({ addr, label, size = 40 }: { addr: string; label: string; size?: number }) {
  const initials = label.slice(0, 2).toUpperCase();
  const hue = addressHue(addr);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <img
        src={`https://effigy.im/a/${addr}.svg`}
        alt={label}
        width={size}
        height={size}
        className="rounded-full border-2 border-cream w-full h-full object-cover"
        onError={(e) => {
          // Hide img, show fallback underneath
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {/* Fallback: initials on coloured circle (visible when img fails) */}
      <div
        className="absolute inset-0 rounded-full border-2 border-cream flex items-center justify-center text-cream font-bold font-[family-name:var(--font-kode-mono)] -z-10"
        style={{ fontSize: size * 0.35, backgroundColor: `hsl(${hue}, 55%, 45%)` }}
      >
        {initials}
      </div>
    </div>
  );
}

function AttendeesStack({
  rsvps,
  names,
  verifiedAddresses,
}: {
  rsvps: ArkivRSVP[];
  names: Map<string, string | null>;
  verifiedAddresses: Set<string>;
}) {
  const count = rsvps.length;
  const visible = rsvps.slice(0, 6);

  // Build summary text: up to 2 resolved names + "y X más"
  const namedAttendees = useMemo(() => {
    const result: string[] = [];
    for (const rsvp of rsvps) {
      if (result.length >= 2) break;
      const nick = names.get(rsvp.attendee?.toLowerCase());
      if (nick) result.push(nick);
    }
    return result;
  }, [rsvps, names]);

  const remaining = count - namedAttendees.length;

  const verifiedCount = rsvps.filter(
    (r) => verifiedAddresses.has(r.attendee?.toLowerCase() ?? '')
  ).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Stacked avatars */}
      <div className="flex items-center">
        {visible.map((rsvp, i) => {
          const addr = rsvp.attendee ?? '';
          const { name } = displayName(addr, names);
          return (
            <div
              key={rsvp.entityKey}
              className="relative hover:z-10 transition-transform hover:scale-110"
              style={{ marginLeft: i === 0 ? 0 : -12, zIndex: visible.length - i }}
            >
              <AttendeeAvatar addr={addr} label={name} />
            </div>
          );
        })}
        {count > 6 && (
          <div
            className="w-10 h-10 rounded-full border-2 border-cream bg-warm-gray/30 flex items-center justify-center text-xs font-bold text-ink/70 font-[family-name:var(--font-kode-mono)]"
            style={{ marginLeft: -12 }}
          >
            +{count - 6}
          </div>
        )}
      </div>

      {/* Summary text */}
      <p className="text-sm text-ink/80 font-[family-name:var(--font-geist-sans)] leading-snug">
        {namedAttendees.length > 0 ? (
          <>
            <span className="font-semibold text-ink">{namedAttendees.join(', ')}</span>
            {remaining > 0 && (
              <> y <span className="font-semibold text-ink">{remaining}</span> más</>
            )}
          </>
        ) : (
          <span className="text-ink/60">{count} {count === 1 ? 'asistente' : 'asistentes'}</span>
        )}
      </p>

      {/* Verified badge */}
      {verifiedCount > 0 && (
        <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
          ✓ {verifiedCount} verified on-chain
        </p>
      )}
    </div>
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
  const [shareOpen, setShareOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  // Community profile for sidebar card
  const [communityProfile, setCommunityProfile] = useState<ArkivCommunity | null>(null);

  // QR Ticket modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketQrUrl, setTicketQrUrl] = useState('');
  const [ticketQrError, setTicketQrError] = useState('');

  // QR Scanner modal
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanError, setScanError] = useState('');
  const [scanVerifying, setScanVerifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect all addresses to resolve display names in one batch
  const allAddresses = [
    ...(event?.organizer ? [event.organizer] : []),
    ...(rsvps ?? []).map((r) => r.attendee),
    ...(waitlist ?? []).map((w) => w.attendee),
    ...(address ? [address] : []),
  ].filter(Boolean);
  const names = useDisplayNames(allAddresses);

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
        const parsedEvent = parseEvent(entity);
        setEvent(parsedEvent);
        await Promise.all([fetchAttendees(), fetchAttendances(), fetchWaitlist()]);

        // Fetch community profile if event belongs to one
        if (parsedEvent.community) {
          const commResult = await publicClient
            .buildQuery()
            .where([eq('type', 'community'), eq('slug', parsedEvent.community)])
            .withPayload(true)
            .limit(1)
            .fetch()
            .catch(() => null);
          const commEntity = commResult?.entities?.[0];
          if (commEntity) setCommunityProfile(parseCommunity(commEntity));
        }
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
          eventOrganizer: event.organizer,
        }),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'rsvp' },
          { key: 'eventId', value: id },
        ],
        expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(event.date))),
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
        expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(event.date))),
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

    if (!myRsvpKey) return;

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

      const myWaitlistEntry = (waitlist ?? []).find(
        (w) => (w?.attendee?.toLowerCase() ?? '') === address.toLowerCase()
      );
      if (myWaitlistEntry?.entityKey) {
        await arkivWalletClient.deleteEntity({ entityKey: myWaitlistEntry.entityKey as Hex });
        setWaitlist(prev => prev.filter(w => w.entityKey !== myWaitlistEntry.entityKey));
      }

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
        expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(event.date))),
      });

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
          expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(event.date))),
        });
      }

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
          expiresIn: Math.floor(secondsUntilExpiry(eventExpiresAt(event.date))),
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

  function handleShare() {
    setShareOpen(true);
  }

  // ── QR Ticket handlers ──────────────────────────────────────────────────────

  async function handleViewTicket() {
    if (!address || !id) return;
    setTicketQrUrl('');
    setTicketQrError('');
    setShowTicketModal(true);

    const myRsvp = (rsvps ?? []).find(
      (r) => (r?.attendee?.toLowerCase() ?? '') === address.toLowerCase()
    );

    try {
      const dataUrl = await QRCode.toDataURL(
        JSON.stringify({ eventId: id, attendee: address, rsvpKey: myRsvp?.entityKey ?? '' }),
        { width: 200, margin: 2, color: { dark: '#1A1614', light: '#F2EDE4' } }
      );
      setTicketQrUrl(dataUrl);
    } catch {
      setTicketQrError('Failed to generate QR code');
    }
  }

  function handleCloseTicket() {
    setShowTicketModal(false);
    setTicketQrUrl('');
    setTicketQrError('');
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  function startScanning() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    scanIntervalRef.current = setInterval(() => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code?.data) {
        handleScannedCode(code.data);
      }
    }, 250);
  }

  async function handleOpenScanner() {
    setScanResult(null);
    setScanError('');
    setScanVerifying(false);
    setShowScanner(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Wait a tick for the video element to mount
      await new Promise((r) => setTimeout(r, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startScanning();
        };
      }
    } catch {
      setScanError('Camera access denied. Please allow camera permissions and try again.');
    }
  }

  async function handleScannedCode(raw: string) {
    // Pause scanning while we process
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setScanResult(null);
    setScanError('');

    let parsed: { eventId?: string; attendee?: string; rsvpKey?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      setScanError('Invalid QR code — not a valid ticket.');
      setTimeout(() => startScanning(), 3000);
      return;
    }

    if (!parsed.eventId || !parsed.attendee) {
      setScanError('Invalid ticket data.');
      setTimeout(() => startScanning(), 3000);
      return;
    }

    if (parsed.eventId !== id) {
      setScanError('This ticket is for a different event.');
      setTimeout(() => startScanning(), 3000);
      return;
    }

    const attendeeLower = parsed.attendee.toLowerCase();

    // Check if this person actually RSVPed
    const hasRsvp = (rsvps ?? []).some(
      (r) => (r?.attendee?.toLowerCase() ?? '') === attendeeLower
    );
    if (!hasRsvp) {
      setScanError(`${shortAddress(parsed.attendee)} is not in the RSVP list.`);
      setTimeout(() => startScanning(), 3000);
      return;
    }

    // Already verified?
    if (verifiedAddresses.has(attendeeLower)) {
      setScanResult({ success: true, message: `${shortAddress(parsed.attendee)} is already verified.` });
      return;
    }

    // Verify on-chain
    if (!address || !wagmiWalletClient) {
      setScanError('Connect your wallet to verify attendance.');
      return;
    }
    if (chainId !== KAOLIN_CHAIN_ID) {
      setScanError('Please switch to Arkiv Kaolin to verify.');
      return;
    }

    setScanVerifying(true);
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
          attendee: parsed.attendee,
          verified: true,
          verifiedAt: new Date().toISOString(),
        }),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'attendance' },
          { key: 'eventId', value: id },
          { key: 'attendee', value: parsed.attendee },
          { key: 'verified', value: 'true' },
        ],
        expiresIn: ExpirationTime.fromDays(3650),
      });

      await fetchAttendances();
      setScanResult({ success: true, message: `Attendance verified for ${shortAddress(parsed.attendee)}` });
    } catch (err) {
      setScanError(friendlyError(err));
    } finally {
      setScanVerifying(false);
    }
  }

  function handleCloseScanner() {
    stopCamera();
    setShowScanner(false);
    setScanResult(null);
    setScanError('');
    setScanVerifying(false);
  }

  // Clean up camera on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stopCamera(), []);

  if (loading) return <PageSkeleton />;

  if (!event) {
    return (
      <main className="max-w-2xl mx-auto py-20 px-6 text-center">
        <p className="text-ink/60 font-[family-name:var(--font-kode-mono)] text-lg mb-2">
          Event not found
        </p>
        {error && <p className="text-sm text-ink/60">{error}</p>}
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
    event?.status === 'pending' ? 'pending' :
    event?.status === 'cancelled' ? 'cancelled' : getEventStatus(event?.date ?? '');

  const verifiedAddresses = new Set(
    (attendances ?? []).map((a) => a?.attendee?.toLowerCase() ?? '')
  );

  const day = formatDay(event?.date ?? '');
  const time = formatTime(event?.date ?? '', event?.endTime);
  const gradient = titleGradient(event?.title ?? '');

  const capacityPct =
    (event?.capacity ?? 0) > 0
      ? Math.min(100, Math.round(((rsvps?.length ?? 0) / (event?.capacity ?? 1)) * 100))
      : null;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-6 py-12">


        {/* ════════════════════════════════════════════════════════
            TWO-COLUMN LAYOUT
            Left: image, community, attendance, organizer
            Right: info, about, location
            ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-[44fr_56fr] gap-8">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-6">
            {/* Event image */}
            <div className="w-full aspect-square rounded-xl overflow-hidden">
              {event?.coverImageUrl ? (
                <img
                  src={event.coverImageUrl}
                  alt={event?.title || ''}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full" style={{ background: gradient }} />
              )}
            </div>

            {/* Community card */}
            {event?.community && (
              <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-ink font-[family-name:var(--font-geist-sans)]">
                  Community
                </h3>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/community/${event.community}`}
                    className="flex items-center gap-3 group"
                  >
                    {communityProfile?.logoUrl ? (
                      <img
                        src={communityProfile.logoUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 flex items-center justify-center text-lg font-bold text-cream font-[family-name:var(--font-kode-mono)] shrink-0"
                        style={{ backgroundColor: '#0247E2' }}
                      >
                        {deslugify(event.community).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-ink font-semibold font-[family-name:var(--font-kode-mono)] group-hover:text-cobalt transition-colors leading-snug">
                      {communityProfile?.name || deslugify(event.community)}
                    </span>
                  </Link>
                  <SubscribeButton slug={event.community} />
                </div>
                {communityProfile?.description && (
                  <p className="text-sm text-ink leading-relaxed font-[family-name:var(--font-geist-sans)]">
                    {communityProfile.description.length > 100
                      ? communityProfile.description.slice(0, 100) + '…'
                      : communityProfile.description}
                  </p>
                )}
                <Link
                  href={`/community/${event.community}`}
                  className="text-xs font-semibold text-cobalt hover:text-cobalt-light transition-colors"
                >
                  View community →
                </Link>
              </div>
            )}

            {/* Attendance / RSVP */}
            <div className="border-t border-warm-gray/20 pt-5 flex flex-col gap-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">
                    {rsvps?.length ?? 0}
                  </span>
                  {(event?.capacity ?? 0) > 0 ? (
                    <span className="text-ink text-sm font-[family-name:var(--font-geist-sans)]">
                      / {event?.capacity} attending
                    </span>
                  ) : (
                    <span className="text-ink text-sm font-[family-name:var(--font-geist-sans)]">attending</span>
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

              {(waitlist?.length ?? 0) > 0 && (
                <p className="text-sm text-ink/60 font-[family-name:var(--font-geist-sans)]">
                  {waitlist?.length ?? 0} {(waitlist?.length ?? 0) === 1 ? 'person' : 'people'} on the waitlist
                </p>
              )}

              {error && <ErrorMessage message={error} />}

              {displayStatus === 'pending' ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <p className="text-sm text-yellow-700 font-[family-name:var(--font-geist-sans)]">
                    This event is awaiting approval from the community leader
                  </p>
                </div>
              ) : displayStatus === 'cancelled' ? (
                <div className="p-4 bg-warm-gray/10 border border-warm-gray/30 text-center">
                  <p className="text-sm text-ink/60 font-[family-name:var(--font-geist-sans)]">
                    This event has been cancelled
                  </p>
                </div>
              ) : !isConnected ? (
                <p className="text-center text-sm font-semibold text-cobalt py-3 font-[family-name:var(--font-geist-sans)]">
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
                      <p className="text-xs text-ink/60 font-[family-name:var(--font-geist-sans)] leading-snug">
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
                          className="px-3 py-1.5 text-xs text-ink/60 border border-warm-gray/40 hover:text-ink hover:border-warm-gray transition-colors"
                        >
                          Keep RSVP
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-xs text-ink/60 underline text-center font-[family-name:var(--font-geist-sans)] hover:text-ink transition-colors"
                    >
                      Cancel attendance
                    </button>
                  )}
                </div>
              ) : atCapacity ? (
                alreadyOnWaitlist ? (
                  <button
                    disabled
                    className="w-full py-3 text-sm font-semibold border cursor-default text-cobalt border-cobalt bg-cobalt/5"
                  >
                    You&apos;re on the waitlist
                  </button>
                ) : (
                  <button
                    onClick={handleWaitlist}
                    disabled={waitlistLoading}
                    className="w-full py-3 text-sm font-semibold text-cream bg-cobalt transition-colors disabled:opacity-60 disabled:cursor-wait hover:bg-cobalt-light"
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

              {cancelledWithWaitlist && (
                <p className="text-xs text-center text-cobalt font-[family-name:var(--font-geist-sans)] leading-snug">
                  Your spot has been freed. Waitlisted attendees can now join.
                </p>
              )}

              <p className="text-xs text-ink/60 font-[family-name:var(--font-geist-sans)] leading-snug">
                Attendance is public and verifiable on-chain.
              </p>
            </div>

            {/* Organizer card */}
            {event?.organizer && (
              <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-ink font-[family-name:var(--font-geist-sans)]">
                  Organizer
                </h3>
                <Link
                  href={`/profile/${event.organizer}`}
                  className="flex items-center gap-3 group"
                >
                  <img
                    src={`https://effigy.im/a/${event.organizer}.svg`}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-ink group-hover:text-cobalt transition-colors block truncate font-[family-name:var(--font-geist-sans)]">
                      {displayName(event.organizer, names).name}
                    </span>
                    {displayName(event.organizer, names).isResolved && (
                      <span className="text-xs text-ink/60 font-mono block truncate">
                        {shortAddress(event.organizer)}
                      </span>
                    )}
                  </div>
                </Link>
                {isOrganizer && (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        href={`/event/edit/${id}`}
                        className="px-4 py-2 text-xs font-semibold border border-ink/60 text-ink/60 hover:border-ink hover:text-ink transition-colors"
                      >
                        Edit event
                      </Link>
                      <button
                        onClick={handleOpenScanner}
                        className="px-4 py-2 text-xs font-semibold border border-ink/60 text-ink/60 hover:border-ink hover:text-ink transition-colors"
                      >
                        Scan QR
                      </button>
                      {(displayStatus === 'upcoming' || displayStatus === 'live') && !showCancelEventConfirm && (
                        <button
                          onClick={() => setShowCancelEventConfirm(true)}
                          className="px-4 py-1.5 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Cancel event
                        </button>
                      )}
                    </div>

                    {showCancelEventConfirm && (
                      <div className="border border-red-200 p-4 flex flex-col gap-3">
                        <p className="text-sm font-semibold text-ink">Cancel this event?</p>
                        <p className="text-xs text-ink/60 font-[family-name:var(--font-geist-sans)]">
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
                            className="px-3 py-1.5 text-xs text-ink/60 border border-warm-gray/40 hover:text-ink hover:border-warm-gray transition-colors disabled:opacity-40"
                          >
                            Keep event
                          </button>
                        </div>
                        {cancelEventStatus && (
                          <p className="text-xs text-ink/60 font-[family-name:var(--font-geist-sans)]">
                            {cancelEventStatus}
                          </p>
                        )}
                      </div>
                    )}

                    {atCapacity && (
                      <div className="border-t border-warm-gray/20 pt-4">
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
                                <div className="truncate min-w-0">
                                  <span className="text-sm text-ink font-mono truncate block">
                                    {displayName(entry?.attendee ?? '', names).name}
                                  </span>
                                  {displayName(entry?.attendee ?? '', names).isResolved && (
                                    <span className="text-sm text-ink/60 font-mono truncate block">
                                      {shortAddress(entry?.attendee ?? '')}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-ink/60 italic mb-3">No one on the waitlist yet.</p>
                        )}
                        <p className="text-xs text-ink/60 font-[family-name:var(--font-geist-sans)] leading-snug">
                          Waitlist members are stored on-chain and expire with the event.
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
                            <p className="text-sm text-ink/60">
                              Select who actually attended:
                            </p>
                            {(rsvps?.length ?? 0) === 0 ? (
                              <p className="text-sm text-ink/60 italic">No RSVPs to verify.</p>
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
                                        className="font-mono cursor-pointer"
                                      >
                                        <span className="text-sm text-ink block">{displayName(addr, names).name}</span>
                                        {displayName(addr, names).isResolved && (
                                          <span className="text-sm text-ink/60 block">{shortAddress(addr)}</span>
                                        )}
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
                                className="text-sm text-ink/60 hover:text-ink transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-ink/70 italic font-[family-name:var(--font-geist-sans)]">
                        The &quot;Close event &amp; verify attendance&quot; option will appear after
                        the event date has passed.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-8">
            {/* Event info */}
            <div className="flex flex-col gap-5">
              {/* Badges row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatusBadge status={displayStatus} />
                {event?.category && (
                  <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cream bg-ink font-[family-name:var(--font-geist-sans)]">
                    {event.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-ink leading-tight font-[family-name:var(--font-kode-mono)]">
                {event?.title || 'Untitled Event'}
              </h1>

              {/* Pending review banner */}
              {displayStatus === 'pending' && (
                <div className="bg-yellow-500/15 text-yellow-700 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3 font-[family-name:var(--font-geist-sans)]">
                  <span className="text-lg leading-none shrink-0">&#9203;</span>
                  <div>
                    <p className="text-sm font-semibold">This event is pending review by the community leader</p>
                    <p className="text-xs text-yellow-700/70 mt-1">It will be visible to everyone once approved.</p>
                  </div>
                </div>
              )}

              {/* Date */}
              {day && (
                <div className="flex items-center gap-2.5 text-sm">
                  <svg className="w-5 h-5 shrink-0 text-ink/60" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-ink font-[family-name:var(--font-geist-sans)]">{day}</span>
                </div>
              )}

              {/* Time */}
              {time && (
                <div className="flex items-center gap-2.5 text-sm">
                  <svg className="w-5 h-5 shrink-0 text-ink/60" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-ink font-[family-name:var(--font-geist-sans)]">{time}</span>
                </div>
              )}

              {/* Location */}
              {event?.location && (
                <div className="flex items-center gap-2.5 text-sm">
                  <svg className="w-5 h-5 shrink-0 text-ink/60" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-ink font-[family-name:var(--font-geist-sans)]">{event.location}</span>
                </div>
              )}

              {/* Action buttons: Share + Calendar */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleShare}
                  className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-ink/80 hover:border-ink transition-colors"
                >
                  Share event
                </button>
                {shareOpen && event && (
                  <ShareModal event={event} onClose={() => setShareOpen(false)} />
                )}
                <button
                  onClick={() => setCalendarOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-ink/80 hover:border-ink transition-colors"
                >
                  Add to calendar
                </button>
                {calendarOpen && (
                  <CalendarModal event={event} onClose={() => setCalendarOpen(false)} />
                )}
                {alreadyRsvpd && (
                  <button
                    onClick={handleViewTicket}
                    className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-ink/80 hover:border-ink transition-colors"
                  >
                    View ticket
                  </button>
                )}
              </div>
            </div>

            {/* About section */}
            <div className="flex flex-col gap-7">
              <h2 className="text-xl font-semibold text-ink font-[family-name:var(--font-kode-mono)]">
                About this event
              </h2>
              {event?.description ? (
                <p className="text-ink leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-geist-sans)]">
                  {event.description}
                </p>
              ) : (
                <p className="text-ink/60 italic font-[family-name:var(--font-geist-sans)]">
                  No description provided.
                </p>
              )}

              {event?.location && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-semibold text-ink font-[family-name:var(--font-kode-mono)]">
                    Location
                  </h2>
                  <p className="text-ink font-[family-name:var(--font-geist-sans)]">
                    {event.location}
                  </p>
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                    className="w-full border border-warm-gray/30 rounded-lg"
                    style={{ height: 200, border: 'none' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Event location map"
                  />
                </div>
              )}

              {event?.date && (
                <p className="text-xs text-ink/60 font-[family-name:var(--font-geist-sans)]">
                  This event page expires on {formatExpiryDate(eventExpiresAt(event.date))}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Ticket Modal ── */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4">
          <div className="relative w-[340px] bg-ink p-6 flex flex-col items-center">
            {/* Close */}
            <button
              onClick={handleCloseTicket}
              className="absolute top-3 right-3 text-cream/60 hover:text-cream transition-colors"
              aria-label="Close ticket"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </button>

            {/* QR Code */}
            <div className="w-[200px] h-[200px] flex items-center justify-center mb-4">
              {ticketQrError ? (
                <p className="text-sm text-red-400 text-center">{ticketQrError}</p>
              ) : ticketQrUrl ? (
                <img src={ticketQrUrl} alt="Event ticket QR code" width={200} height={200} />
              ) : (
                <div className="w-[200px] h-[200px] bg-cream/10 animate-pulse" />
              )}
            </div>

            {/* Dashed separator */}
            <div className="w-full border-t border-dashed border-cream/20 my-4" />

            {/* Event info */}
            <h3 className="text-cream font-bold text-center font-[family-name:var(--font-kode-mono)] leading-snug mb-2">
              {event?.title || 'Untitled Event'}
            </h3>
            {day && (
              <p className="text-cream/60 text-sm font-[family-name:var(--font-geist-sans)]">
                {day}{time ? ` · ${time}` : ''}
              </p>
            )}
            {event?.location && (
              <p className="text-cream/50 text-xs font-[family-name:var(--font-geist-sans)] mt-1">
                {event.location}
              </p>
            )}

            {/* Attendee address */}
            <div className="mt-4 px-3 py-1.5 bg-cream/10 text-cream/70 text-xs font-mono">
              <span className="block">{displayName(address ?? '', names).name}</span>
              {displayName(address ?? '', names).isResolved && (
                <span className="block text-cream/50">{shortAddress(address ?? '')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── QR Scanner Modal ── */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/90 p-4">
          {/* Close */}
          <button
            onClick={handleCloseScanner}
            className="absolute top-4 right-4 text-cream/60 hover:text-cream transition-colors z-10"
            aria-label="Close scanner"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
              <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
            </svg>
          </button>

          <p className="text-cream/80 text-sm font-[family-name:var(--font-geist-sans)] mb-4">
            Point your camera at an attendee&apos;s QR ticket
          </p>

          {/* Video + viewfinder */}
          <div className="relative w-[300px] h-[300px] overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Viewfinder corners */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-left */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cream/70" />
              {/* Top-right */}
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cream/70" />
              {/* Bottom-left */}
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cream/70" />
              {/* Bottom-right */}
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cream/70" />
            </div>
          </div>

          {/* Hidden canvas for jsQR processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Status area */}
          <div className="mt-4 text-center min-h-[48px] flex flex-col items-center justify-center">
            {scanVerifying ? (
              <p className="text-cream/70 text-sm font-[family-name:var(--font-geist-sans)] animate-pulse">
                Verifying attendance…
              </p>
            ) : scanResult ? (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-sm font-semibold ${scanResult.success ? 'text-green-400' : 'text-orange'}`}>
                  {scanResult.success ? '✓ ' : ''}{scanResult.message}
                </p>
                <button
                  onClick={() => {
                    setScanResult(null);
                    setScanError('');
                    startScanning();
                  }}
                  className="text-xs text-cream/60 underline hover:text-cream transition-colors font-[family-name:var(--font-geist-sans)]"
                >
                  Scan next attendee
                </button>
              </div>
            ) : scanError ? (
              <p className="text-sm text-orange font-[family-name:var(--font-geist-sans)]">
                {scanError}
              </p>
            ) : (
              <p className="text-cream/50 text-xs font-[family-name:var(--font-geist-sans)]">
                Scanning…
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
