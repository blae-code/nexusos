/**
 * SystemMap — full SVG star system map with toolbar.
 * Props: {
 *   deposits, blueprints, liveOp,
 *   filterState: { system, material, qualityMin, staleness, heatmap, opOverlay },
 *   onFilterChange, onSelectDeposit, selectedDepositId
 * }
 *
 * viewBox "0 0 900 480", 100% width, 480px height.
 * Three regions: Stanton (left), Pyro (centre), Nyx (right).
 * Region dividers at x=300 and x=600.
 * Deposit markers: letter circles, quality-coloured, stale=35% opacity/dashed.
 * Heatmap: opacity-scaled density circles per body when toggled.
 * Op overlay: pulsing amber ring on craft-target deposits when live op active.
 */
import React, { useMemo, useState } from 'react';
import { Layers, Crosshair, MapPin } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { depositToken } from '@/lib/tokenMap';
import EmptyState from '@/components/ui/EmptyState';
import { Chip, IconBtn } from './SystemMapControls';

// ─── System layout data ────────────────────────────────────────────────────────

const SYSTEMS = {
  STANTON: {
    label: 'STANTON',
    star: { x: 150, y: 240 },
    regionX: 0,
    orbits: [
      { rx: 46, ry: 28 },
      { rx: 88, ry: 54 },
      { rx: 118, ry: 72 },
      { rx: 140, ry: 84 },
    ],
    bodies: [
      { name: 'Crusader',    x: 136, y: 187, r: 5, belt: false },
      { name: 'Hurston',     x: 108, y: 256, r: 4, belt: false },
      { name: 'ArcCorp',     x: 193, y: 256, r: 4, belt: false },
      { name: 'MicroTech',   x: 228, y: 183, r: 4, belt: false },
      { name: 'Yela',        x: 128, y: 152, r: 0, belt: true,  beltRx: 18, beltRy: 7 },
      { name: 'Delamar',     x: 266, y: 248, r: 3, belt: false },
    ],
  },
  PYRO: {
    label: 'PYRO',
    star: { x: 450, y: 240 },
    regionX: 300,
    orbits: [
      { rx: 42, ry: 26 },
      { rx: 76, ry: 46 },
      { rx: 108, ry: 64 },
      { rx: 136, ry: 82 },
    ],
    bodies: [
      { name: 'Pyro I',      x: 450, y: 196, r: 3, belt: false },
      { name: 'Pyro II',     x: 392, y: 216, r: 4, belt: false },
      { name: 'Bloom',       x: 396, y: 268, r: 5, belt: false, note: 'Pyro III' },
      { name: 'Pyro IV',     x: 450, y: 286, r: 4, belt: false },
      { name: 'Pyro V',      x: 506, y: 268, r: 3, belt: false },
      { name: 'Pyro VI',     x: 508, y: 215, r: 3, belt: false },
      { name: 'Checkmate',   x: 370, y: 192, r: 2, belt: false },
      { name: 'Furud',       x: 358, y: 248, r: 3, belt: false },
    ],
  },
  NYX: {
    label: 'NYX',
    star: { x: 750, y: 240 },
    regionX: 600,
    orbits: [
      { rx: 48, ry: 30 },
      { rx: 86, ry: 52 },
      { rx: 116, ry: 70 },
    ],
    bodies: [
      { name: 'Delamar',     x: 750, y: 186, r: 4, belt: false },
      { name: 'Glaciem Ring', x: 710, y: 294, r: 0, belt: true,  beltRx: 22, beltRy: 8 },
      { name: 'Keeger Belt', x: 792, y: 268, r: 0, belt: true,  beltRx: 22, beltRy: 8 },
    ],
  },
};

// Lookup table: location keyword → body coords (for deposit positioning)
const BODY_LOOKUP = {
  STANTON: {
    crusader:   { x: 136, y: 187 },
    hurston:    { x: 108, y: 256 },
    arccorp:    { x: 193, y: 256 },
    'arc corp': { x: 193, y: 256 },
    microtech:  { x: 228, y: 183 },
    yela:       { x: 128, y: 152 },
    delamar:    { x: 266, y: 248 },
    aaron:      { x: 266, y: 248 }, // Aaron Halo
    halo:       { x: 155, y: 178 },
    _default:   { x: 150, y: 240 },
  },
  PYRO: {
    'pyro i':   { x: 450, y: 196 },
    'pyro 1':   { x: 450, y: 196 },
    'pyro ii':  { x: 392, y: 216 },
    'pyro 2':   { x: 392, y: 216 },
    bloom:      { x: 396, y: 268 },
    'pyro iii': { x: 396, y: 268 },
    'pyro 3':   { x: 396, y: 268 },
    'pyro iv':  { x: 450, y: 286 },
    'pyro 4':   { x: 450, y: 286 },
    'pyro v':   { x: 506, y: 268 },
    'pyro 5':   { x: 506, y: 268 },
    'pyro vi':  { x: 508, y: 215 },
    'pyro 6':   { x: 508, y: 215 },
    checkmate:  { x: 370, y: 192 },
    furud:      { x: 358, y: 248 },
    'ruin':     { x: 404, y: 204 },
    _default:   { x: 450, y: 240 },
  },
  NYX: {
    delamar:    { x: 750, y: 186 },
    glaciem:    { x: 710, y: 294 },
    keeger:     { x: 792, y: 268 },
    'nyx belt': { x: 760, y: 300 },
    _default:   { x: 750, y: 240 },
  },
};

// Quality colour thresholds
function qColor(pct) {
  if ((pct || 0) >= 80) return 'var(--live)';
  if ((pct || 0) >= 60) return 'var(--warn)';
  return 'var(--t2)';
}

// ─── Deposit marker positioning ────────────────────────────────────────────────

function resolveDepositPositions(deposits) {
  const bodyCounters = {};
  return deposits.map((deposit) => {
    const sys = (deposit.system_name || 'STANTON').toUpperCase();
    const lookup = BODY_LOOKUP[sys] || BODY_LOOKUP.STANTON;
    const loc = (deposit.location_detail || '').toLowerCase();

    let base = lookup._default;
    for (const [key, pos] of Object.entries(lookup)) {
      if (key !== '_default' && loc.includes(key)) {
        base = pos;
        break;
      }
    }

    const bKey = `${sys}:${base.x},${base.y}`;
    if (!bodyCounters[bKey]) bodyCounters[bKey] = 0;
    const idx = bodyCounters[bKey]++;

    // Golden-angle scatter around body
    const angle = idx * 2.399;
    const r = 18 + (idx % 4) * 10;
    return {
      id: deposit.id,
      x: base.x + r * Math.cos(angle),
      y: base.y + r * Math.sin(angle),
    };
  });
}

// ─── SystemMap ────────────────────────────────────────────────────────────────

export default function SystemMap({
  deposits = [],
  blueprints = [],
  liveOp,
  filterState,
  onFilterChange,
  onSelectDeposit,
  selectedDepositId,
}) {
  const { system, material, qualityMin, staleness, heatmap, opOverlay } = filterState;

  // Unique materials in deposit data for filter chips
  const materialChips = useMemo(() => {
    const seen = new Set();
    deposits.forEach(d => {
      if (d.material_name) seen.add(d.material_name.toUpperCase());
    });
    return Array.from(seen).slice(0, 12);
  }, [deposits]);

  // Craft-target deposit ids: deposits whose material matches any priority blueprint ingredient
  const craftTargetMaterials = useMemo(() => {
    const mats = new Set();
    if (!opOverlay || !liveOp) return mats;
    blueprints.forEach(bp => {
      if (bp.is_priority) {
        (bp.recipe_materials || []).forEach(ing => {
          if (ing.material_name) mats.add(ing.material_name.toLowerCase());
        });
      }
    });
    return mats;
  }, [blueprints, liveOp, opOverlay]);

  // Filter deposits
  const visibleDeposits = useMemo(() => {
    const now = Date.now();
    return deposits.filter(d => {
      if (system !== 'ALL' && (d.system_name || '').toUpperCase() !== system) return false;
      if (material !== 'ALL' && (d.material_name || '').toUpperCase() !== material) return false;
      if ((d.quality_pct || 0) < qualityMin) return false;
      if (staleness === 'FRESH') {
        const age = now - new Date(d.reported_at || 0).getTime();
        if (age > 86400000 || d.is_stale) return false;
      } else if (staleness === 'WEEK') {
        const age = now - new Date(d.reported_at || 0).getTime();
        if (age > 604800000 || d.is_stale) return false;
      }
      return true;
    });
  }, [deposits, system, material, qualityMin, staleness]);

  // Deposit SVG positions
  const positions = useMemo(() => resolveDepositPositions(visibleDeposits), [visibleDeposits]);

  // Heatmap density: count + avg quality per body key
  const heatNodes = useMemo(() => {
    if (!heatmap) return [];
    const groups = {};
    visibleDeposits.forEach((d, i) => {
      const pos = positions[i];
      // Round to nearest 20px grid to group nearby markers
      const gx = Math.round(pos.x / 40) * 40;
      const gy = Math.round(pos.y / 40) * 40;
      const key = `${gx},${gy}`;
      if (!groups[key]) groups[key] = { x: gx, y: gy, count: 0, totalQ: 0 };
      groups[key].count++;
      groups[key].totalQ += (d.quality_pct || 0);
    });
    return Object.values(groups).map(g => ({ ...g, avgQ: g.totalQ / g.count }));
  }, [heatmap, visibleDeposits, positions]);

  // Systems to render (filtered)
  const visibleSystems = useMemo(() => {
    if (system === 'ALL') return Object.values(SYSTEMS);
    return Object.values(SYSTEMS).filter(s => s.label === system);
  }, [system]);

  const [hoveredDepositId, setHoveredDepositId] = useState(null);

  const svgW = 900, svgH = 480;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {/* System filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['ALL', 'STANTON', 'PYRO', 'NYX'].map(s => (
            <Chip
              key={s}
              label={s}
              active={system === s}
              onClick={() => onFilterChange({ system: s })}
              systemChip={s !== 'ALL'}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--b1)', flexShrink: 0 }} />

        {/* Material filter chips (dynamic) */}
        {materialChips.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <Chip
              label="ALL MAT"
              active={material === 'ALL'}
              onClick={() => onFilterChange({ material: 'ALL' })}
            />
            {materialChips.map(m => (
              <Chip
                key={m}
                label={m[0]}
                active={material === m}
                onClick={() => onFilterChange({ material: material === m ? 'ALL' : m })}
              />
            ))}
          </div>
        )}

        <div style={{ width: 1, height: 16, background: 'var(--b1)', flexShrink: 0 }} />

        {/* Quality slider + T2 preset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            MIN {qualityMin}%
          </span>
          <input
            type="range" min={0} max={100} step={5}
            value={qualityMin}
            onChange={e => onFilterChange({ qualityMin: parseInt(e.target.value) })}
            style={{ width: 70, accentColor: 'var(--acc)' }}
          />
          <button
            onClick={() => onFilterChange({ qualityMin: 80 })}
            style={{
              padding: '2px 6px', fontSize: 9, letterSpacing: '0.06em',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              border: qualityMin === 80 ? '0.5px solid rgba(var(--live-rgb), 0.4)' : '0.5px solid var(--b1)',
              background: qualityMin === 80 ? 'rgba(var(--live-rgb), 0.06)' : 'var(--bg2)',
              color: qualityMin === 80 ? 'var(--live)' : 'var(--t2)',
            }}
          >
            T2
          </button>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--b1)', flexShrink: 0 }} />

        {/* Staleness filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['ALL', 'FRESH', 'WEEK'].map(s => (
            <Chip
              key={s}
              label={s}
              active={staleness === s}
              onClick={() => onFilterChange({ staleness: s })}
            />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Heatmap toggle */}
        <IconBtn
          icon={Layers}
          active={heatmap}
          title="Toggle heatmap"
          onClick={() => onFilterChange({ heatmap: !heatmap })}
        />

        {/* Op overlay toggle — only relevant when live op exists */}
        <IconBtn
          icon={Crosshair}
          active={opOverlay}
          title={liveOp ? 'Toggle op overlay' : 'No live op'}
          onClick={() => liveOp && onFilterChange({ opOverlay: !opOverlay })}
        />
      </div>

      {/* ── SVG Map ─────────────────────────────────────────────────────────── */}
      {visibleDeposits.length === 0 ? (
        <div style={{
          background: 'var(--bg0)',
          border: '0.5px solid var(--b1)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <EmptyState
            icon={MapPin}
            title="No deposits logged"
            detail="Log a scout deposit to begin tracking resource locations."
          />
        </div>
      ) : (
      <div style={{
        position: 'relative',
        background: 'var(--bg0)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: 'block' }}
        >
          {/* Background */}
          <rect width={svgW} height={svgH} fill="var(--bg0)" />

          {/* Star scatter */}
          {Array.from({ length: 60 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 137.508) % svgW}
              cy={(i * 91.237) % svgH}
              r={0.5 + (i % 3) * 0.3}
              fill="var(--t0)"
              opacity={0.06 + (i % 7) * 0.02}
            />
          ))}

          {/* Region dividers */}
          <line x1={300} y1={0} x2={300} y2={svgH} stroke="var(--b0)" strokeWidth={0.5} strokeDasharray="4 6" opacity={0.6} />
          <line x1={600} y1={0} x2={600} y2={svgH} stroke="var(--b0)" strokeWidth={0.5} strokeDasharray="4 6" opacity={0.6} />

          {/* Systems */}
          {Object.values(SYSTEMS).map(sys => {
            const hidden = system !== 'ALL' && sys.label !== system;
            if (hidden) return null;
            const { star } = sys;
            return (
              <g key={sys.label} opacity={1}>
                {/* System label */}
                <text
                  x={star.x}
                  y={22}
                  textAnchor="middle"
                  fill="var(--t3)"
                  fontSize={10}
                  letterSpacing="0.12em"
                  fontFamily="monospace"
                >
                  {sys.label}
                </text>

                {/* Orbital rings */}
                {sys.orbits.map((orbit, oi) => (
                  <ellipse
                    key={oi}
                    cx={star.x} cy={star.y}
                    rx={orbit.rx} ry={orbit.ry}
                    fill="none"
                    stroke="var(--b0)"
                    strokeWidth={0.5}
                  />
                ))}

                {/* Central star */}
                <circle
                  cx={star.x} cy={star.y}
                  r={8}
                  fill="var(--t3)"
                  opacity={0.8}
                />
                <circle
                  cx={star.x} cy={star.y}
                  r={4}
                  fill="var(--acc2)"
                  opacity={0.5}
                />

                {/* Bodies */}
                {sys.bodies.map(body => {
                  if (body.belt) {
                    return (
                      <g key={body.name}>
                        <ellipse
                          cx={body.x} cy={body.y}
                          rx={body.beltRx || 20} ry={body.beltRy || 8}
                          fill="none"
                          stroke="var(--b2)"
                          strokeWidth={1}
                          strokeDasharray="2 3"
                          opacity={0.6}
                        />
                        <text
                          x={body.x}
                          y={body.y + (body.beltRy || 8) + 10}
                          textAnchor="middle"
                          fill="var(--t3)"
                          fontSize={7}
                          fontFamily="monospace"
                        >
                          {body.name}
                        </text>
                      </g>
                    );
                  }
                  return (
                    <g key={body.name}>
                      <circle
                        cx={body.x} cy={body.y}
                        r={body.r || 4}
                        fill="var(--bg3)"
                        stroke="var(--b2)"
                        strokeWidth={0.5}
                      />
                      <text
                        x={body.x}
                        y={body.y + (body.r || 4) + 9}
                        textAnchor="middle"
                        fill="var(--t3)"
                        fontSize={7}
                        fontFamily="monospace"
                      >
                        {body.note || body.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Heatmap overlay */}
          {heatmap && heatNodes.map((node, i) => {
            const col = node.avgQ >= 80 ? 'rgba(var(--live-rgb), ' : node.avgQ >= 60 ? 'rgba(var(--warn-rgb), ' : 'rgba(74,80,104,';
            const opacity = Math.min(0.35, 0.07 * node.count);
            return (
              <circle
                key={i}
                cx={node.x} cy={node.y}
                r={30 + node.count * 4}
                fill={`${col}${opacity})`}
              />
            );
          })}

          {/* Deposit markers */}
          {visibleDeposits.map((deposit, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const col = qColor(deposit.quality_pct);
            const stale = deposit.is_stale;
            const selected = deposit.id === selectedDepositId;
            const hovered = deposit.id === hoveredDepositId;
            const isCraftTarget = opOverlay && liveOp &&
              craftTargetMaterials.has((deposit.material_name || '').toLowerCase());

            return (
              <g
                key={deposit.id}
                opacity={stale ? 0.4 : 1}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectDeposit(deposit)}
                onMouseEnter={() => setHoveredDepositId(deposit.id)}
                onMouseLeave={() => setHoveredDepositId(null)}
              >
                {/* Selection / hover ring */}
                {(selected || hovered) && (
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={18}
                    fill="none"
                    stroke={col}
                    strokeWidth={selected ? 1 : 0.5}
                    opacity={selected ? 0.7 : 0.4}
                  />
                )}

                {/* Marker circle stroke — dashed when stale */}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={13}
                  fill="none"
                  stroke={col}
                  strokeWidth={0.75}
                  strokeDasharray={stale ? '2 2' : 'none'}
                  opacity={0.6}
                />

                {/* Quality label (above token) */}
                {deposit.quality_pct != null && (
                  <text
                    x={pos.x}
                    y={pos.y - 18}
                    textAnchor="middle"
                    fill={col}
                    fontSize={8}
                    fontFamily="monospace"
                    fontWeight={600}
                  >
                    {Math.round(deposit.quality_pct)}%
                  </text>
                )}

                {/* NexusToken deposit marker — 28px centred on pos */}
                <foreignObject
                  x={pos.x - 14}
                  y={pos.y - 14}
                  width={28}
                  height={28}
                  style={{ overflow: 'visible' }}
                >
                  <NexusToken
                    src={depositToken(deposit.quality_pct, stale, isCraftTarget)}
                    size={28}
                    pulse={isCraftTarget ? 'warn' : false}
                    alt={deposit.material_name || 'deposit'}
                    title={deposit.material_name}
                  />
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* Map status bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '4px 10px',
          background: 'rgba(var(--bg0-rgb), 0.75)',
          display: 'flex', gap: 14,
        }}>
          <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em' }}>
            {visibleDeposits.length} deposits
          </span>
          <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em' }}>
            {visibleDeposits.filter(d => !d.is_stale).length} fresh
          </span>
          <span style={{ color: 'var(--live)', fontSize: 9, letterSpacing: '0.08em' }}>
            {visibleDeposits.filter(d => (d.quality_pct || 0) >= 80).length} T2
          </span>
          {liveOp && (
            <span style={{ color: 'var(--warn)', fontSize: 9, letterSpacing: '0.08em' }}>
              ● LIVE: {liveOp.name}
            </span>
          )}
        </div>
      </div>
      )}
    </div>
  );
}