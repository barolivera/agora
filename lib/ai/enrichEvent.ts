import Anthropic from '@anthropic-ai/sdk';
import type { LumaEventData, AIEnrichment } from '@/lib/types/luma';

const LOG_PREFIX = '[enrichEvent]';

const VALID_CATEGORIES = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference',
  'Study Group', 'Social', 'Online', 'Other',
];

export interface CommunityHint {
  slug: string;
  name: string;
}

function buildClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  console.log(`${LOG_PREFIX} API key present (length=${key.length}, prefix=${key.slice(0, 12)}…)`);
  return new Anthropic({ apiKey: key });
}

export async function enrichEventWithAI(
  event: LumaEventData,
  communities: CommunityHint[] = [],
): Promise<AIEnrichment> {
  const anthropic = buildClient();

  console.log(`${LOG_PREFIX} Requesting enrichment for "${event.title}"`);

  let message;
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an AI assistant analyzing event data for a Web3 event platform based in Buenos Aires, Argentina. The platform serves Spanish and English speaking communities.

Analyze this event and return ONLY a JSON object (no markdown fences, no explanation) with these fields:

- "category": exactly one of: ${VALID_CATEGORIES.map(c => `"${c}"`).join(', ')}
- "tags": array of 3-5 relevant lowercase tags (e.g. "ethereum", "defi", "networking")
- "summary": if the description is longer than 280 characters, a 1-2 sentence summary in Latin American Spanish. Otherwise null
- "suggestedCommunities": array of 0-3 community SLUGS from this list that match: ${communities.length ? communities.map(c => `"${c.slug}" (${c.name})`).join(', ') : '(none available)'}. Return the slug values, not the display names. Empty array if none match.
- "language": ISO 639-1 code of the event's primary language (e.g. "en", "es")
- "translatedTitle": if the title is in English, translate to Latin American Spanish. Otherwise null
- "translatedDescription": if the description is in English and under 2000 characters, translate to Latin American Spanish. Otherwise null

Event data:
Title: ${event.title}
Description: ${event.description}
Location: ${event.location}
Date: ${event.date}
Organizer: ${event.organizer}`,
      }],
    });
  } catch (err) {
    const apiErr = err as { status?: number; message?: string };
    console.error(`${LOG_PREFIX} Anthropic API error: status=${apiErr.status} message=${apiErr.message}`);
    throw err;
  }

  console.log(`${LOG_PREFIX} API response: stop_reason=${message.stop_reason}, blocks=${message.content.length}`);

  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    console.error(`${LOG_PREFIX} No text block in response:`, JSON.stringify(message.content));
    throw new Error('No text response from Claude');
  }

  // Strip markdown fences if present
  const raw = textBlock.text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`${LOG_PREFIX} Failed to parse JSON from Claude. Raw text:`, raw.slice(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }

  // Case-insensitive category match — Claude may return "meetup" instead of "Meetup"
  const matchedCategory = typeof parsed.category === 'string'
    ? VALID_CATEGORIES.find(c => c.toLowerCase() === parsed.category.toLowerCase()) ?? null
    : null;

  console.log(`${LOG_PREFIX} Enrichment succeeded — raw category="${parsed.category}", matched="${matchedCategory}", tags=${JSON.stringify(parsed.tags)}`);

  return {
    category: matchedCategory,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 5)
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : null,
    suggestedCommunities: Array.isArray(parsed.suggestedCommunities)
      ? parsed.suggestedCommunities.filter(
          (s: unknown) => typeof s === 'string' && communities.some(c => c.slug === s)
        )
      : [],
    language: typeof parsed.language === 'string' ? parsed.language : null,
    translatedTitle: typeof parsed.translatedTitle === 'string' ? parsed.translatedTitle : null,
    translatedDescription: typeof parsed.translatedDescription === 'string' ? parsed.translatedDescription : null,
  };
}
