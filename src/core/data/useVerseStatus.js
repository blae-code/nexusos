import { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';

export const VERSE_BUILD_LABEL = '4.7.0';

export function useVerseStatus() {
  const [status, setStatus] = useState('unknown');

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await base44.functions.invoke('verseStatus', {});
        if (!cancelled) {
          setStatus(response?.data?.status || response?.status || 'unknown');
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[useVerseStatus] poll failed:', error?.message || error);
          setStatus('unknown');
        }
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return { status };
}
