import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import NexusSidebar from './NexusSidebar';
import NexusTopbar from './NexusTopbar';

export default function NexusShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [layoutMode, setLayoutMode] = useState('alt-tab');
  const [ready, setReady] = useState(false);

  // Auth gate — allow nexus_session (org members) OR Base44 native admin session
  useEffect(() => {
    const nexusSession = localStorage.getItem('nexus_session');
    if (nexusSession) return; // already authed as org member

    base44.auth.me().then(user => {
      if (user) {
        if (!localStorage.getItem('nexus_callsign')) {
          localStorage.setItem('nexus_callsign', 'SYS-ADMIN');
          localStorage.setItem('nexus_rank', 'PIONEER');
        }
      } else {
        navigate('/gate');
      }
    }).catch(() => navigate('/gate'));
  }, []);

  const callsign = localStorage.getItem('nexus_callsign') || 'SYS-ADMIN';
  const rank = localStorage.getItem('nexus_rank') || 'PIONEER';

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