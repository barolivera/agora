import type { Entity } from '@arkiv-network/sdk';
import type {
  ArkivEvent,
  ArkivRSVP,
  ArkivCommunity,
  ArkivAttendance,
  ArkivWaitlist,
  ArkivSubscription,
  ArkivApproval,
  ArkivProfile,
} from './types';

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
    coverImageUrl: data?.coverImageUrl ?? undefined,
    category: data?.category ?? undefined,
    endTime: data?.endTime ?? undefined,
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

export function parseCommunity(entity: Entity): ArkivCommunity {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    name: data?.name ?? '',
    slug: data?.slug ?? '',
    description: data?.description ?? '',
    location: data?.location ?? undefined,
    logoUrl: data?.logoUrl ?? undefined,
    coverUrl: data?.coverUrl ?? undefined,
    website: data?.website ?? undefined,
    twitter: data?.twitter ?? undefined,
    discord: data?.discord ?? undefined,
    instagram: data?.instagram ?? undefined,
    linkedin: data?.linkedin ?? undefined,
    youtube: data?.youtube ?? undefined,
    createdBy: data?.createdBy ?? '',
    updatedAt: data?.updatedAt ?? '',
  };
}

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

export function parseWaitlist(entity: Entity): ArkivWaitlist {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    eventId: data?.eventId ?? '',
    attendee: data?.attendee ?? '',
    joinedAt: data?.joinedAt ?? '',
  };
}

export function parseSubscription(entity: Entity): ArkivSubscription {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    communitySlug: data?.communitySlug ?? '',
    subscriber: data?.subscriber ?? '',
    subscribedAt: data?.subscribedAt ?? '',
  };
}

export function parseApproval(entity: Entity): ArkivApproval {
  const data = entity.toJson();
  return {
    entityKey: entity.key ?? '',
    eventId: data?.eventId ?? '',
    community: data?.community ?? '',
    approvedBy: data?.approvedBy ?? '',
    status: data?.status === 'rejected' ? 'rejected' : 'approved',
    createdAt: data?.createdAt ?? '',
  };
}

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
