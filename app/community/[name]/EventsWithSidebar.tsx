'use client';

import { useState } from 'react';
import Link from 'next/link';
import Calendar from '@/app/components/Calendar';
import { type ArkivEvent, type ArkivCommunity } from '@/lib/arkiv';
import { useDisplayNames, displayName } from '@/lib/useDisplayNames';
import { deslugify } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isUpcoming(event: ArkivEvent): boolean {
  if (!event?.date) return true;
  const d = new Date(event.date);
  if (isNaN(d.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

function formatEventDateTime(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${day} ${month} - ${h12}.${minutes} ${ampm}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function LocationPinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── Event card ─────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: ArkivEvent }) {
  const dateLabel = formatEventDateTime(event?.date ?? '');

  return (
    <Link
      href={`/event/${event?.entityKey}`}
      className="flex items-stretch h-[162px] rounded-[6px] overflow-hidden border border-warm-gray/15 bg-white/50 transition-opacity hover:opacity-[0.93]"
    >
      {/* Cover image */}
      <div className="shrink-0 w-[133px] m-[14px] mr-0 rounded-[2px] overflow-hidden">
        {event?.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={`${event.title} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-ink/10" />
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col gap-3 justify-center px-7 py-5 min-w-0">
        {dateLabel && (
          <p className="text-xs font-bold uppercase tracking-[1px] text-ink font-[family-name:var(--font-geist-sans)]">
            {dateLabel}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold leading-snug text-ink font-[family-name:var(--font-kode-mono)] line-clamp-2">
            {event?.title || 'Untitled Event'}
          </p>
          {event?.community && (
            <p className="text-base font-medium text-ink font-[family-name:var(--font-geist-sans)]">
              By {deslugify(event.community)}
            </p>
          )}
        </div>
        {event?.location && (
          <div className="flex items-center gap-1 text-xs text-ink font-[family-name:var(--font-geist-sans)]">
            <LocationPinIcon />
            <span>{event.location}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Members card ───────────────────────────────────────────────────────────────

function MembersCard({
  subscriberAddresses,
  subscriberCount,
  names,
}: {
  subscriberAddresses: string[];
  subscriberCount: number;
  names: Map<string, string | null>;
}) {
  return (
    <div className="border border-warm-gray/20 p-5">
      <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-ink/80 mb-3 font-[family-name:var(--font-kode-mono)]">
        Members
      </h2>

      {subscriberCount === 0 ? (
        <p className="text-sm text-ink/80 font-[family-name:var(--font-geist-sans)]">
          Be the first to subscribe.
        </p>
      ) : (
        <>
          {subscriberAddresses.length > 0 && (
            <div className="flex items-center gap-[-8px] mb-3">
              {subscriberAddresses.slice(0, 8).map((addr, i) => (
                <Link
                  key={addr}
                  href={`/profile/${addr}`}
                  title={displayName(addr, names).name}
                  className="relative hover:z-10"
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                >
                  <img
                    src={`https://effigy.im/a/${addr}.svg`}
                    alt={displayName(addr, names).name}
                    width={32}
                    height={32}
                    className="rounded-full border border-warm-gray/30 hover:opacity-80 transition-opacity"
                  />
                </Link>
              ))}
              {subscriberCount > 8 && (
                <div
                  className="w-8 h-8 rounded-full bg-warm-gray/30 flex items-center justify-center text-[10px] font-semibold text-ink/80 border border-warm-gray/30"
                  style={{ marginLeft: -8 }}
                >
                  +{subscriberCount - 8}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-ink/80 font-[family-name:var(--font-geist-sans)]">
            {subscriberCount.toLocaleString()}{' '}
            {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
          </p>
        </>
      )}
    </div>
  );
}

// ── EventsWithSidebar ─────────────────────────────────────────────────────────

type Filter = 'upcoming' | 'past';

const tabCls = (active: boolean) =>
  `px-[11px] py-[7px] text-[11px] font-bold uppercase tracking-[0.15em] transition-colors font-[family-name:var(--font-kode-mono)] ${
    active ? 'bg-ink text-cream' : 'text-ink/80 hover:text-ink'
  }`;

export default function EventsWithSidebar({
  events,
  name,
  subscriberAddresses,
  subscriberCount,
  initialTab = 'upcoming',
  initialDate = null,
}: {
  events: ArkivEvent[];
  profile?: ArkivCommunity | null;
  name?: string;
  subscriberAddresses: string[];
  subscriberCount: number;
  initialTab?: Filter;
  initialDate?: string | null;
}) {
  const [filter, setFilter] = useState<Filter>(initialTab);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const names = useDisplayNames(subscriberAddresses);

  // Events are pre-filtered by the parent — only approved events arrive here
  const byFilter = events.filter((e) =>
    filter === 'upcoming' ? isUpcoming(e) : !isUpcoming(e)
  );

  // Calendar only highlights dates that exist in the current filter view
  const calendarDates = byFilter
    .map((e) => e.date?.slice(0, 10))
    .filter((d): d is string => Boolean(d));

  const displayed = selectedDate
    ? byFilter.filter((e) => e.date?.slice(0, 10) === selectedDate)
    : byFilter;

  function handleFilterChange(f: Filter) {
    setFilter(f);
    setSelectedDate(null);
  }

  return (
    <div className="flex gap-10 items-start">

      {/* ── Left: events ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Filter tabs + active date chip */}
        <div className="flex items-center gap-1 mb-5">
          <button
            onClick={() => handleFilterChange('upcoming')}
            className={tabCls(filter === 'upcoming')}
          >
            Upcoming
          </button>
          <button
            onClick={() => handleFilterChange('past')}
            className={tabCls(filter === 'past')}
          >
            Past
          </button>

          {selectedDate && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-cobalt font-[family-name:var(--font-geist-sans)]">
              {selectedDate}
              <button
                onClick={() => setSelectedDate(null)}
                className="w-4 h-4 rounded-full bg-cobalt/15 hover:bg-cobalt/30 flex items-center justify-center text-cobalt leading-none"
                aria-label="Clear date filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Event list or empty state */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 border border-dashed border-warm-gray/40">
            {selectedDate ? (
              <>
                <p className="text-lg text-ink font-[family-name:var(--font-kode-mono)] mb-2">
                  No events on this date.
                </p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-cobalt hover:text-cobalt-light transition-colors font-[family-name:var(--font-geist-sans)]"
                >
                  View all events
                </button>
              </>
            ) : filter === 'upcoming' ? (
              <>
                <p className="text-4xl mb-4" role="img" aria-label="calendar">📅</p>
                <p className="text-lg text-ink font-[family-name:var(--font-kode-mono)] mb-2">
                  No upcoming events yet.
                </p>
                <p className="text-ink/80 text-sm mb-6 max-w-xs leading-relaxed font-[family-name:var(--font-geist-sans)]">
                  Be the first to create an event for this community.
                </p>
                <Link
                  href={name ? `/create-event?community=${encodeURIComponent(name)}` : '/create-event'}
                  className="bg-orange text-cream px-5 py-2.5 text-sm font-semibold hover:bg-orange-light transition-colors"
                >
                  Create an event →
                </Link>
              </>
            ) : (
              <p className="text-lg text-ink font-[family-name:var(--font-kode-mono)]">
                No past events.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {displayed.map((event) => (
              <EventCard key={event?.entityKey} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* ── Right: sidebar ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 w-[320px] shrink-0">
        <Calendar
          eventDates={calendarDates}
          selectedDate={selectedDate}
          onDaySelect={setSelectedDate}
        />
        <MembersCard
          subscriberAddresses={subscriberAddresses}
          subscriberCount={subscriberCount}
          names={names}
        />
      </div>

    </div>
  );
}
