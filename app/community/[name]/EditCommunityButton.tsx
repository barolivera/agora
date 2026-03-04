'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';

export default function EditCommunityButton({
  slug,
  createdBy,
  eventOrganizers = [],
}: {
  slug: string;
  createdBy: string;
  eventOrganizers?: string[];
}) {
  const { address } = useAccount();

  if (!address) return null;

  const wallet = address.toLowerCase();
  const isCreator = !!createdBy && wallet === createdBy.toLowerCase();
  const isOrganizerOfUnclaimed =
    !createdBy && eventOrganizers.some((o) => o.toLowerCase() === wallet);

  if (!isCreator && !isOrganizerOfUnclaimed) return null;

  return (
    <Link
      href={`/community/edit/${slug}`}
      className="shrink-0 px-4 py-2 text-xs font-semibold border border-cream/30 text-cream/70 hover:bg-cream/10 hover:text-cream transition-colors uppercase tracking-wide"
    >
      Edit community
    </Link>
  );
}
