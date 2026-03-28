/**
 * ReservationRow — single reservation display with quick actions.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Ship, Package, Check, X, Edit3, Trash2 } from 'lucide-react';

const STATUS_CFG = {
  PENDING:   { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)' },
  CONFIRMED: { color: '#3498DB', bg: 'rgba(52,152,219,0.10)' },
  ACTIVE:    { color: '#4A8C5C', bg: 'rgba(74,140,92,0.10)' },
  COMPLETED: { color: '#5A5850', bg: 'rgba(90,88,80,0.10)' },
  CANCELLED: { color: '#5A5850', bg: 'rgba(90,88,80,0.08)' },
};

function timeLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const mon = d.toLocaleString('en', { month: 'short' });
  return `${mon} ${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function durationLabel(start, end) {
  if (!start || !end) return '';
  const ms = new Date(end) - new Date(start);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ReservationRow({ reservation, isLeader, callsign, onEdit, onRefresh }) {
  const r = reservation;
  const cfg = STATUS_CFG[r.status] || STATUS_CFG.PENDING;
  const [acting, setActing] = useState(false);
  const isMine = (r.reserved_by_callsign || '').toUpperCase() === (callsign || '').toUpperCase();
  const isActive = r.status === 'ACTIVE';
  const now = Date.now();
  const startMs = new Date(r.start_time).getTime();
  const endMs = new Date(r.end_time).getTime();
  const isUpcoming = startMs > now;
  const isPast = endMs < now;

  const handleAction = async (action) => {
    setActing(true);
    const updates = {};
    if (action === 'confirm') { updates.status = 'CONFIRMED'; updates.approved_by = callsign; updates.approved_at = new Date().toISOString(); }
    else if (action === 'activate') { updates.status = 'ACTIVE'; }
    else if (action === 'complete') { updates.status = 'COMPLETED'; }
    else if (action === 'cancel') { updates.status = 'CANCELLED'; }
    try {
      await base44.entities.AssetReservation.update(r.id, updates);
      showToast(`Reservation ${action}ed`, 'success');
      onRefresh();
    } catch { showToast('Action failed', 'error'); }
    setActing(false);
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await base44.entities.AssetReservation.delete(r.id);
      showToast('Reservation deleted', 'success');
      onRefresh();
    } catch { showToast('Delete failed', 'error'); }
    setActing(false);
  };

  const Icon = r.asset_type === 'SHIP' ? Ship : Package;
  const displayName = r.ship_name || r.asset_name || 'Unknown';
  const displayModel = r.ship_model || r.asset_type || '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      opacity: r.status === 'CANCELLED' ? 0.4 : 1,
      transition: 'background 120ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {/* Asset icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 2,
        background: `${cfg.color}12`, border: `0.5px solid ${cfg.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>{displayModel}</span>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>{r.reserved_by_callsign}</span>
          <span>{timeLabel(r.start_time)} → {timeLabel(r.end_time)}</span>
          <span style={{ color: '#9A9488' }}>{durationLabel(r.start_time, r.end_time)}</span>
          {r.purpose && <span style={{ color: '#C8A84B' }}>{r.purpose}</span>}
          {r.op_name && <span style={{ color: '#3498DB' }}>OP: {r.op_name}</span>}
          {r.system_location && <span>{r.system_location}</span>}
        </div>
      </div>

      {/* Status */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 2,
        letterSpacing: '0.08em', flexShrink: 0,
      }}>{r.status}</span>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {/* Leader approve */}
        {isLeader && r.status === 'PENDING' && (
          <button onClick={() => handleAction('confirm')} disabled={acting} title="Confirm" style={{
            background: 'rgba(52,152,219,0.08)', border: '0.5px solid rgba(52,152,219,0.25)',
            borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#3498DB',
            display: 'flex', alignItems: 'center', gap: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          }}><Check size={9} /> OK</button>
        )}
        {/* Activate */}
        {(isMine || isLeader) && r.status === 'CONFIRMED' && !isPast && (
          <button onClick={() => handleAction('activate')} disabled={acting} title="Start using" style={{
            background: 'rgba(74,140,92,0.08)', border: '0.5px solid rgba(74,140,92,0.25)',
            borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#4A8C5C',
            display: 'flex', alignItems: 'center', gap: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          }}><Check size={9} /> GO</button>
        )}
        {/* Complete */}
        {(isMine || isLeader) && r.status === 'ACTIVE' && (
          <button onClick={() => handleAction('complete')} disabled={acting} title="Complete" style={{
            background: 'rgba(74,140,92,0.08)', border: '0.5px solid rgba(74,140,92,0.25)',
            borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#4A8C5C',
            display: 'flex', alignItems: 'center', gap: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          }}><Check size={9} /> DONE</button>
        )}
        {/* Edit */}
        {(isMine || isLeader) && !['COMPLETED', 'CANCELLED'].includes(r.status) && (
          <button onClick={() => onEdit(r)} title="Edit" style={{
            background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#5A5850',
          }}><Edit3 size={9} /></button>
        )}
        {/* Cancel */}
        {(isMine || isLeader) && !['COMPLETED', 'CANCELLED'].includes(r.status) && (
          <button onClick={() => handleAction('cancel')} disabled={acting} title="Cancel" style={{
            background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#C0392B',
          }}><X size={9} /></button>
        )}
        {/* Delete (leader only, cancelled/completed) */}
        {isLeader && ['COMPLETED', 'CANCELLED'].includes(r.status) && (
          <button onClick={handleDelete} disabled={acting} title="Delete" style={{
            background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#5A5850',
          }}><Trash2 size={9} /></button>
        )}
      </div>
    </div>
  );
}