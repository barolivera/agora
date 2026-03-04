import { NextResponse } from 'next/server';
import type { LumaEventData, LumaImportResponse, AIEnrichment } from '@/lib/types/luma';
import { enrichEventWithAI } from '@/lib/ai/enrichEvent';

function extractFromJsonLd(html: string): Partial<LumaEventData> {
  const data: Partial<LumaEventData> = {};

  // Find JSON-LD script blocks
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      if (json['@type'] === 'Event' || json['@type']?.includes?.('Event')) {
        data.title = json.name;
        data.description = json.description;
        if (json.startDate) {
          // Convert to datetime-local format: YYYY-MM-DDTHH:MM
          const d = new Date(json.startDate);
          if (!isNaN(d.getTime())) {
            data.date = d.toISOString().slice(0, 16);
          }
        }
        if (json.location) {
          const loc = json.location;
          if (typeof loc === 'string') {
            data.location = loc;
          } else if (loc.name && loc.address?.streetAddress) {
            data.location = `${loc.name}, ${loc.address.streetAddress}`;
          } else if (loc.name) {
            data.location = loc.name;
          } else if (loc.address?.streetAddress) {
            data.location = loc.address.streetAddress;
          }
        }
        if (json.image) {
          data.coverImageUrl = Array.isArray(json.image) ? json.image[0] : json.image;
        }
        if (json.organizer) {
          const org = json.organizer;
          data.organizer = typeof org === 'string' ? org : org.name ?? '';
        }
        break;
      }
    } catch {
      // skip malformed JSON-LD
    }
  }

  return data;
}

function extractFromOpenGraph(html: string): Partial<LumaEventData> {
  const data: Partial<LumaEventData> = {};

  const getMetaContent = (property: string): string | null => {
    // Match both property="og:..." and name="og:..."
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      'i'
    );
    const m = html.match(regex);
    return m ? (m[1] ?? m[2] ?? null) : null;
  };

  const ogTitle = getMetaContent('og:title');
  if (ogTitle) data.title = decodeHtmlEntities(ogTitle);

  const ogDescription = getMetaContent('og:description');
  if (ogDescription) data.description = decodeHtmlEntities(ogDescription);

  const ogImage = getMetaContent('og:image');
  if (ogImage) data.coverImageUrl = ogImage;

  // Luma sometimes puts dates in meta tags
  const articleDate = getMetaContent('article:published_time') ??
    getMetaContent('event:start_time');
  if (articleDate) {
    const d = new Date(articleDate);
    if (!isNaN(d.getTime())) {
      data.date = d.toISOString().slice(0, 16);
    }
  }

  return data;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function extractFromNextData(html: string): Partial<LumaEventData> {
  const data: Partial<LumaEventData> = {};

  // Luma uses Next.js — look for __NEXT_DATA__ or inline JSON with event data
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      // Navigate to event data — Luma's structure may vary
      const event = nextData?.props?.pageProps?.event ??
        nextData?.props?.pageProps?.data?.event ??
        nextData?.props?.pageProps?.initialData?.event;
      if (event) {
        if (event.name) data.title = event.name;
        if (event.description) data.description = event.description;
        if (event.start_at) {
          const d = new Date(event.start_at);
          if (!isNaN(d.getTime())) data.date = d.toISOString().slice(0, 16);
        }
        if (event.geo_address_info?.full_address) {
          data.location = event.geo_address_info.full_address;
        } else if (event.location) {
          data.location = event.location;
        }
        if (event.cover_url) data.coverImageUrl = event.cover_url;
        if (event.hosts?.[0]?.name) data.organizer = event.hosts[0].name;
      }
    } catch {
      // skip
    }
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize: add https:// if missing, then validate domain
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const lumaPattern = /^https?:\/\/(www\.)?(lu\.ma|luma\.com)\/.+/i;
    if (!lumaPattern.test(normalizedUrl)) {
      return NextResponse.json(
        { error: 'Please provide a valid lu.ma or luma.com event link' },
        { status: 400 }
      );
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GatherBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Could not fetch the Luma event page' },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Try multiple extraction strategies, merge results (earlier sources take priority)
    const jsonLd = extractFromJsonLd(html);
    const nextData = extractFromNextData(html);
    const og = extractFromOpenGraph(html);

    const merged: LumaEventData = {
      title: jsonLd.title ?? nextData.title ?? og.title ?? '',
      description: jsonLd.description ?? nextData.description ?? og.description ?? '',
      date: jsonLd.date ?? nextData.date ?? og.date ?? '',
      location: jsonLd.location ?? nextData.location ?? og.location ?? '',
      coverImageUrl: jsonLd.coverImageUrl ?? nextData.coverImageUrl ?? og.coverImageUrl ?? '',
      organizer: jsonLd.organizer ?? nextData.organizer ?? og.organizer ?? '',
      lumaUrl: normalizedUrl,
    };

    // Must have at least a title to consider it a success
    if (!merged.title) {
      return NextResponse.json(
        { error: 'Could not extract event data from this link. The page may not be a public event.' },
        { status: 422 }
      );
    }

    // AI enrichment — non-blocking; failures are swallowed gracefully
    let ai: AIEnrichment | null = null;
    let aiError: string | undefined;

    try {
      ai = await enrichEventWithAI(merged);
    } catch (err) {
      console.error('[import-luma] AI enrichment failed:', err);
      aiError = 'AI enrichment unavailable — event imported without suggestions.';
    }

    const result: LumaImportResponse = { ...merged, ai, aiError };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong while importing. Please try again.' },
      { status: 500 }
    );
  }
}
