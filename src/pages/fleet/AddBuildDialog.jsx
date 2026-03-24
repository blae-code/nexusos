import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { X } from 'lucide-react';

const ROLE_TAGS = ['Mining', 'Combat', 'Hauling', 'Exploration', 'Salvage', 'Racing', 'Support', 'Multi-Role'];

export default function AddBuildDialog({ build, ships, onClose, onSaved }) {
  const { user } = useSession();
  const isEdit = Boolean(build?.id);
  const [form, setForm] = useState({
    ship_name: '', build_name: '', role_tag: '',
    build_url: '', patch_version: '', notes: '',
    is_org_canonical: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (build) {
      setForm({
        ship_name: build.ship_name || '',
        build_name: build.build_name || '',
        role_tag: build.role_tag || '',
        build_url: build.build_url || '',
        patch_version: build.patch_version || '',
        notes: build.notes || '',
        is_org_canonical: build.is_org_canonical || false,
      });
    }
  }, [build]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Unique ship names from fleet
  const shipNames = [...new Set((ships || []).map(s => s.model).filter(Boolean))].sort();

  const handleSave = async () => {
    if (!form.ship_name.trim() || !form.build_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ship_name: form.ship_name.trim(),
        build_name: form.build_name.trim(),
        role_tag: form.role_tag || null,
        build_url: form.build_url.trim() || null,
        patch_version: form.patch_version.trim() || null,
        is_org_canonical: form.is_org_canonical,
        created_by: user?.id || 'unknown',
        created_by_callsign: user?.callsign || 'UNKNOWN',
      };

      if (isEdit) {
        await base44.entities.FleetBuild.update(build.id, payload);
      } else {
        await base44.entities.FleetBuild.create(payload);
      }
      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,11,0.86)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 4, width: 'min(480px, 100%)', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>
          <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            {isEdit ? 'EDIT BUILD' : 'NEW BUILD'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 4, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SHIP MODEL *</label>
            <input
              className="nexus-input"
              list="ship-models"
              value={form.ship_name}
              onChange={e => set('ship_name', e.target.value)}
              placeholder="e.g. Cutlass Black, Prospector"
              style={{ width: '100%' }}
            />
            <datalist id="ship-models">
              {shipNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div>
            <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>BUILD NAME *</label>
            <input className="nexus-input" value={form.build_name} onChange={e => set('build_name', e.target.value)} placeholder="RSN Standard Mining Fit" style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>ROLE</label>
              <select className="nexus-input" value={form.role_tag} onChange={e => set('role_tag', e.target.value)} style={{ width: '100%' }}>
                <option value="">Select role...</option>
                {ROLE_TAGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>PATCH VERSION</label>
              <input className="nexus-input" value={form.patch_version} onChange={e => set('patch_version', e.target.value)} placeholder="4.0.1" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>BUILD URL (Erkul / Loadout link)</label>
            <input className="nexus-input" value={form.build_url} onChange={e => set('build_url', e.target.value)} placeholder="https://www.erkul.games/loadout/..." style={{ width: '100%' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_org_canonical} onChange={e => set('is_org_canonical', e.target.checked)} style={{ accentColor: '#4A8C5C' }} />
            <span style={{ color: '#9A9488', fontSize: 10 }}>Set as org standard build for this ship</span>
          </label>

          <button
            onClick={handleSave}
            disabled={saving || !form.ship_name.trim() || !form.build_name.trim()}
            className="nexus-btn primary"
            style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {saving ? 'SAVING...' : isEdit ? 'UPDATE BUILD' : 'SAVE BUILD'}
          </button>
        </div>
      </div>
    </div>
  );
}