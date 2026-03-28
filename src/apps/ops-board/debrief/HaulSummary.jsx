/**
 * HaulSummary — log resource haul items from the op.
 */
import React, { useState } from 'react';
import { Plus, X, Boxes } from 'lucide-react';

const LABEL = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

export default function HaulSummary({ items, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ material_name: '', quantity_scu: '', quality_score: '', value_aUEC: '' });

  const add = () => {
    if (!draft.material_name.trim()) return;
    onChange([...items, {
      material_name: draft.material_name,
      quantity_scu: parseFloat(draft.quantity_scu) || 0,
      quality_score: parseInt(draft.quality_score) || 0,
      value_aUEC: parseInt(draft.value_aUEC) || 0,
    }]);
    setDraft({ material_name: '', quantity_scu: '', quality_score: '', value_aUEC: '' });
    setShowForm(false);
  };

  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  const totalScu = items.reduce((s, it) => s + (it.quantity_scu || 0), 0);
  const totalValue = items.reduce((s, it) => s + (it.value_aUEC || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B', fontWeight: 700, letterSpacing: '0.08em' }}>
          <Boxes size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          RESOURCE HAUL ({items.length} items · {totalScu.toFixed(1)} SCU · {totalValue.toLocaleString()} aUEC)
        </span>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: 'none', border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          padding: '3px 8px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9, color: '#9A9488', display: 'flex', alignItems: 'center', gap: 3,
        }}>{showForm ? <><X size={8} /> CANCEL</> : <><Plus size={8} /> ADD</>}</button>
      </div>

      {showForm && (
        <div style={{
          display: 'flex', gap: 6, padding: 8, background: '#141410', border: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, marginBottom: 8, animation: 'nexus-fade-in 120ms ease-out both', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 2, minWidth: 100 }}>
            <span style={LABEL}>MATERIAL</span>
            <input value={draft.material_name} onChange={e => setDraft(d => ({ ...d, material_name: e.target.value }))}
              placeholder="e.g. Hadanite" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 60 }}>
            <span style={LABEL}>SCU</span>
            <input type="number" step="0.1" value={draft.quantity_scu} onChange={e => setDraft(d => ({ ...d, quantity_scu: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 60 }}>
            <span style={LABEL}>QUALITY</span>
            <input type="number" min={0} max={1000} value={draft.quality_score} onChange={e => setDraft(d => ({ ...d, quality_score: e.target.value }))}
              placeholder="1-1000" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 70 }}>
            <span style={LABEL}>VALUE (aUEC)</span>
            <input type="number" value={draft.value_aUEC} onChange={e => setDraft(d => ({ ...d, value_aUEC: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={add} disabled={!draft.material_name.trim()} style={{
              padding: '7px 14px', background: '#C8A84B', border: 'none', borderRadius: 2, color: '#0A0908',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, cursor: 'pointer',
              opacity: draft.material_name.trim() ? 1 : 0.4,
            }}>ADD</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: '12px 0', fontSize: 10, color: '#5A5850', fontStyle: 'italic' }}>No resource haul logged.</div>
      ) : (
        <div style={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 28px',
            padding: '6px 10px', background: '#141410', gap: 6,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            <span>MATERIAL</span><span>SCU</span><span>QUALITY</span><span>VALUE</span><span />
          </div>
          {items.map((it, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 28px',
              padding: '7px 10px', gap: 6, alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.04)',
            }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, color: '#E8E4DC' }}>{it.material_name}</span>
              <span style={{ fontSize: 10, color: '#9A9488', fontVariantNumeric: 'tabular-nums' }}>{it.quantity_scu}</span>
              <span style={{ fontSize: 10, color: (it.quality_score || 0) >= 800 ? '#C8A84B' : '#5A5850', fontVariantNumeric: 'tabular-nums' }}>
                {it.quality_score || '—'}
              </span>
              <span style={{ fontSize: 10, color: '#4A8C5C', fontVariantNumeric: 'tabular-nums' }}>{(it.value_aUEC || 0).toLocaleString()}</span>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2 }}><X size={9} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}