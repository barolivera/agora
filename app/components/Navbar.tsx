'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect, useAccount } from 'wagmi';
import { shortAddress } from '@/lib/arkiv';
import { useDisplayNames, displayName } from '@/lib/useDisplayNames';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const names = useDisplayNames(address ? [address] : []);

  useEffect(() => {
    if (!walletOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setWalletOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [walletOpen]);

  return (
    <div className="relative">
      <nav className="flex items-center justify-between px-6 py-4 bg-ink">
        {/* Left: logo + desktop nav links */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold font-[family-name:var(--font-kode-mono)] tracking-tight"
            style={{ color: '#F2EDE4' }}
          >
            <Image src="/agora-logo_v2.svg" alt="" width={28} height={28} />
            Agora
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/events"
              className="text-sm text-cream/60 hover:text-cream transition-colors"
            >
              Events
            </Link>
            <Link
              href="/community"
              className="text-sm text-cream/60 hover:text-cream transition-colors"
            >
              Communities
            </Link>
          </div>
        </div>

        {/* Right: wallet + hamburger */}
        <div className="flex items-center gap-3">
          <ConnectButton.Custom>
            {({ account, chain, openChainModal, openConnectModal, mounted }) => {
              if (!mounted) return null;

              if (!account) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="bg-orange text-cream text-sm font-semibold px-4 py-2 hover:bg-orange-light transition-colors"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain?.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="bg-red-600 text-cream text-sm font-semibold px-4 py-2"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  {chain?.hasIcon && chain.iconUrl && (
                    <button onClick={openChainModal} className="opacity-50 hover:opacity-100 transition-opacity">
                      <img src={chain.iconUrl} alt={chain.name ?? ''} width={18} height={18} className="rounded-full" />
                    </button>
                  )}
                  <div ref={walletRef} className="relative">
                    <button
                      onClick={() => setWalletOpen((o) => !o)}
                      className="flex items-center gap-2 bg-ink border border-cream/30 text-cream text-sm font-semibold px-3 py-2 hover:border-cream/50 transition-colors"
                    >
                      <img
                        src={`https://effigy.im/a/${account.address}.svg`}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      {displayName(account.address, names).name}
                    </button>
                    {walletOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-ink border border-cream/20 z-50 flex flex-col">
                        <Link
                          href={`/profile/${account.address}`}
                          onClick={() => setWalletOpen(false)}
                          className="px-4 py-3 text-sm text-cream/80 hover:bg-cream/5 hover:text-cream transition-colors font-[family-name:var(--font-dm-sans)]"
                        >
                          View profile
                        </Link>
                        <button
                          onClick={() => { disconnect(); setWalletOpen(false); }}
                          className="px-4 py-3 text-sm text-left text-cream/80 hover:bg-cream/5 hover:text-cream transition-colors border-t border-cream/10 font-[family-name:var(--font-dm-sans)]"
                        >
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          </ConnectButton.Custom>

          {/* Hamburger button — visible on mobile only */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-cream"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <line x1="1" y1="1" x2="17" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <line x1="17" y1="1" x2="1" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
              </svg>
            ) : (
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                <line y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="2" />
                <line y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" />
                <line y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown — hidden on desktop */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-ink border-t border-warm-gray/20 z-50 flex flex-col">
          <Link
            href="/events"
            onClick={() => setMenuOpen(false)}
            className="px-6 py-4 text-sm text-cream/60 hover:text-cream hover:bg-white/5 transition-colors border-b border-warm-gray/10"
          >
            Events
          </Link>
          <Link
            href="/community"
            onClick={() => setMenuOpen(false)}
            className="px-6 py-4 text-sm text-cream/60 hover:text-cream hover:bg-white/5 transition-colors"
          >
            Communities
          </Link>
        </div>
      )}
    </div>
  );
}
