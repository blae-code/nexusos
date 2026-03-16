import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';
import { useSession } from '@/lib/SessionContext';
import { getStoredLayoutMode, setStoredLayoutMode } from '@/lib/layout-mode';
import { useVerseStatus } from '@/lib/useVerseStatus';

export default function NexusShell() {
  const location = useLocation();
  const { session, user, source, isAuthenticated, loading } = useSession();
  const { status: verseStatus } = useVerseStatus();
  const [layoutMode, setLayoutMode] = useState(() => getStoredLayoutMode());

  const updateLayoutMode = (nextMode) => {
    setLayoutMode(setStoredLayoutMode(nextMode));
  };

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
        <div className="nexus-loading-dots" style={{ color: 'var(--cyan)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = `/gate?redirect_to=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
    return <Navigate to={redirectTo} replace />;
  }

  const isElevated = source === 'admin' || ['PIONEER', 'FOUNDER'].includes(user?.rank);
  if (location.pathname.startsWith('/app/admin') && !isElevated) {
    return <Navigate to="/app/industry" replace />;
  }

  const outletContext = {
    layoutMode,
    setLayoutMode: updateLayoutMode,
    callsign: user?.callsign || 'UNKNOWN',
    rank: user?.rank || 'AFFILIATE',
    discordId: user?.discordId || '',
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
        />
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