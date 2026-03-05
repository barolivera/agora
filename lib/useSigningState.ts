import { useState, useCallback, useRef } from 'react';

export type SigningPhase = 'idle' | 'waiting' | 'saving' | 'done' | 'cancelled';

export function useSigningState() {
  const [phase, setPhase] = useState<SigningPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setPhase('waiting');
  }, [clearTimer]);

  const signed = useCallback(() => {
    setPhase('saving');
  }, []);

  const done = useCallback(() => {
    setPhase('done');
    timerRef.current = setTimeout(() => setPhase('idle'), 2000);
  }, []);

  const cancelled = useCallback(() => {
    setPhase('cancelled');
    timerRef.current = setTimeout(() => setPhase('idle'), 6000);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setPhase('idle');
  }, [clearTimer]);

  return {
    phase,
    isActive: phase !== 'idle' && phase !== 'cancelled',
    start,
    signed,
    done,
    cancelled,
    reset,
  };
}
