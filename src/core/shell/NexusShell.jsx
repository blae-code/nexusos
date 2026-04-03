// NexusOS v1.0 — Production build
import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';
import { useSession } from '@/core/data/SessionContext';
import { getStoredLayoutMode, setStoredLayoutMode } from '@/core/data/layout-mode';
import { preloadCriticalTokens } from '@/core/data/tokenMap';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import AmbientBackground from './components/AmbientBackground';
import { useOperationalState } from './useOperationalState';
import usePresence from '@/core/hooks/usePresence';
import { useTutorial } from '@/core/tutorial/useTutorial';
import TourOverlay from '@/core/tutorial/TourOverlay';
import HelpButton from '@/core/tutorial/HelpButton';
import GettingStartedBanner from '@/core/tutorial/GettingStartedBanner';

export default function NexusShell() {
  const location = useLocation();
  const { session, user, source, isAuthenticated, isAdmin, loading } = useSession();
  useOperationalState();
  usePresence(isAuthenticated);
  const [layoutMode, setLayoutMode] = useState(() => getStoredLayoutMode());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tutorial = useTutorial(user);

  // No auto-launch — tour is opt-in via the Getting Started banner or Help button

  const updateLayoutMode = (nextMode) => {
    setLayoutMode(setStoredLayoutMode(nextMode));
  };
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (user?.rank) {
      preloadCriticalTokens(user.rank, 6);
    }
  }, [user?.rank]);

  // Close sidebar on route change (mobile).
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#08080A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.3, animation: 'pulse 2s ease-in-out infinite' }}>
          <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" opacity="0.4"/>
          <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" opacity="0.55"/>
          <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.85"/>
          <circle cx="22" cy="22" r="3" fill="#E8E4DC"/>
          <line x1="22" y1="2" x2="22" y2="7.5" stroke="#E8E4DC" strokeWidth="1.2" strokeLinecap="round"/>
          <polygon points="22,2 20.2,12 22,10.5 23.8,12" fill="#E8E4DC" opacity="0.9"/>
        </svg>
        <div style={{ fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif", fontSize: 28, color: '#E8E4DC', letterSpacing: '0.08em' }}>NEXUSOS</div>
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#5A5850', letterSpacing: '0.25em', textTransform: 'uppercase' }}>INITIALISING...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = `/?redirect_to=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
    return <Navigate to={redirectTo} replace />;
  }

  if (location.pathname === '/app/keys') {
    return <Navigate to="/app/admin/keys" replace />;
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
      <AmbientBackground />
      <NexusSidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="nexus-main-area" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <NexusTopbar onMenuToggle={toggleSidebar} />
        {/* Getting Started banner — only shown if user hasn't dismissed it */}
        {!tutorial.dismissed && (
          <GettingStartedBanner tutorial={tutorial} />
        )}
        <main className="nexus-shell-content nexus-fade-in" style={{ position: 'relative', flex: 1, overflow: 'auto', zIndex: 1 }}>
          <AppErrorBoundary compact key={`${location.pathname}${location.search}`}>
            <Outlet context={outletContext} />
          </AppErrorBoundary>
        </main>
      </div>

      {/* Tutorial system */}
      {tutorial.tourActive && (
        <TourOverlay
          tourStep={tutorial.tourStep}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTour}
        />
      )}
      <HelpButton
        onStartTour={tutorial.startTour}
        onShowChecklist={tutorial.showChecklist}
        tourComplete={tutorial.tourComplete}
      />
    </div>
  );
}
