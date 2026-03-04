'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';

export default function EditCommunityButton({
  slug,
  createdBy,
}: {
  slug: string;
  createdBy: string;
}) {
  const { address } = useAccount();

  if (
    !address ||
    !createdBy ||
    address.toLowerCase() !== createdBy.toLowerCase()
  ) {
    return null;
  }

  return (
    <Link
      href={`/community/edit/${slug}`}
      className="shrink-0 px-4 py-2 text-xs font-semibold border border-cream/30 text-cream/70 hover:bg-cream/10 hover:text-cream transition-colors uppercase tracking-wide"
    >
      Edit community
    </Link>
  );
}
