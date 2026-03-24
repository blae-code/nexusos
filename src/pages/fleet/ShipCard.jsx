import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE:   { color: '#4AE830', bg: 'rgba(74,232,48,0.08)',   border: 'rgba(74,232,48,0.25)' },
  ASSIGNED:    { color: '#C8A84B', bg: 'rgba(200,168,75,0.08)',  border: 'rgba(200,168,75,0.25)' },
  MAINTENANCE: { color: '#FF6B35', bg: 'rgba(255,107,53,0.08)',  border: 'rgba(255,107,53,0.25)' },
  DESTROYED:   { color: '#C0392B', bg: 'rgba(192,57,43,0.08)',   border: 'rgba(192,57,43,0.25)' },
  ARCHIVED:    { color: '#8A8478', bg: 'rgba(138,132,120,0.06)', border: 'rgba(138,132,120,0.2)' },
};

const CLASS_ICONS = {
  FIGHTER: '⚔️', HEAVY_FIGHTER: '⚔️⚔️', MINER: '⛏️',
  HAULER: '📦', SALVAGER: '♻️', MEDICAL: '✚',
  EXPLORER: '🔭', GROUND_VEHICLE: '🚗', OTHER: '🛸',
};

const ALL_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED', 'ARCHIVED'];

export default function ShipCard({ ship, onEdit, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[ship.status] || STATUS_CONFIG.AVAILABLE;

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await base44.entities.OrgShip.update(ship.id, { status: newStatus });
      onRefresh?.();
    } finally {
      setSaving(false);
      setStatusMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${ship.name}?`)) return;
    await base44.entities.OrgShip.delete(ship.id);
    onRefresh?.();
  };

  return (
    <div
      style={{
        background: '#0F0F0D',
        borderLeft: `3px solid ${cfg.color}`,
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
          {CLASS_ICONS[ship.class] || '🛸'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E8E4DC', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ship.name}
          </div>
          <div style={{ color: '#9A9488', fontSize: 10, marginTop: 1 }}>
            {ship.manufacturer ? `${ship.manufacturer} · ` : ''}{ship.model}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setStatusMenu(!statusMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 7px', background: cfg.bg,
              border: `0.5px solid ${cfg.border}`, borderRadius: 3,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
            <span style={{ color: cfg.color, fontSize: 8, letterSpacing: '0.1em', fontWeight: 600 }}>{ship.status}</span>
          </button>

          {statusMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 24, zIndex: 20,
              background: '#141410', border: '0.5px solid rgba(200,170,100,0.15)',
              borderRadius: 3, padding: 4, display: 'flex', flexDirection: 'column', gap: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              {ALL_STATUSES.map(s => {
                const sc = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={saving}
                    style={{
                      padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: '0.08em',
                      background: s === ship.status ? sc.bg : 'transparent',
                      border: 'none', color: sc.color, textAlign: 'left',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '0.5px solid rgba(200,170,100,0.06)', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
        {[
          { label: 'CARGO', value: ship.cargo_scu ? `${ship.cargo_scu} SCU` : '—', color: '#5297FF' },
          { label: 'CREW', value: ship.crew_size || '—', color: '#9DA1CD' },
          { label: 'CLASS', value: ship.class, color: '#C8A84B' },
        ].map((stat, i) => (
          <div key={stat.label} style={{
            padding: '7px 10px', textAlign: 'center',
            borderRight: i < 2 ? '0.5px solid rgba(200,170,100,0.06)' : 'none',
          }}>
            <div style={{ color: '#5A5850', fontSize: 7, letterSpacing: '0.08em', marginBottom: 2 }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: 11, fontWeight: 600 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Assigned pilot */}
      {ship.assigned_to_callsign && (
        <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
          <span style={{ color: '#5A5850', fontSize: 8, letterSpacing: '0.08em' }}>PILOT</span>
          <span style={{ color: '#C8A84B', fontSize: 10, fontWeight: 500 }}>{ship.assigned_to_callsign}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setExpanded(!expanded)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', fontSize: 8, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {expanded ? <><ChevronUp size={10} /> LESS</> : <><ChevronDown size={10} /> MORE</>}
        </button>
        <button onClick={() => onEdit?.(ship)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 4, display: 'flex' }} title="Edit">
          <Edit2 size={10} />
        </button>
        <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', padding: 4, display: 'flex' }} title="Delete">
          <Trash2 size={10} />
        </button>
      </div>

      {/* Expanded info */}
      {expanded && (
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(200,170,100,0.06)', color: '#9A9488', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ship.notes && <div><span style={{ color: '#5A5850' }}>Notes:</span> {ship.notes}</div>}
          {ship.fleetyards_id && <div><span style={{ color: '#5A5850' }}>FleetYards ID:</span> {ship.fleetyards_id}</div>}
          {ship.last_synced && <div><span style={{ color: '#5A5850' }}>Last synced:</span> {new Date(ship.last_synced).toLocaleString()}</div>}
          {!ship.notes && !ship.fleetyards_id && <div style={{ color: '#5A5850' }}>No additional details recorded.</div>}
        </div>
      )}
    </div>
  );
}