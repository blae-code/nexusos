/**
 * OCR review table — shown after screenshot extraction.
 * User edits qty/quality then confirms.
 * No closed-over variables — props only.
 */
import React from 'react';
import { X } from 'lucide-react';
import { TH, TD, T2Badge } from './MaterialTablePrimitives';

// ─── OCR review table ──────────────────────────────────────────────────────────

export default function OCRReviewTable({ items, checked, setChecked, setItems, onConfirm, onDismiss, confirming }) {
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const updateItem = (idx, field, value) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const inputStyle = {
    background: 'var(--bg3)', border: '0.5px solid var(--b2)',
    color: 'var(--t0)', fontFamily: 'inherit', fontSize: 11,
    padding: '2px 6px', borderRadius: 4, outline: 'none', width: '68px',
  };

  const allChecked = items.length > 0 && Object.values(checked).every(Boolean);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: 'var(--t1)', fontSize: 11 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} extracted — review before saving
        </span>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ border: '0.5px solid var(--b1)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 28 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={e => setChecked(Object.fromEntries(items.map((_, i) => [i, e.target.checked])))}
                  style={{ accentColor: 'var(--acc)', cursor: 'pointer' }}
                />
              </th>
              {['MATERIAL', 'TYPE', 'QUALITY %', 'QTY SCU', 'T2'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isT2 = (parseFloat(item.quality_pct) || 0) >= 80;
              return (
                <tr
                  key={idx}
                  style={{ borderBottom: '0.5px solid var(--b0)', opacity: checked[idx] ? 1 : 0.4 }}
                >
                  <td style={TD}>
                    <input
                      type="checkbox"
                      checked={!!checked[idx]}
                      onChange={e => setChecked(prev => ({ ...prev, [idx]: e.target.checked }))}
                      style={{ accentColor: 'var(--acc)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={TD}>
                    <span style={{ color: 'var(--t0)', fontSize: 11 }}>{item.material_name || '—'}</span>
                  </td>
                  <td style={TD}>
                    <span className="nexus-tag" style={{ color: 'var(--t1)', borderColor: 'var(--b2)', background: 'var(--bg3)', fontSize: 9 }}>
                      {item.material_type || 'RAW'}
                    </span>
                  </td>
                  <td style={TD}>
                    {/* quality input — inline editing per spec */}
                    <input
                      type="number" min="0" max="100" step="0.1"
                      value={item.quality_pct ?? ''}
                      onChange={e => updateItem(idx, 'quality_pct', e.target.value)}
                      disabled={!checked[idx]}
                      style={inputStyle}
                    />
                  </td>
                  <td style={TD}>
                    {/* quantity input — inline editing per spec */}
                    <input
                      type="number" min="0" step="0.1"
                      value={item.quantity_scu ?? ''}
                      onChange={e => updateItem(idx, 'quantity_scu', e.target.value)}
                      disabled={!checked[idx]}
                      style={inputStyle}
                    />
                  </td>
                  <td style={TD}>
                    {/* T2 eligibility auto-computed from quality_pct */}
                    <T2Badge t2_eligible={isT2} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          onClick={onConfirm}
          disabled={confirming || checkedCount === 0}
          className="nexus-btn"
          style={{
            padding: '5px 14px', fontSize: 11,
            background: checkedCount > 0 ? 'rgba(39,201,106,0.1)' : 'var(--bg2)',
            borderColor: checkedCount > 0 ? 'rgba(39,201,106,0.3)' : 'var(--b1)',
            color: checkedCount > 0 ? 'var(--live)' : 'var(--t2)',
          }}
        >
          {confirming ? 'Saving...' : `Confirm ${checkedCount} item${checkedCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
