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
 *
 * Tooltips:
 *   Material chips — hover to see full name, type/tier, deposit stats, systems, uses.
 *   Deposit markers — hover to see quality, location, volume, risk, scout, age, votes.
 */
import React, { useMemo, useState, useRef } from 'react';
import { Layers, Crosshair, MapPin } from 'lucide-react';
import NexusToken from '@/core/design/NexusToken';
import { depositToken } from '@/core/data/tokenMap';
import EmptyState from '@/core/design/EmptyState';
import { Chip, MaterialChip, IconBtn } from './SystemMapControls';
import { relativeTime, RISK_COLORS } from './DepositPanelModes';

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
      { name: 'Delamar',      x: 750, y: 186, r: 4, belt: false },
      { name: 'Glaciem Ring', x: 710, y: 294, r: 0, belt: true,  beltRx: 22, beltRy: 8 },
      { name: 'Keeger Belt',  x: 792, y: 268, r: 0, belt: true,  beltRx: 22, beltRy: 8 },
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

// ─── Star Citizen material knowledge base ─────────────────────────────────────
// Used to populate material chip tooltips with context beyond deposit stats.

const MATERIAL_DATA = {
  QUANTANIUM: {
    label: 'Quantanium',
    type: 'RAW MINERAL',
    tier: 'ULTRA-RARE · T2+',
    desc: 'Highly unstable quantum-resonant ore. Degrades minutes after extraction — return to outpost immediately.',
    uses: 'Quantum drives, advanced electronics',
  },
  BEXALITE: {
    label: 'Bexalite',
    type: 'RAW MINERAL',
    tier: 'RARE · T2',
    desc: 'Dense crystalline ore prized for heat-management components. Found primarily in high-risk asteroid fields.',
    uses: 'Coolers, heat exchangers, T2 components',
  },
  AGRICIUM: {
    label: 'Agricium',
    type: 'RAW MINERAL',
    tier: 'RARE · T2',
    desc: 'Silvery metallic mineral with strong conductivity properties. Concentrated deposits near planetary bodies.',
    uses: 'Power plants, shields, T2 electronics',
  },
  LARANITE: {
    label: 'Laranite',
    type: 'RAW MINERAL',
    tier: 'COMMON · T2',
    desc: 'High-density metallic ore and the primary T2 crafting input for Redscar industrial runs.',
    uses: 'Armor components, structural T2 parts',
  },
  TARANITE: {
    label: 'Taranite',
    type: 'RAW MINERAL',
    tier: 'UNCOMMON · T2',
    desc: 'Bronze-tinted ore valued for its balance of yield and refinery efficiency. Reliable T2 source.',
    uses: 'T2 weapons, vehicle components',
  },
  HEPHAESTANITE: {
    label: 'Hephaestanite',
    type: 'RAW MINERAL',
    tier: 'UNCOMMON · T2',
    desc: 'Volcanic-origin silicate mineral with high concentrations in active geological zones.',
    uses: 'Drives, thrusters, T2 powerplant parts',
  },
  HADANITE: {
    label: 'Hadanite',
    type: 'RAW MINERAL',
    tier: 'PYRO-EXCLUSIVE · T2',
    desc: 'Found only in the Pyro system. Extreme heat environment makes extraction dangerous but rewarding.',
    uses: 'High-heat components, Pyro-specific builds',
  },
  APHORITE: {
    label: 'Aphorite',
    type: 'RAW MINERAL',
    tier: 'PYRO-EXCLUSIVE',
    desc: 'Lightweight crystalline ore native to Pyro. Lower yield but useful for specific component recipes.',
    uses: 'Electronic assemblies, consumables',
  },
  BORASE: {
    label: 'Borase',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Widely distributed mineral compound. Low individual value but abundant in bulk.',
    uses: 'Basic components, trade commodity',
  },
  TITANIUM: {
    label: 'Titanium',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Structural metal found across all systems. Foundation material for most manufacturing chains.',
    uses: 'Hull plates, structural components',
  },
  GOLD: {
    label: 'Gold',
    type: 'PRECIOUS MINERAL',
    tier: 'UNCOMMON',
    desc: 'Conductive precious metal. Stable trade value and reliable commodity across all factions.',
    uses: 'Electronics, trade commodity',
  },
  DIAMOND: {
    label: 'Diamond',
    type: 'PRECIOUS MINERAL',
    tier: 'UNCOMMON',
    desc: 'Crystalline carbon allotrope. Industrial-grade diamonds are core to cutting and drilling tooling.',
    uses: 'Industrial tooling, luxury trade',
  },
  TUNGSTEN: {
    label: 'Tungsten',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'High-density refractory metal valued for ballistic and high-temperature applications.',
    uses: 'Ballistic weapons, heat-resistant parts',
  },
  SILICON: {
    label: 'Silicon',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Semiconductor mineral present in most asteroid fields. Backbone of electronics manufacturing.',
    uses: 'Electronics, sensor components',
  },
  ALUMINIUM: {
    label: 'Aluminium',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Lightweight structural metal. Ubiquitous and essential in large quantities.',
    uses: 'Frames, panels, trade commodity',
  },
  ALUMINUM: {
    label: 'Aluminum',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Lightweight structural metal. Ubiquitous and essential in large quantities.',
    uses: 'Frames, panels, trade commodity',
  },
  COPPER: {
    label: 'Copper',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Conductive metal with broad industrial applications. Consistent commodity value.',
    uses: 'Wiring, cooling systems',
  },
  IRON: {
    label: 'Iron',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Base ferrous mineral. Required for steel and alloy production in bulk.',
    uses: 'Alloys, basic manufacturing',
  },
  QUARTZ: {
    label: 'Quartz',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Common silicate mineral useful in optics and electronics at refined grade.',
    uses: 'Optics, sensor glass',
  },
  BERYL: {
    label: 'Beryl',
    type: 'RAW MINERAL',
    tier: 'UNCOMMON',
    desc: 'Beryllium silicate mineral. Lightweight and radiation-resistant, valued in shielded components.',
    uses: 'Shields, radiation-resistant parts',
  },
  CORUNDUM: {
    label: 'Corundum',
    type: 'RAW MINERAL',
    tier: 'UNCOMMON',
    desc: 'Extremely hard aluminium oxide mineral with abrasive and optical applications.',
    uses: 'Abrasives, optical components',
  },
  RMC: {
    label: 'Recycled Material Composite',
    type: 'SALVAGE',
    tier: 'SALVAGE',
    desc: 'Processed output from derelict hull work. Variable composition, consistent market demand.',
    uses: 'General manufacturing, trade',
  },
  'RECYCLED MATERIAL COMPOSITE': {
    label: 'Recycled Material Composite',
    type: 'SALVAGE',
    tier: 'SALVAGE',
    desc: 'Processed output from derelict hull work. Variable composition, consistent market demand.',
    uses: 'General manufacturing, trade',
  },
  STILERON: {
    label: 'Stileron',
    type: 'SALVAGE',
    tier: 'SALVAGE',
    desc: 'Refined polymer recovered from wreck scraping operations. Light, high-margin commodity.',
    uses: 'Polymer components, trade commodity',
  },
  'CONSTRUCTION MATERIALS': {
    label: 'Construction Materials',
    type: 'SALVAGE',
    tier: 'SALVAGE',
    desc: 'Bulk salvaged structural materials. Heavy but consistent value at major stations.',
    uses: 'Station repairs, bulk trade',
  },
  CHLORINE: {
    label: 'Chlorine',
    type: 'ATMOSPHERIC GAS',
    tier: 'COMMON',
    desc: 'Atmospheric gas collected during atmospheric mining operations. Chemical feedstock.',
    uses: 'Chemical components, trade',
  },
  FLUORINE: {
    label: 'Fluorine',
    type: 'ATMOSPHERIC GAS',
    tier: 'COMMON',
    desc: 'Reactive halogen gas. Valuable in trace quantities for specialized chemical processes.',
    uses: 'Chemicals, coatings',
  },
  HYDROGEN: {
    label: 'Hydrogen',
    type: 'FUEL GAS',
    tier: 'COMMON',
    desc: 'Primary propulsion fuel. Abundant in gas giant atmospheres.',
    uses: 'Ship fuel, energy production',
  },
  CARBON: {
    label: 'Carbon',
    type: 'RAW MINERAL',
    tier: 'COMMON',
    desc: 'Elemental carbon in various forms. Foundation for organic chemistry and advanced materials.',
    uses: 'Composites, carbon-fibre components',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute deposit stats for a given material name from the deposits array.
 * Returns { count, t2Count, bestQuality, systems }.
 */
function computeMaterialStats(materialName, deposits) {
  const upper = materialName.toUpperCase();
  const matching = deposits.filter(d => (d.material_name || '').toUpperCase() === upper);
  const t2Count = matching.filter(d => (d.quality_pct || 0) >= 80).length;
  const qualities = matching.map(d => d.quality_pct || 0).filter(q => q > 0);
  const bestQuality = qualities.length > 0 ? Math.max(...qualities) : null;
  const systems = [...new Set(matching.map(d => d.system_name?.toUpperCase()).filter(Boolean))];
  return { count: matching.length, t2Count, bestQuality, systems };
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

// ─── DepositMarkerTooltip ─────────────────────────────────────────────────────

function DTRow({ label, value, highlight }) {
  const valueColor =
    highlight === 'live'   ? 'var(--live)'   :
    highlight === 'warn'   ? 'var(--warn)'   :
    highlight === 'danger' ? 'var(--danger)' :
    'var(--t1)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ color: valueColor, fontSize: 9, letterSpacing: '0.06em', fontWeight: 500, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function DepositMarkerTooltip({ deposit, x, y, containerW, containerH }) {
  const TOOLTIP_W = 212;
  const TOOLTIP_H_EST = 170;
  const OFFSET_X = 18;
  const OFFSET_Y = -24;

  // Position to the right of the cursor; flip left if near right edge
  let left = x + OFFSET_X;
  let top  = y + OFFSET_Y;
  if (left + TOOLTIP_W > containerW - 8) left = x - TOOLTIP_W - OFFSET_X;
  if (left < 8) left = 8;
  if (top + TOOLTIP_H_EST > containerH - 8) top = containerH - TOOLTIP_H_EST - 8;
  if (top < 8) top = 8;

  const qPct    = deposit.quality_pct;
  const isT2    = (qPct || 0) >= 80;
  const qualCol = qColor(qPct);
  const riskCol = RISK_COLORS[(deposit.risk_level || '').toUpperCase()] || 'var(--t2)';
  const age     = relativeTime(deposit.reported_at);

  return (
    <div style={{
      position: 'absolute',
      left, top,
      width: TOOLTIP_W,
      zIndex: 150,
      background: 'var(--bg3)',
      border: '0.5px solid var(--b2)',
      borderRadius: 3,
      padding: '10px 12px',
      pointerEvents: 'none',
    }}>
      {/* Header: material name + quality */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 2,
      }}>
        <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}>
          {(deposit.material_name || 'UNKNOWN').toUpperCase()}
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: qualCol, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
            {qPct != null ? `${Math.round(qPct)}%` : '—'}
          </span>
          {isT2 && (
            <span style={{
              color: 'var(--live)', fontSize: 8, fontWeight: 600, letterSpacing: '0.08em',
              border: '0.5px solid rgba(var(--live-rgb), 0.4)',
              borderRadius: 2, padding: '1px 3px',
            }}>
              T2
            </span>
          )}
        </span>
      </div>

      {/* Location */}
      <div style={{
        color: 'var(--t2)', fontSize: 9, letterSpacing: '0.06em', marginBottom: 8,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {deposit.location_detail || '—'}
        {deposit.system_name ? ` · ${deposit.system_name.toUpperCase()}` : ''}
      </div>

      <div style={{ borderTop: '0.5px solid var(--b1)', marginBottom: 8 }} />

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {deposit.volume_estimate && (
          <DTRow label="VOLUME" value={deposit.volume_estimate} />
        )}
        {deposit.risk_level && (
          <DTRow
            label="RISK"
            value={deposit.risk_level}
            highlight={
              deposit.risk_level === 'EXTREME' ? 'danger' :
              deposit.risk_level === 'HIGH'    ? 'danger' :
              deposit.risk_level === 'MEDIUM'  ? 'warn'   : null
            }
          />
        )}
        {deposit.ship_type && (
          <DTRow label="SHIP TYPE" value={deposit.ship_type} />
        )}
        {deposit.reported_by_callsign && (
          <DTRow label="SCOUT" value={deposit.reported_by_callsign} />
        )}
        <DTRow label="LOGGED" value={age} />
        {(deposit.confirmed_votes != null || deposit.stale_votes != null) && (
          <DTRow
            label="VOTES"
            value={`${deposit.confirmed_votes || 0} confirmed · ${deposit.stale_votes || 0} stale`}
            highlight={
              deposit.is_stale            ? 'danger' :
              (deposit.confirmed_votes || 0) >= 2 ? 'live' : null
            }
          />
        )}
      </div>

      {/* Notes */}
      {deposit.notes && (
        <>
          <div style={{ borderTop: '0.5px solid var(--b1)', marginTop: 8, marginBottom: 8 }} />
          <div style={{ color: 'var(--t2)', fontSize: 9, lineHeight: 1.55, letterSpacing: '0.03em' }}>
            {deposit.notes}
          </div>
        </>
      )}
    </div>
  );
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

  // Ref for the map container — used to compute tooltip position
  const containerRef = useRef(null);

  // Deposit marker hover tooltip state
  const [markerTooltip, setMarkerTooltip] = useState(null);
  // { deposit, x, y, containerW, containerH }

  // Unique materials in deposit data for filter chips
  const materialChips = useMemo(() => {
    const seen = new Set();
    deposits.forEach(d => {
      if (d.material_name) seen.add(d.material_name.toUpperCase());
    });
    return Array.from(seen).slice(0, 12);
  }, [deposits]);

  // Craft-target deposit ids
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

  // Heatmap density
  const heatNodes = useMemo(() => {
    if (!heatmap) return [];
    const groups = {};
    visibleDeposits.forEach((d, i) => {
      const pos = positions[i];
      const gx = Math.round(pos.x / 40) * 40;
      const gy = Math.round(pos.y / 40) * 40;
      const key = `${gx},${gy}`;
      if (!groups[key]) groups[key] = { x: gx, y: gy, count: 0, totalQ: 0 };
      groups[key].count++;
      groups[key].totalQ += (d.quality_pct || 0);
    });
    return Object.values(groups).map(g => ({ ...g, avgQ: g.totalQ / g.count }));
  }, [heatmap, visibleDeposits, positions]);

  // Systems to render
  const visibleSystems = useMemo(() => {
    if (system === 'ALL') return Object.values(SYSTEMS);
    return Object.values(SYSTEMS).filter(s => s.label === system);
  }, [system]);

  const [hoveredDepositId, setHoveredDepositId] = useState(null);

  const svgW = 900, svgH = 480;

  // ── Deposit marker event handlers ─────────────────────────────────────────

  const handleMarkerEnter = (e, deposit) => {
    setHoveredDepositId(deposit.id);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMarkerTooltip({
        deposit,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        containerW: rect.width,
        containerH: rect.height,
      });
    }
  };

  const handleMarkerLeave = () => {
    setHoveredDepositId(null);
    setMarkerTooltip(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
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

        {/* Material filter chips — with rich tooltips */}
        {materialChips.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <Chip
              label="ALL MAT"
              active={material === 'ALL'}
              onClick={() => onFilterChange({ material: 'ALL' })}
            />
            {materialChips.map(m => {
              const data = MATERIAL_DATA[m] || MATERIAL_DATA[m.toUpperCase()] || {};
              const stats = computeMaterialStats(m, deposits);
              const tooltipData = {
                fullName:    data.label || m,
                type:        data.type  || null,
                tier:        data.tier  || null,
                desc:        data.desc  || null,
                uses:        data.uses  || null,
                ...stats,
              };
              return (
                <MaterialChip
                  key={m}
                  materialName={m}
                  active={material === m}
                  onClick={() => onFilterChange({ material: material === m ? 'ALL' : m })}
                  tooltipData={tooltipData}
                />
              );
            })}
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
              borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
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

        {/* Op overlay toggle */}
        <IconBtn
          icon={Crosshair}
          active={opOverlay}
          title={liveOp ? 'Toggle op overlay' : 'No live op'}
          onClick={() => liveOp && onFilterChange({ opOverlay: !opOverlay })}
        />
      </div>

      {/* ── SVG Map ──────────────────────────────────────────────────────────── */}
      {visibleDeposits.length === 0 ? (
        <div style={{
          background: 'var(--bg0)',
          border: '0.5px solid var(--b1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <EmptyState
            icon={MapPin}
            title="No deposits logged"
            detail="Log a scout deposit to begin tracking resource locations."
          />
        </div>
      ) : (
        /* Outer wrapper: position:relative so the tooltip renders outside overflow:hidden */
        <div ref={containerRef} style={{ position: 'relative' }}>
          <div style={{
            background: 'var(--bg0)',
            border: '0.5px solid var(--b1)',
            borderRadius: 3,
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
                    <text
                      x={star.x} y={22}
                      textAnchor="middle"
                      fill="var(--t3)" fontSize={10}
                      letterSpacing="0.12em" fontFamily="monospace"
                    >
                      {sys.label}
                    </text>

                    {sys.orbits.map((orbit, oi) => (
                      <ellipse
                        key={oi}
                        cx={star.x} cy={star.y}
                        rx={orbit.rx} ry={orbit.ry}
                        fill="none" stroke="var(--b0)" strokeWidth={0.5}
                      />
                    ))}

                    <circle cx={star.x} cy={star.y} r={8} fill="var(--t3)" opacity={0.8} />
                    <circle cx={star.x} cy={star.y} r={4} fill="var(--acc2)" opacity={0.5} />

                    {sys.bodies.map(body => {
                      if (body.belt) {
                        return (
                          <g key={body.name}>
                            <ellipse
                              cx={body.x} cy={body.y}
                              rx={body.beltRx || 20} ry={body.beltRy || 8}
                              fill="none" stroke="var(--b2)" strokeWidth={1}
                              strokeDasharray="2 3" opacity={0.6}
                            />
                            <text
                              x={body.x} y={body.y + (body.beltRy || 8) + 10}
                              textAnchor="middle" fill="var(--t3)"
                              fontSize={7} fontFamily="monospace"
                            >
                              {body.name}
                            </text>
                          </g>
                        );
                      }
                      return (
                        <g key={body.name}>
                          <circle
                            cx={body.x} cy={body.y} r={body.r || 4}
                            fill="var(--bg3)" stroke="var(--b2)" strokeWidth={0.5}
                          />
                          <text
                            x={body.x} y={body.y + (body.r || 4) + 9}
                            textAnchor="middle" fill="var(--t3)"
                            fontSize={7} fontFamily="monospace"
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
                const col      = qColor(deposit.quality_pct);
                const stale    = deposit.is_stale;
                const selected = deposit.id === selectedDepositId;
                const hovered  = deposit.id === hoveredDepositId;
                const isCraftTarget = opOverlay && liveOp &&
                  craftTargetMaterials.has((deposit.material_name || '').toLowerCase());

                return (
                  <g
                    key={deposit.id}
                    opacity={stale ? 0.4 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectDeposit(deposit)}
                    onMouseEnter={e => handleMarkerEnter(e, deposit)}
                    onMouseLeave={handleMarkerLeave}
                  >
                    {/* Selection / hover ring */}
                    {(selected || hovered) && (
                      <circle
                        cx={pos.x} cy={pos.y} r={18}
                        fill="none" stroke={col}
                        strokeWidth={selected ? 1 : 0.5}
                        opacity={selected ? 0.7 : 0.4}
                      />
                    )}

                    {/* Marker circle — dashed when stale */}
                    <circle
                      cx={pos.x} cy={pos.y} r={13}
                      fill="none" stroke={col} strokeWidth={0.75}
                      strokeDasharray={stale ? '2 2' : 'none'}
                      opacity={0.6}
                    />

                    {/* Quality label */}
                    {deposit.quality_pct != null && (
                      <text
                        x={pos.x} y={pos.y - 18}
                        textAnchor="middle"
                        fill={col} fontSize={8}
                        fontFamily="monospace" fontWeight={600}
                      >
                        {Math.round(deposit.quality_pct)}%
                      </text>
                    )}

                    {/* NexusToken deposit marker */}
                    <foreignObject
                      x={pos.x - 14} y={pos.y - 14}
                      width={28} height={28}
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

          {/* Deposit marker tooltip — rendered outside overflow:hidden */}
          {markerTooltip && (
            <DepositMarkerTooltip
              deposit={markerTooltip.deposit}
              x={markerTooltip.x}
              y={markerTooltip.y}
              containerW={markerTooltip.containerW}
              containerH={markerTooltip.containerH}
            />
          )}
        </div>
      )}
    </div>
  );
}
