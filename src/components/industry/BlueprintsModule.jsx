/**
 * BlueprintsModule — Full Blueprint Registry UI
 * Filters by category, tier, system availability, ownership status.
 * Supports add/edit/delete for Voyager+ ranks.
 */
import React, { useState, useMemo } from 'react';
import { Plus, X, Star, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['ALL', 'WEAPON', 'ARMOR', 'GEAR', 'COMPONENT', 'CONSUMABLE', 'FOCUSING_LENS', 'SHIP_COMPONENT', 'OTHER'];
const SYSTEMS = ['ALL', 'STANTON', 'PYRO', 'NYX'];
const OWNERSHIP = ['ALL', 'OWNED', 'UNOWNED', 'PRIORITY'];
const TIERS = ['ALL', 'T1', 'T2'];
const EDITOR_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];

const CAT_COLOR = {
  WEAPON: 'var(--danger)', ARMOR: 'var(--info)', GEAR: 'var(--acc2)',
  COMPONENT: 'var(--warn)', CONSUMABLE: 'var(--live)', FOCUSING_LENS: 'var(--cyan)',
  SHIP_COMPONENT: 'var(--info)', OTHER: 'var(--t2)',
};

function formatTime(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// ─── Blueprint card ────────────────────────────────────────────────────────────
function BlueprintCard({ bp, materials, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const owned = Boolean(bp.owned_by || bp.owned_by_callsign);
  const catColor = CAT_COLOR[bp.category] || 'var(--t2)';
  const isT2 = bp.tier === 'T2';

  // Check material availability against current stockpile
  const recipeMaterials = bp.recipe_materials || [];
  const materialStatus = recipeMaterials.map(req => {
    const stock = materials.filter(m => m.material_name?.toLowerCase() === req.material?.toLowerCase());
    const totalScu = stock.reduce((s, m) => s + (m.quantity_scu || 0), 0);
    const bestQuality = stock.length ? Math.max(...stock.map(m => m.quality_pct || 0)) : 0;
    const qualityOk = bestQuality >= (req.min_quality || bp.min_material_quality || 80);
    const qtyOk = totalScu >= (req.quantity_scu || 0);
    return { ...req, totalScu, bestQuality, qualityOk, qtyOk, met: qualityOk && qtyOk };
  });

  const allMet = recipeMaterials.length > 0 && materialStatus.every(m => m.met);
  const anyMet = materialStatus.some(m => m.met);

  const systems = (bp.available_systems || ['STANTON']).join(' · ');

  return (
    <div style={{
      background: 'var(--bg1)',
      border: `0.5px solid ${bp.is_priority ? 'var(--warn-b, rgba(232,160,32,0.25))' : 'var(--b1)'}`,
      borderRadius: 8,
      overflow: 'hidden',
      transition: 'border-color 0.1s',
    }}
      onMouseEnter={e => { if (!bp.is_priority) e.currentTarget.style.borderColor = 'var(--b2)'; }}
      onMouseLeave={e => { if (!bp.is_priority) e.currentTarget.style.borderColor = 'var(--b1)'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        {/* Category dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: catColor, flexShrink: 0 }} />

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: owned ? 'var(--t0)' : 'var(--t2)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bp.item_name}
            </span>
            {bp.is_priority && (
              <span style={{ color: 'var(--warn)', fontSize: 8, padding: '1px 5px', border: '0.5px solid rgba(232,160,32,0.3)', borderRadius: 3, background: 'rgba(232,160,32,0.06)', flexShrink: 0 }}>
                PRIORITY
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: catColor, fontSize: 9 }}>{bp.category}</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>·</span>
            <span style={{ color: isT2 ? 'var(--warn)' : 'var(--t2)', fontSize: 9 }}>{bp.tier}</span>
            {systems && <><span style={{ color: 'var(--t3)', fontSize: 9 }}>·</span><span style={{ color: 'var(--t2)', fontSize: 9 }}>{systems}</span></>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {bp.crafting_time_min > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--t2)', fontSize: 9 }}>
              <Clock size={9} />
              {formatTime(bp.crafting_time_min)}
            </div>
          )}
          {bp.refinery_bonus_pct > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--live)', fontSize: 9 }}>
              <Zap size={9} />
              +{bp.refinery_bonus_pct}%
            </div>
          )}
          {bp.aUEC_value_est > 0 && (
            <span style={{ color: 'var(--t1)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
              {bp.aUEC_value_est.toLocaleString()} aUEC
            </span>
          )}

          {/* Material readiness indicator */}
          {recipeMaterials.length > 0 && (
            <div style={{
              padding: '2px 7px', borderRadius: 3, fontSize: 9,
              background: allMet ? 'rgba(39,201,106,0.08)' : 'var(--bg3)',
              border: `0.5px solid ${allMet ? 'rgba(39,201,106,0.25)' : 'var(--b2)'}`,
              color: allMet ? 'var(--live)' : 'var(--t2)',
            }}>
              {allMet ? '✓ READY' : `${materialStatus.filter(m => m.met).length}/${recipeMaterials.length}`}
            </div>
          )}

          {/* Ownership */}
          {owned ? (
            <span style={{ color: 'var(--acc2)', fontSize: 9, padding: '1px 6px', border: '0.5px solid var(--b2)', borderRadius: 3, background: 'var(--bg3)' }}>
              {bp.owned_by_callsign || 'owned'}
            </span>
          ) : (
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>unowned</span>
          )}

          {canEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(bp); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex', fontSize: 10 }}>
              ✎
            </button>
          )}

          {expanded ? <ChevronUp size={11} style={{ color: 'var(--t2)' }} /> : <ChevronDown size={11} style={{ color: 'var(--t2)' }} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '0.5px solid var(--b0)' }}>
          {/* Recipe materials */}
          {recipeMaterials.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>REQUIRED MATERIALS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {materialStatus.map((req, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px',
                    gap: 8, padding: '5px 8px', borderRadius: 5,
                    background: req.met ? 'rgba(39,201,106,0.04)' : 'var(--bg2)',
                    border: `0.5px solid ${req.met ? 'rgba(39,201,106,0.15)' : 'var(--b1)'}`,
                    alignItems: 'center',
                  }}>
                    <span style={{ color: req.met ? 'var(--t0)' : 'var(--t1)', fontSize: 11 }}>{req.material}</span>
                    <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: req.qtyOk ? 'var(--live)' : 'var(--danger)' }}>{req.totalScu.toFixed(1)}</span>
                      /{req.quantity_scu || 0} SCU
                    </span>
                    <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: req.qualityOk ? 'var(--live)' : 'var(--danger)' }}>{req.bestQuality.toFixed(0)}</span>
                      /{req.min_quality || 80}%
                    </span>
                    <span style={{ color: req.met ? 'var(--live)' : 'var(--t3)', fontSize: 9 }}>
                      {req.met ? '✓ MET' : '✗ SHORT'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta info row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {bp.output_quantity > 1 && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>OUTPUT · </span><span style={{ color: 'var(--t1)', fontSize: 10 }}>×{bp.output_quantity}</span></div>
            )}
            {bp.min_material_quality && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>MIN QUALITY · </span><span style={{ color: bp.min_material_quality >= 80 ? 'var(--warn)' : 'var(--t1)', fontSize: 10 }}>{bp.min_material_quality}%</span></div>
            )}
            {bp.fabricator_location && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>FABRICATOR · </span><span style={{ color: 'var(--t1)', fontSize: 10 }}>{bp.fabricator_location}</span></div>
            )}
            {bp.refinery_bonus_pct > 0 && (
              <div><span style={{ color: 'var(--t3)', fontSize: 9 }}>REFINERY BONUS · </span><span style={{ color: 'var(--live)', fontSize: 10 }}>+{bp.refinery_bonus_pct}% yield</span></div>
            )}
          </div>

          {bp.notes && (
            <div style={{ marginTop: 8, color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>{bp.notes}</div>
          )}
          {bp.priority_note && (
            <div style={{ marginTop: 6, color: 'var(--warn)', fontSize: 10 }}>⚑ {bp.priority_note}</div>
          )}

          {canEdit && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => onEdit(bp)} className="nexus-btn" style={{ padding: '4px 12px', fontSize: 9 }}>EDIT</button>
              <button onClick={() => onDelete(bp.id)} style={{
                padding: '4px 12px', fontSize: 9, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                background: 'rgba(224,72,72,0.07)', border: '0.5px solid rgba(224,72,72,0.2)', color: 'var(--danger)',
              }}>DELETE</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit modal ────────────────────────────────────────────────────────────
function BlueprintModal({ bp, callsign, discordId, onSave, onClose }) {
  const editing = Boolean(bp?.id);
  const [form, setForm] = useState({
    item_name: bp?.item_name || '',
    category: bp?.category || 'COMPONENT',
    tier: bp?.tier || 'T2',
    output_quantity: bp?.output_quantity || 1,
    crafting_time_min: bp?.crafting_time_min || '',
    aUEC_value_est: bp?.aUEC_value_est || '',
    min_material_quality: bp?.min_material_quality ?? 80,
    refinery_bonus_pct: bp?.refinery_bonus_pct || 0,
    available_systems: bp?.available_systems || ['STANTON'],
    fabricator_location: bp?.fabricator_location || '',
    owned_by: bp?.owned_by || '',
    owned_by_callsign: bp?.owned_by_callsign || '',
    is_priority: bp?.is_priority || false,
    priority_note: bp?.priority_note || '',
    notes: bp?.notes || '',
    recipe_materials: bp?.recipe_materials || [],
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSystem = (sys) => {
    const current = form.available_systems;
    set('available_systems', current.includes(sys) ? current.filter(s => s !== sys) : [...current, sys]);
  };

  const addMaterial = () => set('recipe_materials', [...form.recipe_materials, { material: '', quantity_scu: 0, min_quality: 80 }]);
  const updateMaterial = (i, field, value) => {
    const updated = form.recipe_materials.map((m, idx) => idx === i ? { ...m, [field]: value } : m);
    set('recipe_materials', updated);
  };
  const removeMaterial = (i) => set('recipe_materials', form.recipe_materials.filter((_, idx) => idx !== i));

  const claimForSelf = () => {
    set('owned_by', discordId || '');
    set('owned_by_callsign', callsign || '');
  };

  const handleSave = async () => {
    if (!form.item_name.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      crafting_time_min: form.crafting_time_min ? Number(form.crafting_time_min) : null,
      aUEC_value_est: form.aUEC_value_est ? Number(form.aUEC_value_est) : null,
      added_at: editing ? bp.added_at : new Date().toISOString(),
    };
    if (editing) {
      await base44.entities.Blueprint.update(bp.id, data);
    } else {
      await base44.entities.Blueprint.create(data);
    }
    setSaving(false);
    onSave();
  };

  const inputStyle = { background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 5, color: 'var(--t0)', fontFamily: 'inherit', fontSize: 11, padding: '6px 10px', outline: 'none', width: '100%' };
  const labelStyle = { color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(7,8,11,0.85)',
    }}>
      <div className="nexus-fade-in" style={{
        width: 560, maxHeight: '90vh', background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0 }}>
          <span style={{ color: 'var(--t0)', fontSize: 11, letterSpacing: '0.1em' }}>{editing ? 'EDIT BLUEPRINT' : 'REGISTER BLUEPRINT'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex' }}><X size={13} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name + tier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 10 }}>
            <div>
              <label style={labelStyle}>ITEM NAME</label>
              <input style={inputStyle} value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="e.g. Kastak Arms Custodian SMG" />
            </div>
            <div>
              <label style={labelStyle}>CATEGORY</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={e => set('category', e.target.value)}>
                {['WEAPON','ARMOR','GEAR','COMPONENT','CONSUMABLE','FOCUSING_LENS','SHIP_COMPONENT','OTHER'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>TIER</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['T1','T2'].map(t => (
                  <button key={t} type="button" onClick={() => set('tier', t)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                    background: form.tier === t ? 'var(--bg4)' : 'var(--bg2)',
                    border: `0.5px solid ${form.tier === t ? 'var(--b3)' : 'var(--b1)'}`,
                    color: form.tier === t ? (t === 'T2' ? 'var(--warn)' : 'var(--t0)') : 'var(--t2)',
                  }}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>CRAFT TIME (MIN)</label>
              <input style={inputStyle} type="number" min={0} value={form.crafting_time_min} onChange={e => set('crafting_time_min', e.target.value)} placeholder="120" />
            </div>
            <div>
              <label style={labelStyle}>OUTPUT QTY</label>
              <input style={inputStyle} type="number" min={1} value={form.output_quantity} onChange={e => set('output_quantity', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>MIN QUALITY %</label>
              <input style={inputStyle} type="number" min={0} max={100} value={form.min_material_quality} onChange={e => set('min_material_quality', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>REFINERY BONUS %</label>
              <input style={inputStyle} type="number" min={0} max={100} value={form.refinery_bonus_pct} onChange={e => set('refinery_bonus_pct', Number(e.target.value))} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>EST. VALUE (aUEC)</label>
              <input style={inputStyle} type="number" min={0} value={form.aUEC_value_est} onChange={e => set('aUEC_value_est', e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label style={labelStyle}>FABRICATOR LOCATION</label>
              <input style={inputStyle} value={form.fabricator_location} onChange={e => set('fabricator_location', e.target.value)} placeholder="e.g. Tram & Myers Mining" />
            </div>
          </div>

          {/* Systems */}
          <div>
            <label style={labelStyle}>AVAILABLE IN SYSTEMS</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['STANTON','PYRO','NYX'].map(sys => (
                <button key={sys} type="button" onClick={() => toggleSystem(sys)} style={{
                  padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                  background: form.available_systems.includes(sys) ? 'var(--bg4)' : 'var(--bg1)',
                  border: `0.5px solid ${form.available_systems.includes(sys) ? 'var(--b3)' : 'var(--b1)'}`,
                  color: form.available_systems.includes(sys) ? 'var(--t0)' : 'var(--t2)',
                }}>{sys}</button>
              ))}
            </div>
          </div>

          {/* Recipe materials */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>REQUIRED MATERIALS</label>
              <button onClick={addMaterial} className="nexus-btn" style={{ padding: '3px 10px', fontSize: 9 }}><Plus size={9} /> ADD</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {form.recipe_materials.map((mat, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 24px', gap: 6, alignItems: 'center' }}>
                  <input style={inputStyle} value={mat.material} onChange={e => updateMaterial(i, 'material', e.target.value)} placeholder="Material name" />
                  <input style={inputStyle} type="number" min={0} value={mat.quantity_scu} onChange={e => updateMaterial(i, 'quantity_scu', Number(e.target.value))} placeholder="SCU" />
                  <input style={inputStyle} type="number" min={0} max={100} value={mat.min_quality} onChange={e => updateMaterial(i, 'min_quality', Number(e.target.value))} placeholder="Min %" />
                  <button onClick={() => removeMaterial(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, padding: 0, display: 'flex', justifyContent: 'center' }}>×</button>
                </div>
              ))}
              {form.recipe_materials.length === 0 && (
                <div style={{ color: 'var(--t3)', fontSize: 10, padding: '4px 0' }}>No materials defined — click ADD to specify recipe</div>
              )}
            </div>
          </div>

          {/* Ownership */}
          <div>
            <label style={labelStyle}>HELD BY (CALLSIGN)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={form.owned_by_callsign} onChange={e => set('owned_by_callsign', e.target.value)} placeholder="Leave blank if unowned" />
              <button onClick={claimForSelf} className="nexus-btn" style={{ padding: '6px 12px', fontSize: 9, flexShrink: 0 }}>CLAIM MINE</button>
            </div>
          </div>

          {/* Priority */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 11 }}>Mark as Priority Acquisition</div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>Alerts org members this blueprint is needed</div>
            </div>
            <button type="button" onClick={() => set('is_priority', !form.is_priority)} style={{
              width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0,
              background: form.is_priority ? 'var(--warn)' : 'var(--bg4)',
              border: `0.5px solid ${form.is_priority ? 'var(--warn)' : 'var(--b3)'}`,
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--bg0)', position: 'absolute', top: 2, left: form.is_priority ? 18 : 2, transition: 'left 0.2s' }} />
            </button>
          </div>

          {form.is_priority && (
            <div>
              <label style={labelStyle}>PRIORITY NOTE</label>
              <input style={inputStyle} value={form.priority_note} onChange={e => set('priority_note', e.target.value)} placeholder="Why is this a priority?" />
            </div>
          )}

          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Drop location, crafting tips, etc." />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '0.5px solid var(--b1)', flexShrink: 0 }}>
          <button onClick={onClose} className="nexus-btn" style={{ padding: '8px 16px' }}>CANCEL</button>
          <button onClick={handleSave} disabled={saving || !form.item_name.trim()} style={{
            flex: 1, padding: '8px 16px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
            background: 'rgba(39,201,106,0.08)', border: '0.5px solid rgba(39,201,106,0.3)', color: 'var(--live)',
            opacity: saving || !form.item_name.trim() ? 0.5 : 1,
          }}>
            {saving ? 'SAVING...' : editing ? 'SAVE CHANGES' : 'REGISTER BLUEPRINT'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main module ───────────────────────────────────────────────────────────────
export default function BlueprintsModule({ blueprints, materials, rank, callsign, discordId, onRefresh }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

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
          discordId={discordId}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingBp(null); }}
        />
      )}
    </div>
  );
}