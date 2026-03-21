'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';

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
    <Button asChild variant="outline" size="sm" className="border-cream/30 text-cream/70 hover:bg-cream/10 hover:text-cream uppercase tracking-wide">
      <Link href={`/community/edit/${slug}`}>Edit community</Link>
    </Button>
  );
}
