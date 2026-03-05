// ── Card gradients ───────────────────────────────────────────────────────────

export const CARD_GRADIENTS: [string, string][] = [
  ['#E8491C', '#C8C0B4'], // orange → warm-gray
  ['#0247E2', '#F2EDE4'], // cobalt → cream
  ['#1A1614', '#E8491C'], // ink → orange
  ['#D4E84C', '#E8491C'], // yellow → orange
  ['#3D72F5', '#F2EDE4'], // cobalt-light → cream
];

export function titleGradient(title: string): string {
  if (!title.trim()) return 'linear-gradient(135deg, #C8C0B4, #F2EDE4)';
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff;
  }
  const [from, to] = CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

// ── Shared input class ───────────────────────────────────────────────────────

export const inputCls =
  'w-full border border-warm-gray/50 px-4 py-3 text-sm bg-cream text-ink ' +
  'placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-cobalt/40 ' +
  'focus:border-cobalt transition-colors';
