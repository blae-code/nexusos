import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { CalendarCheck, Plus } from 'lucide-react';

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER'];

const STATUS_COLORS = {
  PENDING: '#C8A84B', CONFIRMED: '#3498DB', ACTIVE: '#4A8C5C',
  COMPLETED: '#5A5850', CANCELLED: '#C0392B',
};

function dtFmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function hasConflict(reservations, shipId, assetId, startIso, endIso, excludeId) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return reservations.some((r) => {
    if (r.id === excludeId) return false;
    if (r.status === 'CANCELLED' || r.status === 'COMPLETED') return false;
    const matchShip = shipId && r.ship_id === shipId;
    const matchAsset = assetId && r.asset_id === assetId;
    if (!matchShip && !matchAsset) return false;
    const rStart = new Date(r.start_time).getTime();
    const rEnd = new Date(r.end_time).getTime();
    return start < rEnd && end > rStart;
  });
}

function toLocalDatetimeInput(isoOrNow) {
  const d = isoOrNow ? new Date(isoOrNow) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ROW_STYLE = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 1.2fr 1fr 1.8fr 0.9fr 1fr',
  gap: 8,
  padding: '6px 0',
  borderBottom: '0.5px solid rgba(200,170,100,0.06)',
  alignItems: 'center',
  fontSize: 10,
};

const CELL = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function ReservationRow({ res, callsign, isLeader, onStatus, onCancel }) {
  const sc = STATUS_COLORS[res.status] || '#5A5850';
  const isMine = res.reserved_by_callsign?.toUpperCase() === callsign?.toUpperCase();

  return (
    <div style={ROW_STYLE}>
      <div style={{ ...CELL, color: '#E8E4DC' }}>
        {res.ship_name || res.asset_name || '—'}
        {res.ship_model && <span style={{ color: '#5A5850', marginLeft: 4 }}>{res.ship_model}</span>}
      </div>
      <div style={{ ...CELL, color: '#9A9488' }}>{res.reserved_by_callsign || '—'}</div>
      <div style={{ ...CELL, color: '#9A9488' }}>{res.purpose || '—'}</div>
      <div style={{ ...CELL, color: '#5A5850', fontSize: 9 }}>
        {dtFmt(res.start_time)} → {dtFmt(res.end_time)}
      </div>
      <div>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 2,
          color: sc, background: `${sc}18`, border: `0.5px solid ${sc}40`,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
        }}>
          {res.status}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        {isLeader && res.status === 'PENDING' && (
          <button type="button" onClick={() => onStatus(res, 'CONFIRMED')} style={actionBtn('#3498DB')}>
            CONFIRM
          </button>
        )}
        {isLeader && res.status === 'CONFIRMED' && (
          <button type="button" onClick={() => onStatus(res, 'ACTIVE')} style={actionBtn('#4A8C5C')}>
            ACTIVATE
          </button>
        )}
        {isLeader && res.status === 'ACTIVE' && (
          <button type="button" onClick={() => onStatus(res, 'COMPLETED')} style={actionBtn('#5A5850')}>
            COMPLETE
          </button>
        )}
        {(isMine || isLeader) && res.status !== 'COMPLETED' && res.status !== 'CANCELLED' && (
          <button type="button" onClick={() => onCancel(res)} style={actionBtn('#C0392B', true)}>
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}

function actionBtn(color, ghost = false) {
  return {
    padding: '3px 8px',
    background: ghost ? 'transparent' : `${color}18`,
    border: `0.5px solid ${color}40`,
    borderRadius: 2,
    color,
    fontSize: 8,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  };
}

const HEADER_CELL = { fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', fontFamily: "'Barlow Condensed', sans-serif" };

export default function AssetReservationPanel({ callsign, rank, ships = [], orgAssets = [] }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    asset_type: 'SHIP', ship_id: '', asset_id: '',
    purpose: '', start_time: '', end_time: '', system_location: '', notes: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const isLeader = LEADER_RANKS.includes(rank);

  const load = useCallback(async () => {
    const data = await base44.entities.AssetReservation.list('start_time', 300).catch(() => []);
    setReservations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    return base44.entities.AssetReservation.subscribe(() => void load());
  }, [load]);

  const active = useMemo(() => reservations.filter((r) => r.status === 'ACTIVE'), [reservations]);
  const confirmed = useMemo(() => reservations.filter((r) => r.status === 'CONFIRMED'), [reservations]);
  const pending = useMemo(() => reservations.filter((r) => r.status === 'PENDING'), [reservations]);

  const fc = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!form.start_time || !form.end_time) { setFormError('Start and end time are required.'); return; }
    if (new Date(form.end_time) <= new Date(form.start_time)) { setFormError('End must be after start.'); return; }
    if (!form.purpose.trim()) { setFormError('Purpose is required.'); return; }

    const shipId = form.asset_type === 'SHIP' ? form.ship_id : '';
    const assetId = form.asset_type !== 'SHIP' ? form.asset_id : '';

    if (hasConflict(reservations, shipId, assetId, form.start_time, form.end_time, null)) {
      setFormError('Scheduling conflict: this asset is already reserved for that window.');
      return;
    }

    setSaving(true);
    try {
      const selectedShip = ships.find((s) => s.id === shipId);
      const selectedAsset = orgAssets.find((a) => a.id === assetId);
      await base44.entities.AssetReservation.create({
        asset_type: form.asset_type,
        ...(shipId ? { ship_id: shipId, ship_name: selectedShip?.name, ship_model: selectedShip?.model } : {}),
        ...(assetId ? { asset_id: assetId, asset_name: selectedAsset?.name } : {}),
        reserved_by_callsign: callsign,
        purpose: form.purpose.trim(),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        ...(form.system_location.trim() ? { system_location: form.system_location.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        status: 'PENDING',
      });
      setForm({ asset_type: 'SHIP', ship_id: '', asset_id: '', purpose: '', start_time: '', end_time: '', system_location: '', notes: '' });
      setShowForm(false);
      void load();
    } catch {
      setFormError('Failed to create reservation. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = useCallback(async (res, nextStatus) => {
    await base44.entities.AssetReservation.update(res.id, {
      status: nextStatus,
      ...(nextStatus === 'CONFIRMED' || nextStatus === 'ACTIVE'
        ? { approved_by: callsign, approved_at: new Date().toISOString() }
        : {}),
    }).catch(() => {});
    void load();
  }, [callsign, load]);

  const handleCancel = useCallback(async (res) => {
    await base44.entities.AssetReservation.update(res.id, { status: 'CANCELLED' }).catch(() => {});
    void load();
  }, [load]);

  function ReservationGroup({ label, items }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.14em', marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {label} ({items.length})
        </div>
        <div style={ROW_STYLE}>
          <div style={HEADER_CELL}>ASSET</div>
          <div style={HEADER_CELL}>RESERVED BY</div>
          <div style={HEADER_CELL}>PURPOSE</div>
          <div style={HEADER_CELL}>WINDOW</div>
          <div style={HEADER_CELL}>STATUS</div>
          <div />
        </div>
        {items.map((r) => (
          <ReservationRow key={r.id} res={r} callsign={callsign} isLeader={isLeader} onStatus={handleStatus} onCancel={handleCancel} />
        ))}
      </div>
    );
  }

  const isEmpty = active.length === 0 && confirmed.length === 0 && pending.length === 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarCheck size={12} style={{ color: '#3498DB' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', letterSpacing: '0.08em' }}>
            {reservations.filter((r) => !['CANCELLED', 'COMPLETED'].includes(r.status)).length} active reservation{reservations.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: '5px 12px', borderRadius: 2,
            background: showForm ? 'transparent' : 'rgba(52,152,219,0.12)',
            border: `0.5px solid ${showForm ? 'rgba(200,170,100,0.15)' : 'rgba(52,152,219,0.4)'}`,
            color: showForm ? '#5A5850' : '#3498DB',
            fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Plus size={9} />
          {showForm ? 'CANCEL' : 'RESERVE ASSET'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: '#07080B', border: '0.5px solid rgba(52,152,219,0.18)', borderRadius: 2,
          padding: '12px 14px', marginBottom: 14,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>ASSET TYPE</label>
              <select className="nexus-input" value={form.asset_type} onChange={(e) => fc('asset_type', e.target.value)} style={inputStyle}>
                <option value="SHIP">Ship</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {form.asset_type === 'SHIP' ? (
              <div>
                <label style={labelStyle}>SHIP</label>
                <select className="nexus-input" value={form.ship_id} onChange={(e) => fc('ship_id', e.target.value)} style={inputStyle}>
                  <option value="">— select ship —</option>
                  {ships.filter((s) => s.status !== 'DESTROYED' && s.status !== 'ARCHIVED').map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.model})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>ASSET</label>
                <select className="nexus-input" value={form.asset_id} onChange={(e) => fc('asset_id', e.target.value)} style={inputStyle}>
                  <option value="">— select asset —</option>
                  {orgAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name || a.serial_number || a.id}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>SYSTEM / LOCATION</label>
              <input className="nexus-input" value={form.system_location} onChange={(e) => fc('system_location', e.target.value)} placeholder="Stanton, Pyro..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PURPOSE</label>
              <input className="nexus-input" value={form.purpose} onChange={(e) => fc('purpose', e.target.value)} placeholder="Mining op, escort, transport..." style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>START TIME</label>
              <input type="datetime-local" className="nexus-input" value={form.start_time} onChange={(e) => fc('start_time', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>END TIME</label>
              <input type="datetime-local" className="nexus-input" value={form.end_time} onChange={(e) => fc('end_time', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>NOTES (optional)</label>
              <input className="nexus-input" value={form.notes} onChange={(e) => fc('notes', e.target.value)} placeholder="Additional context..." style={inputStyle} />
            </div>
          </div>
          {formError && (
            <div style={{ fontSize: 9, color: '#C0392B', marginBottom: 8 }}>{formError}</div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '6px 16px', borderRadius: 2,
              background: saving ? 'transparent' : 'rgba(52,152,219,0.14)',
              border: '0.5px solid rgba(52,152,219,0.5)',
              color: saving ? '#5A5850' : '#3498DB',
              fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.08em',
            }}
          >
            {saving ? 'SUBMITTING...' : 'SUBMIT RESERVATION'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#5A5850', fontSize: 10, padding: '20px 0' }}>Loading reservations...</div>
      ) : isEmpty ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <CalendarCheck size={24} style={{ opacity: 0.12, marginBottom: 8 }} />
          <div style={{ fontSize: 10, color: '#5A5850' }}>No active reservations — use RESERVE ASSET to schedule ship or asset time.</div>
        </div>
      ) : (
        <>
          <ReservationGroup label="ACTIVE" items={active} />
          <ReservationGroup label="CONFIRMED" items={confirmed} />
          <ReservationGroup label="PENDING APPROVAL" items={pending} />
        </>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3 };
const inputStyle = { width: '100%', boxSizing: 'border-box', height: 26, fontSize: 10 };
