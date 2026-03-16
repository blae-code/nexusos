import React from 'react';
import { X, MapPin, Clock, Zap } from 'lucide-react';

const SYSTEM_COORDS = {
  STANTON: { x: 50, y: 50 },
  PYRO: { x: 75, y: 30 },
  NYX: { x: 25, y: 70 },
};

export default function RouteOverlay({ route, onClose }) {
  const { route: waypoints = [], estimated_yield_scu = 0, estimated_total_minutes = 0, efficiency_note = '' } = route;

  if (!waypoints || waypoints.length === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7,8,11,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <div
          style={{
            background: 'var(--bg1)',
            border: '0.5px solid var(--b2)',
            borderRadius: 8,
            padding: 20,
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          <div style={{ color: 'var(--t1)', fontSize: 11, marginBottom: 12 }}>
            No viable deposits found matching your criteria.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              background: 'var(--bg2)',
              border: '0.5px solid var(--b1)',
              borderRadius: 4,
              color: 'var(--t1)',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(7,8,11,0.95)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--b1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg1)',
          flexShrink: 0,
        }}
      >
        <div style={{ color: 'var(--info)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 500 }}>
          OPTIMISED ROUTE PLAN
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t2)',
            display: 'flex',
            padding: '2px 4px',
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>
        {/* Map SVG */}
        <div style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
          <svg
            viewBox="0 0 100 100"
            style={{ width: '100%', maxWidth: 400, height: 'auto', border: '0.5px solid var(--b1)', borderRadius: 8 }}
          >
            {/* Background */}
            <rect width="100" height="100" fill="var(--bg2)" />

            {/* System nodes */}
            {Object.entries(SYSTEM_COORDS).map(([system, { x, y }]) => (
              <g key={system}>
                <circle cx={x} cy={y} r="3" fill={
                  system === 'STANTON' ? '#4a8fd0' :
                  system === 'PYRO' ? '#e8a020' :
                  '#e04848'
                } />
                <text x={x} y={y - 6} textAnchor="middle" fill="var(--t2)" fontSize="6">
                  {system.substring(0, 3)}
                </text>
              </g>
            ))}

            {/* Route lines */}
            {waypoints.map((wp, i) => {
              if (i === 0) return null;
              const curr = SYSTEM_COORDS[waypoints[i].system] || SYSTEM_COORDS.STANTON;
              const prev = SYSTEM_COORDS[waypoints[i - 1].system] || SYSTEM_COORDS.STANTON;
              return (
                <line
                  key={`line-${i}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={curr.x}
                  y2={curr.y}
                  stroke="var(--info)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Waypoints */}
            {waypoints.map((wp) => {
              const coord = SYSTEM_COORDS[wp.system] || SYSTEM_COORDS.STANTON;
              return (
                <g key={`wp-${wp.waypoint}`}>
                  <circle cx={coord.x} cy={coord.y} r="4" fill="var(--live)" />
                  <text x={coord.x} y={coord.y + 1} textAnchor="middle" fill="var(--bg0)" fontSize="5" fontWeight="500">
                    {wp.waypoint}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Route details */}
        <div
          style={{
            width: 280,
            borderLeft: '0.5px solid var(--b1)',
            padding: 12,
            overflow: 'auto',
            background: 'var(--bg1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 3 }}>
                YIELD
              </div>
              <div style={{ color: 'var(--live)', fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>
                {estimated_yield_scu.toFixed(0)} SCU
              </div>
            </div>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 3 }}>
                TIME
              </div>
              <div style={{ color: 'var(--info)', fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>
                {estimated_total_minutes}m
              </div>
            </div>
          </div>

          {/* Efficiency note */}
          {efficiency_note && (
            <div style={{ fontSize: 9, color: 'var(--t2)', lineHeight: 1.5, paddingLeft: 8, borderLeft: '2px solid var(--warn)' }}>
              {efficiency_note}
            </div>
          )}

          {/* Waypoint list */}
          <div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 8 }}>
              WAYPOINTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {waypoints.map((wp) => (
                <div
                  key={wp.waypoint}
                  style={{
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--b1)',
                    borderRadius: 5,
                    padding: '8px 10px',
                    fontSize: 9,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--live)',
                        color: 'var(--bg0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {wp.waypoint}
                    </div>
                    <div style={{ color: 'var(--t0)', fontWeight: 500 }}>{wp.location}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 8, color: 'var(--t2)' }}>
                    <span>{wp.quality_pct}% Q</span>
                    <span>{wp.volume_estimate}</span>
                    <span style={{ color: wp.risk_level === 'EXTREME' ? 'var(--danger)' : wp.risk_level === 'HIGH' ? 'var(--warn)' : 'var(--live)' }}>
                      {wp.risk_level}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--t3)', fontSize: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={9} />
                    {wp.estimated_minutes}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}