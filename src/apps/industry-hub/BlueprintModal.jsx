/**
 * BlueprintModal — Add/Edit blueprint modal form.
 */
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';

export default function BlueprintModal({ bp, callsign, discordId, onSave, onClose }) {
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
      position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--bg0-rgb), 0.85)',
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
            background: 'var(--live-bg)', border: '0.5px solid var(--live-b)', color: 'var(--live)',
            opacity: saving || !form.item_name.trim() ? 0.5 : 1,
          }}>
            {saving ? 'SAVING...' : editing ? 'SAVE CHANGES' : 'REGISTER BLUEPRINT'}
          </button>
        </div>
      </div>
    </div>
  );
}
