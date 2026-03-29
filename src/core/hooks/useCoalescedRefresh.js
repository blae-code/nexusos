import { useCallback, useEffect, useRef } from 'react';

/**
 * Coalesces repeated refresh requests so subscription bursts do not trigger
 * overlapping full-page reloads. If a refresh is requested while one is
 * already running, exactly one follow-up run is queued.
 */
export function useCoalescedRefresh(load, delay = 150) {
  const loadRef = useRef(load);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const queuedRef = useRef(false);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const refreshNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (runningRef.current) {
      queuedRef.current = true;
      return;
    }

    runningRef.current = true;
    try {
      await loadRef.current();
    } finally {
      runningRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void refreshNow();
        }, delay);
      }
    }
  }, [delay]);

  const scheduleRefresh = useCallback(() => {
    if (runningRef.current) {
      queuedRef.current = true;
      return;
    }

    if (timerRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void refreshNow();
    }, delay);
  }, [delay, refreshNow]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return { refreshNow, scheduleRefresh };
}
