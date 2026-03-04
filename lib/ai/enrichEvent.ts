import Anthropic from '@anthropic-ai/sdk';
import type { LumaEventData, AIEnrichment } from '@/lib/types/luma';

const anthropic = new Anthropic();

const VALID_CATEGORIES = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference',
  'Study Group', 'Social', 'Online', 'Other',
];

const KNOWN_COMMUNITIES = [
  'SheFi', 'ETHArgentina', 'Developer DAO', 'Ethereum BA', 'BuidlGuidl',
];

export async function enrichEventWithAI(
  event: LumaEventData
): Promise<AIEnrichment> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are an AI assistant analyzing event data for a Web3 event platform based in Buenos Aires, Argentina. The platform serves Spanish and English speaking communities.

Analyze this event and return ONLY a JSON object (no markdown fences, no explanation) with these fields:

- "category": exactly one of: ${VALID_CATEGORIES.map(c => `"${c}"`).join(', ')}
- "tags": array of 3-5 relevant lowercase tags (e.g. "ethereum", "defi", "networking")
- "summary": if the description is longer than 280 characters, a 1-2 sentence summary in Latin American Spanish. Otherwise null
- "suggestedCommunities": array of 0-3 communities from this list that match: ${KNOWN_COMMUNITIES.map(c => `"${c}"`).join(', ')}. Empty array if none match.
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

  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Strip markdown fences if present
  const raw = textBlock.text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(raw);

  return {
    category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : null,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 5)
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : null,
    suggestedCommunities: Array.isArray(parsed.suggestedCommunities)
      ? parsed.suggestedCommunities.filter(
          (c: unknown) => typeof c === 'string' && KNOWN_COMMUNITIES.includes(c as string)
        )
      : [],
    language: typeof parsed.language === 'string' ? parsed.language : null,
    translatedTitle: typeof parsed.translatedTitle === 'string' ? parsed.translatedTitle : null,
    translatedDescription: typeof parsed.translatedDescription === 'string' ? parsed.translatedDescription : null,
  };
}
