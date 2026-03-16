import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function OcrPreview({ data, callsign, onConfirm, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);

  const materials = data.materials || [];
  const refineryOrders = data.refinery_orders || [];
  const discrepancies = data.discrepancies || [];

  const toggleItem = (id) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
  };

  const selectAll = () => {
    if (selectedItems.size === materials.length + refineryOrders.length) {
      setSelectedItems(new Set());
    } else {
      const all = new Set();
      materials.forEach((m, i) => all.add(`mat_${i}`));
      refineryOrders.forEach((r, i) => all.add(`ref_${i}`));
      setSelectedItems(all);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const itemsToInsert = [];
      const now = new Date().toISOString();

      // Materials
      materials.forEach((m, i) => {
        if (selectedItems.has(`mat_${i}`)) {
          itemsToInsert.push({
            type: 'material',
            data: {
              material_name: m.name,
              quantity_scu: m.quantity_scu,
              quality_pct: m.quality_pct || 0,
              location: m.location || '',
              material_type: m.type || 'RAW',
              logged_by: callsign,
              source_type: 'OCR_UPLOAD',
              logged_at: now,
            },
          });
        }
      });

      // Refinery Orders
      refineryOrders.forEach((r, i) => {
        if (selectedItems.has(`ref_${i}`)) {
          itemsToInsert.push({
            type: 'refinery',
            data: {
              material_name: r.material,
              quantity_scu: r.quantity_scu,
              method: r.method || 'STANDARD',
              yield_pct: r.yield_pct || 0,
              cost_aUEC: r.cost_aUEC || 0,
              station: r.station || '',
              submitted_by: callsign,
              submitted_by_callsign: callsign,
              status: 'ACTIVE',
              source_type: 'OCR_UPLOAD',
              started_at: new Date().toISOString(),
              completes_at: r.completes_at || null,
            },
          });
        }
      });

      // Bulk insert
      for (const item of itemsToInsert) {
        if (item.type === 'material') {
          await base44.entities.Material.create(item.data);
        } else if (item.type === 'refinery') {
          await base44.entities.RefineryOrder.create(item.data);
        }
      }

      setSaving(false);
      onConfirm();
    } catch (err) {
      console.error('Save failed:', err);
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--bg2)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>
        OCR EXTRACTION PREVIEW
      </div>

      {/* Discrepancies */}
      {discrepancies.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(232,160,32,0.08)',
            border: '0.5px solid rgba(232,160,32,0.3)',
            borderRadius: 6,
            color: 'var(--warn)',
            fontSize: 10,
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {discrepancies.length} issue{discrepancies.length !== 1 ? 's' : ''} detected
            </div>
            {discrepancies.map((d, i) => (
              <div key={i} style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 2 }}>
                • {d}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <div>
          <div style={{ color: 'var(--t1)', fontSize: 10, marginBottom: 8, fontWeight: 500 }}>
            MATERIALS ({materials.filter((_, i) => selectedItems.has(`mat_${i}`)).length} selected)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {materials.map((m, i) => {
              const id = `mat_${i}`;
              const isSelected = selectedItems.has(id);
              return (
                <div
                  key={i}
                  onClick={() => toggleItem(id)}
                  style={{
                    padding: '8px 10px',
                    background: isSelected ? 'var(--bg3)' : 'var(--bg1)',
                    border: `0.5px solid ${isSelected ? 'var(--b2)' : 'var(--b1)'}`,
                    borderRadius: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ marginTop: 2, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>
                      {m.name}
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                      {m.quantity_scu} SCU
                      {m.quality_pct > 0 && ` · ${m.quality_pct}% qual`}
                      {m.location && ` · ${m.location}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Refinery Orders */}
      {refineryOrders.length > 0 && (
        <div>
          <div style={{ color: 'var(--t1)', fontSize: 10, marginBottom: 8, fontWeight: 500 }}>
            REFINERY ORDERS ({refineryOrders.filter((_, i) => selectedItems.has(`ref_${i}`)).length} selected)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {refineryOrders.map((r, i) => {
              const id = `ref_${i}`;
              const isSelected = selectedItems.has(id);
              return (
                <div
                  key={i}
                  onClick={() => toggleItem(id)}
                  style={{
                    padding: '8px 10px',
                    background: isSelected ? 'var(--bg3)' : 'var(--bg1)',
                    border: `0.5px solid ${isSelected ? 'var(--b2)' : 'var(--b1)'}`,
                    borderRadius: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ marginTop: 2, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>
                      {r.material}
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                      {r.quantity_scu} SCU
                      {r.method && ` · ${r.method}`}
                      {r.yield_pct > 0 && ` · ${r.yield_pct}% yield`}
                      {r.station && ` · ${r.station}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Select All */}
      {(materials.length > 0 || refineryOrders.length > 0) && (
        <button
          onClick={selectAll}
          style={{
            padding: '4px 8px',
            fontSize: 9,
            color: 'var(--acc2)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            textAlign: 'left',
          }}
        >
          {selectedItems.size === materials.length + refineryOrders.length
            ? 'DESELECT ALL'
            : 'SELECT ALL'}
        </button>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          disabled={saving}
          className="nexus-btn"
          style={{ flex: 1, padding: '6px 0', fontSize: 10 }}
        >
          CANCEL
        </button>
        <button
          onClick={handleSave}
          disabled={saving || selectedItems.size === 0}
          className="nexus-btn live-btn"
          style={{
            flex: 1,
            padding: '6px 0',
            fontSize: 10,
            opacity: saving || selectedItems.size === 0 ? 0.5 : 1,
          }}
        >
          {saving ? 'SAVING...' : `CONFIRM (${selectedItems.size})`}
        </button>
      </div>
    </div>
  );
}