import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';
import { withAppBase } from '@/lib/app-base-path';
import { notifyBrowser, useNotificationPreferences } from '@/lib/notification-preferences';
import { loadRescueCalls, refreshRescueCalls, subscribeToRescueCalls } from '@/lib/rescue-board-store';
import { useSession } from '@/lib/SessionContext';
import { getStoredLayoutMode, setStoredLayoutMode } from '@/lib/layout-mode';
import { useVerseStatus } from '@/lib/useVerseStatus';
import { preloadCriticalTokens } from '@/lib/tokenMap';
import { IS_DEV_MODE } from '@/lib/dev';

export default function NexusShell() {
  const location = useLocation();
  const { session, user, source, isAuthenticated, loading } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const { preferences, permission } = useNotificationPreferences();
  const [layoutMode, setLayoutMode] = useState(() => getStoredLayoutMode());
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
  const isElevated = isAdmin || ['PIONEER', 'FOUNDER'].includes(user?.rank);
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
    <div style={{ height: '100vh', background: 'var(--bg0)', padding: 5 }}>
      <div className="nexus-shell-frame">
        {IS_DEV_MODE ? (
          <div
            style={{
              height: 22,
              background: 'rgba(240,168,36,0.07)',
              borderBottom: '0.5px solid rgba(240,168,36,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, color: 'var(--warn)', letterSpacing: '0.18em', userSelect: 'none' }}>
              SIMULATION ENVIRONMENT · SYNTHETIC DATA · ALL CHANGES RESET ON TAB CLOSE
            </span>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse-dot 2.5s ease-in-out infinite 1.25s' }} />
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
                  color: 'rgba(240,168,36,0.028)',
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
            <Outlet context={outletContext} />
          </main>
        </div>
      </div>
    </div>
  );
}
