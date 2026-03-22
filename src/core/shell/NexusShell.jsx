import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authApi } from '@/core/data/auth-api';
import { base44 } from '@/core/data/base44Client';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';
import { withAppBase } from '@/core/data/app-base-path';
import { notifyBrowser, useNotificationPreferences } from '@/core/data/notification-preferences';
import { loadRescueCalls, refreshRescueCalls, subscribeToRescueCalls } from '@/core/data/rescue-board-store';
import { useSession } from '@/core/data/SessionContext';
import { getStoredLayoutMode, setStoredLayoutMode } from '@/core/data/layout-mode';
import { useVerseStatus } from '@/core/data/useVerseStatus';
import { preloadCriticalTokens } from '@/core/data/tokenMap';
import { IS_DEV_MODE, IS_LOCAL_SIMULATION_MODE, IS_SHARED_SANDBOX_MODE } from '@/core/data/dev';
import AppErrorBoundary from '@/components/AppErrorBoundary';

export default function NexusShell() {
  const location = useLocation();
  const { session, user, source, isAuthenticated, loading } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const { preferences, permission } = useNotificationPreferences();
  const [layoutMode, setLayoutMode] = useState(() => getStoredLayoutMode());
  const [sandboxMeta, setSandboxMeta] = useState(null);
  const seenLiveOpsRef = useRef(new Set());
  const seenScoutDepositsRef = useRef(new Set());
  const seenRescueCallsRef = useRef(new Set());

  const updateLayoutMode = (nextMode) => {
    setLayoutMode(setStoredLayoutMode(nextMode));
  };

  useEffect(() => {
    if (user?.rank) {
      preloadCriticalTokens(user.rank, 6);
    }
  }, [user?.rank]);

  useEffect(() => {
    if (!IS_SHARED_SANDBOX_MODE) {
      setSandboxMeta(null);
      return;
    }

    let cancelled = false;

    const loadSandboxMeta = async () => {
      try {
        const payload = await authApi.getDemoState({ metaOnly: true });
        if (!cancelled) {
          setSandboxMeta(payload?.meta || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusShell] sandbox meta lookup failed:', error?.message || error);
          setSandboxMeta({
            persistence: 'unknown',
            warnings: ['Collaboration sandbox metadata is unavailable. Verify the demo API deployment before inviting collaborators.'],
          });
        }
      }
    };

    loadSandboxMeta();
    const intervalId = window.setInterval(loadSandboxMeta, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const notifyIfBackgrounded = (payload) => {
      if (permission !== 'granted' || document.visibilityState === 'visible') {
        return;
      }

      notifyBrowser(payload);
    };

    const seedLiveOps = async () => {
      try {
        const liveOps = await base44.entities.Op.filter({ status: 'LIVE' });
        if (!cancelled) {
          seenLiveOpsRef.current = new Set((liveOps || []).map((item) => item.id));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusShell] live-op notification seed failed:', error?.message || error);
        }
      }
    };

    const checkLiveOps = async () => {
      if (!preferences.ops || permission !== 'granted') {
        return;
      }

      try {
        const liveOps = await base44.entities.Op.filter({ status: 'LIVE' });
        if (cancelled) {
          return;
        }

        const nextSeen = new Set();
        (liveOps || []).forEach((op) => {
          nextSeen.add(op.id);
          if (!seenLiveOpsRef.current.has(op.id)) {
            notifyIfBackgrounded({
              title: 'NexusOS · Live Op',
              body: `${op.name || 'Unnamed op'} is now live${op.location ? ` · ${op.location}` : ''}`,
              tag: `nexus-op-${op.id}`,
              onClickUrl: withAppBase('/app/ops'),
            });
          }
        });
        seenLiveOpsRef.current = nextSeen;
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusShell] live-op notification check failed:', error?.message || error);
        }
      }
    };

    const seedScoutDeposits = async () => {
      try {
        const deposits = await base44.entities.ScoutDeposit.list('-reported_at', 25);
        if (!cancelled) {
          seenScoutDepositsRef.current = new Set((deposits || []).map((item) => item.id));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusShell] scout notification seed failed:', error?.message || error);
        }
      }
    };

    const checkScoutDeposits = async () => {
      if (!preferences.scout || permission !== 'granted') {
        return;
      }

      try {
        const deposits = await base44.entities.ScoutDeposit.list('-reported_at', 25);
        if (cancelled) {
          return;
        }

        const nextSeen = new Set();
        (deposits || []).forEach((deposit) => {
          nextSeen.add(deposit.id);
          const quality = Number(deposit.quality_pct || 0);
          if (!seenScoutDepositsRef.current.has(deposit.id) && quality >= 80) {
            notifyIfBackgrounded({
              title: 'NexusOS · Scout Intel',
              body: `${deposit.material_name || 'Deposit'} @ ${quality.toFixed(0)}%${deposit.system_name ? ` · ${deposit.system_name}` : ''}`,
              tag: `nexus-scout-${deposit.id}`,
              onClickUrl: withAppBase('/app/scout'),
            });
          }
        });
        seenScoutDepositsRef.current = nextSeen;
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusShell] scout notification check failed:', error?.message || error);
        }
      }
    };

    const seedRescueCalls = async () => {
      const calls = await refreshRescueCalls().catch(() => loadRescueCalls());
      if (cancelled) {
        return;
      }

      seenRescueCallsRef.current = new Set(
        (calls || [])
          .filter((call) => call.status === 'OPEN')
          .map((call) => call.id),
      );
    };

    const handleRescueCalls = (calls) => {
      const nextOpenIds = new Set();

      calls
        .filter((call) => call.status === 'OPEN')
        .forEach((call) => {
          nextOpenIds.add(call.id);

          if (preferences.rescue && permission === 'granted' && !seenRescueCallsRef.current.has(call.id)) {
            notifyIfBackgrounded({
              title: 'NexusOS · Distress Call',
              body: `${call.callsign || 'UNKNOWN'} requests help${call.location ? ` · ${call.location}` : ''}`,
              tag: `nexus-rescue-${call.id}`,
              onClickUrl: withAppBase('/app/rescue'),
            });
          }
        });

      seenRescueCallsRef.current = nextOpenIds;
    };

    seedLiveOps();
    seedScoutDeposits();
    seedRescueCalls();

    const opUnsubscribe = base44.entities.Op.subscribe(() => {
      checkLiveOps();
    });
    const scoutUnsubscribe = base44.entities.ScoutDeposit.subscribe(() => {
      checkScoutDeposits();
    });
    const rescueUnsubscribe = subscribeToRescueCalls(handleRescueCalls);
    const intervalId = window.setInterval(() => {
      checkLiveOps();
      checkScoutDeposits();
    }, 60000);

    return () => {
      cancelled = true;
      opUnsubscribe?.();
      scoutUnsubscribe?.();
      rescueUnsubscribe?.();
      window.clearInterval(intervalId);
    };
  }, [permission, preferences.ops, preferences.rescue, preferences.scout]);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          background: 'var(--bg0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = `/?redirect_to=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
    return <Navigate to={redirectTo} replace />;
  }

  const isAdmin = source === 'admin';
  const isPreview = source === 'preview';
  const isElevated = isAdmin || isPreview || ['PIONEER', 'FOUNDER'].includes(user?.rank);
  if (location.pathname.startsWith('/app/admin') && !isElevated) {
    return <Navigate to="/app/industry" replace />;
  }

  const outletContext = {
    layoutMode,
    setLayoutMode: updateLayoutMode,
    callsign: isAdmin ? 'System Administrator' : (user?.callsign || 'UNKNOWN'),
    rank: isAdmin ? 'SYSTEM_ADMIN' : (user?.rank || 'AFFILIATE'),
    discordId: isAdmin ? null : (user?.discordId || null),
    isAdmin,
    source: source || session?.source || 'member',
    sessionUserId: user?.id || null,
  };

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(180deg, #0A0908 0%, #08080A 100%)',
      padding: 5,
    }}>
      <div className="nexus-shell-frame">
        {IS_DEV_MODE ? (
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div
              style={{
                height: 22,
                background: 'rgba(var(--warn-rgb), 0.07)',
                borderBottom: '0.5px solid rgba(var(--warn-rgb), 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 9, color: 'var(--warn)', letterSpacing: '0.18em', userSelect: 'none' }}>
                {IS_SHARED_SANDBOX_MODE
                  ? 'COLLABORATION SANDBOX · SYNTHETIC DATA · CHANGES SHARED ACROSS PREVIEW USERS'
                  : 'SIMULATION ENVIRONMENT · SYNTHETIC DATA · ALL CHANGES RESET ON TAB CLOSE'}
              </span>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite 1.25s' }} />
            </div>
            {IS_SHARED_SANDBOX_MODE && sandboxMeta?.persistence === 'memory' ? (
              <div
                style={{
                  height: 24,
                  background: 'rgba(var(--danger-rgb), 0.12)',
                  borderBottom: '0.5px solid rgba(var(--danger-rgb), 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                }}
              >
                <span style={{ fontSize: 9, color: 'var(--danger)', letterSpacing: '0.14em', textAlign: 'center' }}>
                  KV NOT CONFIGURED · SHARED SANDBOX IS RUNNING IN MEMORY ONLY · COLLABORATION STATE MAY RESET OR SPLIT ACROSS INSTANCES
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        {isPreview ? (
          <div
            style={{
              height: 22,
              background: 'rgba(210, 180, 0, 0.08)',
              borderBottom: '0.5px solid rgba(210, 180, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgb(210, 180, 0)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, color: 'rgb(210, 180, 0)', letterSpacing: '0.18em', userSelect: 'none' }}>
              PREVIEW MODE — AUTH BYPASSED · MOCK PIONEER USER
            </span>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgb(210, 180, 0)', animation: 'pulse-dot 2.5s ease-in-out infinite 1.25s' }} />
          </div>
        ) : null}
        <NexusTopbar
          layoutMode={layoutMode}
          onSelectLayout={updateLayoutMode}
          verseStatus={verseStatus}
        />
        <div className="nexus-shell-body">
          <NexusSidebar currentPath={location.pathname} currentSearch={location.search} rank={outletContext.rank} />
          <main className="nexus-shell-content nexus-fade-in" style={{ position: 'relative' }}>
            {IS_DEV_MODE ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-25deg)',
                  fontSize: 110,
                  fontWeight: 700,
                  color: 'rgba(var(--warn-rgb), 0.028)',
                  letterSpacing: '0.45em',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  zIndex: 0,
                  fontFamily: 'var(--font)',
                }}
              >
                SIMULATION
              </div>
            ) : null}
            <AppErrorBoundary compact>
              <Outlet context={outletContext} />
            </AppErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}
