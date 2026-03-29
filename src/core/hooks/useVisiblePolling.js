import { useEffect, useRef } from 'react';

/**
 * Polls while the page is visible, pauses while the tab is hidden, and runs
 * one catch-up refresh when visibility returns.
 */
export function useVisiblePolling(callback, intervalMs) {
  const callbackRef = useRef(callback);
  const intervalRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const run = () => {
      void callbackRef.current();
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      intervalRef.current = setInterval(run, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        stopPolling();
        return;
      }
      run();
      startPolling();
    };

    run();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs]);
}
