import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { withAppBase } from '@/lib/app-base-path';
import { getAppParams } from '@/lib/app-params';
import { authApi, AUTH_REQUEST_TIMEOUT_MS } from '@/lib/auth-api';
import { buildBase44Url, getBase44Headers } from '@/lib/base44-host';
import { IS_DEV_MODE } from '@/lib/dev';

const SessionContext = createContext(null);
const ADMIN_MARKERS = new Set(['admin', 'system_admin', 'app_admin', 'super_admin', 'sudo']);
const SESSION_REFRESH_TIMEOUT_MS = AUTH_REQUEST_TIMEOUT_MS;

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

function isAbortError(error) {
  return error?.name === 'AbortError';
}

function withTimeout(task, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  });
}

async function fetchPreviewAdminUser(timeoutMs = SESSION_REFRESH_TIMEOUT_MS) {
  const { appId } = getAppParams();
  if (!appId) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(buildBase44Url(`/api/apps/${appId}/entities/User/me`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
      headers: getBase44Headers(),
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startupIssue, setStartupIssue] = useState('');
  const isMountedRef = useRef(true);
  const refreshRequestIdRef = useRef(0);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const refreshSession = useCallback(async ({ silent = false } = {}) => {
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    const previousSession = sessionRef.current;
    const shouldShowBlockingLoader = !silent || !previousSession?.authenticated;

    if (shouldShowBlockingLoader) {
      setLoading(true);
    }

    let nextSession = null;
    let transportIssue = '';

    try {
      const data = await authApi.getSession({ timeoutMs: SESSION_REFRESH_TIMEOUT_MS });
      if (data?.authenticated) {
        nextSession = data;
      } else if (data?.status >= 500 && data?.error) {
        transportIssue = data.error;
      }
    } catch (error) {
      transportIssue = isAbortError(error) ? 'Session check timed out' : 'Session check unavailable';
      console.warn('[SessionProvider] refresh failed:', error);
    }

    if (!nextSession && !IS_DEV_MODE) {
      try {
        const adminUser = await fetchPreviewAdminUser(SESSION_REFRESH_TIMEOUT_MS);
        if (isBase44Admin(adminUser)) {
          nextSession = toAdminSession(adminUser);
        }
      } catch (error) {
        if (!transportIssue) {
          transportIssue = isAbortError(error) ? 'Admin preview lookup timed out' : 'Admin preview lookup unavailable';
        }
        console.warn('[SessionProvider] Base44 preview admin lookup unavailable:', error?.message || error);
      }
    }

    if (!nextSession && !IS_DEV_MODE) {
      try {
        const adminUser = await withTimeout(
          () => base44.auth.me(),
          SESSION_REFRESH_TIMEOUT_MS,
          'Base44 admin lookup',
        );
        if (isBase44Admin(adminUser)) {
          nextSession = toAdminSession(adminUser);
        }
      } catch (error) {
        if (!transportIssue) {
          transportIssue = isAbortError(error) ? 'Base44 admin lookup timed out' : 'Base44 admin lookup unavailable';
        }
        console.warn('[SessionProvider] Base44 admin fallback unavailable:', error?.message || error);
      }
    }

    if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) {
      return;
    }

    if (nextSession) {
      setSession(nextSession);
      setStartupIssue('');
      setLoading(false);
      return;
    }

    if (transportIssue && previousSession?.authenticated) {
      setSession(previousSession);
      setStartupIssue(transportIssue);
      setLoading(false);
      return;
    }

    setSession(null);
    setStartupIssue(transportIssue);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();

    const handleFocus = () => {
      refreshSession({ silent: true });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshSession]);

  const logout = useCallback(async (redirectTo = '/') => {
    const destination = withAppBase(redirectTo);

    if (session?.source === 'admin') {
      try {
        base44.auth.logout(new URL(destination, window.location.origin).toString());
      } catch {
        window.location.assign(destination);
      }
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
    startupIssue,
    refreshSession,
    logout,
    patchUser,
  }), [loading, logout, patchUser, refreshSession, session, startupIssue]);

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
