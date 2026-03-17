/**
 * TacticalDisplay — immersive command-centre mini-map for Live Op view.
 *
 * Props:
 *   opData         — op record { system, location, name, phases }
 *   crewPositions  — array of { callsign, role, posX?, posY? }
 *   threats        — array of { id, severity, text, resolved }
 *   currentPhase   — number (0-based index)
 *   onPing         — function(x, y) called when map is clicked in ping mode
 *
 * Layout modes: compact (240×240) | fullscreen (fills container)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Radio } from 'lucide-react';

// ─── Star-system data ─────────────────────────────────────────────────────────

const SYSTEMS = {
  STANTON: {
    label: 'Stanton',
    starColor: '#fffbe8',
    planets: [
      { name: 'Hurston',  orbit: 0.24, angle: 45,  radius: 4,   color: '#8a6a10' },
      { name: 'Crusader', orbit: 0.43, angle: 158, radius: 5.5, color: '#6a8aaa' },
      { name: 'ArcCorp',  orbit: 0.62, angle: 292, radius: 3.5, color: '#9a8870' },
      { name: 'MicroTech',orbit: 0.82, angle: 18,  radius: 3,   color: '#a8c0d0' },
    ],
    belts: [{ orbit: 0.52, count: 28, opacity: 0.18 }],
  },
  PYRO: {
    label: 'Pyro',
    starColor: '#ff5820',
    planets: [
      { name: 'Pyro I',   orbit: 0.18, angle: 30,  radius: 2.8, color: '#cc3818' },
      { name: 'Fuego',    orbit: 0.32, angle: 138, radius: 4.2, color: '#d07020' },
      { name: 'Monox',    orbit: 0.47, angle: 218, radius: 3.0, color: '#888880' },
      { name: 'Bloom',    orbit: 0.60, angle: 308, radius: 3.3, color: '#994020' },
      { name: 'Terminus', orbit: 0.74, angle: 62,  radius: 2.5, color: '#555550' },
      { name: 'Pyro VI',  orbit: 0.88, angle: 180, radius: 2.0, color: '#444440' },
    ],
    belts: [
      { orbit: 0.40, count: 40, opacity: 0.22 },
      { orbit: 0.68, count: 22, opacity: 0.14 },
    ],
  },
  NYX: {
    label: 'Nyx',
    starColor: '#8899aa',
    planets: [
      { name: 'Delamar', orbit: 0.38, angle: 100, radius: 3.3, color: '#7a6b5a' },
      { name: 'Nyx II',  orbit: 0.60, angle: 240, radius: 2.8, color: '#5a5a6a' },
      { name: 'Nyx III', orbit: 0.80, angle: 330, radius: 2.4, color: '#6a6a7a' },
    ],
    belts: [],
  },
};

// ─── Role marker shapes & colours ────────────────────────────────────────────

const ROLE_COLOR = {
  mining:   '#f0aa24',
  escort:   '#e85252',
  scout:    '#5aa2e8',
  support:  '#2edb7a',
  hauler:   '#8898d8',
  refinery: '#5aa2e8',
  combat:   '#e85252',
  salvage:  '#f0aa24',
};

const ROLE_SHAPE = (role) => {
  const r = (role || '').toLowerCase();
  if (r.includes('escort') || r.includes('combat') || r.includes('scout')) return 'triangle';
  if (r.includes('mining') || r.includes('salvage'))                        return 'diamond';
  return 'circle';
};

function roleColor(role) {
  return ROLE_COLOR[(role || '').toLowerCase().split(' ')[0]] || '#6878c0';
}

// ─── Deterministic crew position scatter (when real positions absent) ─────────

function crewPos(idx, total, cx, cy, r) {
  const angle = (idx / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const spread = r * 0.35;
  return {
    x: cx + Math.cos(angle) * spread,
    y: cy + Math.sin(angle) * spread,
  };
}

// ─── Canvas background renderer ──────────────────────────────────────────────

function drawStarSystem(canvas, system, w, h) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy) * 0.88;

  const sys = SYSTEMS[system] || SYSTEMS.STANTON;

  // Orbital paths
  sys.planets.forEach(p => {
    const r = p.orbit * maxR;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,210,230,0.07)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  });

  // Asteroid belt point clouds
  sys.belts.forEach(belt => {
    const r = belt.orbit * maxR;
    for (let i = 0; i < belt.count; i++) {
      const a  = (i / belt.count) * Math.PI * 2 + (i * 0.31);
      const rr = r + (Math.sin(i * 7.3) * 6);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,230,${belt.opacity})`;
      ctx.fill();
    }
  });

  // Planets
  sys.planets.forEach(p => {
    const r   = p.orbit * maxR;
    const rad = (p.angle * Math.PI) / 180;
    const px  = cx + Math.cos(rad) * r;
    const py  = cy + Math.sin(rad) * r * 0.92;
    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);
    ctx.strokeStyle = p.color + '44';
    ctx.lineWidth   = 0.75;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, p.radius - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = p.color + '22';
    ctx.fill();
  });

  // Central star
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
  grad.addColorStop(0, sys.starColor + 'cc');
  grad.addColorStop(1, sys.starColor + '00');
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = sys.starColor + '99';
  ctx.fill();
}

// ─── SVG marker shapes ────────────────────────────────────────────────────────

function TriangleMarker({ cx, cy, color, size = 7 }) {
  const h = size * 0.866;
  const pts = `${cx},${cy - size * 0.6} ${cx - size * 0.5},${cy + h * 0.4} ${cx + size * 0.5},${cy + h * 0.4}`;
  return <polygon points={pts} stroke={color} strokeWidth="0.8" fill={color + '40'}/>;
}

function DiamondMarker({ cx, cy, color, size = 6 }) {
  return (
    <path d={`M ${cx},${cy - size} L ${cx + size},${cy} L ${cx},${cy + size} L ${cx - size},${cy} Z`}
          stroke={color} strokeWidth="0.8" fill={color + '40'}/>
  );
}

function CircleMarker({ cx, cy, color, size = 5 }) {
  return <circle cx={cx} cy={cy} r={size} stroke={color} strokeWidth="0.8" fill={color + '40'}/>;
}

// ─── CSS animation keyframes (injected once) ──────────────────────────────────

const STYLE_ID = 'tactical-display-styles';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes tac-pulse-slow { 0%,100%{opacity:0.08} 50%{opacity:0.16} }
    @keyframes tac-pulse-fast { 0%,100%{opacity:0.25} 50%{opacity:0.55} }
    @keyframes tac-phase-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
    @keyframes tac-ping-ripple {
      0%   { r:4;   opacity:0.8; stroke-width:1.5 }
      60%  { r:22;  opacity:0.3; stroke-width:0.8 }
      100% { r:36;  opacity:0;   stroke-width:0.3 }
    }
    @keyframes tac-threat-pulse {
      0%,100%{ transform:scale(1)  }
      50%    { transform:scale(1.25) }
    }
  `;
  document.head.appendChild(s);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TacticalDisplay({
  opData        = {},
  crewPositions = [],
  threats       = [],
  currentPhase  = 0,
  onPing,
}) {
  const canvasRef    = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pingMode,   setPingMode]   = useState(false);
  const [pings,      setPings]      = useState([]);   // { id, x, y, expires }
  const [hovered,    setHovered]    = useState(null); // crew callsign
  const [dims,       setDims]       = useState({ w: 240, h: 240 });

  const containerRef = useRef(null);

  useEffect(() => { ensureStyles(); }, []);

  // Resolve system from opData
  const system = (opData.system || 'STANTON').toUpperCase();
  const phases = opData.phases || [];

  // Canvas size tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fullscreen]);

  // Draw background
  useEffect(() => {
    drawStarSystem(canvasRef.current, system, dims.w, dims.h);
  }, [system, dims]);

  // Ping expiry sweep
  useEffect(() => {
    if (pings.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setPings(prev => prev.filter(p => p.expires > now));
    }, 1000);
    return () => clearInterval(id);
  }, [pings.length]);

  // Poll pings from opData session_log
  useEffect(() => {
    if (!opData.session_log) return;
    const now = Date.now();
    const freshPings = (opData.session_log || [])
      .filter(e => e.type === 'PING' && e.x != null && e.y != null)
      .map(e => ({
        id:      e.id || `slog-${e.t}`,
        x:       e.x,
        y:       e.y,
        expires: new Date(e.t).getTime() + 30000,
      }))
      .filter(p => p.expires > now);
    if (freshPings.length > 0) {
      setPings(prev => {
        const existing = new Set(prev.map(p => p.id));
        const next = [...prev, ...freshPings.filter(p => !existing.has(p.id))];
        return next;
      });
    }
  }, [opData.session_log]);

  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const mapRadius = Math.min(cx, cy) * 0.88;

  // Op zone polygon (hexagon centered on op area)
  const opZoneR  = mapRadius * 0.32;
  const opZoneCx = cx;
  const opZoneCy = cy;
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    return `${opZoneCx + Math.cos(a) * opZoneR},${opZoneCy + Math.sin(a) * opZoneR}`;
  }).join(' ');

  // Crew marker positions
  const resolvedCrew = crewPositions.map((m, i) => {
    const pos = crewPos(i, crewPositions.length, opZoneCx, opZoneCy, opZoneR);
    return { ...m, px: m.posX != null ? m.posX : pos.x, py: m.posY != null ? m.posY : pos.y };
  });

  // Active threats (not resolved)
  const activeThreats = threats.filter(t => !t.resolved);

  const handleMapClick = useCallback((e) => {
    if (!pingMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ping = { id: `ping-${Date.now()}`, x, y, expires: Date.now() + 30000 };
    setPings(prev => [...prev, ping]);
    setPingMode(false);
    onPing?.(x / dims.w, y / dims.h);
  }, [pingMode, dims, onPing]);

  const compactMode = !fullscreen;
  const containerStyle = compactMode
    ? { width: 240, height: 240, flexShrink: 0 }
    : { width: '100%', height: '100%', minHeight: 400 };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: 'var(--bg0)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
        ...containerStyle,
      }}
    >
      {/* Canvas background — star system */}
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      />

      {/* SVG interactive overlay */}
      <svg
        width={dims.w}
        height={dims.h}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: pingMode ? 'crosshair' : 'default',
        }}
        onClick={handleMapClick}
      >
        {/* Op zone polygon */}
        <polygon
          points={hexPoints}
          fill="rgba(104,120,192,0.08)"
          stroke="var(--acc)"
          strokeWidth="0.5"
          style={{ animation: 'tac-pulse-slow 3s ease-in-out infinite' }}
        />

        {/* Op zone label */}
        {!compactMode && (
          <text
            x={opZoneCx}
            y={opZoneCy - opZoneR - 6}
            textAnchor="middle"
            fill="var(--acc)"
            fontSize="8"
            opacity="0.65"
            fontFamily="var(--font)"
            letterSpacing="0.1em"
          >
            {(opData.name || 'OP ZONE').toUpperCase()}
          </text>
        )}

        {/* Crew position markers */}
        {resolvedCrew.map((m, i) => {
          const col   = roleColor(m.role);
          const shape = ROLE_SHAPE(m.role);
          const isHov = hovered === m.callsign;
          return (
            <g
              key={m.callsign || i}
              onMouseEnter={() => setHovered(m.callsign)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              {shape === 'triangle' && <TriangleMarker cx={m.px} cy={m.py} color={col} size={isHov ? 9 : 7}/>}
              {shape === 'diamond'  && <DiamondMarker  cx={m.px} cy={m.py} color={col} size={isHov ? 8 : 6}/>}
              {shape === 'circle'   && <CircleMarker   cx={m.px} cy={m.py} color={col} size={isHov ? 7 : 5}/>}
              {isHov && (
                <text
                  x={m.px}
                  y={m.py - 12}
                  textAnchor="middle"
                  fill={col}
                  fontSize="8"
                  fontFamily="var(--font)"
                  letterSpacing="0.08em"
                >
                  {m.callsign}
                </text>
              )}
            </g>
          );
        })}

        {/* Threat markers */}
        {activeThreats.map((t, i) => {
          const isHigh = t.severity === 'HIGH' || t.severity === 'CRITICAL';
          const sz     = isHigh ? 10 : 7;
          const tx     = cx + (i % 3 - 1) * 40 + 20;
          const ty     = cy - opZoneR - 20 - Math.floor(i / 3) * 24;
          return (
            <g
              key={t.id}
              style={{ cursor: 'pointer', animation: isHigh ? 'tac-threat-pulse 0.9s ease-in-out infinite' : undefined }}
              title={t.text}
            >
              <path
                d={`M ${tx},${ty - sz} L ${tx + sz},${ty} L ${tx},${ty + sz} L ${tx - sz},${ty} Z`}
                stroke="var(--danger)"
                strokeWidth="0.8"
                fill="rgba(232,82,82,0.25)"
              />
              <text
                x={tx}
                y={ty + sz + 10}
                textAnchor="middle"
                fill="var(--danger)"
                fontSize="7"
                fontFamily="var(--font)"
                opacity="0.7"
              >
                {t.severity?.[0] || '!'}
              </text>
            </g>
          );
        })}

        {/* Ping markers — animated ripple */}
        {pings.map(p => (
          <g key={p.id}>
            <circle
              cx={p.x} cy={p.y}
              fill="none"
              stroke="var(--warn)"
              strokeWidth="1.5"
              style={{ animation: 'tac-ping-ripple 1.2s ease-out forwards' }}
            />
            <circle cx={p.x} cy={p.y} r="2.5" fill="rgba(240,170,36,0.8)"/>
          </g>
        ))}
      </svg>

      {/* Phase timeline — bottom strip */}
      {phases.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            display: 'flex',
            background: 'rgba(var(--bg0-rgb), 0.75)',
            borderTop: '0.5px solid var(--b1)',
          }}
        >
          {phases.map((phase, i) => {
            const done   = i < currentPhase;
            const active = i === currentPhase;
            return (
              <div
                key={i}
                title={phase.title || `Phase ${i + 1}`}
                style={{
                  flex: 1,
                  borderRight: '0.5px solid var(--b0)',
                  background: done
                    ? 'rgba(46,219,122,0.22)'
                    : active
                      ? 'rgba(104,120,192,0.18)'
                      : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: active ? 'tac-phase-pulse 1.8s ease-in-out infinite' : undefined,
                }}
              >
                <div
                  style={{
                    width: '60%',
                    height: 2,
                    borderRadius: 1,
                    background: done
                      ? 'var(--live)'
                      : active
                        ? 'var(--acc)'
                        : 'var(--b1)',
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* HUD overlay — top strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
          background: 'rgba(var(--bg0-rgb), 0.7)',
          borderBottom: '0.5px solid var(--b1)',
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--live)',
            flexShrink: 0,
            animation: 'pulse-dot 2.5s ease-in-out infinite',
          }}
        />
        <span style={{ color: 'var(--t2)', fontSize: 8, letterSpacing: '0.12em', flex: 1 }}>
          {(SYSTEMS[system]?.label || system).toUpperCase()}
        </span>
        <span style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.08em' }}>
          {crewPositions.length} CREW
        </span>

        {/* Controls */}
        <button
          onClick={() => setPingMode(p => !p)}
          style={{
            background: pingMode ? 'rgba(240,170,36,0.15)' : 'transparent',
            border: `0.5px solid ${pingMode ? 'rgba(240,170,36,0.4)' : 'transparent'}`,
            borderRadius: 3,
            padding: '1px 4px',
            cursor: 'pointer',
            color: pingMode ? 'var(--warn)' : 'var(--t2)',
            display: 'flex',
            alignItems: 'center',
          }}
          title={pingMode ? 'Click map to place ping' : 'Ping mode'}
        >
          <Radio size={9}/>
        </button>
        <button
          onClick={() => setFullscreen(f => !f)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t2)',
            display: 'flex',
            alignItems: 'center',
            padding: 1,
          }}
        >
          {fullscreen ? <Minimize2 size={9}/> : <Maximize2 size={9}/>}
        </button>
      </div>

      {/* Ping mode banner */}
      {pingMode && (
        <div
          style={{
            position: 'absolute',
            bottom: phases.length > 0 ? 30 : 6,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(240,170,36,0.12)',
            border: '0.5px solid rgba(240,170,36,0.3)',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 8,
            color: 'var(--warn)',
            letterSpacing: '0.1em',
            pointerEvents: 'none',
          }}
        >
          CLICK TO PING — AUTO-EXPIRES 30s
        </div>
      )}
    </div>
  );
}
