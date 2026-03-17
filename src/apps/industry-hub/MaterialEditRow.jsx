/**
 * Inline row editor for a single material record — Materials.
 * No closed-over variables — props only.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import NexusToken from '@/core/design/NexusToken';
import { materialToken } from '@/core/data/tokenMap';
import { TD } from './MaterialTablePrimitives';

// ─── Helpers (duplicated from Materials.jsx to keep this file self-contained) ──

function matCategory(type) {
  if (type === 'SALVAGE') return 'salvage';
  if (type === 'CRAFTED') return 'general';
  return 'ore'; // RAW, REFINED
}

// ─── Inline row editor ─────────────────────────────────────────────────────────

export default function EditRow({ material, onSave, onCancel }) {
  const [qty, setQty]   = useState(String(material.quantity_scu ?? ''));
  const [qual, setQual] = useState(String(material.quality_pct ?? ''));
  const [type, setType] = useState(material.material_type || 'RAW');

  const inputStyle = {
    background: 'var(--bg3)', border: '0.5px solid var(--b2)',
    color: 'var(--t0)', fontFamily: 'inherit', fontSize: 11,
    padding: '2px 6px', borderRadius: 4, outline: 'none', width: '70px',
  };

  const handleSave = async () => {
    await base44.entities.Material.update(material.id, {
      quantity_scu: parseFloat(qty)  || 0,
      quality_pct:  parseFloat(qual) || 0,
      material_type: type,
      t2_eligible:  (parseFloat(qual) || 0) >= 80,
    });
    onSave();
  };

  return (
    <tr style={{ background: 'rgba(var(--acc-rgb), 0.1)', borderBottom: '0.5px solid var(--b1)' }}>
      {/* icon */}
      <td style={TD}>
        <NexusToken src={materialToken(matCategory(type), 'neutral')} size={24} alt={type} />
      </td>
      {/* name + type selector */}
      <td colSpan={2} style={TD}>
        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{material.material_name}</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {['RAW', 'REFINED', 'SALVAGE', 'CRAFTED'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '2px 7px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
                background: type === t ? 'var(--bg4)' : 'var(--bg2)',
                border: `0.5px solid ${type === t ? 'var(--b3)' : 'var(--b1)'}`,
                color: type === t ? 'var(--t0)' : 'var(--t2)', borderRadius: 4,
              }}
            >{t}</button>
          ))}
        </div>
      </td>
      {/* quality input */}
      <td style={TD}>
        <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 3 }}>QUALITY %</div>
        <input type="number" min="0" max="100" step="0.1" value={qual}
          onChange={e => setQual(e.target.value)} style={inputStyle} />
      </td>
      {/* qty input */}
      <td style={TD}>
        <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 3 }}>QTY SCU</div>
        <input type="number" min="0" step="0.1" value={qty}
          onChange={e => setQty(e.target.value)} style={inputStyle} />
      </td>
      {/* t2, status, logged — read-only during edit */}
      <td colSpan={3} />
      {/* save / cancel */}
      <td style={{ ...TD, textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            className="nexus-btn"
            style={{ padding: '3px 8px', fontSize: 9, background: 'rgba(var(--live-rgb), 0.1)', borderColor: 'rgba(var(--live-rgb), 0.3)', color: 'var(--live)' }}
          >SAVE</button>
          <button onClick={onCancel} className="nexus-btn" style={{ padding: '3px 8px', fontSize: 9 }}>
            CANCEL
          </button>
        </div>
      </td>
    </tr>
  );
}
