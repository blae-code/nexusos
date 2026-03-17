import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';

async function fetchHasLiveOp() {
  if (!base44.entities?.Op?.filter) {
    return false;
  }

  try {
    const liveOps = await base44.entities.Op.filter({ status: 'LIVE' });
    return Array.isArray(liveOps) && liveOps.length > 0;
  } catch {
    return false;
  }
}

export function useOpLiveState() {
  const query = useQuery({
    queryKey: ['has-live-op'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: fetchHasLiveOp,
  });

  return {
    hasLiveOp: Boolean(query.data),
    loading: query.isLoading,
    refresh: query.refetch,
  };
}
