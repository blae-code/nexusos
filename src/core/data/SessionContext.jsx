import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { withAppBase } from '@/core/data/app-base-path';
import { authApi, AUTH_REQUEST_TIMEOUT_MS } from '@/core/data/auth-api';

const SessionContext = createContext(null);
const SESSION_REFRESH_TIMEOUT_MS = AUTH_REQUEST_TIMEOUT_MS;

function isAbortError(error) {
  return error?.name === 'AbortError';
}

function redirectToAccessGate(reason = 'session_expired') {
  if (typeof window === 'undefined') {
    return;
  }

  const gatePath = withAppBase('/gate');
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (window.location.pathname === gatePath) {
    return;
  }

  const url = new URL(gatePath, window.location.origin);
  url.searchParams.set(reason, '1');

  if (currentPath && currentPath !== '/' && currentPath !== gatePath) {
    url.searchParams.set('redirect_to', currentPath);
  }

  window.location.assign(url.toString());
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
      } else if (data?.status === 401 && previousSession?.authenticated) {
        transportIssue = 'Session expired';
      } else if (data?.status >= 500 && data?.error) {
        transportIssue = data.error;
      }
    } catch (error) {
      transportIssue = isAbortError(error) ? 'Session check timed out' : 'Session check unavailable';
      console.warn('[SessionProvider] refresh failed:', error);
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

    if (transportIssue === 'Session expired' && previousSession?.authenticated) {
      setSession(null);
      setStartupIssue('Session expired');
      setLoading(false);
      redirectToAccessGate('session_expired');
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

    try {
      await authApi.logout();
    } catch (error) {
      console.warn('[SessionProvider] logout failed:', error);
    }

    setSession(null);
    window.location.assign(destination);
  }, []);

  const patchUser = useCallback((partial) => {
    setSession((current) => {
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

  const isAdmin = Boolean(session?.is_admin || session?.user?.is_admin);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    source: session?.source || null,
    isAuthenticated: Boolean(session?.authenticated),
    isAdmin,
    loading,
    startupIssue,
    refreshSession,
    logout,
    patchUser,
  }), [isAdmin, loading, logout, patchUser, refreshSession, session, startupIssue]);

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
