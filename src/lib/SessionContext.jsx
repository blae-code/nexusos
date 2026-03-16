import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { withAppBase } from '@/lib/app-base-path';
import { appParams } from '@/lib/app-params';
import { authApi } from '@/lib/auth-api';

const SessionContext = createContext(null);
const ADMIN_MARKERS = new Set(['admin', 'system_admin', 'app_admin', 'super_admin', 'sudo']);

function normalizeAdminValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isBase44Admin(user) {
  if (!user) return false;

  if (user.is_admin === true || user.isAdmin === true || user.is_system_admin === true || user.isSystemAdmin === true) {
    return true;
  }

  const scalarFields = [
    user.role,
    user.access_level,
    user.accessLevel,
    user.app_role,
    user.appRole,
    user.user_role,
    user.userRole,
    user.permission_level,
    user.permissionLevel,
    user.level,
    user.type,
  ];

  if (scalarFields.some((value) => ADMIN_MARKERS.has(normalizeAdminValue(value)))) {
    return true;
  }

  const roleCollections = [user.roles, user.permissions, user.access];
  return roleCollections.some((collection) =>
    Array.isArray(collection) && collection.some((value) => ADMIN_MARKERS.has(normalizeAdminValue(value))),
  );
}

function toAdminSession(adminUser) {
  return {
    authenticated: true,
    source: 'admin',
    user: {
      id: adminUser.id || 'admin',
      discordId: 'SYSTEM_ADMIN',
      callsign: adminUser.full_name || adminUser.name || adminUser.email || 'SYS-ADMIN',
      rank: 'PIONEER',
      discordRoles: ['Base44 Admin'],
      joinedAt: null,
    },
  };
}

async function fetchPreviewAdminUser() {
  if (!appParams.serverUrl || !appParams.appId) {
    return null;
  }

  const url = new URL(`/api/apps/${appParams.appId}/entities/User/me`, appParams.serverUrl);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-App-Id': appParams.appId,
      'Base44-App-Id': appParams.appId,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
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
        const adminUser = await fetchPreviewAdminUser();
        if (isBase44Admin(adminUser)) {
          nextSession = toAdminSession(adminUser);
        }
      } catch (error) {
        console.warn('[SessionProvider] Base44 preview admin lookup unavailable:', error?.message || error);
      }
    }

    if (!nextSession) {
      try {
        const adminUser = await base44.auth.me();
        if (isBase44Admin(adminUser)) {
          nextSession = toAdminSession(adminUser);
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

  const logout = useCallback(async (redirectTo = '/') => {
    const destination = withAppBase(redirectTo);

    if (session?.source === 'admin') {
      base44.auth.logout(new URL(destination, window.location.origin).toString());
      return;
    }

    try {
      await authApi.logout();
    } catch (error) {
      console.warn('[SessionProvider] logout failed:', error);
    }

    setSession(null);
    window.location.assign(destination);
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
