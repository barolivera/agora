'use client';

import { useState } from 'react';
import Script from 'next/script';
import StatusBadge from '@/app/components/StatusBadge';

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EVENT = {
  title: 'Building the Future of Decentralized Communities',
  date: '2026-04-15T19:00:00.000Z',
  location: 'Palermo Soho, Buenos Aires',
  description:
    'Join us for an evening of talks, networking, and deep dives into the latest in decentralized community tooling. We\'ll explore on-chain identity, governance, and coordination mechanisms.',
  organizer: '0x1234567890abcdef1234567890abcdef12345678',
  community: 'eth-buenos-aires',
  capacity: 50,
  category: 'Meetup',
  coverImageUrl: '',
  status: 'active',
};

const MOCK_RSVPS = Array.from({ length: 12 }, (_, i) => ({
  entityKey: `rsvp-${i}`,
  attendee: `0x${(i + 1).toString(16).padStart(40, '0')}`,
  eventId: 'mock',
  confirmedAt: new Date().toISOString(),
}));

const MOCK_WAITLIST = Array.from({ length: 3 }, (_, i) => ({
  entityKey: `wl-${i}`,
  attendee: `0xwl${(i + 1).toString(16).padStart(38, '0')}`,
  eventId: 'mock',
  joinedAt: new Date().toISOString(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const CARD_GRADIENTS: [string, string][] = [
  ['#E8491C', '#C8C0B4'],
  ['#0247E2', '#F2EDE4'],
  ['#1A1614', '#E8491C'],
];

function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function StateLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cobalt text-cream text-xs font-bold uppercase tracking-widest px-4 py-2 mb-0">
      {children}
    </div>
  );
}

function Frame({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`${wide ? 'col-span-2' : ''} flex flex-col`}>
      <StateLabel>{label}</StateLabel>
      <div className="border border-warm-gray/30 bg-cream overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Reusable sub-components (simplified from EventPageClient) ────────────────

function EventPoster({ title, status, gradient }: { title: string; status: 'upcoming' | 'live' | 'ended' | 'cancelled'; gradient: string }) {
  return (
    <div className="relative w-full aspect-video overflow-hidden">
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3">
        <StatusBadge status={status} />
        <h1 className="text-2xl sm:text-3xl font-bold text-cream leading-tight font-[family-name:var(--font-kode-mono)] drop-shadow-sm">
          {title}
        </h1>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-cream/70 font-[family-name:var(--font-geist-sans)]">
          Meetup
        </span>
      </div>
    </div>
  );
}

function InfoBar() {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 px-6 py-4">
      <div className="flex items-center gap-2.5 text-sm">
        <svg className="w-4 h-4 shrink-0 text-warm-gray" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
        <span className="text-ink font-[family-name:var(--font-geist-sans)]">Wed, April 15, 2026</span>
      </div>
      <div className="flex items-center gap-2.5 text-sm">
        <svg className="w-4 h-4 shrink-0 text-warm-gray" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
        <span className="text-ink font-[family-name:var(--font-geist-sans)]">7:00 PM</span>
      </div>
      <div className="flex items-center gap-2.5 text-sm">
        <svg className="w-4 h-4 shrink-0 text-warm-gray" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
        <span className="text-ink font-[family-name:var(--font-geist-sans)]">Palermo Soho, Buenos Aires</span>
      </div>
    </div>
  );
}

function ActionButtons({ shareOpen, calendarOpen }: { shareOpen?: boolean; calendarOpen?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3">
      <button className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-warm-gray/40 hover:border-ink/40 transition-colors">
        Share event
      </button>
      <button className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-warm-gray/40 hover:border-ink/40 transition-colors">
        Add to calendar
      </button>
      {shareOpen && <span className="text-xs text-cobalt font-semibold">(Share modal open)</span>}
      {calendarOpen && <span className="text-xs text-cobalt font-semibold">(Calendar modal open)</span>}
    </div>
  );
}

function CapacityBar({ count, capacity }: { count: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">{count}</span>
        <span className="text-warm-gray text-sm font-[family-name:var(--font-geist-sans)]">/ {capacity} attending</span>
      </div>
      <div className="h-1.5 bg-warm-gray/30 overflow-hidden">
        <div className="h-full bg-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AvatarStack({ count }: { count: number }) {
  const visible = Math.min(count, 6);
  return (
    <div className="flex items-center">
      {Array.from({ length: visible }, (_, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -12, zIndex: visible - i }} className="relative">
          <img
            src={`https://effigy.im/a/0x${(i + 1).toString(16).padStart(40, '0')}.svg`}
            alt=""
            width={40}
            height={40}
            className="rounded-full border-2 border-cream w-10 h-10 object-cover"
          />
        </div>
      ))}
      {count > 6 && (
        <div className="w-10 h-10 rounded-full border-2 border-cream bg-warm-gray/30 flex items-center justify-center text-xs font-bold text-ink/70 font-[family-name:var(--font-kode-mono)]" style={{ marginLeft: -12 }}>
          +{count - 6}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EventStatesPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const gradient = `linear-gradient(135deg, ${CARD_GRADIENTS[2][0]}, ${CARD_GRADIENTS[2][1]})`;

  return (
    <div className="min-h-screen bg-[#E8E4DD] p-8">
      <h1 className="text-3xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
        Event Page — All States
      </h1>
      <p className="text-warm-gray text-sm font-[family-name:var(--font-geist-sans)] mb-8">
        Visual inventory of every state the event detail page can be in.
      </p>

      <div className="grid grid-cols-2 gap-8 max-w-[1400px]">

        {/* ─── 1. LOADING ─── */}
        <Frame label="1 · Loading (Skeleton)">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6 animate-pulse">
                <div className="w-full aspect-video bg-warm-gray/30" />
                <div className="h-8 bg-warm-gray/30 w-3/4" />
                <div className="h-4 bg-warm-gray/30 w-1/2" />
                <div className="h-4 bg-warm-gray/30 w-full" />
                <div className="h-4 bg-warm-gray/30 w-5/6" />
              </div>
              <div className="w-[200px] shrink-0">
                <div className="h-72 bg-warm-gray/30 animate-pulse" />
              </div>
            </div>
          </div>
        </Frame>

        {/* ─── 2. NOT FOUND ─── */}
        <Frame label="2 · Event Not Found">
          <div className="py-20 px-6 text-center">
            <p className="text-warm-gray font-[family-name:var(--font-kode-mono)] text-lg mb-2">
              Event not found
            </p>
            <p className="text-sm text-warm-gray/70">Could not load this event. It may have expired or been removed.</p>
          </div>
        </Frame>

        {/* ─── 3. NOT CONNECTED ─── */}
        <Frame label="3 · Visitor (Wallet Not Connected)" wide>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <EventPoster title={MOCK_EVENT.title} status="upcoming" gradient={gradient} />
              <InfoBar />
              <ActionButtons />
              <div className="px-6 py-4">
                <h2 className="text-xl font-semibold text-ink mb-3 font-[family-name:var(--font-kode-mono)]">About this event</h2>
                <p className="text-ink leading-relaxed font-[family-name:var(--font-geist-sans)] text-sm">{MOCK_EVENT.description}</p>
              </div>
            </div>
            <div className="w-[300px] shrink-0 p-4">
              <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
                <CapacityBar count={12} capacity={50} />
                <AvatarStack count={12} />
                <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">Attendance is public and verifiable on-chain.</p>
                <p className="text-center text-sm font-semibold text-cobalt py-3 font-[family-name:var(--font-geist-sans)]">
                  Connect wallet to RSVP
                </p>
              </div>
            </div>
          </div>
        </Frame>

        {/* ─── 4. RSVP CARD STATES ─── */}

        {/* 4a: Can RSVP */}
        <Frame label="4a · RSVP Card — Can RSVP">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={12} capacity={50} />
            <AvatarStack count={12} />
            <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">Attendance is public and verifiable on-chain.</p>
            <button className="w-full py-3 text-sm font-semibold bg-orange text-cream hover:bg-orange-light transition-colors">
              Confirm Attendance
            </button>
          </div>
        </Frame>

        {/* 4b: Already RSVPd */}
        <Frame label="4b · RSVP Card — Already RSVPd">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={13} capacity={50} />
            <AvatarStack count={13} />
            <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">Attendance is public and verifiable on-chain.</p>
            <div className="flex flex-col gap-2">
              <button disabled className="w-full py-3 text-sm font-semibold bg-ink/10 text-ink border border-ink/20 cursor-default">
                Attendance Confirmed ✓
              </button>
              <button className="text-xs text-warm-gray underline text-center font-[family-name:var(--font-geist-sans)] hover:text-ink transition-colors">
                Cancel attendance
              </button>
            </div>
          </div>
        </Frame>

        {/* 4c: Cancel confirmation */}
        <Frame label="4c · RSVP Card — Cancel Confirmation">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={13} capacity={50} />
            <div className="flex flex-col gap-2">
              <button disabled className="w-full py-3 text-sm font-semibold bg-ink/10 text-ink border border-ink/20 cursor-default">
                Attendance Confirmed ✓
              </button>
              <div className="border border-warm-gray/30 p-3 flex flex-col gap-2.5">
                <p className="text-sm text-ink">
                  Are you sure you want to cancel? This will remove your RSVP from the blockchain.
                </p>
                <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)] leading-snug">
                  Your RSVP will be deleted from Arkiv immediately.
                </p>
                <div className="flex gap-2 pt-0.5">
                  <button className="px-3 py-1.5 bg-red-600 text-cream text-xs font-semibold hover:bg-red-700 transition-colors">
                    Yes, cancel
                  </button>
                  <button className="px-3 py-1.5 text-xs text-warm-gray border border-warm-gray/40 hover:text-ink hover:border-warm-gray transition-colors">
                    Keep RSVP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Frame>

        {/* 4d: At capacity — join waitlist */}
        <Frame label="4d · RSVP Card — At Capacity (Join Waitlist)">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={50} capacity={50} />
            <AvatarStack count={50} />
            <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">Attendance is public and verifiable on-chain.</p>
            <button className="w-full py-3 text-sm font-semibold text-cream bg-cobalt transition-colors hover:bg-cobalt-light">
              Join Waitlist
            </button>
          </div>
        </Frame>

        {/* 4e: On waitlist */}
        <Frame label="4e · RSVP Card — On Waitlist">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={50} capacity={50} />
            <AvatarStack count={50} />
            <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">Attendance is public and verifiable on-chain.</p>
            <button disabled className="w-full py-3 text-sm font-semibold border cursor-default text-cobalt border-cobalt bg-cobalt/5">
              You&apos;re on the waitlist
            </button>
          </div>
        </Frame>

        {/* 4f: Cancelled event */}
        <Frame label="4f · RSVP Card — Event Cancelled">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={12} capacity={50} />
            <AvatarStack count={12} />
            <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">Attendance is public and verifiable on-chain.</p>
            <div className="p-4 bg-warm-gray/10 border border-warm-gray/30 text-center">
              <p className="text-sm text-warm-gray font-[family-name:var(--font-geist-sans)]">
                This event has been cancelled
              </p>
            </div>
          </div>
        </Frame>

        {/* ─── 5. EVENT POSTER VARIANTS ─── */}
        <Frame label="5a · Poster — Upcoming">
          <EventPoster title={MOCK_EVENT.title} status="upcoming" gradient={gradient} />
        </Frame>

        <Frame label="5b · Poster — Live">
          <EventPoster title={MOCK_EVENT.title} status="live" gradient={`linear-gradient(135deg, ${CARD_GRADIENTS[1][0]}, ${CARD_GRADIENTS[1][1]})`} />
        </Frame>

        <Frame label="5c · Poster — Ended">
          <EventPoster title={MOCK_EVENT.title} status="ended" gradient={`linear-gradient(135deg, ${CARD_GRADIENTS[0][0]}, ${CARD_GRADIENTS[0][1]})`} />
        </Frame>

        <Frame label="5d · Poster — Cancelled">
          <EventPoster title={MOCK_EVENT.title} status="cancelled" gradient={`linear-gradient(135deg, #1A1614, #C8C0B4)`} />
        </Frame>

        {/* ─── 6. SHARE MODAL ─── */}
        <Frame label="6 · Share Modal">
          <div className="flex items-center justify-center p-8 bg-ink/70 min-h-[420px]">
            <div className="bg-ink border border-warm-gray/20 w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-cream font-[family-name:var(--font-kode-mono)]">
                  Share this event
                </h2>
                <button className="w-7 h-7 flex items-center justify-center text-warm-gray hover:text-cream transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { label: 'Twitter / X', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
                  { label: 'Telegram', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg> },
                  { label: 'WhatsApp', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg> },
                  { label: 'Copy link', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 hover:border-cream/40 hover:bg-cream/5 transition-colors font-[family-name:var(--font-geist-sans)]"
                  >
                    <span className="shrink-0 text-warm-gray">{s.icon}</span>
                    {s.label}
                  </div>
                ))}
              </div>
              <input
                type="text"
                readOnly
                value="https://agora.xyz/event/0xabc123..."
                className="w-full px-3 py-2 text-xs text-warm-gray bg-ink border border-warm-gray/20 cursor-pointer hover:border-cream/40 transition-colors font-[family-name:var(--font-kode-mono)] truncate"
              />
            </div>
          </div>
        </Frame>

        {/* ─── 7. CALENDAR MODAL ─── */}
        <Frame label="7 · Calendar Modal">
          <div className="flex items-center justify-center p-8 bg-ink/70 min-h-[360px]">
            <div className="bg-ink border border-warm-gray/20 w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-cream font-[family-name:var(--font-kode-mono)]">
                  Add to calendar
                </h2>
                <button className="w-7 h-7 flex items-center justify-center text-warm-gray hover:text-cream transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {['Google Calendar', 'Apple / iCal', 'Outlook.com', 'Yahoo Calendar'].map((label) => (
                  <div
                    key={label}
                    className="w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 hover:border-cream/40 hover:bg-cream/5 transition-colors font-[family-name:var(--font-geist-sans)] text-center"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Frame>

        {/* ─── 8. ORGANIZER CONTROLS ─── */}
        <Frame label="8a · Organizer Controls — Default">
          <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-warm-gray font-[family-name:var(--font-geist-sans)]">
              Organizer Controls
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-4 py-2 text-xs font-semibold border border-warm-gray text-warm-gray hover:border-ink hover:text-ink transition-colors">
                Edit event
              </button>
              <button className="px-4 py-2 text-xs font-semibold border border-warm-gray text-warm-gray hover:border-ink hover:text-ink transition-colors">
                Scan QR
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-warm-gray">Status:</span>
                <StatusBadge status="upcoming" />
              </div>
              <button className="self-start px-4 py-1.5 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 transition-colors">
                Cancel event
              </button>
            </div>
          </div>
        </Frame>

        {/* 8b: Cancel event confirmation */}
        <Frame label="8b · Organizer Controls — Cancel Confirmation">
          <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-warm-gray font-[family-name:var(--font-geist-sans)]">
              Organizer Controls
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-4 py-2 text-xs font-semibold border border-warm-gray text-warm-gray">Edit event</button>
              <button className="px-4 py-2 text-xs font-semibold border border-warm-gray text-warm-gray">Scan QR</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-warm-gray">Status:</span>
                <StatusBadge status="upcoming" />
              </div>
              <div className="border border-red-200 p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-ink">Cancel this event?</p>
                <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">
                  Are you sure? This cannot be undone. All 12 RSVPs will be marked cancelled.
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-red-600 text-cream text-xs font-semibold hover:bg-red-700 transition-colors">
                    Yes, cancel event
                  </button>
                  <button className="px-3 py-1.5 text-xs text-warm-gray border border-warm-gray/40 hover:text-ink transition-colors">
                    Keep event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Frame>

        {/* ─── 9. VERIFY ATTENDANCE ─── */}
        <Frame label="9a · Organizer — Verify Attendance Panel">
          <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-warm-gray font-[family-name:var(--font-geist-sans)]">
              Organizer Controls
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-warm-gray">Select who actually attended:</p>
              <ul className="space-y-2.5">
                {MOCK_RSVPS.slice(0, 4).map((rsvp, i) => (
                  <li key={rsvp.entityKey} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked={i < 3}
                      className="w-4 h-4 accent-orange shrink-0"
                      readOnly
                    />
                    <span className="text-sm text-ink font-mono">{shortAddr(rsvp.attendee)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3 pt-1">
                <button className="px-4 py-2.5 bg-orange text-cream text-sm font-semibold hover:bg-orange-light transition-colors">
                  Confirm attendance (3)
                </button>
                <button className="text-sm text-warm-gray hover:text-ink transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </Frame>

        {/* 9b: Verify done */}
        <Frame label="9b · Organizer — Attendance Verified">
          <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-warm-gray font-[family-name:var(--font-geist-sans)]">
              Organizer Controls
            </h3>
            <p className="text-sm font-medium text-ink">
              Event closed. Attendance verified on-chain.
            </p>
          </div>
        </Frame>

        {/* ─── 10. QR TICKET MODAL ─── */}
        <Frame label="10 · QR Ticket Modal">
          <div className="flex items-center justify-center p-8 bg-ink/80 min-h-[480px]">
            <div className="relative w-[300px] bg-ink p-6 flex flex-col items-center">
              <button className="absolute top-3 right-3 text-cream/60 hover:text-cream transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /><line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
              </button>
              <div className="w-[180px] h-[180px] flex items-center justify-center mb-4 bg-cream/10">
                <span className="text-cream/30 text-xs font-mono">[QR Code]</span>
              </div>
              <div className="w-full border-t border-dashed border-cream/20 my-4" />
              <h3 className="text-cream font-bold text-center font-[family-name:var(--font-kode-mono)] leading-snug mb-2 text-sm">
                {MOCK_EVENT.title}
              </h3>
              <p className="text-cream/60 text-sm font-[family-name:var(--font-geist-sans)]">
                Wed, April 15, 2026 · 7:00 PM
              </p>
              <p className="text-cream/50 text-xs font-[family-name:var(--font-geist-sans)] mt-1">
                {MOCK_EVENT.location}
              </p>
              <div className="mt-4 px-3 py-1.5 bg-cream/10 text-cream/70 text-xs font-mono">
                0x1234…5678
              </div>
            </div>
          </div>
        </Frame>

        {/* ─── 11. QR SCANNER MODAL ─── */}
        <Frame label="11 · QR Scanner Modal">
          <div className="flex flex-col items-center justify-center p-8 bg-ink/90 min-h-[400px]">
            <p className="text-cream/80 text-sm font-[family-name:var(--font-geist-sans)] mb-4">
              Point your camera at an attendee&apos;s QR ticket
            </p>
            <div className="relative w-[240px] h-[240px] overflow-hidden bg-black">
              <div className="absolute inset-0 flex items-center justify-center text-cream/20 text-xs font-mono">
                [Camera Feed]
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cream/70" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cream/70" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cream/70" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cream/70" />
              </div>
            </div>
            <p className="text-cream/50 text-xs font-[family-name:var(--font-geist-sans)] mt-4">Scanning…</p>
          </div>
        </Frame>

        {/* ─── 12. COMMUNITY SIDEBAR CARD ─── */}
        <Frame label="12 · Community Sidebar Card">
          <div className="p-4">
            <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-4 max-w-[340px]">
              <h3 className="text-sm font-bold uppercase tracking-widest text-warm-gray font-[family-name:var(--font-geist-sans)]">
                Community
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center text-lg font-bold text-cream font-[family-name:var(--font-kode-mono)] shrink-0" style={{ backgroundColor: '#0247E2' }}>
                  E
                </div>
                <span className="text-ink font-semibold font-[family-name:var(--font-kode-mono)] leading-snug">
                  Eth Buenos Aires
                </span>
              </div>
              <p className="text-sm text-warm-gray leading-relaxed font-[family-name:var(--font-geist-sans)]">
                Building the Ethereum community in Buenos Aires through meetups, hackathons, and workshops.
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-cobalt">View community →</span>
                <button className="px-3 py-1.5 text-xs font-semibold text-cobalt border border-cobalt/30 hover:bg-cobalt/5 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </Frame>

        {/* ─── 13. WAITLIST SECTION ─── */}
        <Frame label="13 · Waitlist Section (in RSVP card)">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={50} capacity={50} />
            <div className="border-t border-warm-gray/20 pt-4 flex flex-col gap-3">
              <p className="text-sm text-warm-gray font-[family-name:var(--font-geist-sans)]">
                3 people on the waitlist
              </p>
              <ul className="space-y-3">
                {MOCK_WAITLIST.map((entry) => (
                  <li key={entry.entityKey} className="flex items-center gap-2.5">
                    <img
                      src={`https://effigy.im/a/${entry.attendee}.svg`}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
                    />
                    <span className="text-sm text-ink font-mono truncate">{shortAddr(entry.attendee)}</span>
                    <span className="text-xs font-semibold text-cobalt shrink-0">Waitlist</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Frame>

        {/* ─── 14. ERROR STATE ─── */}
        <Frame label="14 · Error Message">
          <div className="p-6 flex flex-col gap-5">
            <CapacityBar count={12} capacity={50} />
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-[family-name:var(--font-geist-sans)]">
              Something went wrong. The transaction may have failed — please check your wallet and try again.
            </div>
            <button className="w-full py-3 text-sm font-semibold bg-orange text-cream hover:bg-orange-light transition-colors">
              Confirm Attendance
            </button>
          </div>
        </Frame>

      </div>

      <p className="text-warm-gray text-xs mt-8 font-[family-name:var(--font-geist-sans)]">
        Generated {new Date().toISOString().slice(0, 10)} · {28} states captured
      </p>

      <Script
        src="https://mcp.figma.com/mcp/html-to-design/capture.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
