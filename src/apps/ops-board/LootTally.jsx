/**
 * LootTally — material harvest tracker for phases index >= 4.
 * Props: { op, callsign, rank, currentPhase, onUpdate }
 */
import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCountUp } from '@/core/hooks/useCountUp';
import { Plus } from 'lucide-react';

function qColor(pct) {
  if ((pct || 0) >= 80) return 'var(--live)';
  if ((pct || 0) >= 60) return 'var(--warn)';
  return 'var(--t2)';
}

function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="nexus-input"
        value={value}
        placeholder={placeholder}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 60,
            background: 'var(--bg3)',
            border: '0.5px solid var(--b2)',
            borderRadius: '0 0 3px 3px',
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => {
                onSelect(s);
                setOpen(false);
              }}
              style={{
                padding: '6px 10px',
                color: 'var(--t0)',
                fontSize: 11,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ material_name: '', quantity_scu: '', quality_pct: '' });
  const [itemSugg, setItemSugg] = useState([]);
  const [saving, setSaving] = useState(false);
  const debounce = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadSuggestions = useCallback(async (q) => {
    if (q.length < 3) {
      setItemSugg([]);
      return;
    }
    try {
      const res = await base44.entities.game_cache_items.list('-item_name', 100);
      setItemSugg(
        (res || [])
          .filter(r => (r.item_name || r.name || '').toLowerCase().includes(q.toLowerCase()))
          .slice(0, 8)
          .map(r => ({ label: r.item_name || r.name, value: r.item_name || r.name }))
      );
    } catch {
      setItemSugg([]);
    }
  }, []);

  const handleSelect = (s) => {
    set('material_name', s.value);
  };

  const submit = async () => {
    if (!form.material_name.trim() || !form.quantity_scu) return;
    setSaving(true);
    await onSubmit({
      material_name: form.material_name.trim(),
      quantity_scu: parseFloat(form.quantity_scu) || 0,
      quality_pct: parseFloat(form.quality_pct) || 0,
    });
    setSaving(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '8px 0',
        borderTop: '0.5px solid var(--b0)',
        animation: 'loot-form-in 200ms ease-out both',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AutocompleteInput
            value={form.material_name}
            placeholder="Material..."
            suggestions={itemSugg}
            onChange={v => {
              set('material_name', v);
              clearTimeout(debounce.current);
              debounce.current = setTimeout(() => loadSuggestions(v), 250);
            }}
            onSelect={handleSelect}
          />
        </div>
        <div style={{ width: 80 }}>
          <input
            className="nexus-input"
            type="number"
            min="0"
            step="0.1"
            value={form.quantity_scu}
            onChange={e => set('quantity_scu', e.target.value)}
            placeholder="0 SCU"
            style={{ fontSize: 11, height: 32 }}
          />
        </div>
        <div style={{ width: 70 }}>
          <input
            className="nexus-input"
            type="number"
            min="0"
            max="100"
            step="1"
            value={form.quality_pct}
            onChange={e => set('quality_pct', e.target.value)}
            placeholder="0 %"
            style={{ fontSize: 11, height: 32 }}
          />
        </div>
        <button
          onClick={submit}
          disabled={saving || !form.material_name.trim() || !form.quantity_scu}
          className="nexus-btn primary"
          style={{
            padding: '6px 10px',
            fontSize: 10,
            height: 32,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {saving ? '...' : 'ADD'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 10px',
            fontSize: 10,
            height: 32,
            background: 'none',
            border: '0.5px solid var(--b1)',
            borderRadius: 3,
            color: 'var(--t2)',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--b2)';
            e.currentTarget.style.background = 'rgba(var(--bg3-rgb), 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--b1)';
            e.currentTarget.style.background = 'none';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const SCOUT_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

export default function LootTally({ op, callsign, rank, currentPhase, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const canLog = SCOUT_RANKS.includes(rank);
  const isVisible = (currentPhase || 0) >= 4;
  const log = Array.isArray(op.session_log) ? op.session_log : [];
  const loot = log.filter(e => e.type === 'MATERIAL');
  const totalSCU = loot.reduce((s, e) => s + (e.quantity_scu || 0), 0);
  const animatedSCU = useCountUp(isVisible ? totalSCU : 0);

  // Only visible in phases index >= 4, fades in.
  if (!isVisible) return null;

  const handleSubmit = async ({ material_name, quantity_scu, quality_pct }) => {
    const entry = {
      t: new Date().toISOString(),
      type: 'MATERIAL',
      text: `Logged ${quantity_scu} SCU ${material_name}${quality_pct ? ` @ ${quality_pct}%` : ''}`,
      material_name,
      quantity_scu,
      quality_pct,
    };
    const newLog = [...log, entry];
    await base44.entities.Op.update(op.id, { session_log: newLog });
    setShowForm(false);
    onUpdate?.(newLog);
  };

  return (
    <div
      style={{
        animation: 'loot-reveal 300ms ease-out 100ms both',
      }}
    >
      <style>{`
        @keyframes loot-reveal {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes loot-form-in {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            max-height: 100px;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Loot Tally
        </span>
        {canLog && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="nexus-btn primary"
            style={{
              padding: '4px 10px',
              fontSize: 9,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font)',
            }}
          >
            <Plus size={10} /> Log Haul
          </button>
        )}
      </div>

      {/* Loot entries */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loot.length === 0 ? (
          <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font)', textAlign: 'center' }}>
            No loot logged
          </div>
        ) : (
          loot.map((e, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 36,
                borderBottom: '0.5px solid var(--b0)',
              }}
            >
              {/* Material name */}
              <span style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'var(--font)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.material_name || '—'}
              </span>

              {/* Quantity */}
              <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {(e.quantity_scu || 0).toFixed(1)} SCU
              </span>

              {/* Quality */}
              <span
                style={{
                  fontSize: 9,
                  color: qColor(e.quality_pct),
                  fontFamily: 'monospace',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: 40,
                }}
              >
                {e.quality_pct ? `${e.quality_pct}%` : '—'}
              </span>

              {/* Type pill */}
              <span
                className="nexus-tag"
                style={{
                  fontSize: 8,
                  color: 'var(--t3)',
                  borderColor: 'var(--b1)',
                  background: 'var(--bg2)',
                  flexShrink: 0,
                }}
              >
                {(e.material_name || '').substring(0, 3).toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Form */}
      {showForm && <LogForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {/* Total line */}
      {loot.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', marginTop: 4, paddingTop: 8, borderTop: '0.5px solid var(--b0)' }}>
          <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Total Haul
          </span>
          <span style={{ fontSize: 11, color: 'var(--t0)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', flex: 1, textAlign: 'right' }}>
            {animatedSCU.toFixed(1)} SCU
          </span>
        </div>
      )}
    </div>
  );
}
