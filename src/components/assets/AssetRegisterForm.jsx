import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { X } from 'lucide-react';

const ASSET_TYPES = [
  { value: 'SHIP', label: 'Ship' },
  { value: 'VEHICLE', label: 'Ground Vehicle' },
  { value: 'FPS_WEAPON', label: 'FPS Weapon' },
  { value: 'FPS_ARMOR', label: 'FPS Armor' },
  { value: 'SHIP_COMPONENT', label: 'Ship Component' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OTHER', label: 'Other' },
];
const STATUSES = ['ACTIVE', 'STORED', 'DEPLOYED', 'MAINTENANCE', 'DAMAGED', 'DESTROYED', 'LOANED', 'MISSING'];
const CONDITIONS = ['PRISTINE', 'GOOD', 'FAIR', 'DAMAGED', 'WRECKED'];
const SOURCES = ['PURCHASED', 'CRAFTED', 'LOOTED', 'DONATED', 'OP_REWARD', 'SALVAGED', 'OTHER'];

/** @type {import('react').CSSProperties} */
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
  borderRadius: 2, color: '#E8E4DC',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
  letterSpacing: '0.06em', outline: 'none',
};
/** @type {import('react').CSSProperties} */
const labelStyle = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
  color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
  marginBottom: 4, display: 'block',
};

export default function AssetRegisterForm({ editAsset, members, ships, onClose, onSaved }) {
  const isEdit = Boolean(editAsset?.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    asset_name: '', asset_type: 'SHIP', model: '', manufacturer: '',
    serial_tag: '', status: 'STORED', condition: 'GOOD',
    assigned_to_callsign: '', assigned_to_id: '',
    location_system: '', location_detail: '',
    linked_ship_id: '', linked_ship_name: '',
    estimated_value_aUEC: '', quantity: '1',
    acquisition_source: 'PURCHASED', is_org_property: true, notes: '',
  });

  useEffect(() => {
    if (editAsset) {
      setForm({
        asset_name: editAsset.asset_name || '',
        asset_type: editAsset.asset_type || 'SHIP',
        model: editAsset.model || '',
        manufacturer: editAsset.manufacturer || '',
        serial_tag: editAsset.serial_tag || '',
        status: editAsset.status || 'STORED',
        condition: editAsset.condition || 'GOOD',
        assigned_to_callsign: editAsset.assigned_to_callsign || '',
        assigned_to_id: editAsset.assigned_to_id || '',
        location_system: editAsset.location_system || '',
        location_detail: editAsset.location_detail || '',
        linked_ship_id: editAsset.linked_ship_id || '',
        linked_ship_name: editAsset.linked_ship_name || '',
        estimated_value_aUEC: editAsset.estimated_value_aUEC || '',
        quantity: editAsset.quantity || '1',
        acquisition_source: editAsset.acquisition_source || 'PURCHASED',
        is_org_property: editAsset.is_org_property !== false,
        notes: editAsset.notes || '',
      });
    }
  }, [editAsset]);

  const handleMemberSelect = (callsign) => {
    const m = members.find(u => (u.callsign || '').toUpperCase() === callsign.toUpperCase());
    setForm(f => ({ ...f, assigned_to_callsign: callsign, assigned_to_id: m?.id || '' }));
  };

  const handleShipSelect = (shipId) => {
    const s = ships.find(sh => sh.id === shipId);
    setForm(f => ({ ...f, linked_ship_id: shipId, linked_ship_name: s ? `${s.name} (${s.model})` : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      estimated_value_aUEC: parseInt(form.estimated_value_aUEC) || 0,
      quantity: parseInt(form.quantity) || 1,
      acquired_at: isEdit ? (editAsset.acquired_at || new Date().toISOString()) : new Date().toISOString(),
    };
    if (isEdit) {
      await base44.entities.OrgAsset.update(editAsset.id, payload);
    } else {
      await base44.entities.OrgAsset.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0A0908', border: '0.5px solid rgba(200,170,100,0.15)',
        borderLeft: '2px solid #C0392B', borderRadius: 2,
        width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto',
        padding: '24px 28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{isEdit ? 'EDIT ASSET' : 'REGISTER ASSET'}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 4,
          }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            {/* Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Asset Name *</label>
              <input style={inputStyle} value={form.asset_name} required placeholder="e.g. Shadow Fang, GP-33 MOD, Nightrider Helmet"
                onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} />
            </div>
            {/* Type */}
            <div>
              <label style={labelStyle}>Type *</label>
              <select style={inputStyle} value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}>
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {/* Model */}
            <div>
              <label style={labelStyle}>Model / Variant</label>
              <input style={inputStyle} value={form.model} placeholder="e.g. Cutlass Black"
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            {/* Manufacturer */}
            <div>
              <label style={labelStyle}>Manufacturer</label>
              <input style={inputStyle} value={form.manufacturer} placeholder="e.g. Drake, Kastak Arms"
                onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
            </div>
            {/* Serial */}
            <div>
              <label style={labelStyle}>Serial Tag</label>
              <input style={inputStyle} value={form.serial_tag} placeholder="e.g. RSN-SHP-042"
                onChange={e => setForm(f => ({ ...f, serial_tag: e.target.value }))} />
            </div>
            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Condition */}
            <div>
              <label style={labelStyle}>Condition</label>
              <select style={inputStyle} value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Assigned to */}
            <div>
              <label style={labelStyle}>Assigned To</label>
              <select style={inputStyle} value={form.assigned_to_callsign}
                onChange={e => handleMemberSelect(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.callsign || m.login_name}>{m.callsign || m.login_name}</option>
                ))}
              </select>
            </div>
            {/* Location system */}
            <div>
              <label style={labelStyle}>System</label>
              <select style={inputStyle} value={form.location_system} onChange={e => setForm(f => ({ ...f, location_system: e.target.value }))}>
                <option value="">—</option>
                <option value="STANTON">Stanton</option>
                <option value="PYRO">Pyro</option>
                <option value="NYX">Nyx</option>
              </select>
            </div>
            {/* Location detail */}
            <div>
              <label style={labelStyle}>Location Detail</label>
              <input style={inputStyle} value={form.location_detail} placeholder="e.g. Port Olisar Hangar B"
                onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))} />
            </div>
            {/* Linked Ship */}
            <div>
              <label style={labelStyle}>Installed On Ship</label>
              <select style={inputStyle} value={form.linked_ship_id}
                onChange={e => handleShipSelect(e.target.value)}>
                <option value="">None</option>
                {ships.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.model})</option>
                ))}
              </select>
            </div>
            {/* Value */}
            <div>
              <label style={labelStyle}>Estimated Value (aUEC)</label>
              <input style={inputStyle} type="number" min="0" value={form.estimated_value_aUEC}
                onChange={e => setForm(f => ({ ...f, estimated_value_aUEC: e.target.value }))} />
            </div>
            {/* Quantity */}
            <div>
              <label style={labelStyle}>Quantity</label>
              <input style={inputStyle} type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            {/* Source */}
            <div>
              <label style={labelStyle}>Acquisition Source</label>
              <select style={inputStyle} value={form.acquisition_source}
                onChange={e => setForm(f => ({ ...f, acquisition_source: e.target.value }))}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Org property */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18 }}>
              <input type="checkbox" checked={form.is_org_property}
                onChange={e => setForm(f => ({ ...f, is_org_property: e.target.checked }))}
                style={{ accentColor: '#C0392B', width: 14, height: 14 }} />
              <label style={{ ...labelStyle, margin: 0 }}>ORG PROPERTY</label>
            </div>
            {/* Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes}
                placeholder="Optional notes..."
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>CANCEL</button>
            <button type="submit" disabled={saving || !form.asset_name.trim()} style={{
              padding: '10px 24px', background: '#C0392B',
              border: 'none', borderRadius: 2, color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>{saving ? 'SAVING...' : (isEdit ? 'UPDATE ASSET' : 'REGISTER ASSET')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
