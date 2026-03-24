import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { X, HelpCircle } from 'lucide-react';

const ROLE_TAGS = [
  { value: 'Mining',       desc: 'Extraction and refining operations' },
  { value: 'Combat',       desc: 'Escort, bounty, PvP engagements' },
  { value: 'Hauling',      desc: 'Cargo transport and trade runs' },
  { value: 'Exploration',  desc: 'Long-range scanning and pathfinding' },
  { value: 'Salvage',      desc: 'Hull stripping and material recovery' },
  { value: 'Racing',       desc: 'Speed-optimized builds' },
  { value: 'Support',      desc: 'Repair, refuel, medical support' },
  { value: 'Multi-Role',   desc: 'General-purpose loadout' },
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

export default function AddBuildDialog({ build, ships, onClose, onSaved }) {
  const { user } = useSession();
  const isEdit = Boolean(build?.id);
  const [form, setForm] = useState({
    ship_name: '', build_name: '', role_tag: '',
    build_url: '', patch_version: '', is_org_canonical: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (build) {
      setForm({
        ship_name: build.ship_name || '', build_name: build.build_name || '',
        role_tag: build.role_tag || '', build_url: build.build_url || '',
        patch_version: build.patch_version || '', is_org_canonical: build.is_org_canonical || false,
      });
    }
  }, [build]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const shipNames = [...new Set((ships || []).map(s => s.model).filter(Boolean))].sort();
  const selectedRole = ROLE_TAGS.find(r => r.value === form.role_tag);

  const handleSave = async () => {
    if (!form.ship_name.trim() || !form.build_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ship_name: form.ship_name.trim(), build_name: form.build_name.trim(),
        role_tag: form.role_tag || null, build_url: form.build_url.trim() || null,
        patch_version: form.patch_version.trim() || null,
        is_org_canonical: form.is_org_canonical,
        created_by: user?.id || 'unknown',
        created_by_callsign: user?.callsign || 'UNKNOWN',
      };
      if (isEdit) await base44.entities.FleetBuild.update(build.id, payload);
      else await base44.entities.FleetBuild.create(payload);
      onSaved?.();
      onClose?.();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,11,0.88)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div className="nexus-card" style={{ padding: 0, width: 'min(520px, 100%)', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '0.5px solid var(--b1)' }}>
          <div>
            <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--acc)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              {isEdit ? 'EDIT BUILD' : 'CREATE NEW BUILD'}
            </div>
            <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
              {isEdit ? 'Update loadout details' : 'Save a ship loadout configuration for the org'}
            </div>
          </div>
          <button onClick={onClose} className="nexus-btn" style={{ padding: 6 }}><X size={14} /></button>
        </div>

        {/* Form */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel label="SHIP MODEL" tip="The ship this build is designed for — type to search existing fleet models" />
            <input
              className="nexus-input" list="ship-models-build"
              value={form.ship_name}
              onChange={e => set('ship_name', e.target.value)}
              placeholder="Start typing a ship model…"
            />
            <datalist id="ship-models-build">
              {shipNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div>
            <FieldLabel label="BUILD NAME" tip="A descriptive name (e.g. 'RSN Standard Mining Fit', 'PvP Alpha Strike')" />
            <input className="nexus-input" value={form.build_name} onChange={e => set('build_name', e.target.value)} placeholder="RSN Standard Mining Fit" />
          </div>

          {/* Role selector — visual pills */}
          <div>
            <FieldLabel label="BUILD ROLE" tip="Primary role this loadout is optimized for" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ROLE_TAGS.map(r => (
                <button
                  key={r.value} type="button" onClick={() => set('role_tag', form.role_tag === r.value ? '' : r.value)}
                  className="nexus-btn"
                  style={{
                    padding: '5px 10px', fontSize: 10,
                    background: form.role_tag === r.value ? 'var(--bg3)' : 'var(--bg2)',
                    borderColor: form.role_tag === r.value ? 'var(--acc)' : 'var(--b1)',
                    color: form.role_tag === r.value ? 'var(--acc)' : 'var(--t2)',
                  }}
                >
                  {r.value}
                </button>
              ))}
            </div>
            {selectedRole && <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 6 }}>{selectedRole.desc}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel label="BUILD URL" tip="Link to Erkul, Loadout Manager, or other fitting tool" />
              <input className="nexus-input" value={form.build_url} onChange={e => set('build_url', e.target.value)} placeholder="https://www.erkul.games/loadout/…" />
            </div>
            <div>
              <FieldLabel label="PATCH VERSION" tip="Game patch this build was validated against" />
              <input className="nexus-input" value={form.patch_version} onChange={e => set('patch_version', e.target.value)} placeholder="4.0.1" />
            </div>
          </div>

          {/* Org standard toggle */}
          <div
            className="nexus-toggle"
            onClick={() => set('is_org_canonical', !form.is_org_canonical)}
            style={{ padding: '10px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 'var(--r-lg)' }}
          >
            <div className={`nexus-toggle-track ${form.is_org_canonical ? 'on' : ''}`}>
              <div className="nexus-toggle-thumb" />
            </div>
            <div>
              <div className="nexus-toggle-label" style={{ color: form.is_org_canonical ? 'var(--live)' : 'var(--t2)' }}>
                Org Standard Build
              </div>
              <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
                {form.is_org_canonical
                  ? 'This build will be flagged as the recommended loadout for this ship across the org.'
                  : 'Personal build — visible to all but not flagged as the org recommendation.'}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.ship_name.trim() || !form.build_name.trim()}
            className="nexus-btn nexus-btn-go"
            style={{ width: '100%', padding: '12px 0', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}
          >
            {saving ? 'SAVING…' : isEdit ? '✓ UPDATE BUILD' : '✓ SAVE BUILD'}
          </button>
        </div>
      </div>
    </div>
  );
}