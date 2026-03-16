/**
 * LogForm — deposit logger.
 * Props: { callsign, discordId, onSubmit, onCancel }
 *
 * Material autocomplete from game_cache_commodities.
 * Quality slider with live T2 feedback (≥80% green, 60-79% amber, <60% dim).
 * On submit: ScoutDeposit.create + heraldBot scoutPing (.catch()).
 */
import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

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

function SegCtrl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '3px 9px', fontSize: 10, letterSpacing: '0.06em',
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            border: value === opt ? '0.5px solid var(--b3)' : '0.5px solid var(--b1)',
            background: value === opt ? 'var(--bg4)' : 'var(--bg2)',
            color: value === opt ? 'var(--t0)' : 'var(--t2)',
            fontWeight: value === opt ? 600 : 400,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Material autocomplete ────────────────────────────────────────────────────

function MaterialInput({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef(null);

  const loadSugg = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await base44.entities.game_cache_commodities.list('-name', 100);
      setSuggestions(
        (res || [])
          .filter(c => (c.name || c.commodity_name || '').toLowerCase().includes(q.toLowerCase()))
          .slice(0, 8)
          .map(c => c.name || c.commodity_name)
      );
    } catch { setSuggestions([]); }
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="nexus-input"
        value={value}
        placeholder="Laranite, Quantanium..."
        onChange={e => {
          onChange(e.target.value);
          clearTimeout(debounce.current);
          debounce.current = setTimeout(() => loadSugg(e.target.value), 250);
          setOpen(true);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: 'var(--bg3)', border: '0.5px solid var(--b2)',
          borderRadius: '0 0 6px 6px', maxHeight: 160, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onChange(s); setOpen(false); }}
              style={{ padding: '6px 10px', color: 'var(--t0)', fontSize: 12, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LogForm ──────────────────────────────────────────────────────────────────

export default function LogForm({ callsign, discordId, onSubmit, onCancel }) {
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fb = qualityFeedback(form.quality_pct);

  const submit = async () => {
    if (!form.material_name.trim() || !form.location_detail.trim()) return;
    setSaving(true);
    try {
      const deposit = await base44.entities.ScoutDeposit.create({
        material_name:   form.material_name.trim(),
        system_name:     form.system_name.toUpperCase(),
        location_detail: form.location_detail.trim(),
        quality_pct:     form.quality_pct,
        volume_estimate: form.volume_estimate.toUpperCase(),
        risk_level:      form.risk_level.toUpperCase(),
        ship_type:       form.ship_type.trim() || null,
        notes:           form.notes.trim() || null,
        reported_by:     discordId || null,
        reported_by_callsign: callsign,
        reported_at:     new Date().toISOString(),
        is_stale:        false,
        confirmed_votes: 0,
        stale_votes:     0,
      });

      // heraldBot scoutPing — non-fatal
      base44.functions.invoke('heraldBot', {
        action:  'scoutPing',
        payload: {
          material_name:   form.material_name.trim(),
          system_name:     form.system_name,
          location_detail: form.location_detail.trim(),
          quality_pct:     form.quality_pct,
          risk_level:      form.risk_level.toUpperCase(),
          callsign,
        },
      }).catch(e => console.warn('[LogForm] heraldBot scoutPing failed:', e.message));

      setSaved(true);
      onSubmit?.(deposit);
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
        <MaterialInput
          value={form.material_name}
          onChange={v => set('material_name', v)}
        />
      </div>

      {/* System */}
      <div>
        <label style={LABEL}>SYSTEM</label>
        <SegCtrl
          options={['Stanton', 'Pyro', 'Nyx']}
          value={form.system_name}
          onChange={v => set('system_name', v)}
        />
      </div>

      {/* Location */}
      <div>
        <label style={LABEL}>LOCATION DETAIL *</label>
        <input
          className="nexus-input"
          value={form.location_detail}
          onChange={e => set('location_detail', e.target.value)}
          placeholder="Keeger Belt · Sector 7"
          style={{ width: '100%', boxSizing: 'border-box' }}
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
            background: saved ? 'rgba(39,201,106,0.06)' : undefined,
            borderColor: saved ? 'rgba(39,201,106,0.3)' : undefined,
            color: saved ? 'var(--live)' : undefined,
          }}
        >
          {saved ? '✓ DEPOSIT LOGGED' : saving ? 'LOGGING...' : 'LOG DEPOSIT →'}
        </button>
      </div>
    </div>
  );
}
