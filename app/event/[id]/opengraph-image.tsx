import { ImageResponse } from 'next/og';
import type { Hex } from '@arkiv-network/sdk';
import { publicClient, parseEvent } from '@/lib/arkiv';

export const alt = 'Event poster';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG_COLORS = ['#E8491C', '#0247E2', '#1A1614'];

function titleBg(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff;
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function formatPosterDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const year = d.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = 'Event';
  let date = '';
  let location = '';

  try {
    const entity = await publicClient.getEntity(id as Hex);
    const event = parseEvent(entity);
    title = event.title || 'Event';
    date = event.date;
    location = event.location;
  } catch {
    // graceful fallback — render a generic poster
  }

  const bg = titleBg(title);
  const cream = '#F2EDE4';
  const ink = '#1A1614';
  const separator = 'rgba(242, 237, 228, 0.45)';
  const posterDate = formatPosterDate(date);

  // Adaptive title size: stay within 80–100px, shrink for long titles
  const titleSize = title.length > 50 ? 80 : title.length > 30 ? 88 : 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: bg,
        }}
      >
        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '56px 72px 40px',
          }}
        >
          {/* Top rule */}
          <div
            style={{
              height: 1,
              backgroundColor: separator,
              marginBottom: 40,
            }}
          />

          {/* Title — fills remaining vertical space */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: titleSize,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 700,
                color: cream,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                maxWidth: 1056,
              }}
            >
              {title}
            </div>
          </div>

          {/* Rule below title */}
          <div
            style={{
              height: 1,
              backgroundColor: separator,
              marginTop: 36,
              marginBottom: 28,
            }}
          />

          {/* Date — 48px monospaced */}
          {posterDate && (
            <div
              style={{
                fontSize: 48,
                fontFamily: '"Courier New", Courier, monospace',
                color: cream,
                letterSpacing: '0.04em',
                marginBottom: 24,
              }}
            >
              {posterDate}
            </div>
          )}

          {/* Bottom row: location left / agora.xyz right — 28px */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 28,
              fontFamily: '"Courier New", Courier, monospace',
              color: cream,
              letterSpacing: '0.04em',
              opacity: 0.82,
            }}
          >
            <span>{location}</span>
            <span>agora.xyz</span>
          </div>
        </div>

        {/* Bottom strip — cream bg, ink text */}
        <div
          style={{
            height: 60,
            backgroundColor: cream,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            fontFamily: '"Courier New", Courier, monospace',
            color: ink,
            letterSpacing: '0.18em',
            fontWeight: 700,
          }}
        >
          RSVP ON-CHAIN AT AGORA.XYZ
        </div>
      </div>
    ),
    { ...size },
  );
}
