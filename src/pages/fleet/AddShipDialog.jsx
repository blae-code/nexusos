import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { X } from 'lucide-react';

const CLASSES = ['FIGHTER', 'HEAVY_FIGHTER', 'MINER', 'HAULER', 'SALVAGER', 'MEDICAL', 'EXPLORER', 'GROUND_VEHICLE', 'OTHER'];
const STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED', 'ARCHIVED'];

export default function AddShipDialog({ ship, members, onClose, onSaved }) {
  const isEdit = Boolean(ship?.id);
  const [form, setForm] = useState({
    name: '', model: '', manufacturer: '', class: 'FIGHTER',
    status: 'AVAILABLE', cargo_scu: '', crew_size: '',
    assigned_to_callsign: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ship) {
      setForm({
        name: ship.name || '',
        model: ship.model || '',
        manufacturer: ship.manufacturer || '',
        class: ship.class || 'FIGHTER',
        status: ship.status || 'AVAILABLE',
        cargo_scu: ship.cargo_scu ?? '',
        crew_size: ship.crew_size ?? '',
        assigned_to_callsign: ship.assigned_to_callsign || '',
        notes: ship.notes || '',
      });
    }
  }, [ship]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        model: form.model.trim(),
        manufacturer: form.manufacturer.trim(),
        class: form.class,
        status: form.status,
        cargo_scu: parseInt(form.cargo_scu) || 0,
        crew_size: parseInt(form.crew_size) || 1,
        assigned_to_callsign: form.assigned_to_callsign || null,
        notes: form.notes.trim() || null,
      };

      if (isEdit) {
        await base44.entities.OrgShip.update(ship.id, payload);
      } else {
        await base44.entities.OrgShip.create(payload);
      }
      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,11,0.86)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 4, width: 'min(520px, 100%)', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            {isEdit ? 'EDIT SHIP' : 'ADD SHIP'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 4, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SHIP NAME *</label>
              <input className="nexus-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="RSN Nomad-01" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>MODEL *</label>
              <input className="nexus-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Cutlass Black" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>MANUFACTURER</label>
              <input className="nexus-input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="Drake Interplanetary" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CLASS</label>
              <select className="nexus-input" value={form.class} onChange={e => set('class', e.target.value)} style={{ width: '100%' }}>
                {CLASSES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>STATUS</label>
              <select className="nexus-input" value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CARGO (SCU)</label>
              <input className="nexus-input" type="number" min="0" value={form.cargo_scu} onChange={e => set('cargo_scu', e.target.value)} placeholder="0" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CREW SIZE</label>
              <input className="nexus-input" type="number" min="1" value={form.crew_size} onChange={e => set('crew_size', e.target.value)} placeholder="1" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>ASSIGNED PILOT</label>
            <select className="nexus-input" value={form.assigned_to_callsign} onChange={e => set('assigned_to_callsign', e.target.value)} style={{ width: '100%' }}>
              <option value="">Unassigned</option>
              {(members || []).map(m => <option key={m.id} value={m.callsign}>{m.callsign}</option>)}
            </select>
          </div>

          <div>
            <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>NOTES</label>
            <textarea className="nexus-input nexus-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." style={{ width: '100%', minHeight: 60 }} />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.model.trim()}
            className="nexus-btn primary"
            style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {saving ? 'SAVING...' : isEdit ? 'UPDATE SHIP' : 'ADD SHIP'}
          </button>
        </div>
      </div>
    </div>
  );
}