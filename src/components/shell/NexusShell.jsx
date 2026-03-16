import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';
import PortraitNavDrawer from './PortraitNavDrawer';
import { withAppBase } from '@/lib/app-base-path';
import { notifyBrowser, useNotificationPreferences } from '@/lib/notification-preferences';
import { loadRescueCalls, refreshRescueCalls, subscribeToRescueCalls } from '@/lib/rescue-board-store';
import { useSession } from '@/lib/SessionContext';
import { getStoredLayoutMode, setStoredLayoutMode } from '@/lib/layout-mode';
import { useVerseStatus } from '@/lib/useVerseStatus';
import { preloadCriticalTokens } from '@/lib/tokenMap';

export default function NexusShell() {
  const location = useLocation();
  const { session, user, source, isAuthenticated, loading } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const { preferences, permission } = useNotificationPreferences();
  const [layoutMode, setLayoutMode] = useState(() => getStoredLayoutMode());
  const [portraitNavOpen, setPortraitNavOpen] = useState(false);
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
        <NexusTopbar
          layoutMode={layoutMode}
          onSelectLayout={updateLayoutMode}
          verseStatus={verseStatus}
          onTogglePortraitNav={() => setPortraitNavOpen(!portraitNavOpen)}
        />
        <PortraitNavDrawer isOpen={portraitNavOpen} onClose={() => setPortraitNavOpen(false)} />
        <div className="nexus-shell-body">
          <NexusSidebar currentPath={location.pathname} currentSearch={location.search} />
          <main className="nexus-shell-content nexus-fade-in">
            <Outlet context={outletContext} />
          </main>
        </div>
      </div>
    </div>
  );
}
