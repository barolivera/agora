import { NextResponse } from 'next/server';
import type { LumaEventData } from '@/lib/types/luma';

const ENRICHMENT_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  try {
    const { event, communities: rawCommunities } = await request.json();

    if (!event?.title) {
      return NextResponse.json({ error: 'Event data is required' }, { status: 400 });
    }

    const { enrichEventWithAI } = await import('@/lib/ai/enrichEvent');

    const communityHints = Array.isArray(rawCommunities)
      ? rawCommunities.filter((c: unknown) =>
          typeof c === 'object' && c !== null &&
          typeof (c as Record<string, unknown>).slug === 'string' &&
          typeof (c as Record<string, unknown>).name === 'string'
        )
      : [];

    // Race the enrichment against a timeout
    const enrichment = await Promise.race([
      enrichEventWithAI(event as LumaEventData, communityHints),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Enrichment timed out')), ENRICHMENT_TIMEOUT_MS)
      ),
    ]);

    return NextResponse.json(enrichment);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[enrich-event] Failed: ${errMsg}`);
    // Return 204 (no content) — enrichment is optional, caller should not treat this as fatal
    return new Response(null, { status: 204 });
  }
}
