import React, { useEffect, useMemo, useState } from 'react';
import {
  Save,
  Search,
  Layers3,
  Wrench,
  RotateCcw,
  Radar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import shipComponents from '@/apps/armory/assets/ships/index.jsx';
import { fleetPlanningApi } from '@/core/data/fleet-planning-api';

const COMPONENT_TABS = ['Compatible', 'Owned', 'Buyable', 'All'];
const SHIP_GLYPH_MAP = {
  prospector: shipComponents.Prospector,
  mole: shipComponents.Mole,
  caterpillar: shipComponents.Caterpillar,
  'c2-hercules': shipComponents.C2Hercules,
  'hull-c': shipComponents.HullC,
  arrow: shipComponents.Arrow,
  gladius: shipComponents.Gladius,
  'cutlass-black': shipComponents.CutlassBlack,
  carrack: shipComponents.Carrack,
  pisces: shipComponents.Pisces,
  razor: shipComponents.Razor,
};

function resolveGlyph(assetKey) {
  const normalized = String(assetKey || '').toLowerCase();
  return SHIP_GLYPH_MAP[normalized]
    || Object.entries(SHIP_GLYPH_MAP).find(([key]) => normalized.includes(key) || key.includes(normalized))?.[1]
    || null;
}

function ShipGlyph({ assetKey, size = 60, showHardpoints = false, onHardpointClick = undefined }) {
  const Glyph = resolveGlyph(assetKey);
  if (!Glyph) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid var(--b1)', color: 'var(--t3)', fontSize: 9 }}>
        SHIP
      </div>
    );
  }
  return <Glyph size={size} colour="var(--acc)" showHardpoints={showHardpoints} onHardpointClick={onHardpointClick} />;
}

function flattenSlots(ship) {
  return (ship?.sections || []).flatMap((section) => (section?.slots || []).map((slot) => ({
    ...slot,
    section_id: section.id,
    section_label: section.label,
  })));
}

function normalizeLoadoutEntries(entries = []) {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        hardpoint_id: String(entry?.hardpoint_id || entry?.id || ''),
        component_id: String(entry?.component_id || entry?.id || ''),
        component_name: String(entry?.component_name || entry?.name || ''),
        manufacturer: String(entry?.manufacturer || ''),
        slot_type: String(entry?.slot_type || entry?.type || ''),
        slot_size: Number(entry?.slot_size || entry?.size || 0) || 0,
        is_owned: Boolean(entry?.is_owned),
        owned_quantity: Number(entry?.owned_quantity || 0) || 0,
        buy_locations: Array.isArray(entry?.buy_locations) ? entry.buy_locations : [],
        source_locations: Array.isArray(entry?.source_locations) ? entry.source_locations : [],
        role_keywords: Array.isArray(entry?.role_keywords) ? entry.role_keywords : [],
        grade: String(entry?.grade || ''),
        class_rating: String(entry?.class_rating || ''),
      }))
    : [];
}

function componentMatchesSlot(component, slot) {
  const expectedType = String(slot?.slot_type || '').toLowerCase();
  const componentType = String(component?.slot_type || '').toLowerCase();
  const compatibleTypes = {
    weapon: ['weapon', 'turret'],
    turret: ['turret', 'weapon'],
    missile: ['missile'],
    utility: ['utility', 'sensor'],
    sensor: ['sensor', 'utility'],
    'mining-arm': ['mining-arm', 'mining-turret', 'utility'],
    'mining-turret': ['mining-turret', 'mining-arm'],
  }[expectedType] || [expectedType];

  return compatibleTypes.includes(componentType)
    && (!slot?.slot_size || !component?.slot_size || Number(component.slot_size) === Number(slot.slot_size));
}

function componentScore(component, slot, ship) {
  let score = componentMatchesSlot(component, slot) ? 100 : 0;
  if (component?.is_owned) score += 24;
  if (component?.is_buyable) score += 12;
  if ((component?.role_keywords || []).some((keyword) => (ship?.role_tags || []).includes(keyword))) score += 10;
  if (component?.grade === 'A') score += 10;
  else if (component?.grade === 'B') score += 7;
  else if (component?.grade === 'C') score += 4;
  return score;
}

function buildDeltaStats(ship, baselineEntries, equippedEntries) {
  const baseline = {
    shield: Number(ship?.shield_hp || 0),
    hull: Number(ship?.hull_hp || ship?.mass * 0.6 || 0),
    fuel: Math.max(10, Number(ship?.mass || 0) / 200),
    cargo: Number(ship?.cargo_scu || 0),
    crew: Math.max(1, Number(ship?.crew_max || 1)),
    speed: Number(ship?.speed_max || 0),
    quantum: Math.max(20, Number(ship?.speed_scm || 0)),
  };

  const modifiers = equippedEntries.reduce((acc, entry) => {
    const slotType = String(entry?.slot_type || '');
    const size = Number(entry?.slot_size || 1) || 1;
    const grade = String(entry?.grade || '').toUpperCase();
    const gradeBonus = grade === 'A' ? 1.08 : grade === 'B' ? 1.05 : grade === 'C' ? 1.02 : 1;
    if (slotType === 'shield') acc.shield += 8 * size * gradeBonus;
    if (slotType === 'power-plant') acc.hull += 2 * size * gradeBonus;
    if (slotType === 'cooler') acc.speed += 1.5 * size * gradeBonus;
    if (slotType === 'quantum-drive') acc.quantum += 4 * size * gradeBonus;
    if (slotType === 'mining-arm' || slotType === 'mining-turret') acc.cargo += 1 * size;
    if (slotType === 'sensor' || slotType === 'utility') acc.crew += 0.1 * size;
    return acc;
  }, { shield: 0, hull: 0, fuel: 0, cargo: 0, crew: 0, speed: 0, quantum: 0 });

  const completionFactor = Math.min(1.12, Math.max(0.72, (equippedEntries.length || 1) / (baselineEntries.length || 1)));
  return {
    baseline,
    current: {
      shield: Math.round((baseline.shield * completionFactor) + modifiers.shield),
      hull: Math.round((baseline.hull * completionFactor) + modifiers.hull),
      fuel: Math.round((baseline.fuel + modifiers.fuel) * 10) / 10,
      cargo: Math.round(baseline.cargo + modifiers.cargo),
      crew: Math.round((baseline.crew + modifiers.crew) * 10) / 10,
      speed: Math.round((baseline.speed * completionFactor) + modifiers.speed),
      quantum: Math.round((baseline.quantum * completionFactor) + modifiers.quantum),
    },
  };
}

function loadoutToLegacyHardpoints(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.hardpoint_id] = {
      id: entry.component_id,
      name: entry.component_name,
      manufacturer: entry.manufacturer,
      slot_type: entry.slot_type,
      slot_size: entry.slot_size,
      is_owned: entry.is_owned,
      buy_locations: entry.buy_locations,
      source_locations: entry.source_locations,
      role_keywords: entry.role_keywords,
      grade: entry.grade,
      class_rating: entry.class_rating,
    };
    return acc;
  }, {});
}

function DeltaTooltip({ active = false, payload = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', padding: '8px 10px', fontSize: 10 }}>
      <div style={{ color: 'var(--t0)', marginBottom: 4 }}>{payload[0]?.payload?.label}</div>
      <div style={{ color: 'var(--t2)' }}>Stock: {payload[0]?.payload?.stock}</div>
      <div style={{ color: 'var(--acc)' }}>Current: {payload[0]?.payload?.current}</div>
      <div style={{ color: 'var(--warn)' }}>Delta: {payload[0]?.payload?.delta > 0 ? '+' : ''}{payload[0]?.payload?.delta}</div>
    </div>
  );
}

export default function FleetForgeShipFitting({
  catalog,
  user,
  onBuildSaved,
}) {
  const ships = Array.isArray(catalog?.ships) ? catalog.ships : [];
  const allComponents = Array.isArray(catalog?.components) ? catalog.components : [];
  const [shipPickerOpen, setShipPickerOpen] = useState(false);
  const [shipSearch, setShipSearch] = useState('');
  const [selectedShipSlug, setSelectedShipSlug] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [componentTab, setComponentTab] = useState('Compatible');
  const [componentQuery, setComponentQuery] = useState('');
  const [buildName, setBuildName] = useState('');
  const [canonicalLevel, setCanonicalLevel] = useState('PERSONAL');
  const [equippedLoadout, setEquippedLoadout] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedShipSlug && ships.length) {
      const preferred = ships.find((ship) => ship.supported) || ships[0];
      setSelectedShipSlug(preferred?.ship_slug || '');
    }
  }, [selectedShipSlug, ships]);

  const selectedShip = useMemo(
    () => ships.find((ship) => ship.ship_slug === selectedShipSlug) || null,
    [selectedShipSlug, ships],
  );

  const slots = useMemo(() => flattenSlots(selectedShip), [selectedShip]);
  const baselineLoadout = useMemo(() => normalizeLoadoutEntries(selectedShip?.default_loadout), [selectedShip]);
  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId) || slots[0] || null, [selectedSlotId, slots]);

  useEffect(() => {
    if (!selectedShip) return;
    setBuildName(`${selectedShip.name} Stock Fit`);
    setEquippedLoadout(baselineLoadout);
    setSelectedSlotId(slots[0]?.id || '');
  }, [selectedShip, baselineLoadout, slots]);

  const currentLoadoutMap = useMemo(
    () => new Map(equippedLoadout.map((entry) => [entry.hardpoint_id, entry])),
    [equippedLoadout],
  );

  const compatibleComponents = useMemo(() => {
    const filtered = allComponents.filter((component) => {
      if (!selectedSlot) return false;
      if (!componentMatchesSlot(component, selectedSlot)) return false;
      if (componentTab === 'Owned' && !component.is_owned) return false;
      if (componentTab === 'Buyable' && !component.is_buyable) return false;
      if (componentQuery && !`${component.name} ${component.manufacturer} ${(component.role_keywords || []).join(' ')}`.toLowerCase().includes(componentQuery.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((left, right) => componentScore(right, selectedSlot, selectedShip) - componentScore(left, selectedSlot, selectedShip)).slice(0, 120);
  }, [allComponents, componentQuery, componentTab, selectedShip, selectedSlot]);

  const filteredShips = useMemo(() => {
    return ships.filter((ship) => {
      if (!shipSearch.trim()) return true;
      return `${ship.name} ${ship.manufacturer} ${ship.ship_class} ${ship.role} ${(ship.role_tags || []).join(' ')}`.toLowerCase().includes(shipSearch.trim().toLowerCase());
    });
  }, [shipSearch, ships]);

  const deltaStats = useMemo(() => buildDeltaStats(selectedShip, baselineLoadout, equippedLoadout), [selectedShip, baselineLoadout, equippedLoadout]);
  const deltaChart = useMemo(() => ([
    { label: 'Shield', stock: deltaStats.baseline.shield, current: deltaStats.current.shield },
    { label: 'Hull', stock: deltaStats.baseline.hull, current: deltaStats.current.hull },
    { label: 'Fuel', stock: deltaStats.baseline.fuel, current: deltaStats.current.fuel },
    { label: 'Cargo', stock: deltaStats.baseline.cargo, current: deltaStats.current.cargo },
    { label: 'Crew', stock: deltaStats.baseline.crew, current: deltaStats.current.crew },
    { label: 'Speed', stock: deltaStats.baseline.speed, current: deltaStats.current.speed },
    { label: 'Quantum', stock: deltaStats.baseline.quantum, current: deltaStats.current.quantum },
  ]).map((entry) => ({ ...entry, delta: Math.round((entry.current - entry.stock) * 10) / 10 })), [deltaStats]);

  async function saveBuild() {
    if (!selectedShip?.supported) return;
    setSaving(true);
    try {
      const payload = {
        ship_name: selectedShip.name,
        ship_vehicle_id: selectedShip.id,
        ship_slug: selectedShip.ship_slug,
        build_name: buildName,
        role_tag: selectedShip.role,
        created_by_user_id: user?.id || null,
        created_by_callsign: user?.callsign || 'UNKNOWN',
        canonical_level: canonicalLevel,
        manifest_version: catalog?.manifest_version || null,
        baseline_loadout_json: baselineLoadout,
        equipped_loadout_json: equippedLoadout,
        delta_stats_json: deltaStats,
        hardpoints: loadoutToLegacyHardpoints(equippedLoadout),
        stats_snapshot: { readiness_score: 0, delta_stats: deltaStats },
        is_org_canonical: canonicalLevel !== 'PERSONAL',
      };
      const record = await fleetPlanningApi.createBuild(payload);
      onBuildSaved?.(record);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 380px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ borderRight: '0.5px solid var(--b1)', padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShipGlyph assetKey={selectedShip?.viewer_asset_key || selectedShip?.ship_slug} size={52} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.16em' }}>INDIVIDUAL FITTER</div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedShip?.name || 'Select Ship'}</div>
            <div style={{ color: 'var(--t2)', fontSize: 10 }}>{selectedShip?.role || 'UNSPECIFIED'}{selectedShip?.supported ? ' · Supported' : ' · Read-only'}</div>
          </div>
        </div>

        <button type="button" className="nexus-btn" onClick={() => setShipPickerOpen(true)} style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Search size={12} /> Choose Ship</span>
          <span style={{ color: 'var(--t2)' }}>{ships.length}</span>
        </button>

        <div className="nexus-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>BUILD NAME</label>
          <input className="nexus-input" value={buildName} onChange={(event) => setBuildName(event.target.value)} />
          <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>STANDARD LEVEL</label>
          <select className="nexus-input" value={canonicalLevel} onChange={(event) => setCanonicalLevel(event.target.value)}>
            <option value="PERSONAL">PERSONAL</option>
            <option value="SQUAD">SQUAD</option>
            <option value="WING">WING</option>
            <option value="FLEET">FLEET</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <button type="button" className="nexus-btn" onClick={() => setEquippedLoadout(baselineLoadout)}><RotateCcw size={12} /> Apply Stock</button>
            <button type="button" className="nexus-btn primary" disabled={saving || !selectedShip?.supported} onClick={saveBuild}><Save size={12} /> {saving ? 'Saving' : 'Save Build'}</button>
          </div>
        </div>

        <div className="nexus-card" style={{ padding: 12 }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 10 }}>SLOT MAP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedShip?.sections?.map((section) => (
              <div key={section.id}>
                <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 6 }}>{section.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(section.slots || []).map((slot) => {
                    const equipped = currentLoadoutMap.get(slot.id);
                    const isActive = selectedSlot?.id === slot.id;
                    return (
                      <button key={slot.id} type="button" onClick={() => setSelectedSlotId(slot.id)} className="nexus-btn" style={{ justifyContent: 'space-between', background: isActive ? 'var(--bg3)' : 'var(--bg2)', borderColor: isActive ? 'var(--b2)' : 'var(--b1)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--warn)', fontSize: 9 }}>S{slot.slot_size}</span>
                          <span>{slot.label}</span>
                        </span>
                        <span style={{ color: equipped?.component_name ? 'var(--t0)' : 'var(--t3)', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{equipped?.component_name || 'Empty'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="nexus-card" style={{ padding: 10, minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <ShipGlyph
              assetKey={selectedShip?.viewer_asset_key || selectedShip?.ship_slug}
              size={320}
              showHardpoints
              onHardpointClick={(hardpoint) => setSelectedSlotId(hardpoint?.id || '')}
            />
            <div style={{ color: 'var(--t2)', fontSize: 10 }}>Click a hardpoint marker to focus that slot.</div>
          </div>
        </div>

        <div className="nexus-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>SHIP FIT DELTAS</div>
              <div style={{ color: 'var(--t0)', fontSize: 13 }}>Stock vs Current</div>
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Layers3 size={12} /> {baselineLoadout.length} slots</div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deltaChart}>
                <CartesianGrid stroke="var(--b0)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--t3)" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                <YAxis stroke="var(--t3)" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                <Tooltip content={DeltaTooltip} />
                <Bar dataKey="stock" fill="rgba(90,96,128,0.45)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="current" fill="var(--acc)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ borderLeft: '0.5px solid var(--b1)', padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>COMPONENT DRAWER</div>
            <div style={{ color: 'var(--t0)', fontSize: 14 }}>{selectedSlot?.label || 'Select a slot'}</div>
          </div>
          <div style={{ color: 'var(--warn)', fontSize: 10 }}>{selectedSlot ? `S${selectedSlot.slot_size} ${String(selectedSlot.slot_type || '').toUpperCase()}` : 'NO SLOT'}</div>
        </div>

        <input className="nexus-input" placeholder="Search compatible parts" value={componentQuery} onChange={(event) => setComponentQuery(event.target.value)} />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COMPONENT_TABS.map((tab) => (
            <button key={tab} type="button" className="nexus-btn" onClick={() => setComponentTab(tab)} style={{ background: componentTab === tab ? 'var(--bg3)' : 'var(--bg2)', borderColor: componentTab === tab ? 'var(--b2)' : 'var(--b1)' }}>
              {tab}
            </button>
          ))}
        </div>

        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden', flex: 1, minHeight: 320 }}>
          <div style={{ maxHeight: 640, overflow: 'auto' }}>
            {!selectedShip?.supported ? (
              <div style={{ padding: 18, color: 'var(--t2)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: 'var(--warn)' }}>This ship is visible in the catalog but is not yet in the curated editable manifest.</div>
                <div>The fitter is read-only until its hardpoint schema and stock loadout are added to NexusOS.</div>
              </div>
            ) : compatibleComponents.map((component) => (
              <button
                key={`${component.id}-${component.name}`}
                type="button"
                onClick={() => {
                  if (!selectedSlot) return;
                  setEquippedLoadout((current) => {
                    const next = current.filter((entry) => entry.hardpoint_id !== selectedSlot.id);
                    next.push({
                      hardpoint_id: selectedSlot.id,
                      component_id: component.id,
                      component_name: component.name,
                      manufacturer: component.manufacturer,
                      slot_type: component.slot_type,
                      slot_size: component.slot_size,
                      is_owned: component.is_owned,
                      owned_quantity: component.owned_quantity,
                      buy_locations: component.buy_locations,
                      source_locations: component.source_locations,
                      role_keywords: component.role_keywords,
                      grade: component.grade,
                      class_rating: component.class_rating,
                    });
                    return next;
                  });
                }}
                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: '0.5px solid var(--b0)', background: 'transparent', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{component.name}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 10 }}>{component.manufacturer || 'Unknown'} · {component.grade || 'Stock'} {component.class_rating || ''}</div>
                  </div>
                  <div style={{ color: component.is_owned ? 'var(--live)' : component.is_buyable ? 'var(--warn)' : 'var(--t3)', fontSize: 10, flexShrink: 0 }}>
                    {component.is_owned ? `OWNED ${component.owned_quantity || ''}` : component.is_buyable ? 'BUYABLE' : 'UNSOURCED'}
                  </div>
                </div>
              </button>
            ))}
            {!compatibleComponents.length && (
              <div style={{ padding: 18, color: 'var(--t2)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}><Wrench size={12} /> No compatible components match the active filters.</div>
            )}
          </div>
        </div>

        <div className="nexus-card" style={{ padding: 12 }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>CURRENT SLOT</div>
          {selectedSlot ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: 'var(--t0)', fontSize: 13 }}>{currentLoadoutMap.get(selectedSlot.id)?.component_name || 'No component installed'}</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>Ship role tags: {(selectedShip?.role_tags || []).join(' · ') || 'General'}</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>Source visibility: use Owned or Buyable tabs if you do not know part names.</div>
            </div>
          ) : (
            <div style={{ color: 'var(--t2)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Radar size={12} /> Select a hardpoint from the viewer or slot list.</div>
          )}
        </div>
      </div>

      {shipPickerOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,11,0.86)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShipPickerOpen(false)}>
          <div className="nexus-card" style={{ width: 'min(720px, 100%)', maxHeight: '80vh', overflow: 'hidden' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ background: 'var(--bg1)', padding: 12, borderBottom: '0.5px solid var(--b1)' }}>
              <input
                className="nexus-input"
                value={shipSearch}
                onChange={(event) => setShipSearch(event.target.value)}
                placeholder="Search ships by name, manufacturer, class, or role"
              />
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto', background: 'var(--bg1)' }}>
              {filteredShips.map((ship) => (
                <button
                  key={ship.id || ship.ship_slug}
                  type="button"
                  onClick={() => {
                    setSelectedShipSlug(ship.ship_slug);
                    setShipPickerOpen(false);
                    setShipSearch('');
                  }}
                  style={{ width: '100%', border: 'none', borderBottom: '0.5px solid var(--b0)', background: 'transparent', padding: '10px 12px', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <ShipGlyph assetKey={ship.viewer_asset_key || ship.ship_slug} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{ship.name}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10 }}>{ship.manufacturer} · {ship.ship_class} · {ship.role}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: ship.supported ? 'var(--live)' : 'var(--warn)', fontSize: 9 }}>{ship.supported ? 'SUPPORTED' : 'READ-ONLY'}</div>
                  </div>
                </button>
              ))}
              {!filteredShips.length ? (
                <div style={{ padding: 18, color: 'var(--t2)', fontSize: 11 }}>No ships match the current search.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
