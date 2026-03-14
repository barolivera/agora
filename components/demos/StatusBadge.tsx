import { Badge } from '@/components/ui/badge';

export type EventStatus = 'upcoming' | 'live' | 'ended' | 'cancelled' | 'pending';

const STATUS_STYLES: Record<EventStatus, { bg: string; color: string; label: string }> = {
  upcoming: { bg: '#0075FF', color: '#FAFAFA', label: 'Upcoming' },
  live:     { bg: '#03AE33', color: '#ffffff', label: '● Live' },
  ended:    { bg: '#FF3D00', color: '#FAFAFA', label: 'Ended' },
  cancelled:{ bg: '#ef4444', color: '#ffffff', label: 'Cancelled' },
  pending:  { bg: '#F59E0B', color: '#422006', label: 'Pending Review' },
};

export default function StatusBadge({ status }: { status: EventStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.upcoming;
  return (
    <Badge
      style={{ backgroundColor: s.bg, color: s.color }}
      className="rounded-none px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase font-[family-name:var(--font-geist-sans)] border-0"
    >
      {s.label}
    </Badge>
  );
}
