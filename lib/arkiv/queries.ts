import { createPublicClient, http, type Hex } from '@arkiv-network/sdk';
import { kaolin } from '@arkiv-network/sdk/chains';
import { and, eq } from '@arkiv-network/sdk/query';
import type { ArkivEvent, ArkivRSVP, ArkivAttendance, ArkivWaitlist, ArkivProfile } from './types';
import { parseEvent, parseRSVP, parseAttendance, parseWaitlist, parseProfile } from './parsers';

export const KAOLIN_CHAIN_ID = 60138453025;

export const publicClient = createPublicClient({
  chain: kaolin,
  transport: http('https://kaolin.hoodi.arkiv.network/rpc'),
});

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
    .limit(500)
    .fetch();
  return result?.entities?.map(parseEvent) ?? [];
}

// ── Profile display name helpers ────────────────────────────────────────────

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const profileCache = new Map<string, ArkivProfile | null>();

export async function fetchProfile(address: string): Promise<ArkivProfile | null> {
  const key = address.toLowerCase();
  if (profileCache.has(key)) return profileCache.get(key)!;

  try {
    const result = await publicClient
      .buildQuery()
      .where([eq('type', 'profile'), eq('address', key)])
      .withPayload(true)
      .limit(1)
      .fetch();
    const entity = result?.entities?.[0];
    const profile = entity ? parseProfile(entity) : null;
    profileCache.set(key, profile);
    return profile;
  } catch {
    profileCache.set(key, null);
    return null;
  }
}

/**
 * Resolves a batch of addresses to display names in parallel.
 * Returns a Map<lowercased-address, nickname | null>.
 */
export async function fetchDisplayNames(addresses: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const results = await Promise.all(unique.map((addr) => fetchProfile(addr)));
  const map = new Map<string, string | null>();
  unique.forEach((addr, i) => {
    map.set(addr, results[i]?.nickname ?? null);
  });
  return map;
}
