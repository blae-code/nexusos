/**
 * ReservationForm — create or edit an asset reservation.
 * Checks for conflicts against existing reservations.
 */
import React, { useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { X, AlertTriangle, Ship, Package } from 'lucide-react';

const PURPOSES = [
  'TRADE RUN', 'MINING OP', 'SALVAGE OP', 'CARGO HAUL',
  'PATROL', 'ESCORT', 'EXPLORATION', 'TRAINING', 'OTHER',
];

function formatLocal(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReservationForm({ ships, assets, ops, reservations, callsign, userId, onClose, onSaved, editReservation }) {
  const isEdit = !!editReservation;
  const [form, setForm] = useState(() => {
    if (editReservation) return {
      asset_type: editReservation.asset_type || 'SHIP',
      ship_id: editReservation.ship_id || '',
      asset_id: editReservation.asset_id || '',
      purpose: editReservation.purpose || '',
      op_id: editReservation.op_id || '',
      start_time: formatLocal(editReservation.start_time),
      end_time: formatLocal(editReservation.end_time),
      notes: editReservation.notes || '',
      system_location: editReservation.system_location || '',
    };
    const now = new Date();
    const later = new Date(now.getTime() + 3 * 3600000);
    return {
      asset_type: 'SHIP', ship_id: '', asset_id: '',
      purpose: '', op_id: '',
      start_time: formatLocal(now), end_time: formatLocal(later),
      notes: '', system_location: '',
    };
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Detect conflicts
  const conflicts = useMemo(() => {
    if (!form.start_time || !form.end_time) return [];
    const start = new Date(form.start_time).getTime();
    const end = new Date(form.end_time).getTime();
    if (start >= end) return [];

    const targetId = form.asset_type === 'SHIP' ? form.ship_id : form.asset_id;
    if (!targetId) return [];

    return (reservations || []).filter(r => {
      if (isEdit && r.id === editReservation.id) return false;
      if (['COMPLETED', 'CANCELLED'].includes(r.status)) return false;
      const rAssetId = r.asset_type === 'SHIP' ? r.ship_id : r.asset_id;
      if (rAssetId !== targetId) return false;
      const rStart = new Date(r.start_time).getTime();
      const rEnd = new Date(r.end_time).getTime();
      return start < rEnd && end > rStart;
    });
  }, [form, reservations, isEdit, editReservation]);

  const selectedShip = ships.find(s => s.id === form.ship_id);
  const selectedAsset = assets.find(a => a.id === form.asset_id);
  const selectedOp = ops.find(o => o.id === form.op_id);

  const handleSubmit = async () => {
    if (!form.start_time || !form.end_time) return;
    if (conflicts.length > 0) return;
    const targetId = form.asset_type === 'SHIP' ? form.ship_id : form.asset_id;
    if (!targetId) return;

    setSaving(true);
    const payload = {
      asset_type: form.asset_type,
      ship_id: form.asset_type === 'SHIP' ? form.ship_id : null,
      ship_name: selectedShip?.name || null,
      ship_model: selectedShip?.model || null,
      asset_id: form.asset_type !== 'SHIP' ? form.asset_id : null,
      asset_name: selectedAsset?.asset_name || null,
      reserved_by_callsign: callsign,
      reserved_by_id: userId,
      purpose: form.purpose,
      op_id: form.op_id || null,
      op_name: selectedOp?.name || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      notes: form.notes || null,
      system_location: form.system_location || null,
      status: isEdit ? editReservation.status : 'PENDING',
    };

    try {
      if (isEdit) {
        await base44.entities.AssetReservation.update(editReservation.id, payload);
        showToast('Reservation updated', 'success');
      } else {
        await base44.entities.AssetReservation.create(payload);
        showToast('Reservation created', 'success');
      }
      onSaved();
    } catch (err) {
      showToast(err?.message || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const LABEL = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };
  const INPUT = { width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto',
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2, padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em' }}>
            {isEdit ? 'EDIT RESERVATION' : 'RESERVE ASSET'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Asset type */}
          <div>
            <span style={LABEL}>ASSET TYPE</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[{ id: 'SHIP', icon: Ship, label: 'SHIP' }, { id: 'VEHICLE', icon: Package, label: 'VEHICLE' }, { id: 'EQUIPMENT', icon: Package, label: 'EQUIPMENT' }].map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => { set('asset_type', t.id); set('ship_id', ''); set('asset_id', ''); }} style={{
                    flex: 1, padding: '6px', borderRadius: 2, cursor: 'pointer',
                    background: form.asset_type === t.id ? 'rgba(192,57,43,0.10)' : '#141410',
                    border: `0.5px solid ${form.asset_type === t.id ? '#C0392B' : 'rgba(200,170,100,0.08)'}`,
                    color: form.asset_type === t.id ? '#E8E4DC' : '#5A5850',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    letterSpacing: '0.06em',
                  }}>
                    <Icon size={10} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset selector */}
          <div>
            <span style={LABEL}>{form.asset_type === 'SHIP' ? 'SELECT SHIP' : 'SELECT ASSET'}</span>
            {form.asset_type === 'SHIP' ? (
              <select value={form.ship_id} onChange={e => set('ship_id', e.target.value)} style={INPUT}>
                <option value="">— select ship —</option>
                {ships.filter(s => s.status !== 'DESTROYED' && s.status !== 'ARCHIVED').map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.model} ({s.cargo_scu || 0} SCU)</option>
                ))}
              </select>
            ) : (
              <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)} style={INPUT}>
                <option value="">— select asset —</option>
                {assets.filter(a => a.asset_type === form.asset_type && a.status !== 'DESTROYED').map(a => (
                  <option key={a.id} value={a.id}>{a.asset_name} — {a.model || a.asset_type}</option>
                ))}
              </select>
            )}
          </div>

          {/* Time range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={LABEL}>START TIME</span>
              <input type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)} style={INPUT} />
            </div>
            <div>
              <span style={LABEL}>END TIME</span>
              <input type="datetime-local" value={form.end_time} onChange={e => set('end_time', e.target.value)} style={INPUT} />
            </div>
          </div>

          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: 'rgba(192,57,43,0.10)', border: '0.5px solid rgba(192,57,43,0.3)',
              borderRadius: 2,
            }}>
              <AlertTriangle size={14} style={{ color: '#C0392B', flexShrink: 0 }} />
              <div style={{ fontSize: 10, color: '#C0392B', fontFamily: "'Barlow Condensed', sans-serif" }}>
                <strong>CONFLICT:</strong> This asset is already reserved by{' '}
                {conflicts.map(c => c.reserved_by_callsign).join(', ')} during this window.
              </div>
            </div>
          )}

          {/* Purpose */}
          <div>
            <span style={LABEL}>PURPOSE</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PURPOSES.map(p => (
                <button key={p} onClick={() => set('purpose', p)} style={{
                  padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                  background: form.purpose === p ? 'rgba(200,168,75,0.10)' : '#141410',
                  border: `0.5px solid ${form.purpose === p ? '#C8A84B' : 'rgba(200,170,100,0.08)'}`,
                  color: form.purpose === p ? '#C8A84B' : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
                  letterSpacing: '0.06em',
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Op link */}
          <div>
            <span style={LABEL}>LINKED OPERATION (optional)</span>
            <select value={form.op_id} onChange={e => set('op_id', e.target.value)} style={INPUT}>
              <option value="">— none —</option>
              {ops.map(o => <option key={o.id} value={o.id}>{o.name} ({o.status})</option>)}
            </select>
          </div>

          {/* System location */}
          <div>
            <span style={LABEL}>SYSTEM LOCATION</span>
            <input value={form.system_location} onChange={e => set('system_location', e.target.value)} placeholder="e.g. STANTON" style={INPUT} />
          </div>

          {/* Notes */}
          <div>
            <span style={LABEL}>NOTES</span>
            <textarea className="nexus-input" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional details..." style={{ ...INPUT, resize: 'none', minHeight: 56 }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '8px 16px', background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, cursor: 'pointer',
            }}>CANCEL</button>
            <button onClick={handleSubmit} disabled={saving || conflicts.length > 0 || !(form.ship_id || form.asset_id)} style={{
              padding: '8px 20px', background: saving || conflicts.length > 0 ? '#5A5850' : '#C0392B',
              border: 'none', borderRadius: 2, color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', cursor: saving || conflicts.length > 0 ? 'not-allowed' : 'pointer',
            }}>{saving ? 'SAVING...' : isEdit ? 'UPDATE' : 'RESERVE →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}