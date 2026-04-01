/**
 * LogForm — deposit logger.
 * Props: { callsign, onSubmit, onCancel }
 *
 * Material autocomplete from game_cache_commodities.
 * Quality slider with live T2 feedback (≥80% green, 60-79% amber, <60% dim).
 * On submit: ScoutDeposit.create using the current NexusOS session identity.
 */
import React, { useState } from 'react';
import { useSession } from '@/core/data/SessionContext';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { qualityScoreFromPercent } from '@/core/data/quality';
import { X } from 'lucide-react';
import SmartSelect from '@/components/sc/SmartSelect';
import SmartCombobox from '@/components/sc/SmartCombobox';
import { useSCReferenceOptions } from '@/core/data/useSCReferenceOptions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABEL = {
  color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em',
  display: 'block', marginBottom: 5,
};

function qualityFeedback(pct) {
  if (pct >= 80) return { label: 'T2 ELIGIBLE', color: 'var(--live)' };
  if (pct >= 60) return { label: 'STANDARD QUALITY', color: 'var(--warn)' };
  return { label: 'BELOW STANDARD', color: 'var(--t2)' };
}

// ─── Segmented control ────────────────────────────────────────────────────────

const RISK_ACTIVE_BG = {
  High:     'rgba(var(--danger-rgb), 0.10)',
  Extreme:  'rgba(var(--danger-rgb), 0.10)',
};

const RISK_ACTIVE_BORDER = {
  High:     'var(--danger)',
  Extreme:  'var(--danger)',
};

function SegCtrl({ options, value, onChange, riskColors }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const isActive = value === opt;
        const riskBg = riskColors && isActive ? RISK_ACTIVE_BG[opt] : null;
        const riskBorder = riskColors && isActive ? RISK_ACTIVE_BORDER[opt] : null;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: '3px 9px', fontSize: 10, letterSpacing: '0.06em',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
              border: isActive ? `0.5px solid ${riskBorder || 'var(--b3)'}` : '0.5px solid var(--b1)',
              background: isActive ? (riskBg || 'var(--bg4)') : 'var(--bg2)',
              color: isActive ? 'var(--t0)' : 'var(--t2)',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── LogForm ──────────────────────────────────────────────────────────────────

export default function LogForm({ callsign, onSubmit, onCancel }) {
  const { user } = useSession();
  const sessionCallsign = user?.callsign || callsign || 'UNKNOWN';
  const sessionUserId = user?.id || null;
  const [form, setForm] = useState({
    material_name:   '',
    system_name:     'Stanton',
    location_detail: '',
    quality_pct:     50,
    volume_estimate: 'Medium',
    risk_level:      'Low',
    ship_type:       '',
    notes:           '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const { options: materialOptions } = useSCReferenceOptions('tradeable-items', { currentValue: form.material_name });
  const { options: systemOptions } = useSCReferenceOptions('systems', { currentValue: form.system_name.toUpperCase() });
  const { options: locationOptions } = useSCReferenceOptions('locations', { system: form.system_name.toUpperCase(), currentValue: form.location_detail });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fb = qualityFeedback(form.quality_pct);

  const submit = async () => {
    if (!form.material_name.trim() || !form.location_detail.trim()) return;
    setSaving(true);
    try {
      const qualityScore = qualityScoreFromPercent(form.quality_pct);
      const result = await nexusWriteApi.createScoutDeposit({
        material_name:   form.material_name.trim(),
        system_name:     form.system_name.toUpperCase(),
        location_detail: form.location_detail.trim(),
        quality_score:   qualityScore,
        quality_pct:     form.quality_pct,
        volume_estimate: form.volume_estimate.toUpperCase(),
        risk_level:      form.risk_level.toUpperCase(),
        ship_type:       form.ship_type.trim() || null,
        notes:           form.notes.trim() || null,
        reported_by_user_id: sessionUserId,
        reported_by_callsign: sessionCallsign,
        reported_at:     new Date().toISOString(),
        is_stale:        false,
        confirmed_votes: 0,
        stale_votes:     0,
      });

      setSaved(true);
      onSubmit?.(result.deposit);
    } catch {
      // submit failed — saving state cleared
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em' }}>
          LOG DEPOSIT
        </span>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 2 }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Material */}
      <div>
        <label style={LABEL}>MATERIAL *</label>
        <SmartCombobox
          value={form.material_name}
          onChange={v => set('material_name', v)}
          options={materialOptions}
          theme="industrial"
          storageKey="nexus-smart:deposit:material"
          searchPlaceholder="Search live items and commodities"
          placeholder="Laranite, Quantanium, Hephaestanite..."
          allowCustom
          helperText="Live trade cache with custom scout shorthand support"
        />
      </div>

      {/* System */}
      <div>
        <label style={LABEL}>SYSTEM</label>
        <SmartSelect
          value={form.system_name.toUpperCase()}
          onChange={v => set('system_name', v.charAt(0) + v.slice(1).toLowerCase())}
          options={systemOptions}
          theme="tactical"
          storageKey="nexus-smart:deposit:system"
          helperText="Patch-aware live system registry"
        />
      </div>

      {/* Location */}
      <div>
        <label style={LABEL}>LOCATION DETAIL *</label>
        <SmartCombobox
          value={form.location_detail}
          onChange={v => set('location_detail', v)}
          options={locationOptions}
          theme="tactical"
          storageKey="nexus-smart:deposit:location"
          searchPlaceholder={`Search ${form.system_name} scout locations`}
          placeholder="Keeger Belt, moon, station, or custom grid"
          allowCustom
          helperText="Known locations plus custom belt sectors"
        />
      </div>

      {/* Quality slider */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <label style={{ ...LABEL, marginBottom: 0 }}>QUALITY %</label>
          <span style={{ color: fb.color, fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {form.quality_pct}%
          </span>
        </div>
        <input
          type="range" min={0} max={100} step={1}
          value={form.quality_pct}
          onChange={e => set('quality_pct', parseInt(e.target.value))}
          style={{ width: '100%', accentColor: fb.color }}
        />
        <div style={{ color: fb.color, fontSize: 9, letterSpacing: '0.08em', marginTop: 3 }}>
          {fb.label}
        </div>
      </div>

      {/* Volume */}
      <div>
        <label style={LABEL}>VOLUME ESTIMATE</label>
        <SegCtrl
          options={['Small', 'Medium', 'Large', 'Massive']}
          value={form.volume_estimate}
          onChange={v => set('volume_estimate', v)}
        />
      </div>

      {/* Risk */}
      <div>
        <label style={LABEL}>RISK LEVEL</label>
        <SegCtrl
          options={['Low', 'Medium', 'High', 'Extreme']}
          value={form.risk_level}
          onChange={v => set('risk_level', v)}
          riskColors
        />
      </div>

      {/* Ship type */}
      <div>
        <label style={LABEL}>SHIP TYPE</label>
        <input
          className="nexus-input"
          value={form.ship_type}
          onChange={e => set('ship_type', e.target.value)}
          placeholder="Prospector, ROC, MOLE..."
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Notes */}
      <div>
        <label style={LABEL}>NOTES</label>
        <textarea
          className="nexus-input"
          rows={3}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional scout notes..."
          style={{ width: '100%', resize: 'none', fontSize: 11, boxSizing: 'border-box' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          className="nexus-btn"
          style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: 11 }}
        >
          CANCEL
        </button>
        <button
          onClick={submit}
          disabled={saving || saved || !form.material_name.trim() || !form.location_detail.trim()}
          className="nexus-btn primary"
          style={{
            flex: 2, justifyContent: 'center', padding: '8px 0', fontSize: 11,
            opacity: saving ? 0.6 : 1,
            background: saved ? 'rgba(var(--live-rgb), 0.06)' : undefined,
            borderColor: saved ? 'rgba(var(--live-rgb), 0.3)' : undefined,
            color: saved ? 'var(--live)' : undefined,
          }}
        >
          {saved ? '✓ DEPOSIT LOGGED' : saving ? 'LOGGING...' : 'LOG DEPOSIT →'}
        </button>
      </div>
    </div>
  );
}
