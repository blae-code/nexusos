/**
 * ResourceHaulForm — log materials/commodities hauled during an op.
 */
import React, { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';

export default function ResourceHaulForm({ haul, onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ material_name: '', quantity_scu: '', quality_score: '', value_aUEC: '' });

  const add = () => {
    if (!form.material_name.trim()) return;
    onChange([...haul, {
      material_name: form.material_name,
      quantity_scu: parseFloat(form.quantity_scu) || 0,
      quality_score: parseInt(form.quality_score) || 0,
      value_aUEC: parseInt(form.value_aUEC) || 0,
    }]);
    setForm({ material_name: '', quantity_scu: '', quality_score: '', value_aUEC: '' });
    setShowAdd(false);
  };

  const remove = (i) => onChange(haul.filter((_, idx) => idx !== i));

  const totalScu = haul.reduce((s, h) => s + (h.quantity_scu || 0), 0);
  const totalValue = haul.reduce((s, h) => s + (h.value_aUEC || 0), 0);

  return (
    <div>
      {haul.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, padding: '6px 8px', background: '#141410', borderRadius: 2 }}>
          <span style={{ fontSize: 9, color: '#C8A84B', fontFamily: "'Barlow Condensed', sans-serif" }}>
            TOTAL: {totalScu.toFixed(1)} SCU
          </span>
          <span style={{ fontSize: 9, color: '#4A8C5C', fontFamily: "'Barlow Condensed', sans-serif" }}>
            VALUE: {totalValue.toLocaleString()} aUEC
          </span>
        </div>
      )}

      {haul.map((h, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
          borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        }}>
          <Package size={10} style={{ color: '#4A8C5C', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 11, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
            {h.material_name}
          </span>
          <span style={{ fontSize: 10, color: '#9A9488', fontFamily: 'monospace' }}>{h.quantity_scu} SCU</span>
          {h.quality_score > 0 && <span style={{ fontSize: 9, color: h.quality_score >= 800 ? '#C8A84B' : '#5A5850' }}>Q{h.quality_score}</span>}
          <span style={{ fontSize: 10, color: '#C8A84B', fontFamily: 'monospace', minWidth: 70, textAlign: 'right' }}>
            {h.value_aUEC ? `${h.value_aUEC.toLocaleString()}` : '—'}
          </span>
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 2 }}><X size={10} /></button>
        </div>
      ))}

      {showAdd ? (
        <div style={{ display: 'flex', gap: 6, padding: '8px 0', flexWrap: 'wrap', animation: 'nexus-fade-in 120ms ease-out both' }}>
          <input className="nexus-input" value={form.material_name} onChange={e => setForm(f => ({ ...f, material_name: e.target.value }))}
            placeholder="Material / commodity" style={{ flex: 2, fontSize: 10, minWidth: 120 }} />
          <input className="nexus-input" type="number" step="0.1" value={form.quantity_scu} onChange={e => setForm(f => ({ ...f, quantity_scu: e.target.value }))}
            placeholder="SCU" style={{ width: 60, fontSize: 10 }} />
          <input className="nexus-input" type="number" value={form.quality_score} onChange={e => setForm(f => ({ ...f, quality_score: e.target.value }))}
            placeholder="Quality" style={{ width: 60, fontSize: 10 }} />
          <input className="nexus-input" type="number" value={form.value_aUEC} onChange={e => setForm(f => ({ ...f, value_aUEC: e.target.value }))}
            placeholder="aUEC" style={{ width: 70, fontSize: 10 }} />
          <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: '4px 10px', cursor: 'pointer', color: '#5A5850', fontSize: 9 }}>CANCEL</button>
          <button onClick={add} style={{ background: '#C0392B', border: 'none', borderRadius: 2, padding: '4px 12px', cursor: 'pointer', color: '#E8E4DC', fontSize: 9, fontWeight: 600 }}>ADD</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          marginTop: 6, padding: '6px 12px', background: 'none',
          border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          color: '#9A9488', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}><Plus size={9} /> ADD RESOURCE</button>
      )}
    </div>
  );
}