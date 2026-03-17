import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';
import { useCurrentUser } from '@/core/data/hooks/useCurrentUser';

const RED_TIER_RANKS = new Set(['VOYAGER', 'FOUNDER', 'PIONEER', 'SYSTEM_ADMIN']);
const AMBER_TIER_RANKS = new Set(['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER', 'SYSTEM_ADMIN']);

function getVisibleRiskTiers(rank) {
  if (RED_TIER_RANKS.has(rank)) {
    return new Set(['GREEN', 'AMBER', 'RED']);
  }
  if (AMBER_TIER_RANKS.has(rank)) {
    return new Set(['GREEN', 'AMBER']);
  }
  return new Set(['GREEN']);
}

async function fetchCargoJobs(visibleTiers) {
  if (!base44.entities?.CargoJob) {
    return [];
  }

  try {
    const jobs = base44.entities.CargoJob.filter
      ? await base44.entities.CargoJob.filter({ status: 'OPEN' })
      : await base44.entities.CargoJob.list?.('-created_at', 100);

    return (Array.isArray(jobs) ? jobs : [])
      .filter((job) => (job.status || 'OPEN') === 'OPEN')
      .filter((job) => visibleTiers.has(String(job.risk_tier || 'GREEN').toUpperCase()))
      .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime());
  } catch {
    return [];
  }
}

export function useCargoJobs() {
  const { currentUser, loading: currentUserLoading } = useCurrentUser();
  const visibleTiers = useMemo(
    () => getVisibleRiskTiers(String(currentUser?.nexus_rank || 'AFFILIATE').toUpperCase()),
    [currentUser?.nexus_rank],
  );

  const query = useQuery({
    queryKey: ['cargo-jobs', currentUser?.nexus_rank || 'AFFILIATE'],
    enabled: !currentUserLoading,
    refetchOnWindowFocus: true,
    queryFn: () => fetchCargoJobs(visibleTiers),
  });

  return {
    cargoJobs: query.data || [],
    loading: currentUserLoading || query.isLoading,
    refresh: query.refetch,
  };
}
