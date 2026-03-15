import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Save, Share2, Lock, Unlock, ChevronDown, Zap, Shield, Cpu } from 'lucide-react';

const TABS = ['SHIP FITTING', 'FPS LOADOUT', 'FLEET VIEW', 'BUILD LIBRARY', 'COMPARE'];

const SLOT_SECTIONS = [
  { label: 'MINING EQUIPMENT', slots: [
    { id: 'ml1', label: 'Mining Laser Mk1', size: 'L1' },
    { id: 'ml2', label: 'Mining Laser Mk2', size: 'L1' },
    { id: 'mo1', label: 'Mining Optimizer', size: 'MO' },
    { id: 'mo2', label: 'Mining Module 2', size: 'MO' },
  ]},
  { label: 'POWER & THERMAL', slots: [
    { id: 'pp', label: 'Power Plant', size: 'PP' },
    { id: 'co1', label: 'Cooler 1', size: 'CO' },
    { id: 'co2', label: 'Cooler 2', size: 'CO' },
  ]},
  { label: 'SHIELDS', slots: [
    { id: 'sh1', label: 'Shield Generator 1', size: 'SH' },
    { id: 'sh2', label: 'Shield Generator 2', size: 'SH' },
  ]},
  { label: 'PROPULSION', slots: [
    { id: 'qd', label: 'Quantum Drive', size: 'QD' },
  ]},
];

const ROLE_PRESETS = ['MINING', 'SALVAGE', 'ESCORT', 'MULTI-ROLE'];

function PowerBar({ label, icon: Icon, value, onChange, color }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} />
      <span style={{ color: 'var(--t2)', fontSize: 10, width: 60, flexShrink: 0 }}>{label}</span>
      <div
        style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          onChange(Math.max(0, Math.min(100, pct)));
        }}
      >
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.1s' }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function SlotRow({ slot, component, onEdit }) {
  const hasComponent = !!component?.name;
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '7px 12px',
        borderBottom: '0.5px solid var(--b0)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onEdit(slot)}
    >
      <span
        style={{
          display: 'inline-block',
          minWidth: 28,
          padding: '1px 4px',
          background: 'var(--bg4)',
          border: '0.5px solid var(--b3)',
          borderRadius: 3,
          color: 'var(--t2)',
          fontSize: 9,
          textAlign: 'center',
          letterSpacing: '0.06em',
        }}
      >
        {slot.size}
      </span>
      <span style={{ flex: 1, color: hasComponent ? 'var(--t0)' : 'var(--t2)', fontSize: 12 }}>
        {hasComponent ? component.name : slot.label}
      </span>
      {hasComponent ? (
        <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)', fontSize: 9 }}>OWNED</span>
      ) : (
        <span className="nexus-tag" style={{ color: 'var(--t2)', borderColor: 'var(--b2)', background: 'transparent', fontSize: 9 }}>EMPTY</span>
      )}
      <ChevronDown size={11} style={{ color: 'var(--t2)' }} />
    </div>
  );
}

function ShipFitting({ builds, vehicles, callsign }) {
  const [selectedShip, setSelectedShip] = useState('');
  const [buildName, setBuildName] = useState('My Build');
  const [components, setComponents] = useState({});
  const [power, setPower] = useState({ weapons: 33, shields: 33, engines: 34 });
  const [editingSlot, setEditingSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [patchLocked, setPatchLocked] = useState(false);

  const buildScore = Math.min(100, Object.keys(components).length * 14 + 22);

  const saveBuild = async () => {
    if (!selectedShip || !buildName) return;
    setSaving(true);
    const discord_id = localStorage.getItem('nexus_discord_id') || '';
    await base44.entities.FleetBuild.create({
      ship_name: selectedShip,
      build_name: buildName,
      hardpoints: components,
      power_allocation: power,
      created_by: discord_id,
      created_by_callsign: callsign,
      patch_locked: patchLocked,
      stats_snapshot: { build_score: buildScore },
    });
    setSaving(false);
  };

  return (
    <div className="flex h-full" style={{ overflow: 'hidden' }}>
      {/* Left — ship selector + schematic */}
      <div
        className="flex flex-col gap-3 flex-shrink-0"
        style={{ width: 240, borderRight: '0.5px solid var(--b1)', padding: 12, overflow: 'auto' }}
      >
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>SHIP</label>
          <select className="nexus-input" value={selectedShip} onChange={e => setSelectedShip(e.target.value)} style={{ cursor: 'pointer', fontSize: 12 }}>
            <option value="">Select ship...</option>
            {vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            {vehicles.length === 0 && (
              <>
                <option value="Prospector">Prospector</option>
                <option value="MOLE">MOLE</option>
                <option value="Orion">Orion</option>
                <option value="Vulture">Vulture</option>
                <option value="Reclaimer">Reclaimer</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>BUILD NAME</label>
          <input className="nexus-input" value={buildName} onChange={e => setBuildName(e.target.value)} style={{ fontSize: 12 }} />
        </div>

        {/* Schematic placeholder */}
        <div
          style={{
            flex: 1,
            background: 'var(--bg2)',
            border: '0.5px dashed var(--b2)',
            borderRadius: 8,
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selectedShip ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--t2)', fontSize: 28, marginBottom: 8 }}>◈</div>
              <div style={{ color: 'var(--t1)', fontSize: 11 }}>{selectedShip}</div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 4 }}>SCHEMATIC PLACEHOLDER</div>
            </div>
          ) : (
            <span style={{ color: 'var(--t3)', fontSize: 11 }}>No ship selected</span>
          )}
        </div>

        <div className="flex gap-2">
          {ROLE_PRESETS.map(p => (
            <button key={p} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', padding: '4px 0', fontSize: 9 }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Centre — slot list */}
      <div className="flex flex-col flex-1 min-w-0" style={{ overflow: 'auto' }}>
        {SLOT_SECTIONS.map(section => (
          <div key={section.label}>
            <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>
              {section.label}
            </div>
            {section.slots.map(slot => (
              <SlotRow
                key={slot.id}
                slot={slot}
                component={components[slot.id]}
                onEdit={s => setEditingSlot(editingSlot?.id === s.id ? null : s)}
              />
            ))}
          </div>
        ))}

        {editingSlot && (
          <div style={{ padding: '12px', borderTop: '0.5px solid var(--b1)', background: 'var(--bg2)' }}>
            <div style={{ color: 'var(--t0)', fontSize: 12, marginBottom: 8 }}>COMPONENT PICKER — {editingSlot.label}</div>
            <input
              className="nexus-input"
              placeholder="Search components..."
              style={{ fontSize: 12, marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {['Lancet MH2', 'Hofstede S2', 'Arbor MH1', 'Helix II'].map(c => (
                <button key={c} onClick={() => { setComponents(comps => ({ ...comps, [editingSlot.id]: { name: c } })); setEditingSlot(null); }}
                  className="nexus-btn" style={{ fontSize: 11, padding: '4px 10px' }}>{c}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right — stats panel */}
      <div
        className="flex flex-col gap-4 flex-shrink-0"
        style={{ width: 220, borderLeft: '0.5px solid var(--b1)', padding: 12, overflow: 'auto' }}
      >
        {/* Build score */}
        <div className="nexus-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}>BUILD SCORE</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: buildScore >= 70 ? 'var(--live)' : buildScore >= 40 ? 'var(--warn)' : 'var(--danger)' }}>
            {buildScore}
          </div>
        </div>

        {/* Power allocation */}
        <div className="nexus-card" style={{ padding: '12px' }}>
          <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 10 }}>POWER ALLOCATION</div>
          <div className="flex flex-col gap-3">
            <PowerBar label="Weapons" icon={Zap} value={power.weapons} color="var(--danger)" onChange={v => setPower(p => ({ ...p, weapons: v }))} />
            <PowerBar label="Shields" icon={Shield} value={power.shields} color="var(--info)" onChange={v => setPower(p => ({ ...p, shields: v }))} />
            <PowerBar label="Engines" icon={Cpu} value={power.engines} color="var(--live)" onChange={v => setPower(p => ({ ...p, engines: v }))} />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-col gap-2">
          <button onClick={saveBuild} disabled={saving || !selectedShip} className="nexus-btn primary" style={{ justifyContent: 'center', padding: '8px 0' }}>
            <Save size={12} /> {saving ? 'SAVING...' : 'SAVE BUILD'}
          </button>
          <button
            onClick={() => setPatchLocked(!patchLocked)}
            className="nexus-btn"
            style={{ justifyContent: 'center', padding: '6px 0', color: patchLocked ? 'var(--warn)' : 'var(--t2)', borderColor: patchLocked ? 'rgba(232,160,32,0.3)' : 'var(--b1)' }}
          >
            {patchLocked ? <><Lock size={11}/> PATCH LOCKED</> : <><Unlock size={11}/> LOCK TO PATCH</>}
          </button>
          <button className="nexus-btn" style={{ justifyContent: 'center', padding: '6px 0' }}>
            <Share2 size={11} /> POST TO DISCORD
          </button>
        </div>
      </div>
    </div>
  );
}

function FleetView({ builds }) {
  const grouped = builds.reduce((acc, b) => {
    if (!acc[b.ship_name]) acc[b.ship_name] = [];
    acc[b.ship_name].push(b);
    return acc;
  }, {});

  return (
    <div className="p-4 flex flex-col gap-4">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {builds.map(b => (
          <div key={b.id} className="nexus-card" style={{ padding: '10px 12px' }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{b.ship_name}</span>
              {b.is_org_canonical && <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)', fontSize: 8 }}>CANON</span>}
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 11 }}>{b.build_name}</div>
            <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 4 }}>{b.created_by_callsign} · {b.role_tag?.toUpperCase() || '—'}</div>
          </div>
        ))}
        {builds.length === 0 && (
          <div style={{ gridColumn: '1/-1', color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>
            No builds saved yet. Use the Ship Fitting tab to create one.
          </div>
        )}
      </div>
    </div>
  );
}

export default function FleetForge() {
  const { callsign } = useOutletContext() || {};
  const [tab, setTab] = useState('SHIP FITTING');
  const [builds, setBuilds] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.FleetBuild.list('-created_date', 50),
      base44.entities.GameCacheVehicle.list('name', 50),
    ]).then(([b, v]) => {
      setBuilds(b || []);
      setVehicles(v || []);
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}
      >
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === t ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden nexus-fade-in">
        {tab === 'SHIP FITTING' && <ShipFitting builds={builds} vehicles={vehicles} callsign={callsign} />}
        {tab === 'FLEET VIEW' && <FleetView builds={builds} />}
        {tab === 'BUILD LIBRARY' && (
          <div className="p-4">
            <div style={{ color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>Build library coming soon</div>
          </div>
        )}
        {tab === 'COMPARE' && (
          <div className="p-4">
            <div style={{ color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>Compare up to 4 builds side-by-side</div>
          </div>
        )}
        {tab === 'FPS LOADOUT' && (
          <div className="p-4">
            <div style={{ color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>FPS Loadout module coming soon</div>
          </div>
        )}
      </div>
    </div>
  );
}