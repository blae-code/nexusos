import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import RoutePlannerPanel from '@/components/scout/RoutePlannerPanel';
import RouteOverlay from '@/components/scout/RouteOverlay';
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
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
        {/* Main deposit list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div className="nexus-loading-dots"><span /><span /><span /></div>
            </div>
          ) : deposits.length === 0 ? (
            <div style={{ color: 'var(--t2)', fontSize: 11, textAlign: 'center', marginTop: 40 }}>
              No scout deposits logged yet
            </div>
          ) : (
            deposits.map(dep => (
              <div
                key={dep.id}
                style={{
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                {/* System badge */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: (systemColors[dep.system_name] || '#5a6080') + '20',
                    border: `0.5px solid ${systemColors[dep.system_name] || 'var(--b2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: systemColors[dep.system_name] || 'var(--t1)',
                    fontSize: 9,
                    fontWeight: 500,
                    flexShrink: 0,
                    letterSpacing: '0.1em',
                  }}
                >
                  {(dep.system_name || 'STAN').substring(0, 3).toUpperCase()}
                </div>

                {/* Deposit info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>
                      {dep.material_name}
                    </span>
                    <span
                      style={{
                        color: riskColor[dep.risk_level],
                        fontSize: 8,
                        letterSpacing: '0.08em',
                        padding: '1px 5px',
                        background: riskColor[dep.risk_level] + '15',
                        border: `0.5px solid ${riskColor[dep.risk_level]}40`,
                        borderRadius: 3,
                      }}
                    >
                      {dep.risk_level}
                    </span>
                  </div>

                  <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 3 }}>
                    {dep.location_detail || 'Unknown location'}
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 9, color: 'var(--t1)' }}>
                    <span>
                      <span style={{ color: 'var(--t3)', marginRight: 3 }}>QUAL</span>
                      {dep.quality_pct}%
                    </span>
                    <span>
                      <span style={{ color: 'var(--t3)', marginRight: 3 }}>VOL</span>
                      {dep.volume_estimate}
                    </span>
                    <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: 8 }}>
                      {dep.reported_by_callsign || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Route planner panel */}
        {showPlanner && (
          <div style={{ width: 280, borderLeft: '0.5px solid var(--b1)', padding: '12px', overflow: 'auto', background: 'var(--bg0)', flexShrink: 0 }}>
            <RoutePlannerPanel
              materials={materials}
              onRouteGenerated={setActiveRoute}
              onClose={() => setShowPlanner(false)}
            />
          </div>
        )}

        {/* Route overlay */}
        {activeRoute && <RouteOverlay route={activeRoute} onClose={() => setActiveRoute(null)} />}
      </div>
    </div>
  );
}