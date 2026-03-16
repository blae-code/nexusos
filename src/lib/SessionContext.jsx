import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { authApi } from '@/lib/auth-api';

const SessionContext = createContext(null);

function isBase44Admin(user) {
  if (!user) return false;

  return user.role === 'admin'
    || user.role === 'system_admin'
    || user.access_level === 'admin'
    || user.is_admin === true;
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    let nextSession = null;

    try {
      const data = await authApi.getSession();
      if (data?.authenticated) {
        nextSession = data;
      }
    } catch (error) {
      console.error('[SessionProvider] refresh failed:', error);
    }

    if (!nextSession) {
      try {
        const adminUser = await base44.auth.me();
        if (isBase44Admin(adminUser)) {
          nextSession = {
            authenticated: true,
            source: 'admin',
            user: {
              id: adminUser.id || 'admin',
              discordId: 'SYSTEM_ADMIN',
              callsign: adminUser.full_name || adminUser.name || 'SYS-ADMIN',
              rank: 'PIONEER',
              discordRoles: ['Base44 Admin'],
              joinedAt: null,
            },
          };
        }
      } catch (error) {
        console.warn('[SessionProvider] Base44 admin fallback unavailable:', error?.message || error);
      }
    }

    try {
      setSession(nextSession);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    const handleFocus = () => {
      refreshSession();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshSession]);

  const logout = useCallback(async (redirectTo = '/gate') => {
    if (session?.source === 'admin') {
      base44.auth.logout(new URL(redirectTo, window.location.origin).toString());
      return;
    }

    try {
      await authApi.logout();
    } catch (error) {
      console.warn('[SessionProvider] logout failed:', error);
    }

    setSession(null);
    window.location.assign(redirectTo);
  }, [session]);

  const patchUser = useCallback((partial) => {
    setSession(current => {
      if (!current?.user) return current;
      return {
        ...current,
        user: {
          ...current.user,
          ...partial,
        },
      };
    });
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    source: session?.source || null,
    isAuthenticated: Boolean(session?.authenticated),
    loading,
    refreshSession,
    logout,
    patchUser,
  }), [loading, logout, patchUser, refreshSession, session]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
