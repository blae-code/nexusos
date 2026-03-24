// NexusOS v1.0 — Production build
import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
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
import { qualityPercentFromRecord } from '@/core/data/quality';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import { showToast } from '@/components/NexusToast';

export default function NexusShell() {
  const location = useLocation();
  const { session, user, source, isAuthenticated, isAdmin, loading } = useSession();
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
          const liveOpItems = Array.isArray(liveOps) ? liveOps : [];
          seenLiveOpsRef.current = new Set(liveOpItems.map((item) => item.id));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[NexusShell] live-op notification seed failed:', error?.message || error);
          showToast('Failed to load live ops data — check connection', 'warning', 4000);
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
        const liveOpItems = Array.isArray(liveOps) ? liveOps : [];
        liveOpItems.forEach((op) => {
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
          const depositItems = Array.isArray(deposits) ? deposits : [];
          seenScoutDepositsRef.current = new Set(depositItems.map((item) => item.id));
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
        const depositItems = Array.isArray(deposits) ? deposits : [];
        depositItems.forEach((deposit) => {
          nextSeen.add(deposit.id);
          const quality = qualityPercentFromRecord(deposit);
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
        (Array.isArray(calls) ? calls : [])
          .filter((call) => call.status === 'OPEN')
          .map((call) => call.id),
      );
    };

    const handleRescueCalls = (calls) => {
      const nextOpenIds = new Set();
      const rescueCalls = Array.isArray(calls) ? calls : [];

      rescueCalls
        .filter((call) => call.status === 'OPEN')
        .forEach((call) => {
          nextOpenIds.add(call.id);

          if (preferences.rescue && permission === 'granted' && !seenRescueCallsRef.current.has(call.id)) {
            notifyIfBackgrounded({
              title: 'NexusOS · Distress Call',
              body: `${call.callsign || 'UNKNOWN'} requests help${call.location ? ` · ${call.location}` : ''}`,
              tag: `nexus-rescue-${call.id}`,
              onClickUrl: withAppBase('/app/ops/rescue'),
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

  if (location.pathname.startsWith('/app/admin') && !isAdmin) {
    return <Navigate to="/app/industry" replace />;
  }

  const outletContext = {
    layoutMode,
    setLayoutMode: updateLayoutMode,
    callsign: user?.callsign || 'UNKNOWN',
    rank: user?.rank || 'AFFILIATE',
    isAdmin,
    source: source || session?.source || 'member',
    sessionUserId: user?.id || null,
  };

  return (
    <div style={{ height: '100vh', background: '#08080A', position: 'relative' }}>
      {/* Ambient bloom */}
      <div style={{ position: 'fixed', bottom: 0, left: 220, right: 0, height: '40vh', background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(192,57,43,0.04), transparent)', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true" />
      <NexusSidebar />
      <div style={{ marginLeft: 220, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <NexusTopbar />
        <main className="nexus-shell-content nexus-fade-in" style={{ position: 'relative', flex: 1, overflow: 'auto', zIndex: 1 }}>
          <AppErrorBoundary compact key={`${location.pathname}${location.search}`}>
            <Outlet context={outletContext} />
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}