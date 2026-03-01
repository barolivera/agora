import type { Metadata } from 'next';
import type { Hex } from '@arkiv-network/sdk';
import { publicClient, parseEvent } from '@/lib/arkiv';
import EventPageClient from './EventPageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const entity = await publicClient.getEntity(id as Hex);
    const event = parseEvent(entity);

    const title = event.title ? `${event.title} — Agora` : 'Event — Agora';
    const description = event.description || 'RSVP on-chain at agora.xyz';

    return {
      title,
      description,
      openGraph: {
        title: event.title || 'Event',
        description,
        images: [{ url: `/event/${id}/opengraph-image`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title || 'Event',
        description,
      },
    };
  } catch {
    return {
      title: 'Event — Agora',
      description: 'RSVP on-chain at agora.xyz',
    };
  }
}

export default function EventPage() {
  return <EventPageClient />;
}
