'use client';

import { useState, useEffect } from 'react';
import { fetchProfile, shortAddress, type ArkivProfile } from '@/lib/arkiv';

// Client-side cache shared across all hook instances
const clientCache = new Map<string, ArkivProfile | null>();
const pending = new Map<string, Promise<ArkivProfile | null>>();

function resolve(address: string): Promise<ArkivProfile | null> {
  const key = address.toLowerCase();
  if (clientCache.has(key)) return Promise.resolve(clientCache.get(key)!);
  if (pending.has(key)) return pending.get(key)!;

  const p = fetchProfile(key).then((profile) => {
    clientCache.set(key, profile);
    pending.delete(key);
    return profile;
  });
  pending.set(key, p);
  return p;
}

/**
 * Resolves a list of addresses into display names.
 * Returns a Map<lowercase-address, nickname | null>.
 * Re-renders once all profiles are loaded.
 */
export function useDisplayNames(addresses: string[]): Map<string, string | null> {
  const [names, setNames] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (addresses.length === 0) return;

    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];

    // Return cached results immediately
    const immediate = new Map<string, string | null>();
    const toFetch: string[] = [];
    for (const addr of unique) {
      if (clientCache.has(addr)) {
        immediate.set(addr, clientCache.get(addr)?.nickname ?? null);
      } else {
        toFetch.push(addr);
      }
    }

    if (toFetch.length === 0) {
      setNames(immediate);
      return;
    }

    // Set what we have immediately, then fetch the rest
    if (immediate.size > 0) setNames(immediate);

    let cancelled = false;
    Promise.all(toFetch.map(resolve)).then((profiles) => {
      if (cancelled) return;
      const merged = new Map(immediate);
      toFetch.forEach((addr, i) => {
        merged.set(addr, profiles[i]?.nickname ?? null);
      });
      setNames(merged);
    });

    return () => { cancelled = true; };
  }, [addresses.join(',')]);

  return names;
}

/**
 * Render helper: returns display name with fallback to truncated address.
 */
export function displayName(
  address: string,
  names: Map<string, string | null>,
): { name: string; isResolved: boolean } {
  const nickname = names.get(address.toLowerCase());
  if (nickname) return { name: nickname, isResolved: true };
  return { name: shortAddress(address), isResolved: false };
}
