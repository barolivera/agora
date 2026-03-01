// ── Entity Relationship Model ──────────────────────────────────────────────────
//
// Profile  (1) → Events     (many): organizer address links a profile to its events
// Event    (1) → RSVPs      (many): eventId attribute links RSVPs to their event
// Event    (1) → Attendance (many): eventId links verified attendance records to event
// Community(1) → Events     (many): community slug links events to their community
// Event    (1) → Waitlist   (many): eventId links waitlist entries to their event
//
// Referential integrity is maintained on all mutations:
//   - Cancelling an event propagates status="cancelled" to all child RSVPs + waitlist
//   - Deleting an event cascades: RSVPs → attendance → waitlist → event (no orphans)
//   - Cancelling an RSVP removes any matching waitlist + attendance records
//   - RSVPs carry eventOrganizer in payload for a full 3-way link:
//     organizer → event → rsvp
// ──────────────────────────────────────────────────────────────────────────────

import { createPublicClient, http, type Entity, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { and, eq } from '@arkiv-network/sdk/query';

export const publicClient = createPublicClient({
  chain: kaolin,
  transport: http('https://kaolin.hoodi.arkiv.network/rpc'),
});

export type ArkivEvent = {
  entityKey: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  organizer: string;
  community?: string;
  status?: string;
};

export type ArkivRSVP = {
  entityKey: string;
  eventId: string;
  attendee: string;
  confirmedAt: string;
};

export async function fetchRSVPsByEvent(eventId: string): Promise<ArkivRSVP[]> {
  const result = await publicClient
    .buildQuery()
    .where(and([eq('type', 'rsvp'), eq('eventId', eventId)]))
    .withPayload(true)
    .fetch();
  return result?.entities?.map(parseRSVP) ?? [];
}

export async function fetchAttendanceByEvent(eventId: string): Promise<ArkivAttendance[]> {
  const result = await publicClient
    .buildQuery()
    .where(and([eq('type', 'attendance'), eq('eventId', eventId)]))
    .withPayload(true)
    .fetch();
  return result?.entities?.map(parseAttendance) ?? [];
}

export async function fetchWaitlistByEvent(eventId: string): Promise<ArkivWaitlist[]> {
  const result = await publicClient
    .buildQuery()
    .where(and([eq('type', 'waitlist'), eq('eventId', eventId)]))
    .withPayload(true)
    .fetch();
  return result?.entities?.map(parseWaitlist) ?? [];
}

// Cascade delete maintains referential integrity —
// no orphaned RSVPs or attendance records remain
// when an event is removed from Agora.
export async function cascadeDeleteEvent(
  walletClient: { deleteEntity(args: { entityKey: Hex }): Promise<unknown> },
  eventId: string,
): Promise<void> {
  // Delete all RSVPs
  const rsvps = await fetchRSVPsByEvent(eventId);
  for (const rsvp of rsvps) {
    if (!rsvp?.entityKey) continue;
    await walletClient.deleteEntity({ entityKey: rsvp.entityKey as Hex });
  }
  // Delete all attendance records
  const attendance = await fetchAttendanceByEvent(eventId);
  for (const att of attendance) {
    if (!att?.entityKey) continue;
    await walletClient.deleteEntity({ entityKey: att.entityKey as Hex });
  }
  // Delete all waitlist entries
  const waitlistEntries = await fetchWaitlistByEvent(eventId);
  for (const entry of waitlistEntries) {
    if (!entry?.entityKey) continue;
    await walletClient.deleteEntity({ entityKey: entry.entityKey as Hex });
  }
  // Delete the event itself
  await walletClient.deleteEntity({ entityKey: eventId as Hex });
}

/**
 * Fetches events from Arkiv filtered by a stored status attribute.
 * Demonstrates multi-attribute querying: type="event" AND status=[status].
 */
export async function fetchEventsByStatus(status: string): Promise<ArkivEvent[]> {
  const result = await publicClient
    .buildQuery()
    .where(and([eq('type', 'event'), eq('status', status)]))
    .withPayload(true)
    .fetch();
  return result?.entities?.map(parseEvent) ?? [];
}

export function parseEvent(entity: Entity): ArkivEvent {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    title: data?.title ?? '',
    description: data?.description ?? '',
    date: data?.date ?? '',
    location: data?.location ?? '',
    capacity: typeof data?.capacity === 'number' ? data.capacity : 0,
    organizer: data?.organizer ?? '',
    community: data?.community ?? undefined,
    status: data?.status ?? undefined,
  };
}

export function parseRSVP(entity: Entity): ArkivRSVP {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    eventId: data?.eventId ?? '',
    attendee: data?.attendee ?? '',
    confirmedAt: data?.confirmedAt ?? '',
  };
}

export type ArkivCommunity = {
  entityKey: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  createdBy: string;
  updatedAt: string;
};

export function parseCommunity(entity: Entity): ArkivCommunity {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    name: data?.name ?? '',
    slug: data?.slug ?? '',
    description: data?.description ?? '',
    logoUrl: data?.logoUrl ?? undefined,
    website: data?.website ?? undefined,
    twitter: data?.twitter ?? undefined,
    discord: data?.discord ?? undefined,
    createdBy: data?.createdBy ?? '',
    updatedAt: data?.updatedAt ?? '',
  };
}

export type ArkivAttendance = {
  entityKey: string;
  eventId: string;
  attendee: string;
  verified: boolean;
  verifiedAt: string;
};

export function parseAttendance(entity: Entity): ArkivAttendance {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    eventId: data?.eventId ?? '',
    attendee: data?.attendee ?? '',
    verified: data?.verified === true,
    verifiedAt: data?.verifiedAt ?? '',
  };
}

export type ArkivWaitlist = {
  entityKey: string;
  eventId: string;
  attendee: string;
  joinedAt: string;
};

export function parseWaitlist(entity: Entity): ArkivWaitlist {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    eventId: data?.eventId ?? '',
    attendee: data?.attendee ?? '',
    joinedAt: data?.joinedAt ?? '',
  };
}

export type ArkivSubscription = {
  entityKey: string;
  communitySlug: string;
  subscriber: string;
  subscribedAt: string;
};

export function parseSubscription(entity: Entity): ArkivSubscription {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    communitySlug: data?.communitySlug ?? '',
    subscriber: data?.subscriber ?? '',
    subscribedAt: data?.subscribedAt ?? '',
  };
}

export type ArkivProfile = {
  entityKey: string;
  address: string;
  nickname?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  twitter?: string;
  discord?: string;
  farcaster?: string;
};

export function parseProfile(entity: Entity): ArkivProfile {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    address: data?.address ?? '',
    nickname: data?.nickname ?? undefined,
    bio: data?.bio ?? undefined,
    location: data?.location ?? undefined,
    avatarUrl: data?.avatarUrl ?? undefined,
    twitter: data?.twitter ?? undefined,
    discord: data?.discord ?? undefined,
    farcaster: data?.farcaster ?? undefined,
  };
}
