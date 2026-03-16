/**
 * LootTally — material harvest tracker for phases index >= 4.
 * Props: { op, callsign, currentPhase, onUpdate }
 *
 * Only renders when currentPhase >= 4.
 * Loot stored as session_log entries with type='MATERIAL'.
 * Log loot dialog: material autocomplete from game_cache_items,
 * qty SCU, quality %, est aUEC from game_cache_commodities sell price.
 * Design decision: est value = (quantity_scu * sell_price_per_scu).
 * If no price data found, est value field shows '—'.
 * Running total row at bottom of table.
 */
import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X } from 'lucide-react';

// ─── Overlay (position:absolute, scoped) ─────────────────────────────────────

function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,8,11,0.86)', zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      {children}
    </div>
  );
}

// ─── Simple autocomplete input ────────────────────────────────────────────────

function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="nexus-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
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
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              style={{ padding: '6px 10px', color: 'var(--t0)', fontSize: 12, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Log loot dialog ──────────────────────────────────────────────────────────

function LogLootDialog({ onClose, onSubmit }) {
  const [form, setForm] = useState({ material_name: '', quantity_scu: '', quality_pct: '', est_value: '' });
  const [itemSugg, setItemSugg]   = useState([]);
  const [priceLookup, setPriceLookup] = useState(null);
  const [saving, setSaving]       = useState(false);
  const debounce                  = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Autocomplete from game_cache_items
  const loadSuggestions = useCallback(async (q) => {
    if (q.length < 3) { setItemSugg([]); return; }
    try {
      const res = await base44.entities.game_cache_items.list('-item_name', 100);
      setItemSugg(
        (res || [])
          .filter(r => (r.item_name || r.name || '').toLowerCase().includes(q.toLowerCase()))
          .slice(0, 8)
          .map(r => ({ label: r.item_name || r.name, value: r.item_name || r.name }))
      );
    } catch { setItemSugg([]); }
  }, []);

  // Look up commodity price when material is selected
  const lookupPrice = useCallback(async (name) => {
    if (!name) return;
    try {
      const res = await base44.entities.game_cache_commodities.list('-name', 100);
      const match = (res || []).find(c =>
        (c.name || c.commodity_name || '').toLowerCase() === name.toLowerCase()
      );
      setPriceLookup(match ? (match.sell_price || match.price || null) : null);
    } catch { setPriceLookup(null); }
  }, []);

  // Auto-compute est value when qty or price changes
  const computeEst = (qty, price) => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (!isNaN(q) && !isNaN(p) && p > 0) return Math.round(q * p);
    return '';
  };

  const handleSelect = async (s) => {
    set('material_name', s.value);
    await lookupPrice(s.value);
  };

  const handleQtyChange = (v) => {
    set('quantity_scu', v);
    if (priceLookup) set('est_value', computeEst(v, priceLookup));
  };

  const submit = async () => {
    if (!form.material_name.trim() || !form.quantity_scu) return;
    setSaving(true);
    await onSubmit({
      material_name: form.material_name.trim(),
      quantity_scu:  parseFloat(form.quantity_scu) || 0,
      quality_pct:   parseFloat(form.quality_pct)  || 0,
      est_value:     parseFloat(form.est_value)     || 0,
    });
    setSaving(false);
    onClose();
  };

  const LABEL = { color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 };

  return (
    <Overlay onDismiss={onClose}>
      <div className="nexus-fade-in" style={{
        width: 420, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 10, padding: 22,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>
            LOG LOOT
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LABEL}>MATERIAL *</label>
            <AutocompleteInput
              value={form.material_name}
              placeholder="Laranite, Quantanium..."
              suggestions={itemSugg}
              onChange={v => {
                set('material_name', v);
                clearTimeout(debounce.current);
                debounce.current = setTimeout(() => loadSuggestions(v), 250);
              }}
              onSelect={handleSelect}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>QTY SCU *</label>
              <input
                className="nexus-input"
                type="number" min="0" step="0.1"
                value={form.quantity_scu}
                onChange={e => handleQtyChange(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>QUALITY %</label>
              <input
                className="nexus-input"
                type="number" min="0" max="100" step="1"
                value={form.quality_pct}
                onChange={e => set('quality_pct', e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={LABEL}>
              EST VALUE (aUEC)
              {priceLookup && (
                <span style={{ color: 'var(--t3)', marginLeft: 6, fontWeight: 400 }}>
                  {priceLookup.toLocaleString()}/SCU
                </span>
              )}
            </label>
            <input
              className="nexus-input"
              type="number" min="0"
              value={form.est_value}
              onChange={e => set('est_value', e.target.value)}
              placeholder="Auto-computed or manual"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: 11 }}>
            CANCEL
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.material_name.trim() || !form.quantity_scu}
            className="nexus-btn primary"
            style={{ flex: 2, justifyContent: 'center', padding: '8px 0', fontSize: 11, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'LOGGING...' : 'LOG LOOT →'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── LootTally ────────────────────────────────────────────────────────────────

export default function LootTally({ op, callsign, currentPhase, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);

  // Only visible in phases index >= 4
  if ((currentPhase || 0) < 4) return null;

  const log  = Array.isArray(op.session_log) ? op.session_log : [];
  const loot = log.filter(e => e.type === 'MATERIAL');

  const totalSCU   = loot.reduce((s, e) => s + (e.quantity_scu || 0), 0);
  const totalValue = loot.reduce((s, e) => s + (e.est_value_aUEC || 0), 0);

  const handleSubmit = async ({ material_name, quantity_scu, quality_pct, est_value }) => {
    const entry = {
      t:             new Date().toISOString(),
      type:          'MATERIAL',
      author:        callsign,
      text:          `Logged ${quantity_scu} SCU ${material_name}${quality_pct ? ` @ ${quality_pct}%` : ''}`,
      material_name,
      quantity_scu,
      quality_pct,
      est_value_aUEC: est_value,
    };
    const newLog = [...log, entry];
    await base44.entities.Op.update(op.id, { session_log: newLog });
    onUpdate?.(newLog);
  };

  const TH = { padding: '5px 10px', textAlign: 'left', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)', whiteSpace: 'nowrap' };
  const TD = { padding: '5px 10px', fontSize: 11, fontVariantNumeric: 'tabular-nums' };

  return (
    // position:relative for scoped overlay
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>LOOT TALLY</span>
        <button
          onClick={() => setShowDialog(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '0.5px solid var(--b2)',
            borderRadius: 5, cursor: 'pointer', color: 'var(--t2)',
            fontSize: 9, letterSpacing: '0.07em', padding: '3px 8px',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={9} /> LOG LOOT
        </button>
      </div>

      <div style={{ border: '0.5px solid var(--b1)', borderRadius: 7, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['MATERIAL', 'SCU', 'QUAL %', 'EST aUEC'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loot.map((e, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid var(--b0)' }}>
                <td style={{ ...TD, color: 'var(--t0)' }}>{e.material_name || '—'}</td>
                <td style={{ ...TD, color: 'var(--t1)' }}>{(e.quantity_scu || 0).toFixed(1)}</td>
                <td style={{ ...TD, color: 'var(--t1)' }}>{e.quality_pct ? `${e.quality_pct}%` : '—'}</td>
                <td style={{ ...TD, color: 'var(--acc2)' }}>{e.est_value_aUEC ? e.est_value_aUEC.toLocaleString() : '—'}</td>
              </tr>
            ))}
            {loot.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '14px 10px', textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>
                  No loot logged
                </td>
              </tr>
            )}
            {/* Running total */}
            {loot.length > 0 && (
              <tr style={{ background: 'var(--bg2)', borderTop: '0.5px solid var(--b1)' }}>
                <td style={{ ...TD, color: 'var(--t2)', fontWeight: 600, fontSize: 9, letterSpacing: '0.08em' }}>TOTAL</td>
                <td style={{ ...TD, color: 'var(--t0)', fontWeight: 600 }}>{totalSCU.toFixed(1)}</td>
                <td style={{ ...TD, color: 'var(--t2)' }}>—</td>
                <td style={{ ...TD, color: 'var(--live)', fontWeight: 600 }}>
                  {totalValue > 0 ? totalValue.toLocaleString() : '—'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDialog && (
        <LogLootDialog
          onClose={() => setShowDialog(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
