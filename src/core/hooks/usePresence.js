/**
 * usePresence — sends a heartbeat every 3 minutes to track online status.
 * Also fires immediately on mount and on window focus.
 */
import { useCallback, useEffect, useRef } from 'react';
import { authApi } from '@/core/data/auth-api';

const HEARTBEAT_INTERVAL = 3 * 60 * 1000; // 3 minutes

export default function usePresence(isAuthenticated) {
  const lastBeatRef = useRef(0);

  const beat = useCallback(async () => {
    if (!isAuthenticated) return;
    // Debounce: don't fire more than once per 60s
    if (Date.now() - lastBeatRef.current < 60000) return;
    lastBeatRef.current = Date.now();
    try {
      await authApi.heartbeat();
    } catch {
      // silent — non-critical
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    beat();
    const id = setInterval(beat, HEARTBEAT_INTERVAL);

    const handleFocus = () => beat();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, beat]);
}