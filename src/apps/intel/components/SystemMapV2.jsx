/**
 * SystemMapV2 — navigation-computer-style tactical star map for INTEL.
 *
 * Props:
 *   deposits  — array of ScoutDeposit records (optional)
 *   system    — initial system string ('STANTON' | 'PYRO' | 'NYX')
 *   onDeposit — function(deposit) called when deposit marker is selected
 *
 * Replaces SystemMap.jsx with:
 *   · Three fully-specified system SVGs (Stanton, Pyro, Nyx)
 *   · MFD chrome (top bar, rails, bottom bar)
 *   · Warp jump animation (600ms, stars-streak effect)
 *   · Route planning overlay (click two points → dashed warn line)
 *   · Deposit markers with decay opacity, size/color scaling, cluster detection
 *   · Animated ping on fresh deposits
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Navigation, X, ZoomIn, ZoomOut } from 'lucide-react';

// ─── System definitions ───────────────────────────────────────────────────────

const SYSTEMS = {
  STANTON: {
    label:      'Stanton',
    starType:   'G-TYPE MAIN SEQUENCE',
    security:   'HIGH',
    secColor:   'var(--live)',
    starColor:  '#fffbe8',
    starRadius: 8,
    bodies: [
      { id: 'hurston',   name: 'Hurston',  type: 'planet', orbit: 0.22, angle: 45,  r: 5,   color: '#8a6a10' },
      { id: 'crusader',  name: 'Crusader', type: 'planet', orbit: 0.40, angle: 158, r: 6,   color: '#5a7a9a' },
      { id: 'arccorp',   name: 'ArcCorp',  type: 'planet', orbit: 0.60, angle: 292, r: 4.5, color: '#8a7860' },
      { id: 'microtech', name: 'MicroTech',type: 'planet', orbit: 0.80, angle: 18,  r: 4,   color: '#90b0c0' },
    ],
    lagrange: [
      { orbit: 0.22, angle: 45+60,  r: 1.5 },
      { orbit: 0.22, angle: 45-60,  r: 1.5 },
      { orbit: 0.40, angle: 158+60, r: 1.5 },
    ],
    jumpPoints: [
      { angle: 10,  label: '→ Pyro'   },
      { angle: 110, label: '→ Nyx'    },
      { angle: 200, label: '→ Magnus' },
    ],
    belts: [{ orbit: 0.50, count: 32, spread: 0.04 }],
  },
  PYRO: {
    label:      'Pyro',
    starType:   'RED DWARF / UNSTABLE',
    security:   'LAWLESS',
    secColor:   'var(--danger)',
    starColor:  '#ff4412',
    starRadius: 10,
    bodies: [
      { id: 'pyro1',    name: 'Pyro I',   type: 'planet', orbit: 0.16, angle: 28,  r: 3,   color: '#cc3010' },
      { id: 'fuego',    name: 'Fuego',    type: 'planet', orbit: 0.30, angle: 135, r: 5,   color: '#d06018' },
      { id: 'monox',    name: 'Monox',    type: 'planet', orbit: 0.44, angle: 214, r: 3.5, color: '#787874' },
      { id: 'bloom',    name: 'Bloom',    type: 'planet', orbit: 0.57, angle: 302, r: 4,   color: '#883816' },
      { id: 'terminus', name: 'Terminus', type: 'planet', orbit: 0.72, angle: 58,  r: 3,   color: '#484844' },
      { id: 'pyro6',    name: 'Pyro VI',  type: 'planet', orbit: 0.88, angle: 178, r: 2.5, color: '#3c3c38' },
    ],
    lagrange:   [],
    jumpPoints: [
      { angle: 355, label: '→ Stanton' },
      { angle: 190, label: '→ Nyx'     },
    ],
    belts: [
      { orbit: 0.38, count: 50, spread: 0.06 },
      { orbit: 0.65, count: 28, spread: 0.04 },
    ],
    distortionRings: [14, 22, 32],
  },
  NYX: {
    label:      'Nyx',
    starType:   'M-TYPE SUBDWARF',
    security:   'CONTESTED',
    secColor:   'var(--warn)',
    starColor:  '#7888aa',
    starRadius: 6,
    bodies: [
      { id: 'delamar', name: 'Delamar', type: 'planet', orbit: 0.36, angle: 98,  r: 4,   color: '#706050' },
      { id: 'nyx2',    name: 'Nyx II',  type: 'planet', orbit: 0.58, angle: 238, r: 3.5, color: '#504858' },
      { id: 'nyx3',    name: 'Nyx III', type: 'planet', orbit: 0.78, angle: 326, r: 3,   color: '#585860' },
    ],
    lagrange:   [],
    jumpPoints: [
      { angle: 60,  label: '→ Stanton' },
      { angle: 185, label: '→ Pyro'    },
    ],
    belts: [],
  },
};

// ─── Quality → color ──────────────────────────────────────────────────────────

function qualityColor(q) {
  if (q >= 80) return '#2edb7a';
  if (q >= 60) return '#f0aa24';
  return '#888890';
}

function seededRand(seed, idx) {
  const x = Math.sin(seed * 9301 + idx * 49297 + 233720) * 93140;
  return x - Math.floor(x);
}

// ─── Warp animation styles ────────────────────────────────────────────────────

const WARP_STYLE_ID = 'systemmap-v2-styles';
function ensureStyles() {
  if (document.getElementById(WARP_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = WARP_STYLE_ID;
  s.textContent = `
    @keyframes smv2-warp-in {
      0%   { opacity:0; transform:scale(1.4) }
      30%  { opacity:1; transform:scale(1.02) }
      100% { opacity:1; transform:scale(1) }
    }
    @keyframes smv2-warp-flash {
      0%,100%{ opacity:0 }
      40%,60%{ opacity:1 }
    }
    @keyframes smv2-deposit-ping {
      0%   { r:4; opacity:0.7 }
      100% { r:18; opacity:0 }
    }
    @keyframes smv2-distort {
      0%,100%{ opacity:0.04 }
      50%    { opacity:0.10 }
    }
  `;
  document.head.appendChild(s);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SecurityBadge({ status, color }) {
  return (
    <span style={{
      fontSize: 8, padding: '1px 5px', borderRadius: 3,
      border: `0.5px solid ${color}`, color,
      letterSpacing: '0.1em', background: 'transparent',
    }}>
      {status}
    </span>
  );
}

function BodyListItem({ body, onZoom }) {
  return (
    <button
      onClick={() => onZoom(body)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', width: '100%',
        background: 'transparent', border: 'none',
        cursor: 'pointer', textAlign: 'left',
        borderBottom: '0.5px solid var(--b0)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: body.color || 'var(--t3)', flexShrink: 0 }}/>
      <span style={{ fontSize: 9, color: 'var(--t1)', letterSpacing: '0.06em' }}>{body.name}</span>
      <ChevronRight size={8} style={{ color: 'var(--t3)', marginLeft: 'auto' }}/>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SystemMapV2({ deposits = [], system: initSystem = 'STANTON', onDeposit }) {
  const [activeSystem, setActiveSystem] = useState(initSystem.toUpperCase());
  const [warping,      setWarping]      = useState(false);
  const [warpFlash,    setWarpFlash]    = useState(false);
  const [selectedBody, setSelectedBody] = useState(null);
  const [routePoints,  setRoutePoints]  = useState([]);  // [{x,y}, {x,y}]
  const [routeMode,    setRouteMode]    = useState(false);
  const [svgSize,      setSvgSize]      = useState({ w: 600, h: 480 });
  const svgRef    = useRef(null);
  const wrapRef   = useRef(null);

  useEffect(() => { ensureStyles(); }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSvgSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const switchSystem = useCallback((key) => {
    if (key === activeSystem || warping) return;
    setWarpFlash(true);
    setTimeout(() => {
      setWarping(true);
      setActiveSystem(key);
      setTimeout(() => { setWarping(false); setWarpFlash(false); }, 600);
    }, 200);
  }, [activeSystem, warping]);

  const sys  = SYSTEMS[activeSystem] || SYSTEMS.STANTON;
  const cx   = svgSize.w / 2;
  const cy   = svgSize.h / 2;
  const maxR = Math.min(cx, cy) * 0.82;

  // Compute body screen positions
  const bodyPositions = sys.bodies.map(b => {
    const r   = b.orbit * maxR;
    const rad = (b.angle * Math.PI) / 180;
    return { ...b, sx: cx + Math.cos(rad) * r, sy: cy + Math.sin(rad) * r * 0.92 };
  });

  // Deposit marker positions (seeded scatter)
  const depositMarkers = deposits
    .filter(d => (d.system_name || '').toUpperCase() === activeSystem)
    .map((d, idx) => {
      const seed   = (d.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const angle  = seededRand(seed, 0) * Math.PI * 2;
      const dist   = 0.1 + seededRand(seed, 1) * 0.7;
      const r      = dist * maxR;
      const age    = d.reported_at ? (Date.now() - new Date(d.reported_at)) / (1000 * 60 * 60 * 24) : 7;
      const opacity = Math.max(0.15, 1 - age / 14);
      const isFresh = age < 1;
      const q       = d.quality_score || 50;
      const mRadius = 3 + (q / 100) * 6;
      return {
        key: d.id || idx,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.92,
        color: qualityColor(q),
        opacity,
        radius: mRadius,
        isFresh,
        data: d,
      };
    });

  // Route planning
  const handleSvgClick = useCallback((e) => {
    if (!routeMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt   = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRoutePoints(prev => prev.length >= 2 ? [pt] : [...prev, pt]);
  }, [routeMode]);

  const routePath = routePoints.length === 2
    ? `M ${routePoints[0].x} ${routePoints[0].y} L ${routePoints[1].x} ${routePoints[1].y}`
    : null;
  const routeDist = routePoints.length === 2
    ? Math.hypot(routePoints[1].x - routePoints[0].x, routePoints[1].y - routePoints[0].y)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg0)' }}>

      {/* ── Top bar: MFD chrome ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)', flexShrink: 0,
      }}>
        <span style={{ color: 'var(--t0)', fontSize: 10, letterSpacing: '0.15em', fontWeight: 500 }}>
          {sys.label.toUpperCase()}
        </span>
        <span style={{ color: 'var(--t3)', fontSize: 8 }}>{sys.starType}</span>
        <SecurityBadge status={sys.security} color={sys.secColor}/>
        <div style={{ flex: 1 }}/>
        {/* System switcher */}
        {Object.keys(SYSTEMS).map(key => (
          <button
            key={key}
            onClick={() => switchSystem(key)}
            style={{
              fontSize: 8, padding: '3px 8px', cursor: 'pointer',
              background: activeSystem === key ? 'var(--bg3)' : 'transparent',
              border: `0.5px solid ${activeSystem === key ? 'var(--b2)' : 'transparent'}`,
              borderRadius: 3, color: activeSystem === key ? 'var(--t0)' : 'var(--t3)',
              letterSpacing: '0.1em', fontFamily: 'inherit',
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* ── Main area: left rail + map + right rail ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left rail: celestial body list */}
        <div style={{
          width: 110, flexShrink: 0, borderRight: '0.5px solid var(--b1)',
          background: 'var(--bg1)', overflow: 'auto',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid var(--b0)', color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em' }}>
            BODIES
          </div>
          {bodyPositions.map(b => (
            <BodyListItem key={b.id} body={b} onZoom={(bd) => setSelectedBody(bd.id === selectedBody ? null : bd.id)}/>
          ))}
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid var(--b0)', borderTop: '0.5px solid var(--b0)', color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', marginTop: 4 }}>
            JUMP POINTS
          </div>
          {sys.jumpPoints.map((jp, i) => (
            <div key={i} style={{ padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 5, height: 5, background: 'none', border: '0.5px solid var(--t3)', transform: 'rotate(45deg)', flexShrink: 0 }}/>
              <span style={{ fontSize: 8, color: 'var(--t3)' }}>{jp.label}</span>
            </div>
          ))}
        </div>

        {/* Map canvas */}
        <div
          ref={wrapRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        >
          {/* Warp flash overlay */}
          {warpFlash && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'var(--bg0)',
              animation: 'smv2-warp-flash 0.6s ease-in-out forwards',
              pointerEvents: 'none',
            }}/>
          )}

          <svg
            ref={svgRef}
            width={svgSize.w}
            height={svgSize.h}
            style={{
              display: 'block',
              cursor: routeMode ? 'crosshair' : 'default',
              animation: warping ? 'smv2-warp-in 0.5s ease-out forwards' : undefined,
            }}
            onClick={handleSvgClick}
          >
            {/* Pyro distortion rings */}
            {sys.distortionRings?.map((r, i) => (
              <circle key={i} cx={cx} cy={cy} r={r}
                      fill="none" stroke={sys.starColor}
                      strokeWidth="0.5"
                      style={{ animation: `smv2-distort ${1.8 + i * 0.4}s ease-in-out infinite` }}/>
            ))}

            {/* Asteroid belts */}
            {sys.belts.map((belt, bi) => {
              const bR = belt.orbit * maxR;
              return Array.from({ length: belt.count }, (_, i) => {
                const a   = (i / belt.count) * Math.PI * 2 + (i * 0.35);
                const rr  = bR + (seededRand(bi * 100 + i, 1) - 0.5) * belt.spread * maxR;
                return (
                  <circle key={`b${bi}-${i}`}
                          cx={cx + Math.cos(a) * rr}
                          cy={cy + Math.sin(a) * rr * 0.92}
                          r={0.8}
                          fill="rgba(200,210,230,0.2)"/>
                );
              });
            })}

            {/* Orbital ellipses */}
            {sys.bodies.map(b => {
              const r = b.orbit * maxR;
              const isSelected = b.id === selectedBody;
              return (
                <ellipse key={`orb-${b.id}`}
                         cx={cx} cy={cy} rx={r} ry={r * 0.92}
                         fill="none"
                         stroke={isSelected ? 'var(--acc)' : 'rgba(200,210,230,0.08)'}
                         strokeWidth={isSelected ? 0.6 : 0.4}
                         strokeDasharray={isSelected ? '3 3' : undefined}/>
              );
            })}

            {/* Lagrange points */}
            {sys.lagrange.map((lp, i) => {
              const r   = lp.orbit * maxR;
              const rad = (lp.angle * Math.PI) / 180;
              const lx  = cx + Math.cos(rad) * r;
              const ly  = cy + Math.sin(rad) * r * 0.92;
              return (
                <polygon key={`lp-${i}`}
                         points={`${lx},${ly - 3} ${lx + 2.6},${ly + 1.5} ${lx - 2.6},${ly + 1.5}`}
                         fill="none"
                         stroke="rgba(90,162,232,0.25)"
                         strokeWidth="0.5"/>
              );
            })}

            {/* Jump points */}
            {sys.jumpPoints.map((jp, i) => {
              const rad = (jp.angle * Math.PI) / 180;
              const jx  = cx + Math.cos(rad) * (maxR + 18);
              const jy  = cy + Math.sin(rad) * (maxR + 18) * 0.92;
              const sz  = 5;
              return (
                <g key={`jp-${i}`}>
                  <path d={`M ${jx},${jy - sz} L ${jx + sz},${jy} L ${jx},${jy + sz} L ${jx - sz},${jy} Z`}
                        fill="none"
                        stroke="rgba(90,162,232,0.4)"
                        strokeWidth="0.6"/>
                </g>
              );
            })}

            {/* Deposit markers */}
            {depositMarkers.map(dm => (
              <g key={dm.key} style={{ cursor: 'pointer' }}
                 onClick={(e) => { e.stopPropagation(); onDeposit?.(dm.data); }}>
                <circle cx={dm.x} cy={dm.y} r={dm.radius}
                        fill={dm.color + '33'}
                        stroke={dm.color}
                        strokeWidth="0.6"
                        opacity={dm.opacity}/>
                {dm.isFresh && (
                  <circle cx={dm.x} cy={dm.y}
                          fill="none"
                          stroke={dm.color}
                          strokeWidth="1"
                          style={{ animation: 'smv2-deposit-ping 1.8s ease-out infinite' }}/>
                )}
              </g>
            ))}

            {/* Planet circles */}
            {bodyPositions.map(b => {
              const isSelected = b.id === selectedBody;
              return (
                <g key={b.id} style={{ cursor: 'pointer' }}
                   onClick={() => setSelectedBody(b.id === selectedBody ? null : b.id)}>
                  <circle cx={b.sx} cy={b.sy} r={b.r + (isSelected ? 2 : 0)}
                          fill={b.color + (isSelected ? '44' : '22')}
                          stroke={isSelected ? 'var(--acc)' : b.color + '66'}
                          strokeWidth={isSelected ? 0.8 : 0.5}/>
                  {(!warping) && (
                    <text x={b.sx} y={b.sy + b.r + 9}
                          textAnchor="middle"
                          fill="rgba(200,210,230,0.45)"
                          fontSize="7"
                          fontFamily="var(--font)"
                          letterSpacing="0.08em">
                      {b.name.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Central star */}
            <circle cx={cx} cy={cy} r={sys.starRadius}
                    fill={sys.starColor + '44'}
                    stroke={sys.starColor + '88'}
                    strokeWidth="0.5"/>
            <circle cx={cx} cy={cy} r={sys.starRadius * 0.5}
                    fill={sys.starColor + '88'}/>

            {/* Route planning overlay */}
            {routePath && (
              <>
                <path d={routePath}
                      stroke="var(--warn)"
                      strokeWidth="0.75"
                      strokeDasharray="4 3"
                      fill="none"
                      opacity="0.7"/>
                {routePoints.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r="3"
                          fill="rgba(240,170,36,0.4)"
                          stroke="var(--warn)" strokeWidth="0.5"/>
                ))}
                {routeDist != null && (
                  <text
                    x={(routePoints[0].x + routePoints[1].x) / 2}
                    y={(routePoints[0].y + routePoints[1].y) / 2 - 8}
                    textAnchor="middle"
                    fill="var(--warn)"
                    fontSize="8"
                    fontFamily="var(--font)"
                    opacity="0.8"
                  >
                    {(routeDist / maxR * 100).toFixed(0)} AU (est.)
                  </text>
                )}
              </>
            )}
          </svg>
        </div>

        {/* Right rail: filter controls */}
        <div style={{
          width: 100, flexShrink: 0, borderLeft: '0.5px solid var(--b1)',
          background: 'var(--bg1)', padding: '8px 0',
        }}>
          <div style={{ padding: '0 8px 6px', borderBottom: '0.5px solid var(--b0)', color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em' }}>
            OVERLAYS
          </div>
          {[
            { key: 'route',    label: 'ROUTE PLAN',  active: routeMode,
              action: () => { setRouteMode(r => !r); setRoutePoints([]); } },
          ].map(item => (
            <button key={item.key}
                    onClick={item.action}
                    style={{
                      display: 'block', width: '100%', padding: '6px 8px',
                      background: item.active ? 'rgba(104,120,192,0.12)' : 'transparent',
                      border: 'none', textAlign: 'left', cursor: 'pointer',
                      borderBottom: '0.5px solid var(--b0)',
                      color: item.active ? 'var(--acc)' : 'var(--t2)',
                      fontSize: 8, letterSpacing: '0.08em', fontFamily: 'inherit',
                    }}>
              {item.label}
            </button>
          ))}
          {deposits.length > 0 && (
            <>
              <div style={{ padding: '6px 8px', color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', borderTop: '0.5px solid var(--b0)', marginTop: 4 }}>
                DEPOSITS
              </div>
              <div style={{ padding: '4px 8px', color: 'var(--t2)', fontSize: 9 }}>
                {depositMarkers.length} in view
              </div>
            </>
          )}
          {routePoints.length > 0 && (
            <button
              onClick={() => setRoutePoints([])}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--danger)', fontSize: 8,
                letterSpacing: '0.08em', fontFamily: 'inherit',
              }}
            >
              <X size={8}/> CLEAR ROUTE
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom bar: cursor coords + scale ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '4px 12px', borderTop: '0.5px solid var(--b1)',
        background: 'var(--bg1)', flexShrink: 0,
      }}>
        <span style={{ color: 'var(--t3)', fontSize: 8, fontFamily: 'var(--font)' }}>
          {activeSystem} /{routeMode ? ' ROUTE MODE — CLICK TO ADD WAYPOINT' : ' INTERACTIVE MAP'}
        </span>
        <div style={{ flex: 1 }}/>
        <span style={{ color: 'var(--t3)', fontSize: 8 }}>◈ N</span>
        <div style={{
          width: 40, height: 2, background: 'var(--b1)', borderRadius: 1, position: 'relative',
        }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: -3, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: 1, height: 6, background: 'var(--t3)' }}/>
            <div style={{ width: 1, height: 6, background: 'var(--t3)' }}/>
          </div>
        </div>
        <span style={{ color: 'var(--t3)', fontSize: 8 }}>100 AU</span>
      </div>
    </div>
  );
}
