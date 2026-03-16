import React from 'react';
import { X, MapPin, Zap } from 'lucide-react';

/**
 * RouteOverlay — displays optimized route on map with numbered waypoints,
 * estimated yields, travel times, and efficiency metrics.
 */
export default function RouteOverlay({ route, onClose }) {
  if (!route || route.length === 0) return null;

  const {
    route: deposits,
    total_estimated_yield,
    total_travel_minutes,
    route_efficiency,
  } = route;

  const riskColor = {
    LOW: 'var(--live)',
    MEDIUM: 'var(--warn)',
    HIGH: 'var(--warn)',
    EXTREME: 'var(--danger)',
  };

  const systemColors = {
    STANTON: '#4a8fd0',
    PYRO: '#e8a020',
    NYX: '#e04848',
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(7,8,11,0.85)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg1)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} style={{ color: 'var(--info)' }} />
          <span
            style={{
              color: 'var(--t0)',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontWeight: 500,
            }}
          >
            PLANNED ROUTE — {deposits.length} STOP
            {deposits.length > 1 ? 'S' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t2)',
            display: 'flex',
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Summary metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: '10px 16px',
          background: 'var(--bg2)',
          borderBottom: '0.5px solid var(--b0)',
        }}
      >
        {[
          { label: 'EST. YIELD', value: `${total_estimated_yield} SCU` },
          { label: 'TRAVEL TIME', value: `${total_travel_minutes}m` },
          {
            label: 'EFFICIENCY',
            value: `${route_efficiency} SCU/min`,
            color: 'var(--info)',
          },
        ].map((m, i) => (
          <div key={i}>
            <div
              style={{
                color: 'var(--t3)',
                fontSize: 8,
                letterSpacing: '0.12em',
                marginBottom: 3,
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                color: m.color || 'var(--t0)',
                fontSize: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Route list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deposits.map((dep, idx) => (
            <div
              key={dep.deposit_id}
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
              {/* Waypoint marker */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  background: (systemColors[dep.system] || '#5a6080') + '20',
                  border: `0.5px solid ${systemColors[dep.system] || 'var(--b2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: systemColors[dep.system] || 'var(--t1)',
                  fontSize: 13,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {dep.order}
              </div>

              {/* Deposit details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}
                  >
                    {dep.material_name}
                  </span>
                  <span
                    style={{
                      color: riskColor[dep.risk_level],
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      padding: '1px 5px',
                      background: riskColor[dep.risk_level] + '15',
                      border: `0.5px solid ${riskColor[dep.risk_level]}40`,
                      borderRadius: 3,
                    }}
                  >
                    {dep.risk_level}
                  </span>
                </div>

                {/* Location and quality */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    fontSize: 10,
                    color: 'var(--t2)',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={9} />
                    {dep.system} · {dep.location}
                  </div>
                </div>

                {/* Stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto auto auto',
                    gap: 12,
                    fontSize: 9,
                    color: 'var(--t1)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--t3)', marginRight: 4 }}>
                      QUAL
                    </span>
                    {dep.quality_pct}%
                  </div>
                  <div>
                    <span style={{ color: 'var(--t3)', marginRight: 4 }}>
                      VOL
                    </span>
                    {dep.volume_estimate}
                  </div>
                  <div style={{ color: 'var(--live)' }}>
                    <span style={{ color: 'var(--t3)', marginRight: 4 }}>
                      YIELD
                    </span>
                    {dep.estimated_yield_scu} SCU
                  </div>
                  <div style={{ color: 'var(--info)' }}>
                    <span style={{ color: 'var(--t3)', marginRight: 4 }}>
                      TRAVEL
                    </span>
                    {dep.travel_minutes}m
                  </div>
                </div>

                {/* Reporter */}
                {dep.reported_by && (
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>
                    Reported by {dep.reported_by}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}