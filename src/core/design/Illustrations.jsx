/**
 * NexusOS — Module Illustration Library
 * Stroke-only SVG compositions matching the redscar-emblem aesthetic.
 * All illustrations use CSS custom properties for color so they respond to
 * the operational temperature shift and dark/light theming.
 *
 * Usage:
 *   <TacticalReticle size={72} opacity={0.18} />
 *   <OrbitalChart size={80} opacity={0.22} />
 */

import React from 'react';

/* ─── shared defaults ──────────────────────────────────────────────────────── */
const STROKE = 'var(--t2)';
const ACCENT = 'var(--acc)';
const DANGER = 'var(--danger)';
const LIVE   = 'var(--live)';

function Svg({ size = 80, opacity = 0.2, viewBox = '0 0 80 80', children, style = {} }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', opacity, flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  );
}

/* ─── 1. TacticalReticle — Op Board ───────────────────────────────────────── */
export function TacticalReticle({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* outer ring with gaps at cardinals */}
      <path d="M40 4 A36 36 0 0 1 76 40" stroke={STROKE} strokeWidth="0.8"/>
      <path d="M76 40 A36 36 0 0 1 40 76" stroke={STROKE} strokeWidth="0.8"/>
      <path d="M40 76 A36 36 0 0 1 4 40" stroke={STROKE} strokeWidth="0.8"/>
      <path d="M4 40 A36 36 0 0 1 40 4" stroke={STROKE} strokeWidth="0.8"/>
      {/* mid ring dashed */}
      <circle cx="40" cy="40" r="22" stroke={STROKE} strokeWidth="0.5" strokeDasharray="3 2.5"/>
      {/* inner ring */}
      <circle cx="40" cy="40" r="10" stroke={STROKE} strokeWidth="0.6"/>
      {/* cardinal hairs — full cross */}
      <line x1="40" y1="4"  x2="40" y2="30" stroke={STROKE} strokeWidth="0.7"/>
      <line x1="40" y1="50" x2="40" y2="76" stroke={STROKE} strokeWidth="0.7"/>
      <line x1="4"  y1="40" x2="30" y2="40" stroke={STROKE} strokeWidth="0.7"/>
      <line x1="50" y1="40" x2="76" y2="40" stroke={STROKE} strokeWidth="0.7"/>
      {/* diagonal hairs shorter */}
      <line x1="40" y1="40" x2="62" y2="18" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 3"/>
      <line x1="40" y1="40" x2="18" y2="18" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 3"/>
      <line x1="40" y1="40" x2="62" y2="62" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 3"/>
      <line x1="40" y1="40" x2="18" y2="62" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 3"/>
      {/* outer tick marks every 30° */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].filter(a => a % 90 !== 0).map(a => {
        const r = Math.PI / 180 * a;
        const x1 = 40 + 33 * Math.sin(r), y1 = 40 - 33 * Math.cos(r);
        const x2 = 40 + 36 * Math.sin(r), y2 = 40 - 36 * Math.cos(r);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE} strokeWidth="0.7"/>;
      })}
      {/* sweep arc NE quadrant — accent */}
      <path d="M 40 18 A 22 22 0 0 1 62 40" stroke={ACCENT} strokeWidth="0.9" opacity="0.7"/>
      {/* center diamond */}
      <path d="M40 35.5 L44.5 40 L40 44.5 L35.5 40 Z" stroke={STROKE} strokeWidth="0.7"/>
      <circle cx="40" cy="40" r="1.5" stroke={ACCENT} strokeWidth="0.8"/>
    </Svg>
  );
}

/* ─── 2. OrbitalChart — Scout Intel ──────────────────────────────────────── */
export function OrbitalChart({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* outer orbit ellipse tilted */}
      <ellipse cx="40" cy="40" rx="34" ry="12" stroke={STROKE} strokeWidth="0.6"
               strokeDasharray="3 2" transform="rotate(-25 40 40)"/>
      {/* mid orbit */}
      <circle cx="40" cy="40" r="22" stroke={STROKE} strokeWidth="0.5" strokeDasharray="4 3"/>
      {/* inner orbit */}
      <circle cx="40" cy="40" r="11" stroke={STROKE} strokeWidth="0.55"/>
      {/* central star */}
      <circle cx="40" cy="40" r="5" stroke={ACCENT} strokeWidth="0.8"/>
      {[0,60,120,180,240,300].map(a => {
        const r = Math.PI / 180 * a;
        return <line key={a} x1={40 + 5*Math.cos(r)} y1={40 + 5*Math.sin(r)}
                     x2={40 + 7.5*Math.cos(r)} y2={40 + 7.5*Math.sin(r)}
                     stroke={ACCENT} strokeWidth="0.7"/>;
      })}
      {/* planet nodes */}
      <circle cx="62" cy="40" r="2.2" stroke={STROKE} strokeWidth="0.7"/>
      <circle cx={40 + 22*Math.cos(-0.8)} cy={40 + 22*Math.sin(-0.8)} r="1.6" stroke={STROKE} strokeWidth="0.6"/>
      <circle cx={40 + 11*Math.cos(2.4)} cy={40 + 11*Math.sin(2.4)} r="1.2" stroke={LIVE} strokeWidth="0.6" opacity="0.8"/>
      {/* jump point markers — small X */}
      {[[14,20],[66,56]].map(([x,y],i) => (
        <g key={i}>
          <line x1={x-2} y1={y-2} x2={x+2} y2={y+2} stroke={STROKE} strokeWidth="0.55"/>
          <line x1={x+2} y1={y-2} x2={x-2} y2={y+2} stroke={STROKE} strokeWidth="0.55"/>
        </g>
      ))}
      {/* cardinal tick marks on mid orbit */}
      {[0,90,180,270].map(a => {
        const r = Math.PI / 180 * a;
        return <line key={a} x1={40+19*Math.cos(r)} y1={40+19*Math.sin(r)}
                     x2={40+22*Math.cos(r)} y2={40+22*Math.sin(r)}
                     stroke={STROKE} strokeWidth="0.8"/>;
      })}
    </Svg>
  );
}

/* ─── 3. RefineryFlow — Industry Hub ─────────────────────────────────────── */
export function RefineryFlow({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* process chamber — hexagon */}
      <polygon points="40,16 52,23 52,37 40,44 28,37 28,23" stroke={ACCENT} strokeWidth="0.8"/>
      {/* inner circle */}
      <circle cx="40" cy="30" r="7" stroke={ACCENT} strokeWidth="0.6"/>
      {/* input feeds — left side nodes */}
      <circle cx="8"  cy="20" r="3" stroke={STROKE} strokeWidth="0.7"/>
      <circle cx="8"  cy="30" r="3" stroke={STROKE} strokeWidth="0.7"/>
      <circle cx="8"  cy="40" r="3" stroke={STROKE} strokeWidth="0.7"/>
      {/* pipes from nodes to chamber */}
      <line x1="11" y1="20" x2="28" y2="23" stroke={STROKE} strokeWidth="0.55"/>
      <line x1="11" y1="30" x2="28" y2="30" stroke={STROKE} strokeWidth="0.55"/>
      <line x1="11" y1="40" x2="28" y2="37" stroke={STROKE} strokeWidth="0.55"/>
      {/* output feeds — right side */}
      <circle cx="72" cy="20" r="3" stroke={LIVE} strokeWidth="0.7"/>
      <circle cx="72" cy="30" r="3" stroke={LIVE} strokeWidth="0.7"/>
      {/* pipes chamber to output */}
      <line x1="52" y1="23" x2="69" y2="20" stroke={STROKE} strokeWidth="0.55"/>
      <line x1="52" y1="30" x2="69" y2="30" stroke={STROKE} strokeWidth="0.55"/>
      {/* flow arrows on pipes */}
      <polygon points="22,29 19,27.5 19,30.5" stroke={STROKE} strokeWidth="0.5"/>
      <polygon points="60,29 63,27.5 63,30.5" stroke={LIVE} strokeWidth="0.5"/>
      {/* drip collection below chamber */}
      <line x1="40" y1="44" x2="40" y2="56" stroke={STROKE} strokeWidth="0.55"/>
      <path d="M33 56 Q40 66 47 56" stroke={STROKE} strokeWidth="0.55"/>
      {/* process nodes inside chamber */}
      <circle cx="36" cy="28" r="1.2" stroke={ACCENT} strokeWidth="0.6"/>
      <circle cx="44" cy="28" r="1.2" stroke={ACCENT} strokeWidth="0.6"/>
      <circle cx="40" cy="34" r="1.2" stroke={ACCENT} strokeWidth="0.6"/>
    </Svg>
  );
}

/* ─── 4. TradeLedger — Commerce ──────────────────────────────────────────── */
export function TradeLedger({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* outer frame */}
      <rect x="6" y="8" width="68" height="64" rx="1" stroke={STROKE} strokeWidth="0.7"/>
      {/* header rule */}
      <line x1="6" y1="20" x2="74" y2="20" stroke={STROKE} strokeWidth="0.6"/>
      {/* vertical divider */}
      <line x1="40" y1="8" x2="40" y2="72" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 2"/>
      {/* column labels — ticks */}
      <line x1="13" y1="14" x2="36" y2="14" stroke={STROKE} strokeWidth="0.5"/>
      <line x1="44" y1="14" x2="68" y2="14" stroke={STROKE} strokeWidth="0.5"/>
      {/* ledger rows left (credits) */}
      {[27,34,41,48,55].map((y,i) => (
        <line key={y} x1="10" y1={y} x2={i % 3 === 0 ? 35 : i % 3 === 1 ? 28 : 32} y2={y}
              stroke={LIVE} strokeWidth="0.55" opacity="0.8"/>
      ))}
      {/* ledger rows right (debits) */}
      {[27,34,48,62].map((y,i) => (
        <line key={y} x1="44" y1={y} x2={i % 2 === 0 ? 68 : 60} y2={y}
              stroke={DANGER} strokeWidth="0.55" opacity="0.7"/>
      ))}
      {/* balance indicator at bottom */}
      <line x1="10" y1="65" x2="36" y2="65" stroke={STROKE} strokeWidth="0.8"/>
      <line x1="44" y1="65" x2="68" y2="65" stroke={STROKE} strokeWidth="0.8"/>
      {/* aUEC symbol in center */}
      <circle cx="40" cy="46" r="5" stroke={ACCENT} strokeWidth="0.7"/>
      <line x1="40" y1="41" x2="40" y2="51" stroke={ACCENT} strokeWidth="0.6"/>
      <line x1="36" y1="44" x2="44" y2="44" stroke={ACCENT} strokeWidth="0.5"/>
      <line x1="36" y1="48" x2="44" y2="48" stroke={ACCENT} strokeWidth="0.5"/>
    </Svg>
  );
}

/* ─── 5. CargoRoute — Logistics ──────────────────────────────────────────── */
export function CargoRoute({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* cargo container outline */}
      <rect x="4" y="28" width="20" height="14" rx="1" stroke={STROKE} strokeWidth="0.8"/>
      <line x1="4" y1="32" x2="24" y2="32" stroke={STROKE} strokeWidth="0.4"/>
      <line x1="14" y1="28" x2="14" y2="42" stroke={STROKE} strokeWidth="0.4"/>
      {/* destination node */}
      <circle cx="72" cy="35" r="5" stroke={LIVE} strokeWidth="0.8"/>
      <line x1="70" y1="35" x2="74" y2="35" stroke={LIVE} strokeWidth="0.6"/>
      <line x1="72" y1="33" x2="72" y2="37" stroke={LIVE} strokeWidth="0.6"/>
      {/* mid waypoint */}
      <circle cx="40" cy="24" r="3.5" stroke={ACCENT} strokeWidth="0.7"/>
      {/* route lines */}
      <path d="M24 35 Q32 24 36.5 24" stroke={STROKE} strokeWidth="0.6" strokeDasharray="3 2"/>
      <path d="M43.5 24 Q56 24 67 35" stroke={STROKE} strokeWidth="0.6" strokeDasharray="3 2"/>
      {/* direction arrows */}
      <polygon points="33,30.5 30,28 30,33" stroke={STROKE} strokeWidth="0.5"/>
      <polygon points="60,28.5 63,26 63,31" stroke={STROKE} strokeWidth="0.5"/>
      {/* stacked containers bottom right */}
      <rect x="48" y="50" width="12" height="8"  rx="0.5" stroke={STROKE} strokeWidth="0.55"/>
      <rect x="50" y="43" width="12" height="8"  rx="0.5" stroke={STROKE} strokeWidth="0.55"/>
      <rect x="46" y="57" width="16" height="5"  rx="0.5" stroke={STROKE} strokeWidth="0.45"/>
      {/* SCU label ticks */}
      <line x1="50" y1="54" x2="58" y2="54" stroke={STROKE} strokeWidth="0.35"/>
      <line x1="52" y1="47" x2="60" y2="47" stroke={STROKE} strokeWidth="0.35"/>
    </Svg>
  );
}

/* ─── 6. VaultWheel — Armory ─────────────────────────────────────────────── */
export function VaultWheel({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* outer vault ring */}
      <circle cx="40" cy="40" r="34" stroke={STROKE} strokeWidth="0.8"/>
      {/* locking bolt tracks — 6 evenly spaced */}
      {[0,60,120,180,240,300].map(a => {
        const r = Math.PI / 180 * a;
        const x1 = 40 + 22*Math.cos(r), y1 = 40 + 22*Math.sin(r);
        const x2 = 40 + 30*Math.cos(r), y2 = 40 + 30*Math.sin(r);
        const bx = 40 + 34*Math.cos(r), by = 40 + 34*Math.sin(r);
        return (
          <g key={a}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
            <circle cx={bx} cy={by} r="2" stroke={ACCENT} strokeWidth="0.6"/>
          </g>
        );
      })}
      {/* inner hub ring */}
      <circle cx="40" cy="40" r="18" stroke={STROKE} strokeWidth="0.7"/>
      {/* center wheel spokes */}
      {[30,90,150,210,270,330].map(a => {
        const r = Math.PI / 180 * a;
        return <line key={a} x1={40 + 6*Math.cos(r)} y1={40 + 6*Math.sin(r)}
                     x2={40 + 18*Math.cos(r)} y2={40 + 18*Math.sin(r)}
                     stroke={STROKE} strokeWidth="0.55"/>;
      })}
      {/* center lock body */}
      <rect x="35" y="33" width="10" height="9" rx="1" stroke={ACCENT} strokeWidth="0.75"/>
      <path d="M37 33 Q37 28 40 28 Q43 28 43 33" stroke={ACCENT} strokeWidth="0.75" fill="none"/>
      <circle cx="40" cy="39" r="1.2" stroke={ACCENT} strokeWidth="0.6"/>
      {/* bolt track channel ring */}
      <circle cx="40" cy="40" r="26" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 3"/>
    </Svg>
  );
}

/* ─── 7. ArchiveTimeline — Epic Archive ──────────────────────────────────── */
export function ArchiveTimeline({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* trophy cup */}
      <path d="M28 12 L52 12 L48 36 Q40 44 32 36 Z" stroke={ACCENT} strokeWidth="0.8"/>
      {/* handles */}
      <path d="M28 16 Q18 20 20 30 Q22 36 32 36" stroke={ACCENT} strokeWidth="0.65"/>
      <path d="M52 16 Q62 20 60 30 Q58 36 48 36" stroke={ACCENT} strokeWidth="0.65"/>
      {/* pedestal */}
      <line x1="40" y1="44" x2="40" y2="52" stroke={STROKE} strokeWidth="0.8"/>
      <rect x="30" y="52" width="20" height="4" rx="0.5" stroke={STROKE} strokeWidth="0.7"/>
      <rect x="26" y="56" width="28" height="3" rx="0.5" stroke={STROKE} strokeWidth="0.7"/>
      {/* star shine lines from top */}
      <line x1="40" y1="8" x2="40" y2="5" stroke={ACCENT} strokeWidth="0.8"/>
      {[[-8,6],[8,6],[-5,-7],[5,-7]].map(([dx,dy],i) => (
        <line key={i} x1={40+dx*0.4} y1={12+dy*0.4} x2={40+dx} y2={12+dy}
              stroke={ACCENT} strokeWidth="0.55"/>
      ))}
      {/* timeline strip below */}
      <line x1="8" y1="68" x2="72" y2="68" stroke={STROKE} strokeWidth="0.6"/>
      {[14,26,40,54,66].map((x,i) => (
        <g key={x}>
          <circle cx={x} cy="68" r="2" stroke={i === 2 ? ACCENT : STROKE} strokeWidth="0.7"/>
          <line x1={x} y1="65" x2={x} y2="62" stroke={STROKE} strokeWidth="0.45"/>
          <line x1={x-4} y1="62" x2={x+4} y2="62" stroke={STROKE} strokeWidth="0.45"/>
        </g>
      ))}
    </Svg>
  );
}

/* ─── 8. ConstellationRoster — Org Roster ────────────────────────────────── */
export function ConstellationRoster({ size = 80, opacity = 0.2, style = {} }) {
  // nodes: [x, y, size, color]
  const nodes = [
    [40, 10, 2.8, ACCENT],  // Pioneer (top)
    [20, 26, 2.2, STROKE],  // Founder L
    [60, 26, 2.2, STROKE],  // Founder R
    [10, 44, 1.8, STROKE],  // Voyager
    [30, 44, 1.8, STROKE],
    [50, 44, 1.8, STROKE],
    [70, 44, 1.8, STROKE],
    [6,  62, 1.4, STROKE],  // Scout tier
    [18, 62, 1.4, STROKE],
    [28, 62, 1.4, STROKE],
    [40, 62, 1.4, STROKE],
    [52, 62, 1.4, STROKE],
    [64, 62, 1.4, STROKE],
    [74, 62, 1.4, STROKE],
  ];
  const edges = [
    [0,1],[0,2],
    [1,3],[1,4],[2,5],[2,6],
    [3,7],[3,8],[4,8],[4,9],[5,9],[5,10],[6,10],[6,11],[6,12],[6,13],
  ];
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {edges.map(([a,b],i) => (
        <line key={i}
              x1={nodes[a][0]} y1={nodes[a][1]}
              x2={nodes[b][0]} y2={nodes[b][1]}
              stroke={STROKE} strokeWidth="0.45" strokeDasharray="1.5 2"/>
      ))}
      {nodes.map(([x,y,r,c],i) => (
        <circle key={i} cx={x} cy={y} r={r} stroke={String(c)} strokeWidth="0.65"/>
      ))}
    </Svg>
  );
}

/* ─── 9. HandbookGlyph — Redscar Handbook ────────────────────────────────── */
export function HandbookGlyph({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* book outline */}
      <rect x="12" y="8" width="56" height="64" rx="1" stroke={STROKE} strokeWidth="0.8"/>
      {/* spine */}
      <line x1="24" y1="8" x2="24" y2="72" stroke={STROKE} strokeWidth="0.7"/>
      {/* binding stitches */}
      {[16,24,32,40,48,56,64].map(y => (
        <line key={y} x1="24" y1={y} x2="28" y2={y} stroke={STROKE} strokeWidth="0.4"/>
      ))}
      {/* text lines */}
      {[18,25,32,39,46,53].map((y,i) => (
        <line key={y} x1="32" y1={y} x2={i % 3 === 0 ? 60 : i % 3 === 1 ? 52 : 56} y2={y}
              stroke={STROKE} strokeWidth="0.55"/>
      ))}
      {/* section divider */}
      <line x1="32" y1="42" x2="62" y2="42" stroke={ACCENT} strokeWidth="0.6"/>
      {/* emblem on cover — simplified compass rose */}
      <circle cx="43" cy="61" r="7" stroke={ACCENT} strokeWidth="0.55"/>
      <line x1="43" y1="54" x2="43" y2="68" stroke={ACCENT} strokeWidth="0.4"/>
      <line x1="36" y1="61" x2="50" y2="61" stroke={ACCENT} strokeWidth="0.4"/>
      <circle cx="43" cy="61" r="1.5" stroke={ACCENT} strokeWidth="0.5"/>
    </Svg>
  );
}

/* ─── 10. TrainingConsole — Training Hub ─────────────────────────────────── */
export function TrainingConsole({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* screen / terminal frame */}
      <rect x="6" y="8" width="68" height="48" rx="1.5" stroke={STROKE} strokeWidth="0.8"/>
      {/* scan lines */}
      {[16,22,28,34,40,46].map(y => (
        <line key={y} x1="10" y1={y} x2={y < 30 ? 60 : y < 40 ? 48 : 54} y2={y}
              stroke={STROKE} strokeWidth="0.4" strokeDasharray="3 1"/>
      ))}
      {/* cursor blink */}
      <rect x="10" y="50" width="4" height="1.5" stroke={LIVE} strokeWidth="0.5"/>
      {/* progress bar */}
      <rect x="10" y="18" width="42" height="2.5" rx="0.5" stroke={ACCENT} strokeWidth="0.5"/>
      <rect x="10" y="18" width="26" height="2.5" rx="0.5" stroke={ACCENT} strokeWidth="0.4"/>
      {/* chevron prompt */}
      <path d="M10 27 L14 30 L10 33" stroke={LIVE} strokeWidth="0.7"/>
      {/* stand */}
      <line x1="40" y1="56" x2="40" y2="65" stroke={STROKE} strokeWidth="0.8"/>
      <line x1="26" y1="65" x2="54" y2="65" stroke={STROKE} strokeWidth="0.8"/>
      {/* corner brackets on screen */}
      <path d="M6 12 L6 8 L10 8" stroke={ACCENT} strokeWidth="0.6"/>
      <path d="M70 12 L74 8 L74 8 L70 8" stroke={ACCENT} strokeWidth="0.6"/>
      <path d="M6 52 L6 56 L10 56" stroke={ACCENT} strokeWidth="0.6"/>
      <path d="M70 52 L74 56 L70 56" stroke={ACCENT} strokeWidth="0.6"/>
    </Svg>
  );
}

/* ─── 11. FleetDock — Fleet Hub ──────────────────────────────────────────── */
export function FleetDock({ size = 80, opacity = 0.2, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 80 80" style={style}>
      {/* dock bay structure */}
      <path d="M4 70 L4 30 Q4 26 8 26 L72 26 Q76 26 76 30 L76 70" stroke={STROKE} strokeWidth="0.7"/>
      {/* deck line */}
      <line x1="4" y1="70" x2="76" y2="70" stroke={STROKE} strokeWidth="0.8"/>
      {/* bay divisions */}
      <line x1="28" y1="26" x2="28" y2="70" stroke={STROKE} strokeWidth="0.4" strokeDasharray="3 3"/>
      <line x1="52" y1="26" x2="52" y2="70" stroke={STROKE} strokeWidth="0.4" strokeDasharray="3 3"/>
      {/* ship silhouettes in bays — simplified profile */}
      {/* Bay 1 */}
      <path d="M10 58 Q14 48 18 46 L22 48 L24 52 L20 58 Z" stroke={STROKE} strokeWidth="0.6"/>
      {/* Bay 2 — larger */}
      <path d="M30 60 Q35 44 40 42 L46 44 Q48 50 46 56 L40 62 Z" stroke={ACCENT} strokeWidth="0.65"/>
      {/* Bay 3 */}
      <path d="M54 60 Q58 50 62 48 L66 50 L67 55 L63 60 Z" stroke={STROKE} strokeWidth="0.6"/>
      {/* status lights */}
      <circle cx="16" cy="64" r="1.5" stroke={STROKE} strokeWidth="0.5"/>
      <circle cx="40" cy="64" r="1.5" stroke={LIVE}   strokeWidth="0.6"/>
      <circle cx="62" cy="64" r="1.5" stroke={STROKE} strokeWidth="0.5"/>
      {/* gantry arm */}
      <line x1="4" y1="26" x2="76" y2="26" stroke={STROKE} strokeWidth="1"/>
      <line x1="40" y1="8" x2="40" y2="26" stroke={STROKE} strokeWidth="0.6"/>
      <line x1="20" y1="14" x2="60" y2="14" stroke={STROKE} strokeWidth="0.4"/>
    </Svg>
  );
}

/* ─── 12. ScanPattern — empty state generic ─────────────────────────────── */
export function ScanPattern({ size = 120, opacity = 0.12, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 120 120" style={style}>
      <circle cx="60" cy="60" r="52" stroke={STROKE} strokeWidth="0.6" strokeDasharray="5 4"/>
      <circle cx="60" cy="60" r="36" stroke={STROKE} strokeWidth="0.5" strokeDasharray="3 3"/>
      <circle cx="60" cy="60" r="18" stroke={STROKE} strokeWidth="0.6"/>
      <line x1="60" y1="8" x2="60" y2="112" stroke={STROKE} strokeWidth="0.5"/>
      <line x1="8" y1="60" x2="112" y2="60" stroke={STROKE} strokeWidth="0.5"/>
      <line x1="23" y1="23" x2="97" y2="97" stroke={STROKE} strokeWidth="0.35" strokeDasharray="2 4"/>
      <line x1="97" y1="23" x2="23" y2="97" stroke={STROKE} strokeWidth="0.35" strokeDasharray="2 4"/>
      <path d="M60 24 A36 36 0 0 1 96 60" stroke={ACCENT} strokeWidth="0.8" opacity="0.6"/>
      <circle cx="60" cy="60" r="3" stroke={ACCENT} strokeWidth="0.7"/>
    </Svg>
  );
}

/* ─── 13. MiningRig — Scout deposit empty state ──────────────────────────── */
export function MiningRig({ size = 120, opacity = 0.12, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 120 120" style={style}>
      {/* asteroid outline */}
      <path d="M30 55 Q28 38 42 30 Q58 22 72 34 Q86 44 84 60 Q82 76 68 82 Q52 90 38 78 Q26 68 30 55 Z"
            stroke={STROKE} strokeWidth="0.7"/>
      {/* rock surface detail lines */}
      <line x1="42" y1="30" x2="50" y2="45" stroke={STROKE} strokeWidth="0.4" strokeDasharray="1.5 2"/>
      <line x1="72" y1="34" x2="64" y2="50" stroke={STROKE} strokeWidth="0.4" strokeDasharray="1.5 2"/>
      <line x1="84" y1="60" x2="70" y2="62" stroke={STROKE} strokeWidth="0.4" strokeDasharray="1.5 2"/>
      {/* deposit crystal cluster center */}
      <path d="M57 48 L60 38 L63 48 L68 44 L64 52 L70 54 L62 56 L64 64 L60 58 L56 64 L58 56 L50 54 L56 52 L52 44 Z"
            stroke={ACCENT} strokeWidth="0.65"/>
      {/* mining ship */}
      <path d="M90 30 Q94 26 98 28 L100 36 L94 38 Q90 36 90 30 Z" stroke={STROKE} strokeWidth="0.6"/>
      <line x1="94" y1="38" x2="84" y2="54" stroke={STROKE} strokeWidth="0.45" strokeDasharray="2 2"/>
      {/* laser beam */}
      <line x1="90" y1="36" x2="68" y2="50" stroke={ACCENT} strokeWidth="0.55" opacity="0.7"/>
      {/* scan circles around deposit */}
      <circle cx="60" cy="56" r="14" stroke={STROKE} strokeWidth="0.4" strokeDasharray="2 3"/>
    </Svg>
  );
}

/* ─── 14. EmptyVault — Armory empty state ────────────────────────────────── */
export function EmptyVault({ size = 120, opacity = 0.12, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 120 120" style={style}>
      {/* vault door frame */}
      <rect x="18" y="14" width="84" height="92" rx="2" stroke={STROKE} strokeWidth="0.8"/>
      {/* door panel inset */}
      <rect x="26" y="22" width="68" height="76" rx="1" stroke={STROKE} strokeWidth="0.6"/>
      {/* vault wheel */}
      <circle cx="60" cy="60" r="24" stroke={STROKE} strokeWidth="0.7"/>
      <circle cx="60" cy="60" r="14" stroke={STROKE} strokeWidth="0.6"/>
      {[0,60,120,180,240,300].map(a => {
        const rad = Math.PI / 180 * a;
        return (
          <g key={a}>
            <line x1={60+14*Math.cos(rad)} y1={60+14*Math.sin(rad)}
                  x2={60+24*Math.cos(rad)} y2={60+24*Math.sin(rad)}
                  stroke={STROKE} strokeWidth="2.5" strokeLinecap="round"/>
          </g>
        );
      })}
      <circle cx="60" cy="60" r="4" stroke={ACCENT} strokeWidth="0.7"/>
      {/* handle */}
      <path d="M84 56 Q90 56 90 60 Q90 64 84 64" stroke={STROKE} strokeWidth="0.8"/>
      {/* hinge bolts left */}
      <circle cx="24" cy="34" r="2.5" stroke={STROKE} strokeWidth="0.6"/>
      <circle cx="24" cy="86" r="2.5" stroke={STROKE} strokeWidth="0.6"/>
      {/* open crack / ajar suggestion */}
      <line x1="94" y1="22" x2="96" y2="98" stroke={STROKE} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.5"/>
    </Svg>
  );
}

/* ─── 15. EmptyLedger — Commerce empty state ─────────────────────────────── */
export function EmptyLedger({ size = 120, opacity = 0.12, style = {} }) {
  return (
    <Svg size={size} opacity={opacity} viewBox="0 0 120 120" style={style}>
      <rect x="16" y="10" width="88" height="100" rx="1" stroke={STROKE} strokeWidth="0.8"/>
      <line x1="16" y1="26" x2="104" y2="26" stroke={STROKE} strokeWidth="0.6"/>
      <line x1="36" y1="10" x2="36" y2="110" stroke={STROKE} strokeWidth="0.5"/>
      {/* empty rows with ghost lines */}
      {[36,46,56,66,76,86,96].map(y => (
        <line key={y} x1="44" y1={y} x2="96" y2={y} stroke={STROKE} strokeWidth="0.4"
              strokeDasharray="4 3" opacity="0.4"/>
      ))}
      {/* "no entries" magnifier */}
      <circle cx="60" cy="68" r="16" stroke={STROKE} strokeWidth="0.6"/>
      <line x1="72" y1="80" x2="82" y2="90" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="52" y1="62" x2="68" y2="62" stroke={STROKE} strokeWidth="0.45"/>
      <line x1="60" y1="54" x2="60" y2="76" stroke={STROKE} strokeWidth="0.45"/>
    </Svg>
  );
}
