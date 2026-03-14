'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { KAOLIN_CHAIN_ID } from '@/lib/arkiv';
import { Button } from '@/components/ui/button';

export function WrongChainBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // Only show when connected to a different chain
  if (!isConnected || chainId === KAOLIN_CHAIN_ID) return null;

  return (
    <div className="w-full bg-orange text-cream flex items-center justify-between gap-4 px-6 py-3">
      <p className="text-sm font-[family-name:var(--font-geist-sans)]">
        You&apos;re on the wrong network. Switch to{' '}
        <strong className="font-semibold">Arkiv Kaolin</strong> to continue.
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => switchChain({ chainId: KAOLIN_CHAIN_ID })}
        disabled={isPending}
        className="shrink-0 rounded-none text-xs font-semibold bg-cream text-orange hover:opacity-90"
      >
        {isPending ? 'Switching…' : 'Switch network'}
      </Button>
    </div>
  );
}
