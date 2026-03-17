import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';

function toFallbackUser(user, source) {
  if (!user) {
    return null;
  }

  if (source === 'admin') {
    return {
      id: user.id || 'admin',
      callsign: user.callsign || 'System Administrator',
      nexus_rank: 'SYSTEM_ADMIN',
      discord_roles: user.discordRoles || ['Base44 Admin'],
      discord_id: user.discordId || 'SYSTEM_ADMIN',
    };
  }

  return {
    id: user.id || null,
    callsign: user.callsign || 'UNKNOWN',
    nexus_rank: user.rank || 'AFFILIATE',
    discord_roles: user.discordRoles || [],
    discord_id: user.discordId || null,
  };
}

async function fetchCurrentUserRecord(sessionUser, source) {
  const fallbackUser = toFallbackUser(sessionUser, source);
  if (!fallbackUser) {
    return null;
  }

  if (source === 'admin' || !base44.entities?.NexusUser?.filter) {
    return fallbackUser;
  }

  try {
    if (sessionUser?.discordId) {
      const byDiscord = await base44.entities.NexusUser.filter({ discord_id: String(sessionUser.discordId) });
      if (Array.isArray(byDiscord) && byDiscord[0]) {
        return byDiscord[0];
      }
    }

    if (sessionUser?.id) {
      const byId = await base44.entities.NexusUser.filter({ id: sessionUser.id });
      if (Array.isArray(byId) && byId[0]) {
        return byId[0];
      }
    }
  } catch {
    return fallbackUser;
  }

  return fallbackUser;
}

export function useCurrentUser() {
  const { user, source, isAuthenticated, loading } = useSession();
  const fallbackUser = useMemo(() => toFallbackUser(user, source), [source, user]);

  const query = useQuery({
    queryKey: ['current-user', source, user?.id || null, user?.discordId || null],
    enabled: !loading && isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: () => fetchCurrentUserRecord(user, source),
  });

  return {
    currentUser: query.data || fallbackUser,
    loading: loading || query.isLoading,
    refresh: query.refetch,
  };
}
