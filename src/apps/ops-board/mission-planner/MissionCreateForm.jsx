/**
 * MissionCreateForm — quick op creation inline form
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { sendNexusNotification } from '@/core/data/nexus-notify';
import SmartSelect from '@/components/sc/SmartSelect';
import SmartCombobox from '@/components/sc/SmartCombobox';
import { useSCReferenceOptions } from '@/core/data/useSCReferenceOptions';

const DEFAULT_PHASES = {
  ROCKBREAKER: ['Staging', 'Breach & Clear', 'Power Up', 'Craft Lenses', 'Fire Laser', 'Harvest & Extract'],
  MINING: ['Staging', 'Transit', 'Mining', 'Extraction', 'Refinery Run'],
  PATROL: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  COMBAT: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  SALVAGE: ['Staging', 'Main Op', 'Extraction'],
  CARGO: ['Staging', 'Loading', 'Transit', 'Delivery'],
  RECON: ['Staging', 'Recon', 'Report', 'Extraction'],
};

const DEFAULT_ROLES = {
  ROCKBREAKER: [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Hauler', capacity: 2 }],
  MINING: [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }],
  PATROL: [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
  COMBAT: [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
  SALVAGE: [{ name: 'Salvage', capacity: 3 }, { name: 'Escort', capacity: 2 }],
  CARGO: [{ name: 'Hauler', capacity: 3 }, { name: 'Escort', capacity: 2 }],
  RECON: [{ name: 'Scout', capacity: 3 }, { name: 'Escort', capacity: 1 }],
};

export default function MissionCreateForm({ callsign, sessionUserId, onCreated, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'MINING', system: 'STANTON', location: '', scheduled_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { options: opTypeOptions } = useSCReferenceOptions('op-types', { currentValue: form.type });
  const { options: systemOptions } = useSCReferenceOptions('systems', { currentValue: form.system });
  const { options: locationOptions } = useSCReferenceOptions('locations', { system: form.system, currentValue: form.location });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const phases = DEFAULT_PHASES[form.type] || ['Staging', 'Main Op', 'Extraction'];
      const roleSlots = DEFAULT_ROLES[form.type] || [{ name: 'Crew', capacity: 4 }];

      const op = await base44.entities.Op.create({
        name: form.name.trim(),
        type: form.type,
        system: form.system,
        system_name: form.system,
        location: form.location.trim() || null,
        scheduled_at: form.scheduled_at || null,
        status: 'DRAFT',
        phases,
        phase_current: 0,
        role_slots: roleSlots,
        session_log: [],
      });

      await sendNexusNotification({
        type: 'OP_CREATED', title: `New Op: ${form.name}`,
        body: `${callsign || 'Unknown'} created operation "${form.name}" (${form.type}).`,
        severity: 'INFO', target_user_id: null, source_module: 'OPS', source_id: op.id,
      }).catch(() => {});

      onCreated(op);
    } catch {
      setError('Failed to create operation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    height: 34, background: 'var(--bg2)', border: '0.5px solid var(--b1)',
    borderRadius: 'var(--r-md)', color: 'var(--t0)', fontFamily: 'var(--font)',
    fontSize: 11, padding: '0 10px', outline: 'none', width: '100%',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>
        QUICK CREATE OPERATION
      </div>
      {error && (
        <div style={{ fontSize: 10, color: '#C0392B', background: 'rgba(192,57,43,0.08)', border: '0.5px solid rgba(192,57,43,0.25)', borderRadius: 2, padding: '6px 10px', marginBottom: 10 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        <div>
          <label style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>OP NAME *</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Operation name…" required />
        </div>
        <div>
          <label style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>TYPE</label>
          <SmartSelect
            value={form.type}
            onChange={(nextValue) => set('type', nextValue)}
            options={opTypeOptions}
            theme="tactical"
            storageKey="nexus-smart:ops:type"
            helperText="Patch-tagged mission taxonomy"
          />
        </div>
        <div>
          <label style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SYSTEM</label>
          <SmartSelect
            value={form.system}
            onChange={(nextValue) => set('system', nextValue)}
            options={systemOptions}
            theme="tactical"
            storageKey="nexus-smart:ops:system"
            helperText="Live 4.7 system registry"
          />
        </div>
        <div>
          <label style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LOCATION</label>
          <SmartCombobox
            value={form.location}
            onChange={(nextValue) => set('location', nextValue)}
            options={locationOptions}
            theme="tactical"
            storageKey="nexus-smart:ops:location"
            searchPlaceholder={`Search ${form.system || 'system'} locations`}
            placeholder="Select or mint a location"
            allowCustom
            helperText="Known 4.7 locations plus custom AO naming"
          />
        </div>
        <div>
          <label style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SCHEDULED</label>
          <input type="datetime-local" style={inputStyle} value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="submit" disabled={saving || !form.name.trim()} className="nexus-btn nexus-btn-go" style={{ fontSize: 10, padding: '7px 18px' }}>
          {saving ? 'CREATING…' : 'CREATE OPERATION'}
        </button>
        <button type="button" onClick={onCancel} className="nexus-btn" style={{ fontSize: 10, padding: '7px 14px' }}>
          CANCEL
        </button>
      </div>
    </form>
  );
}
