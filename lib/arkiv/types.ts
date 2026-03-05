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
  coverImageUrl?: string;
  category?: string;
  endTime?: string;
};

export type ArkivRSVP = {
  entityKey: string;
  eventId: string;
  attendee: string;
  confirmedAt: string;
};

export type ArkivCommunity = {
  entityKey: string;
  name: string;
  slug: string;
  description: string;
  location?: string;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  createdBy: string;
  updatedAt: string;
};

export type ArkivAttendance = {
  entityKey: string;
  eventId: string;
  attendee: string;
  verified: boolean;
  verifiedAt: string;
};

export type ArkivWaitlist = {
  entityKey: string;
  eventId: string;
  attendee: string;
  joinedAt: string;
};

export type ArkivSubscription = {
  entityKey: string;
  communitySlug: string;
  subscriber: string;
  subscribedAt: string;
};

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
