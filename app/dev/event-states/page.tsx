'use client';

import Script from 'next/script';
import StatusBadge from '@/app/components/StatusBadge';
import type { EventStatus } from '@/app/components/StatusBadge';

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EVENT = {
  title: 'Building the Future of Decentralized Communities',
  date: '2026-04-15T19:00:00.000Z',
  endTime: '21:30',
  location: 'Workplace by IRSA, Buenos Aires',
  description:
    "Join us for an evening of talks, networking, and deep dives into the latest in decentralized community tooling. We'll explore on-chain identity, governance, and coordination mechanisms.\n\nTopics include:\n- Decentralized reputation systems\n- On-chain event attestations\n- Community treasury management\n- Cross-chain identity solutions",
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

const GRADIENT = 'linear-gradient(135deg, #1A1614, #E8491C)';

function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function StateLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cobalt text-cream text-xs font-bold uppercase tracking-widest px-4 py-2 font-[family-name:var(--font-kode-mono)]">
      {children}
    </div>
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <StateLabel>{label}</StateLabel>
      <div className="border border-warm-gray/30 bg-cream overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Reusable building blocks (matching the new Luma-style layout) ────────────

function EventImage() {
  return (
    <div className="w-full aspect-square rounded-xl overflow-hidden">
      <div className="w-full h-full" style={{ background: GRADIENT }} />
    </div>
  );
}

function OrganizerRow() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="https://effigy.im/a/0x1234567890abcdef1234567890abcdef12345678.svg"
        alt=""
        width={36}
        height={36}
        className="rounded-full ring-1 ring-warm-gray/30 shrink-0"
      />
      <div className="min-w-0">
        <span className="text-sm font-semibold text-ink block truncate font-[family-name:var(--font-geist-sans)]">
          vitalik.eth
        </span>
        <span className="text-xs text-warm-gray font-mono block truncate">
          0x1234…5678
        </span>
      </div>
    </div>
  );
}

function CommunityBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cobalt border border-cobalt/30 self-start">
      Part of Eth Buenos Aires
    </span>
  );
}

function AvatarStack({ count }: { count: number }) {
  const visible = Math.min(count, 6);
  return (
    <div className="flex flex-col gap-3">
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
      <p className="text-sm text-ink/80 font-[family-name:var(--font-geist-sans)] leading-snug">
        <span className="font-semibold text-ink">vitalik.eth, gavin.eth</span>
        {count > 2 && <> y <span className="font-semibold text-ink">{count - 2}</span> más</>}
      </p>
    </div>
  );
}

function CategoryBadge() {
  return (
    <span className="inline-block self-start px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-warm-gray border border-warm-gray/30 font-[family-name:var(--font-geist-sans)]">
      Meetup
    </span>
  );
}

function EventDetails({ status }: { status: EventStatus }) {
  return (
    <div className="flex flex-col gap-5">
      <CategoryBadge />
      <StatusBadge status={status} />
      <h1 className="text-3xl font-bold text-ink leading-tight font-[family-name:var(--font-kode-mono)]">
        {MOCK_EVENT.title}
      </h1>
      <div className="flex items-center gap-2.5 text-sm">
        <svg className="w-5 h-5 shrink-0 text-warm-gray" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <span className="text-ink font-[family-name:var(--font-geist-sans)]">Wed, April 15, 2026</span>
      </div>
      <div className="flex items-center gap-2.5 text-sm">
        <svg className="w-5 h-5 shrink-0 text-warm-gray" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span className="text-ink font-[family-name:var(--font-geist-sans)]">7:00 PM — 9:30 PM</span>
      </div>
      <div className="flex items-center gap-2.5 text-sm">
        <svg className="w-5 h-5 shrink-0 text-warm-gray" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <span className="text-ink font-[family-name:var(--font-geist-sans)]">{MOCK_EVENT.location}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-warm-gray/40">
          Share event
        </button>
        <button className="px-4 py-2 text-xs font-semibold text-ink tracking-widest uppercase border border-warm-gray/40">
          Add to calendar
        </button>
      </div>
    </div>
  );
}

function CapacityBar({ count, capacity }: { count: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-ink font-[family-name:var(--font-kode-mono)]">{count}</span>
        <span className="text-warm-gray text-sm font-[family-name:var(--font-geist-sans)]">/ {capacity} attending</span>
      </div>
      <div className="h-1.5 bg-warm-gray/30 overflow-hidden">
        <div className="h-full bg-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RsvpSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-warm-gray/20 pt-5 flex flex-col gap-4">
      {children}
      <p className="text-xs text-warm-gray font-[family-name:var(--font-geist-sans)] leading-snug">
        Attendance is public and verifiable on-chain.
      </p>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-ink mb-4 font-[family-name:var(--font-kode-mono)]">
        About this event
      </h2>
      <p className="text-ink leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-geist-sans)]">
        {MOCK_EVENT.description}
      </p>
      <p className="mt-6 text-xs text-warm-gray font-[family-name:var(--font-geist-sans)]">
        This event page expires on Jun 15, 2026
      </p>
    </div>
  );
}

function CommunitySidebarCard() {
  return (
    <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-4">
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
        <button className="px-3 py-1.5 text-xs font-semibold text-cobalt border border-cobalt/30">
          Subscribe
        </button>
      </div>
    </div>
  );
}

function OrganizerControlsCard({ variant }: { variant: 'default' | 'cancel-confirm' | 'verify' | 'verified' }) {
  return (
    <div className="bg-cream border border-warm-gray/40 p-6 flex flex-col gap-5">
      <h3 className="text-sm font-bold uppercase tracking-widest text-warm-gray font-[family-name:var(--font-geist-sans)]">
        Organizer Controls
      </h3>
      <div className="flex items-center gap-3 flex-wrap">
        <button className="px-4 py-2 text-xs font-semibold border border-warm-gray text-warm-gray">Edit event</button>
        <button className="px-4 py-2 text-xs font-semibold border border-warm-gray text-warm-gray">Scan QR</button>
      </div>

      {variant === 'default' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-warm-gray">Status:</span>
            <StatusBadge status="upcoming" />
          </div>
          <button className="self-start px-4 py-1.5 text-xs font-semibold border border-red-400 text-red-600">
            Cancel event
          </button>
        </div>
      )}

      {variant === 'cancel-confirm' && (
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
              <button className="px-3 py-1.5 bg-red-600 text-cream text-xs font-semibold">Yes, cancel event</button>
              <button className="px-3 py-1.5 text-xs text-warm-gray border border-warm-gray/40">Keep event</button>
            </div>
          </div>
        </div>
      )}

      {variant === 'verify' && (
        <div className="space-y-4">
          <p className="text-sm text-warm-gray">Select who actually attended:</p>
          <ul className="space-y-2.5">
            {MOCK_RSVPS.slice(0, 4).map((rsvp, i) => (
              <li key={rsvp.entityKey} className="flex items-center gap-3">
                <input type="checkbox" defaultChecked={i < 3} className="w-4 h-4 accent-orange shrink-0" readOnly />
                <span className="text-sm text-ink font-mono">{shortAddr(rsvp.attendee)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 pt-1">
            <button className="px-4 py-2.5 bg-orange text-cream text-sm font-semibold">Confirm attendance (3)</button>
            <button className="text-sm text-warm-gray">Cancel</button>
          </div>
        </div>
      )}

      {variant === 'verified' && (
        <p className="text-sm font-medium text-ink">Event closed. Attendance verified on-chain.</p>
      )}
    </div>
  );
}

// ── Full-page state composer ─────────────────────────────────────────────────

function FullPageState({
  status,
  rsvpContent,
  showPending,
}: {
  status: EventStatus;
  rsvpContent: React.ReactNode;
  showPending?: boolean;
}) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8 mb-10">
        {/* Left: Image + organizer */}
        <div className="flex flex-col gap-5">
          <EventImage />
          <OrganizerRow />
          <CommunityBadge />
          <AvatarStack count={12} />
        </div>
        {/* Right: Details */}
        <div className="flex flex-col gap-5">
          <EventDetails status={status} />
          {showPending && (
            <div className="bg-yellow-500/15 text-yellow-700 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3 font-[family-name:var(--font-geist-sans)]">
              <span className="text-lg leading-none shrink-0">&#9203;</span>
              <div>
                <p className="text-sm font-semibold">This event is pending review by the community leader</p>
                <p className="text-xs text-yellow-700/70 mt-1">It will be visible to everyone once approved.</p>
              </div>
            </div>
          )}
          <RsvpSection>{rsvpContent}</RsvpSection>
        </div>
      </div>
      {/* BODY */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-10">
        <AboutSection />
        <div className="flex flex-col gap-6">
          <CommunitySidebarCard />
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EventStatesPage() {
  return (
    <div className="min-h-screen bg-[#E8E4DD] p-8">
      <h1 className="text-3xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mb-2">
        Event Page — All States (Luma Layout)
      </h1>
      <p className="text-warm-gray text-sm font-[family-name:var(--font-geist-sans)] mb-8">
        Visual inventory of every state the redesigned event detail page can be in.
      </p>

      <div className="flex flex-col gap-12 max-w-[1200px]">

        {/* ═══ 1. LOADING SKELETON ═══ */}
        <Frame label="1 · Loading Skeleton">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8 animate-pulse">
              <div className="w-full aspect-square bg-warm-gray/30 rounded-xl" />
              <div className="space-y-5">
                <div className="h-5 bg-warm-gray/30 w-24" />
                <div className="h-8 bg-warm-gray/30 w-3/4" />
                <div className="h-4 bg-warm-gray/30 w-1/2" />
                <div className="h-4 bg-warm-gray/30 w-2/3" />
                <div className="h-4 bg-warm-gray/30 w-1/3" />
                <div className="h-12 bg-warm-gray/30 w-full mt-4" />
              </div>
            </div>
          </div>
        </Frame>

        {/* ═══ 2. NOT FOUND ═══ */}
        <Frame label="2 · Event Not Found">
          <div className="py-20 px-6 text-center">
            <p className="text-warm-gray font-[family-name:var(--font-kode-mono)] text-lg mb-2">
              Event not found
            </p>
            <p className="text-sm text-warm-gray/70">Could not load this event. It may have expired or been removed.</p>
          </div>
        </Frame>

        {/* ═══ 3. VISITOR — NOT CONNECTED ═══ */}
        <Frame label="3 · Visitor (Wallet Not Connected)">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
                <CapacityBar count={12} capacity={50} />
                <p className="text-center text-sm font-semibold text-cobalt py-3 font-[family-name:var(--font-geist-sans)]">
                  Connect wallet to RSVP
                </p>
              </>
            }
          />
        </Frame>

        {/* ═══ 4. CONNECTED — CAN RSVP ═══ */}
        <Frame label="4 · Connected — Can RSVP">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
                <CapacityBar count={12} capacity={50} />
                <button className="w-full py-3 text-sm font-semibold bg-orange text-cream">
                  Confirm Attendance
                </button>
              </>
            }
          />
        </Frame>

        {/* ═══ 5. CONNECTED — ALREADY RSVP'D ═══ */}
        <Frame label="5 · Connected — Already RSVP'd">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
                <CapacityBar count={13} capacity={50} />
                <div className="flex flex-col gap-2">
                  <button disabled className="w-full py-3 text-sm font-semibold bg-ink/10 text-ink border border-ink/20 cursor-default">
                    Attendance Confirmed ✓
                  </button>
                  <button className="text-xs text-warm-gray underline text-center font-[family-name:var(--font-geist-sans)]">
                    Cancel attendance
                  </button>
                </div>
              </>
            }
          />
        </Frame>

        {/* ═══ 6. CANCEL RSVP CONFIRMATION ═══ */}
        <Frame label="6 · Cancel RSVP Confirmation">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
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
                      <button className="px-3 py-1.5 bg-red-600 text-cream text-xs font-semibold">Yes, cancel</button>
                      <button className="px-3 py-1.5 text-xs text-warm-gray border border-warm-gray/40">Keep RSVP</button>
                    </div>
                  </div>
                </div>
              </>
            }
          />
        </Frame>

        {/* ═══ 7. AT CAPACITY — JOIN WAITLIST ═══ */}
        <Frame label="7 · At Capacity — Join Waitlist">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
                <CapacityBar count={50} capacity={50} />
                <p className="text-sm text-warm-gray font-[family-name:var(--font-geist-sans)]">
                  3 people on the waitlist
                </p>
                <button className="w-full py-3 text-sm font-semibold text-cream bg-cobalt">
                  Join Waitlist
                </button>
              </>
            }
          />
        </Frame>

        {/* ═══ 8. ON THE WAITLIST ═══ */}
        <Frame label="8 · On the Waitlist">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
                <CapacityBar count={50} capacity={50} />
                <p className="text-sm text-warm-gray font-[family-name:var(--font-geist-sans)]">
                  3 people on the waitlist
                </p>
                <button disabled className="w-full py-3 text-sm font-semibold border cursor-default text-cobalt border-cobalt bg-cobalt/5">
                  You&apos;re on the waitlist
                </button>
              </>
            }
          />
        </Frame>

        {/* ═══ 9. PENDING EVENT ═══ */}
        <Frame label="9 · Pending Review">
          <FullPageState
            status="pending"
            showPending
            rsvpContent={
              <>
                <CapacityBar count={0} capacity={50} />
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <p className="text-sm text-yellow-700 font-[family-name:var(--font-geist-sans)]">
                    This event is awaiting approval from the community leader
                  </p>
                </div>
              </>
            }
          />
        </Frame>

        {/* ═══ 10. CANCELLED EVENT ═══ */}
        <Frame label="10 · Cancelled Event">
          <FullPageState
            status="cancelled"
            rsvpContent={
              <>
                <CapacityBar count={12} capacity={50} />
                <div className="p-4 bg-warm-gray/10 border border-warm-gray/30 text-center">
                  <p className="text-sm text-warm-gray font-[family-name:var(--font-geist-sans)]">
                    This event has been cancelled
                  </p>
                </div>
              </>
            }
          />
        </Frame>

        {/* ═══ 11. ENDED EVENT ═══ */}
        <Frame label="11 · Ended Event">
          <FullPageState
            status="ended"
            rsvpContent={
              <>
                <CapacityBar count={42} capacity={50} />
                <button disabled className="w-full py-3 text-sm font-semibold bg-ink/10 text-ink border border-ink/20 cursor-default">
                  Attendance Confirmed ✓
                </button>
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  ✓ 38 verified on-chain
                </p>
              </>
            }
          />
        </Frame>

        {/* ═══ 12. ERROR STATE ═══ */}
        <Frame label="12 · Error State">
          <FullPageState
            status="upcoming"
            rsvpContent={
              <>
                <CapacityBar count={12} capacity={50} />
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-[family-name:var(--font-geist-sans)]">
                  Something went wrong. The transaction may have failed — please check your wallet and try again.
                </div>
                <button className="w-full py-3 text-sm font-semibold bg-orange text-cream">
                  Confirm Attendance
                </button>
              </>
            }
          />
        </Frame>

        {/* ═══ COMPONENT STATES (smaller cards) ═══ */}
        <h2 className="text-2xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mt-4">
          Component States
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ─── Organizer Controls: Default ─── */}
          <Frame label="13a · Organizer Controls — Default">
            <div className="p-4">
              <OrganizerControlsCard variant="default" />
            </div>
          </Frame>

          {/* ─── Organizer Controls: Cancel Confirm ─── */}
          <Frame label="13b · Organizer Controls — Cancel Confirm">
            <div className="p-4">
              <OrganizerControlsCard variant="cancel-confirm" />
            </div>
          </Frame>

          {/* ─── Organizer Controls: Verify Attendance ─── */}
          <Frame label="13c · Organizer Controls — Verify Attendance">
            <div className="p-4">
              <OrganizerControlsCard variant="verify" />
            </div>
          </Frame>

          {/* ─── Organizer Controls: Verified ─── */}
          <Frame label="13d · Organizer Controls — Verified">
            <div className="p-4">
              <OrganizerControlsCard variant="verified" />
            </div>
          </Frame>

          {/* ─── Community Sidebar Card ─── */}
          <Frame label="14 · Community Sidebar Card">
            <div className="p-4">
              <CommunitySidebarCard />
            </div>
          </Frame>

          {/* ─── Waitlist Section ─── */}
          <Frame label="15 · Waitlist Section">
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
        </div>

        {/* ═══ MODALS ═══ */}
        <h2 className="text-2xl font-bold text-ink font-[family-name:var(--font-kode-mono)] mt-4">
          Modals
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ─── Share Modal ─── */}
          <Frame label="16 · Share Modal">
            <div className="flex items-center justify-center p-8 bg-ink/70 min-h-[420px]">
              <div className="bg-ink border border-warm-gray/20 w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-cream font-[family-name:var(--font-kode-mono)]">
                    Share this event
                  </h2>
                  <button className="w-7 h-7 flex items-center justify-center text-warm-gray">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {['Twitter / X', 'Telegram', 'WhatsApp', 'Copy link'].map((label) => (
                    <div key={label} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 font-[family-name:var(--font-geist-sans)]">
                      {label}
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  readOnly
                  value="https://agora.xyz/event/0xabc123..."
                  className="w-full px-3 py-2 text-xs text-warm-gray bg-ink border border-warm-gray/20 font-[family-name:var(--font-kode-mono)] truncate"
                />
              </div>
            </div>
          </Frame>

          {/* ─── Calendar Modal ─── */}
          <Frame label="17 · Calendar Modal">
            <div className="flex items-center justify-center p-8 bg-ink/70 min-h-[360px]">
              <div className="bg-ink border border-warm-gray/20 w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-cream font-[family-name:var(--font-kode-mono)]">
                    Add to calendar
                  </h2>
                  <button className="w-7 h-7 flex items-center justify-center text-warm-gray">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {['Google Calendar', 'Apple / iCal', 'Outlook.com', 'Yahoo Calendar'].map((label) => (
                    <div key={label} className="w-full px-4 py-3 text-sm text-cream border border-warm-gray/20 font-[family-name:var(--font-geist-sans)] text-center">
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Frame>

          {/* ─── QR Ticket Modal ─── */}
          <Frame label="18 · QR Ticket Modal">
            <div className="flex items-center justify-center p-8 bg-ink/80 min-h-[480px]">
              <div className="relative w-[300px] bg-ink p-6 flex flex-col items-center">
                <button className="absolute top-3 right-3 text-cream/60">
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

          {/* ─── QR Scanner Modal ─── */}
          <Frame label="19 · QR Scanner Modal">
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

        </div>

        <p className="text-warm-gray text-xs mt-4 font-[family-name:var(--font-geist-sans)]">
          19 states captured · Luma-style two-column layout
        </p>
      </div>

      <Script
        src="https://mcp.figma.com/mcp/html-to-design/capture.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
