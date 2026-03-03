export type EventStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';

const STATUS_STYLES: Record<EventStatus, { bg: string; color: string; label: string }> = {
  upcoming: { bg: '#0075FF', color: '#FAFAFA', label: 'Upcoming' },
  live:     { bg: '#03AE33', color: '#ffffff', label: '● Live' },
  ended:    { bg: '#FF3D00', color: '#FAFAFA', label: 'Ended' },
  cancelled:{ bg: '#ef4444', color: '#ffffff', label: 'Cancelled' },
};

export default function StatusBadge({ status }: { status: EventStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.upcoming;
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.color }}
      className="inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase font-[family-name:var(--font-dm-sans)]"
    >
      {s.label}
    </span>
  );
}
