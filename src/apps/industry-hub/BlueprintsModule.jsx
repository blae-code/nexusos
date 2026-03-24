/**
 * BlueprintsModule — Full Blueprint Registry UI
 * Filters by category, tier, system availability, ownership status.
 * Supports add/edit/delete for Voyager+ ranks.
 */
import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import BlueprintCard from './BlueprintCard';
import BlueprintModal from './BlueprintModal';

const CATEGORIES = ['ALL', 'WEAPON', 'ARMOR', 'GEAR', 'COMPONENT', 'CONSUMABLE', 'FOCUSING_LENS', 'SHIP_COMPONENT', 'OTHER'];
const SYSTEMS = ['ALL', 'STANTON', 'PYRO', 'NYX'];
const OWNERSHIP = ['ALL', 'OWNED', 'UNOWNED', 'PRIORITY'];
const TIERS = ['ALL', 'T1', 'T2'];
const EDITOR_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];

// ─── Main module ───────────────────────────────────────────────────────────────
export default function BlueprintsModule({ blueprints, materials, rank, callsign, userId, onRefresh }) {
  const canEdit = EDITOR_RANKS.includes(rank);

  const [catFilter, setCatFilter] = useState('ALL');
  const [sysFilter, setSysFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editingBp, setEditingBp] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    return blueprints.filter(bp => {
      if (catFilter !== 'ALL' && bp.category !== catFilter) return false;
      if (tierFilter !== 'ALL' && bp.tier !== tierFilter) return false;
      if (sysFilter !== 'ALL' && !(bp.available_systems || ['STANTON']).includes(sysFilter)) return false;
      if (ownerFilter === 'OWNED' && !bp.owned_by_callsign && !bp.owned_by) return false;
      if (ownerFilter === 'UNOWNED' && (bp.owned_by_callsign || bp.owned_by)) return false;
      if (ownerFilter === 'PRIORITY' && !bp.is_priority) return false;
      if (search && !bp.item_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [blueprints, catFilter, sysFilter, ownerFilter, tierFilter, search]);

  // Stats
  const totalOwned = blueprints.filter(b => b.owned_by || b.owned_by_callsign).length;
  const totalPriority = blueprints.filter(b => b.is_priority).length;
  const totalT2 = blueprints.filter(b => b.tier === 'T2').length;

  const handleEdit = (bp) => { setEditingBp(bp); setShowModal(true); };
  const handleNew = () => { setEditingBp(null); setShowModal(true); };
  const handleDelete = async (id) => {
    await base44.entities.Blueprint.delete(id);
    onRefresh();
  };
  const handleSave = () => { setShowModal(false); setEditingBp(null); onRefresh(); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* Toolbar */}
      <div style={{ flexShrink: 0, padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Stats + add button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[
            { label: 'TOTAL', value: blueprints.length },
            { label: 'OWNED', value: totalOwned, color: 'var(--live)' },
            { label: 'UNOWNED', value: blueprints.length - totalOwned, color: 'var(--t2)' },
            { label: 'PRIORITY', value: totalPriority, color: 'var(--warn)' },
            { label: 'T2', value: totalT2, color: 'var(--warn)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: s.color || 'var(--t1)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{s.value}</span>
              <span style={{ color: 'var(--t3)', fontSize: 9 }}>{s.label}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <input
            style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t0)', fontFamily: 'inherit', fontSize: 10, padding: '5px 10px', outline: 'none', width: 180 }}
            placeholder="Search blueprints…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {canEdit && (
            <button onClick={handleNew} className="nexus-btn primary" style={{ padding: '5px 12px', fontSize: 10 }}>
              <Plus size={11} /> REGISTER
            </button>
          )}
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Category */}
          <div style={{ display: 'flex', gap: 2 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9, letterSpacing: '0.08em',
                background: catFilter === c ? 'var(--bg4)' : 'transparent',
                border: `0.5px solid ${catFilter === c ? 'var(--b2)' : 'transparent'}`,
                color: catFilter === c ? 'var(--t0)' : 'var(--t2)',
              }}>{c}</button>
            ))}
          </div>

          <div style={{ width: '0.5px', height: 14, background: 'var(--b2)' }} />

          {/* System */}
          <div style={{ display: 'flex', gap: 2 }}>
            {SYSTEMS.map(s => (
              <button key={s} onClick={() => setSysFilter(s)} style={{
                padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9,
                background: sysFilter === s ? 'var(--bg4)' : 'transparent',
                border: `0.5px solid ${sysFilter === s ? 'var(--b2)' : 'transparent'}`,
                color: sysFilter === s ? 'var(--t0)' : 'var(--t2)',
              }}>{s}</button>
            ))}
          </div>

          <div style={{ width: '0.5px', height: 14, background: 'var(--b2)' }} />

          {/* Tier */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TIERS.map(t => (
              <button key={t} onClick={() => setTierFilter(t)} style={{
                padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9,
                background: tierFilter === t ? 'var(--bg4)' : 'transparent',
                border: `0.5px solid ${tierFilter === t ? 'var(--b2)' : 'transparent'}`,
                color: tierFilter === t ? (t === 'T2' ? 'var(--warn)' : 'var(--t0)') : 'var(--t2)',
              }}>{t}</button>
            ))}
          </div>

          <div style={{ width: '0.5px', height: 14, background: 'var(--b2)' }} />

          {/* Ownership */}
          <div style={{ display: 'flex', gap: 2 }}>
            {OWNERSHIP.map(o => (
              <button key={o} onClick={() => setOwnerFilter(o)} style={{
                padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 9,
                background: ownerFilter === o ? 'var(--bg4)' : 'transparent',
                border: `0.5px solid ${ownerFilter === o ? 'var(--b2)' : 'transparent'}`,
                color: ownerFilter === o ? (o === 'PRIORITY' ? 'var(--warn)' : 'var(--t0)') : 'var(--t2)',
              }}>{o}</button>
            ))}
          </div>

          <span style={{ color: 'var(--t3)', fontSize: 9, marginLeft: 'auto' }}>{filtered.length} results</span>
        </div>
      </div>

      {/* Blueprint list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
            {blueprints.length === 0 ? 'No blueprints registered. Add the first one →' : 'No blueprints match current filters.'}
          </div>
        ) : (
          filtered.map(bp => (
            <BlueprintCard
              key={bp.id}
              bp={bp}
              materials={materials}
              canEdit={canEdit}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <BlueprintModal
          bp={editingBp}
          callsign={callsign}
          userId={userId}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingBp(null); }}
        />
      )}
    </div>
  );
}
