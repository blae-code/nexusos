import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { X, HelpCircle } from 'lucide-react';

const CLASSES = [
  { value: 'FIGHTER',        label: 'Fighter',        desc: 'Light combat vessel — fast, agile' },
  { value: 'HEAVY_FIGHTER',  label: 'Heavy Fighter',  desc: 'Armored combat platform — high firepower' },
  { value: 'MINER',          label: 'Miner',          desc: 'Ship or vehicle-mounted mining rig' },
  { value: 'HAULER',         label: 'Hauler',         desc: 'Cargo transport — high SCU capacity' },
  { value: 'SALVAGER',       label: 'Salvager',       desc: 'Hull stripping and material recovery' },
  { value: 'MEDICAL',        label: 'Medical',        desc: 'Trauma pods, respawn capability' },
  { value: 'EXPLORER',       label: 'Explorer',       desc: 'Long-range recon and scanning' },
  { value: 'GROUND_VEHICLE', label: 'Ground Vehicle', desc: 'Surface ops — ROC, Ursa, Ballista' },
  { value: 'OTHER',          label: 'Other',          desc: 'Multi-role or utility' },
];

const STATUSES = [
  { value: 'AVAILABLE',   label: 'Available',   color: 'var(--live)' },
  { value: 'ASSIGNED',    label: 'Assigned',    color: 'var(--warn)' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#FF6B35' },
  { value: 'DESTROYED',   label: 'Destroyed',   color: 'var(--danger)' },
  { value: 'ARCHIVED',    label: 'Archived',    color: 'var(--t2)' },
];

function FieldLabel({ label, tip }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
      <span className="nexus-label" style={{ margin: 0 }}>{label}</span>
      {tip && (
        <span className="nexus-tooltip" data-tooltip={tip} style={{ cursor: 'help', display: 'flex' }}>
          <HelpCircle size={10} style={{ color: 'var(--t3)' }} />
        </span>
      )}
    </div>
  );
}

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
        name: ship.name || '', model: ship.model || '',
        manufacturer: ship.manufacturer || '', class: ship.class || 'FIGHTER',
        status: ship.status || 'AVAILABLE', cargo_scu: ship.cargo_scu ?? '',
        crew_size: ship.crew_size ?? '', assigned_to_callsign: ship.assigned_to_callsign || '',
        notes: ship.notes || '',
      });
    }
  }, [ship]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedClass = CLASSES.find(c => c.value === form.class);

  const handleSave = async () => {
    if (!form.name.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), model: form.model.trim(),
        manufacturer: form.manufacturer.trim(), class: form.class,
        status: form.status, cargo_scu: parseInt(form.cargo_scu) || 0,
        crew_size: parseInt(form.crew_size) || 1,
        assigned_to_callsign: form.assigned_to_callsign || null,
        notes: form.notes.trim() || null,
      };
      if (isEdit) await base44.entities.OrgShip.update(ship.id, payload);
      else await base44.entities.OrgShip.create(payload);
      onSaved?.();
      onClose?.();
    } finally { setSaving(false); }
  };

  // Only show status-compatible pilot options
  const showPilotField = form.status === 'ASSIGNED' || form.status === 'AVAILABLE';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,11,0.88)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div className="nexus-card" style={{ padding: 0, width: 'min(560px, 100%)', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '0.5px solid var(--b1)' }}>
          <div>
            <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--acc)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              {isEdit ? 'EDIT SHIP' : 'REGISTER NEW SHIP'}
            </div>
            <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
              {isEdit ? 'Update ship details and assignment' : 'Add a ship to the organization fleet roster'}
            </div>
          </div>
          <button onClick={onClose} className="nexus-btn" style={{ padding: 6 }}><X size={14} /></button>
        </div>

        {/* Form */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel label="SHIP NAME" tip="A unique identifier for this ship in the org roster" />
              <input className="nexus-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="RSN Nomad-01" />
            </div>
            <div>
              <FieldLabel label="SHIP MODEL" tip="The manufacturer's model name (e.g. Cutlass Black)" />
              <input className="nexus-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Cutlass Black" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel label="MANUFACTURER" tip="Ship manufacturer (e.g. Drake, RSI, MISC)" />
              <input className="nexus-input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="Drake Interplanetary" />
            </div>
            <div>
              <FieldLabel label="CLASS" tip="Ship's primary role — determines fleet composition planning" />
              <select className="nexus-input" value={form.class} onChange={e => set('class', e.target.value)}>
                {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {selectedClass && <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 4 }}>{selectedClass.desc}</div>}
            </div>
          </div>

          {/* Operational */}
          <div style={{ borderTop: '0.5px solid var(--b0)', paddingTop: 14 }}>
            <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.15em', marginBottom: 10 }}>OPERATIONAL STATUS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {STATUSES.map(s => (
                <button
                  key={s.value} type="button" onClick={() => set('status', s.value)}
                  className="nexus-btn"
                  style={{
                    padding: '6px 12px', fontSize: 10,
                    background: form.status === s.value ? `${s.color}18` : 'var(--bg2)',
                    borderColor: form.status === s.value ? s.color : 'var(--b1)',
                    color: form.status === s.value ? s.color : 'var(--t2)',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginRight: 4, display: 'inline-block' }} />
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel label="CARGO (SCU)" tip="Standard Cargo Units capacity" />
                <input className="nexus-input" type="number" min="0" value={form.cargo_scu} onChange={e => set('cargo_scu', e.target.value)} placeholder="0" />
              </div>
              <div>
                <FieldLabel label="CREW SIZE" tip="Maximum crew complement" />
                <input className="nexus-input" type="number" min="1" value={form.crew_size} onChange={e => set('crew_size', e.target.value)} placeholder="1" />
              </div>
              {showPilotField && (
                <div>
                  <FieldLabel label="ASSIGNED PILOT" tip="Org member responsible for this ship" />
                  <select className="nexus-input" value={form.assigned_to_callsign} onChange={e => set('assigned_to_callsign', e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {(members || []).map(m => <option key={m.id} value={m.callsign}>{m.callsign}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <FieldLabel label="NOTES" tip="Internal notes — maintenance history, loadout info, etc." />
            <textarea className="nexus-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Loadout notes, maintenance log, squadron assignment…" style={{ height: 'auto', minHeight: 64, padding: '10px' }} />
          </div>

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.model.trim()}
            className="nexus-btn nexus-btn-go"
            style={{ width: '100%', padding: '12px 0', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}
          >
            {saving ? 'SAVING…' : isEdit ? '✓ UPDATE SHIP' : '✓ REGISTER SHIP'}
          </button>
        </div>
      </div>
    </div>
  );
}