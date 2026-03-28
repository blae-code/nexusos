/**
 * MaterialRequisitionDialog — modal for creating a material requisition.
 * Pre-fills from shortfall data when launched from Find Crafters or Production.
 */
import React, { useState } from 'react';
import { X, Send, Package, AlertTriangle } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const PRIORITY_COLORS = { LOW: '#5A5850', NORMAL: '#9A9488', HIGH: '#C8A84B', URGENT: '#C0392B' };

export default function MaterialRequisitionDialog({
  callsign,
  prefill,       // { material_name, material_type, quantity_scu, blueprint_name, blueprint_id, target_callsign, target_user_id, source_module }
  onClose,
  onCreated,
}) {
  const pf = prefill || {};
  const [materialName, setMaterialName] = useState(pf.material_name || '');
  const [materialType, setMaterialType] = useState(pf.material_type || '');
  const [quantityScu, setQuantityScu] = useState(pf.quantity_scu || '');
  const [purpose, setPurpose] = useState(
    pf.blueprint_name
      ? `Material needed to craft ${pf.blueprint_name}`
      : ''
  );
  const [priority, setPriority] = useState(pf.priority || 'NORMAL');
  const [saving, setSaving] = useState(false);

  const LABEL = {
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
    letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
  };

  const submit = async () => {
    if (!materialName.trim() || !purpose.trim()) return;
    setSaving(true);

    const now = new Date().toISOString();
    const reqData = {
      requested_by_callsign: callsign,
      request_type: 'MATERIAL',
      item_name: materialName,
      material_name: materialName,
      material_type: materialType || undefined,
      quantity_scu: parseFloat(quantityScu) || 0,
      quantity: Math.ceil(parseFloat(quantityScu) || 1),
      purpose,
      priority,
      source_module: pf.source_module || 'MANUAL',
      source_blueprint_id: pf.blueprint_id || undefined,
      source_blueprint_name: pf.blueprint_name || undefined,
      target_callsign: pf.target_callsign || undefined,
      target_user_id: pf.target_user_id || undefined,
      requested_at: now,
      status: 'OPEN',
    };

    try {
      await base44.entities.Requisition.create(reqData);
      showToast(`Requisition sent${pf.target_callsign ? ` → ${pf.target_callsign}` : ''}`, 'success');
      onCreated?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'Failed to create requisition', 'error');
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: '#0F0F0D', borderLeft: '2px solid #C0392B',
          border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2,
          animation: 'nexus-fade-in 150ms ease-out both',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          background: '#141410', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={14} style={{ color: '#C0392B' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 14, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>MATERIAL REQUISITION</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Target callsign banner */}
          {pf.target_callsign && (
            <div style={{
              padding: '8px 12px', borderRadius: 2,
              background: 'rgba(200,168,75,0.08)', border: '0.5px solid rgba(200,168,75,0.2)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <AlertTriangle size={10} />
              Requesting from <strong>{pf.target_callsign}</strong>
              {pf.blueprint_name && <> — needed for <strong>{pf.blueprint_name}</strong></>}
            </div>
          )}

          {/* Material name + type */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <span style={LABEL}>MATERIAL NAME *</span>
              <input
                className="nexus-input"
                value={materialName}
                onChange={e => setMaterialName(e.target.value)}
                placeholder="e.g. Quantanium, CMR, Bexalite"
                style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>TYPE</span>
              <select
                className="nexus-input"
                value={materialType}
                onChange={e => setMaterialType(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
              >
                <option value="">ANY</option>
                <option value="CMR">CMR</option>
                <option value="CMP">CMP</option>
                <option value="CMS">CMS</option>
                <option value="CM_REFINED">REFINED</option>
                <option value="ORE">ORE</option>
              </select>
            </div>
          </div>

          {/* Quantity SCU */}
          <div>
            <span style={LABEL}>QUANTITY (SCU)</span>
            <input
              className="nexus-input"
              type="number"
              min="0.1"
              step="0.1"
              value={quantityScu}
              onChange={e => setQuantityScu(e.target.value)}
              placeholder="0.0"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Purpose */}
          <div>
            <span style={LABEL}>PURPOSE / JUSTIFICATION *</span>
            <textarea
              className="nexus-input nexus-input"
              rows={2}
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="Why is this material needed?"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', minHeight: 56 }}
            />
          </div>

          {/* Priority */}
          <div>
            <span style={LABEL}>PRIORITY</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setPriority(p)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 2,
                  background: priority === p ? `${PRIORITY_COLORS[p]}15` : '#141410',
                  border: `0.5px solid ${priority === p ? `${PRIORITY_COLORS[p]}44` : 'rgba(200,170,100,0.08)'}`,
                  color: priority === p ? PRIORITY_COLORS[p] : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                  cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 150ms',
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '8px 14px', background: 'none',
              border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', cursor: 'pointer',
            }}>CANCEL</button>
            <button
              onClick={submit}
              disabled={!materialName.trim() || !purpose.trim() || saving}
              style={{
                padding: '8px 18px', borderRadius: 2,
                background: !materialName.trim() || !purpose.trim() || saving ? '#5A5850' : '#C0392B',
                border: 'none', color: '#E8E4DC',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: !materialName.trim() || !purpose.trim() || saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Send size={11} />
              {saving ? 'SENDING...' : 'SEND REQUISITION'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}