import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import RoutePlannerPanel from '@/components/scout/RoutePlannerPanel';
import RouteOverlay from '@/components/scout/RouteOverlay';
import ScoutMap from '@/components/scout/ScoutMap';
import { Compass } from 'lucide-react';

export default function ScoutIntelModule() {
  const [deposits, setDeposits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showPlanner, setShowPlanner] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const allDeposits = await base44.entities.ScoutDeposit.list('-reported_at', 100);
      setDeposits(allDeposits || []);

      // Extract unique materials
      const unique = [
        ...new Set((allDeposits || []).map(d => d.material_name).filter(Boolean)),
      ].sort();
      setMaterials(
        unique.map(name => ({ material_name: name }))
      );
    } catch (err) {
      console.error('Scout Intel load failed:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const systemColors = {
    STANTON: '#4a8fd0',
    PYRO: '#e8a020',
    NYX: '#e04848',
  };

  const riskColor = {
    LOW: 'var(--live)',
    MEDIUM: 'var(--warn)',
    HIGH: 'var(--warn)',
    EXTREME: 'var(--danger)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg1)',
          flexShrink: 0,
        }}
      >
        <Compass size={13} style={{ color: 'var(--info)' }} />
        <span style={{ color: 'var(--t1)', fontSize: 10, letterSpacing: '0.1em' }}>
          SCOUT INTEL — {deposits.length} DEPOSITS
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowPlanner(!showPlanner)}
          className="nexus-btn primary"
          style={{ padding: '5px 12px', fontSize: 10 }}
        >
          {showPlanner ? '✕ CLOSE' : '→ PLAN ROUTE'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative', gap: 0 }}>
        {/* SVG Map */}
        <div style={{ flex: showPlanner ? '0 0 50%' : 1, display: 'flex', flexDirection: 'column', borderRight: showPlanner ? '0.5px solid var(--b1)' : 'none' }}>
          <ScoutMap
            deposits={deposits}
            activeRoute={activeRoute}
            onDepositSelect={dep => {
              // Can add deposit selection behavior here
            }}
          />
        </div>

        {/* Route planner panel */}
        {showPlanner && (
          <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', padding: '12px', overflow: 'auto', background: 'var(--bg0)' }}>
            <RoutePlannerPanel
              materials={materials}
              onRouteGenerated={setActiveRoute}
              onClose={() => setShowPlanner(false)}
            />
          </div>
        )}

        {/* Route overlay (fullscreen) */}
        {activeRoute && !showPlanner && <RouteOverlay route={activeRoute} onClose={() => setActiveRoute(null)} />}
      </div>
    </div>
  );
}