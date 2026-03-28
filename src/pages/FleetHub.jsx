import React from 'react';
import { useSearchParams } from 'react-router-dom';
import FleetStatusPanel from '@/components/fleet/FleetStatusPanel';
import FleetDashboard from '@/components/fleet/FleetDashboard';
import FleetRoster from '@/pages/fleet/FleetRoster';
import FleetBuilds from '@/pages/fleet/FleetBuilds';
import FleetReadinessView from '@/pages/fleet/FleetReadinessView';
import CrewScheduler from '@/pages/CrewScheduler';
import ShipLoadoutsTab from '@/pages/fleet/ShipLoadoutsTab';

const TABS = [
  { id: 'status', label: 'FLEET STATUS' },
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'roster', label: 'ROSTER' },
  { id: 'loadouts', label: 'LOADOUTS' },
  { id: 'builds', label: 'BUILDS' },
  { id: 'readiness', label: 'READINESS' },
  { id: 'crew', label: 'CREW' },
];

export default function FleetHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'status';

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'status') next.delete('tab'); else next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', gap: 0, padding: '0 16px',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px', background: 'transparent', border: 'none',
            borderBottom: tab === t.id ? '2px solid #C0392B' : '2px solid transparent',
            color: tab === t.id ? '#E8E4DC' : '#5A5850',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
            cursor: 'pointer', transition: 'color 150ms',
          }}
          onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = '#9A9488'; }}
          onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = '#5A5850'; }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'status' && <FleetStatusPanel />}
        {tab === 'dashboard' && <FleetDashboard />}
        {tab === 'roster' && <FleetRoster />}
        {tab === 'loadouts' && <ShipLoadoutsTab />}
        {tab === 'builds' && <FleetBuilds />}
        {tab === 'readiness' && <FleetReadinessView />}
        {tab === 'crew' && <CrewScheduler />}
      </div>
    </div>
  );
}