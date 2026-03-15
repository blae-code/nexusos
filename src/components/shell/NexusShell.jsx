import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';

export default function NexusShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [layoutMode, setLayoutMode] = useState('alt-tab'); // 'alt-tab' | '2nd-monitor'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth gate
  useEffect(() => {
    const session = localStorage.getItem('nexus_session');
    const isAdminRoute = location.pathname.startsWith('/admin');
    if (!session && !isAdminRoute) {
      navigate('/gate');
    }
  }, [location.pathname, navigate]);

  const callsign = localStorage.getItem('nexus_callsign') || 'UNKNOWN';
  const rank = localStorage.getItem('nexus_rank') || 'VAGRANT';

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'var(--bg0)' }}
    >
      <NexusSidebar currentPath={location.pathname} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <NexusTopbar
          callsign={callsign}
          rank={rank}
          layoutMode={layoutMode}
          onToggleLayout={() => setLayoutMode(m => m === 'alt-tab' ? '2nd-monitor' : 'alt-tab')}
          currentPath={location.pathname}
        />
        <main
          className="flex-1 overflow-auto nexus-fade-in"
          style={{ background: 'var(--bg0)' }}
        >
          <Outlet context={{ layoutMode, callsign, rank }} />
        </main>
      </div>
    </div>
  );
}