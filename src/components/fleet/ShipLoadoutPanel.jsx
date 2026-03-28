/**
 * ShipLoadoutPanel — displays and manages equipment slots for a single ship.
 * Shows each hardpoint/component slot with equipped item, size, and status.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Shield, Zap, Crosshair, Cpu, Snowflake, Navigation, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { showToast } from '@/components/NexusToast';

const CATEGORY_CONFIG = {
  weapon:        { icon: Crosshair,  color: '#C0392B', label: 'WEAPON' },
  shield:        { icon: Shield,     color: '#5D9CEC', label: 'SHIELD' },
  power_plant:   { icon: Zap,        color: '#C8A84B', label: 'POWER' },
  cooler:        { icon: Snowflake,  color: '#7AAECC', label: 'COOLER' },
  quantum_drive: { icon: Navigation, color: '#9DA1CD', label: 'QT DRIVE' },
  missile_rack:  { icon: Crosshair,  color: '#FF6B35', label: 'MISSILE' },
  utility:       { icon: Cpu,        color: '#4A8C5C', label: 'UTILITY' },
  other:         { icon: Cpu,        color: '#5A5850', label: 'OTHER' },
};

function resolveCategory(slot) {
  const name = (slot.slot_name || slot.category || '').toLowerCase();
  if (name.includes('weapon') || name.includes('turret') || name.includes('gun')) return 'weapon';
  if (name.includes('shield')) return 'shield';
  if (name.includes('power')) return 'power_plant';
  if (name.includes('cool')) return 'cooler';
  if (name.includes('quantum') || name.includes('jump')) return 'quantum_drive';
  if (name.includes('missile') || name.includes('rack') || name.includes('pylon')) return 'missile_rack';
  if (name.includes('util') || name.includes('mining') || name.includes('salvage') || name.includes('tractor')) return 'utility';
  return slot.category || 'other';
}

const STATUS_STYLES = {
  equipped:  { color: 'var(--live)', bg: 'rgba(74,232,48,0.08)' },
  empty:     { color: 'var(--warn)', bg: 'rgba(243,156,18,0.08)' },
  damaged:   { color: 'var(--danger)', bg: 'rgba(192,57,43,0.08)' },
  stock:     { color: 'var(--t2)', bg: 'var(--bg3)' },
  custom:    { color: 'var(--acc)', bg: 'rgba(200,168,75,0.08)' },
};

function SlotRow({ slot, onRemove }) {
  const cat = resolveCategory(slot);
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
  const Icon = cfg.icon;
  const slotStatus = slot.status || (slot.equipped_name ? 'equipped' : 'empty');
  const sCfg = STATUS_STYLES[slotStatus] || STATUS_STYLES.stock;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 50px 80px auto',
      gap: 8, padding: '8px 12px', alignItems: 'center',
      borderBottom: '0.5px solid var(--b0)',
      transition: 'background 120ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 'var(--r-sm)',
        background: `${cfg.color}12`, border: `0.5px solid ${cfg.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={11} style={{ color: cfg.color }} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slot.equipped_name || <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>Empty slot</span>}
        </div>
        <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 1 }}>
          {slot.slot_name}{slot.equipped_manufacturer ? ` · ${slot.equipped_manufacturer}` : ''}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: cfg.color, fontSize: 10, fontWeight: 600 }}>S{slot.slot_size || slot.equipped_size || '?'}</span>
      </div>

      <span style={{
        padding: '2px 6px', borderRadius: 2, fontSize: 8, fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: sCfg.color, background: sCfg.bg, textAlign: 'center',
      }}>
        {slotStatus}
      </span>

      {onRemove && (
        <button onClick={() => onRemove(slot)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 2,
        }}>
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}

function AddSlotForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ slot_name: '', category: 'weapon', slot_size: 1, equipped_name: '', equipped_manufacturer: '', status: 'equipped' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--b1)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="nexus-input" value={form.slot_name} onChange={e => set('slot_name', e.target.value)} placeholder="Slot name" style={{ flex: 2 }} />
        <select className="nexus-input" value={form.category} onChange={e => set('category', e.target.value)} style={{ flex: 1 }}>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input className="nexus-input" type="number" min={1} max={10} value={form.slot_size} onChange={e => set('slot_size', +e.target.value)} style={{ width: 50 }} placeholder="Size" />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="nexus-input" value={form.equipped_name} onChange={e => set('equipped_name', e.target.value)} placeholder="Equipped item name" style={{ flex: 2 }} />
        <input className="nexus-input" value={form.equipped_manufacturer} onChange={e => set('equipped_manufacturer', e.target.value)} placeholder="Manufacturer" style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="nexus-btn" style={{ padding: '5px 12px', fontSize: 10 }}>CANCEL</button>
        <button onClick={() => { if (form.slot_name.trim()) onAdd({ ...form, source: 'MANUAL' }); }} className="nexus-btn primary" style={{ padding: '5px 12px', fontSize: 10 }}>ADD SLOT</button>
      </div>
    </div>
  );
}

export default function ShipLoadoutPanel({ ship, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const loadout = ship.equipment_loadout || [];

  const handleAddSlot = async (slot) => {
    const updated = [...loadout, slot];
    await base44.entities.OrgShip.update(ship.id, { equipment_loadout: updated });
    setAdding(false);
    showToast('Slot added', 'success');
    onRefresh?.();
  };

  const handleRemoveSlot = async (slot) => {
    const updated = loadout.filter(s => s !== slot);
    await base44.entities.OrgShip.update(ship.id, { equipment_loadout: updated });
    showToast('Slot removed', 'success');
    onRefresh?.();
  };

  const handleSyncFromFleetYards = async () => {
    if (!ship.model) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('fleetyardsSync', { action: 'hardpoints', ship_model: ship.model });
      const hardpoints = res.data?.hardpoints || [];
      if (hardpoints.length === 0) {
        showToast('No hardpoint data found for this model', 'warning');
        setSyncing(false);
        return;
      }
      const slots = hardpoints.map(hp => ({
        slot_name: hp.name || hp.hardpoint_type || 'Unknown',
        slot_size: hp.size || hp.component_size || 0,
        category: hp.category || hp.hardpoint_type || 'other',
        equipped_name: hp.component?.name || hp.component_name || '',
        equipped_manufacturer: hp.component?.manufacturer || '',
        equipped_size: hp.component?.size || hp.size || 0,
        status: hp.component?.name ? 'stock' : 'empty',
        source: 'FLEETYARDS',
      }));
      await base44.entities.OrgShip.update(ship.id, {
        equipment_loadout: slots,
        loadout_synced_at: new Date().toISOString(),
      });
      showToast(`Synced ${slots.length} hardpoints from FleetYards`, 'success');
      onRefresh?.();
    } catch (err) {
      showToast(err?.message || 'FleetYards sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Group by category for visual structure
  const grouped = {};
  loadout.forEach(slot => {
    const cat = resolveCategory(slot);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(slot);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--b0)' }}>
        <div>
          <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em' }}>EQUIPMENT LOADOUT</span>
          <span style={{ color: 'var(--t2)', fontSize: 9, marginLeft: 8 }}>{loadout.length} slots</span>
          {ship.loadout_synced_at && (
            <span style={{ color: 'var(--t3)', fontSize: 8, marginLeft: 8 }}>
              synced {new Date(ship.loadout_synced_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleSyncFromFleetYards} disabled={syncing} className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
            <RefreshCw size={9} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'SYNCING' : 'SYNC FY'}
          </button>
          <button onClick={() => setAdding(!adding)} className="nexus-btn" style={{ padding: '4px 8px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Plus size={9} /> ADD
          </button>
        </div>
      </div>

      {/* Slot list */}
      {loadout.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--t3)', fontSize: 10 }}>
          No equipment configured — sync from FleetYards or add slots manually.
        </div>
      ) : (
        Object.entries(grouped).map(([cat, slots]) => {
          const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
          return (
            <div key={cat}>
              <div style={{ padding: '4px 12px', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <cfg.icon size={8} style={{ color: cfg.color }} />
                <span style={{ color: cfg.color, fontSize: 8, letterSpacing: '0.12em', fontWeight: 600 }}>{cfg.label} ({slots.length})</span>
              </div>
              {slots.map((slot, i) => <SlotRow key={`${cat}-${i}`} slot={slot} onRemove={handleRemoveSlot} />)}
            </div>
          );
        })
      )}

      {adding && <AddSlotForm onAdd={handleAddSlot} onCancel={() => setAdding(false)} />}
    </div>
  );
}