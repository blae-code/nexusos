import { useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';

const POLL_INTERVAL = 30000; // 30s — aligns with Discord role sync cadence

export function useOperationalState() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const ops = await base44.entities.Op.filter({ status: 'LIVE' });
        if (cancelled) return;
        const hasLive = Array.isArray(ops) && ops.length > 0;
        document.documentElement.classList.toggle('op-live', hasLive);
      } catch {
        // non-critical — leave current class state unchanged
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.documentElement.classList.remove('op-live');
    };
  }, []);
}
