import React, { useMemo, useState } from 'react';
import { Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

const SYSTEM_DATA = {
  STANTON: { x: 50, y: 50, color: 'var(--info)',   label: 'STANTON' },
  PYRO:    { x: 75, y: 30, color: 'var(--warn)',   label: 'PYRO' },
  NYX:     { x: 25, y: 70, color: 'var(--danger)', label: 'NYX' },
};

const RISK_COLORS = {
  LOW:     'var(--live)',
  MEDIUM:  'var(--warn)',
  HIGH:    'var(--warn)',
  EXTREME: 'var(--danger)',
};

const VOLUME_SIZE = {
  SMALL: 4,
  MEDIUM: 6,
  LARGE: 8,
  MASSIVE: 10,
};

export default function ScoutMap({ deposits = [], activeRoute = null, onDepositSelect }) {
  const [zoom, setZoom] = useState(1);
  const [hoveredDeposit, setHoveredDeposit] = useState(null);
  const svgRef = React.useRef(null);

  // Group deposits by system
  const depositsBySystem = useMemo(() => {
    const grouped = { STANTON: [], PYRO: [], NYX: [] };
    deposits.forEach(d => {
      const system = d.system_name || 'STANTON';
      if (grouped[system]) {
        grouped[system].push(d);
      }
    });
    return grouped;
  }, [deposits]);

  // Calculate scaled coordinates
  const scale = (value) => value * zoom;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Controls */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setZoom(z => Math.max(0.8, z - 0.2))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '0.5px solid var(--b2)',
            background: 'var(--bg2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--t1)',
          }}
        >
          <ZoomOut size={13} />
        </button>
        <div style={{ color: 'var(--t2)', fontSize: 9, fontFamily: 'monospace' }}>
          {(zoom * 100).toFixed(0)}%
        </div>
        <button
          onClick={() => setZoom(z => Math.min(2, z + 0.2))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '0.5px solid var(--b2)',
            background: 'var(--bg2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--t1)',
          }}
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => setZoom(1)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '0.5px solid var(--b1)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--t2)',
          }}
        >
          <Crosshair size={13} />
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em' }}>
          {deposits.length} DEPOSITS
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={svgRef}
        style={{
          flex: 1,
          border: '0.5px solid var(--b1)',
          borderRadius: 6,
          background: 'var(--bg2)',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '100%',
            minWidth: '300px',
            minHeight: '300px',
          }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--b0)" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="var(--bg2)" />
          <rect width="100" height="100" fill="url(#grid)" />

          {/* System nodes and connections */}
          {Object.entries(SYSTEM_DATA).map(([systemId, system]) => (
            <g key={systemId}>
              {/* System glow */}
              <circle
                cx={system.x}
                cy={system.y}
                r="8"
                fill={system.color}
                opacity="0.15"
              />
              {/* System point */}
              <circle
                cx={system.x}
                cy={system.y}
                r="3"
                fill={system.color}
                stroke={system.color}
                strokeWidth="0.5"
              />
              {/* System label */}
              <text
                x={system.x}
                y={system.y - 6}
                textAnchor="middle"
                fill={system.color}
                fontSize="3.5"
                fontWeight="500"
                letterSpacing="0.2"
              >
                {system.label.substring(0, 3)}
              </text>
            </g>
          ))}

          {/* Deposits as points */}
          {Object.entries(depositsBySystem).map(([systemId, systemDeposits]) => {
            const systemPos = SYSTEM_DATA[systemId];
            if (!systemPos) return null;

            return systemDeposits.map((deposit, idx) => {
              const isHovered = hoveredDeposit?.id === deposit.id;
              const isStale = deposit.is_stale;
              const color = RISK_COLORS[deposit.risk_level] || 'var(--info)';
              const size = VOLUME_SIZE[deposit.volume_estimate] || 5;

              // Scatter deposits around system center with slight offset
              const offsetAngle = (idx / systemDeposits.length) * Math.PI * 2;
              const offsetDist = 5 + (Math.random() * 3);
              const x = systemPos.x + Math.cos(offsetAngle) * offsetDist;
              const y = systemPos.y + Math.sin(offsetAngle) * offsetDist;

              return (
                <g
                  key={deposit.id}
                  style={{
                    cursor: 'pointer',
                    opacity: isStale ? 0.4 : 1,
                  }}
                  onMouseEnter={() => setHoveredDeposit(deposit)}
                  onMouseLeave={() => setHoveredDeposit(null)}
                  onClick={() => onDepositSelect?.(deposit)}
                >
                  {/* Deposit glow (hovered) */}
                  {isHovered && (
                    <circle
                      cx={x}
                      cy={y}
                      r={size + 3}
                      fill={color}
                      opacity="0.25"
                    />
                  )}

                  {/* Deposit point */}
                  <circle
                    cx={x}
                    cy={y}
                    r={size}
                    fill={color}
                    opacity={isHovered ? 1 : 0.8}
                    stroke={color}
                    strokeWidth="0.3"
                  />

                  {/* Stale indicator */}
                  {isStale && (
                    <circle
                      cx={x}
                      cy={y}
                      r={size}
                      fill="none"
                      stroke="var(--t2)"
                      strokeWidth="0.2"
                      strokeDasharray="1,1"
                    />
                  )}

                  {/* Hover label */}
                  {isHovered && (
                    <text
                      x={x}
                      y={y - size - 2}
                      textAnchor="middle"
                      fill="var(--t0)"
                      fontSize="2.5"
                      fontWeight="500"
                      pointerEvents="none"
                    >
                      {deposit.material_name.substring(0, 8)}
                    </text>
                  )}
                </g>
              );
            });
          })}

          {/* Route waypoints and connections */}
          {activeRoute?.deposit_sequence && activeRoute.deposit_sequence.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Route lines */}
              {activeRoute.deposit_sequence.map((waypoint, idx) => {
                if (idx === 0) return null;

                const curr = SYSTEM_DATA[waypoint.system];
                const prev = SYSTEM_DATA[activeRoute.deposit_sequence[idx - 1].system];

                if (!curr || !prev) return null;

                return (
                  <line
                    key={`route-line-${idx}`}
                    x1={prev.x}
                    y1={prev.y}
                    x2={curr.x}
                    y2={curr.y}
                    stroke="var(--info)"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                    opacity="0.6"
                  />
                );
              })}

              {/* Waypoint indicators */}
              {activeRoute.deposit_sequence.map((waypoint, idx) => {
                const systemPos = SYSTEM_DATA[waypoint.system];
                if (!systemPos) return null;

                return (
                  <g key={`waypoint-${idx}`}>
                    {/* Waypoint number circle */}
                    <circle
                      cx={systemPos.x}
                      cy={systemPos.y}
                      r="2.5"
                      fill="var(--live)"
                      stroke="var(--bg2)"
                      strokeWidth="0.3"
                    />
                    {/* Number */}
                    <text
                      x={systemPos.x}
                      y={systemPos.y + 0.8}
                      textAnchor="middle"
                      fill="var(--bg0)"
                      fontSize="2"
                      fontWeight="500"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Deposit Legend */}
      {hoveredDeposit && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--bg1)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            fontSize: 9,
          }}
        >
          <div style={{ color: 'var(--t0)', fontWeight: 500, marginBottom: 4 }}>
            {hoveredDeposit.material_name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 8 }}>
            <div>
              <span style={{ color: 'var(--t3)' }}>QUALITY</span>
              <div style={{ color: 'var(--t0)', marginTop: 2 }}>{hoveredDeposit.quality_pct}%</div>
            </div>
            <div>
              <span style={{ color: 'var(--t3)' }}>VOLUME</span>
              <div style={{ color: 'var(--t0)', marginTop: 2 }}>{hoveredDeposit.volume_estimate}</div>
            </div>
            <div>
              <span style={{ color: 'var(--t3)' }}>RISK</span>
              <div style={{ color: RISK_COLORS[hoveredDeposit.risk_level], marginTop: 2 }}>
                {hoveredDeposit.risk_level}
              </div>
            </div>
          </div>
          {hoveredDeposit.location_detail && (
            <div style={{ marginTop: 6, color: 'var(--t2)' }}>
              📍 {hoveredDeposit.location_detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
