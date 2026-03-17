import { useEffect } from 'react';
import { useOpLiveState } from '@/core/data/hooks';

export function useOperationalState() {
  const { hasLiveOp, loading, refresh } = useOpLiveState();

  useEffect(() => {
    document.documentElement.classList.toggle('op-live', Boolean(hasLiveOp));
    return () => {
      document.documentElement.classList.remove('op-live');
    };
  }, [hasLiveOp]);

  return {
    hasLiveOp,
    loading,
    refresh,
  };
}

export default useOperationalState;
