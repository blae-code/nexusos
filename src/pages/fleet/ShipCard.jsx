import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Edit2, Trash2, ChevronDown, ChevronUp, Package, Users, Gauge, User } from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE:   { color: 'var(--live)',   bg: 'var(--live-bg)',   border: 'var(--live-b)',   desc: 'Ready for deployment' },
  ASSIGNED:    { color: 'var(--warn)',   bg: 'var(--warn-bg)',   border: 'var(--warn-b)',   desc: 'Currently assigned to a pilot' },
  MAINTENANCE: { color: '#FF6B35',       bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.25)', desc: 'Undergoing repairs or refit' },
  DESTROYED:   { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-b)', desc: 'Hull loss — insurance pending' },
  ARCHIVED:    { color: 'var(--t2)',     bg: 'var(--bg3)',       border: 'var(--b1)',       desc: 'Retired from active roster' },
};

const CLASS_LABELS = {
  FIGHTER: { icon: '⚔️', label: 'Fighter' },
  HEAVY_FIGHTER: { icon: '⚔️', label: 'Heavy Fighter' },
  MINER: { icon: '⛏️', label: 'Miner' },
  HAULER: { icon: '📦', label: 'Hauler' },
  SALVAGER: { icon: '♻️', label: 'Salvager' },
  MEDICAL: { icon: '✚', label: 'Medical' },
  EXPLORER: { icon: '🔭', label: 'Explorer' },
  GROUND_VEHICLE: { icon: '🚗', label: 'Ground Vehicle' },
  OTHER: { icon: '🛸', label: 'Other' },
};

const ALL_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED', 'ARCHIVED'];

export default function ShipCard({ ship, onEdit, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[ship.status] || STATUS_CONFIG.AVAILABLE;
  const cls = CLASS_LABELS[ship.class] || CLASS_LABELS.OTHER;

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
    if (!window.confirm(`Delete ${ship.name}? This cannot be undone.`)) return;
    await base44.entities.OrgShip.delete(ship.id);
    onRefresh?.();
  };

  return (
    <div className="nexus-card" style={{ padding: 0, borderLeft: `3px solid ${cfg.color}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div className="nexus-tooltip" data-tooltip={cls.label} style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2, cursor: 'default' }}>
          {cls.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ship.name}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
            {ship.manufacturer ? `${ship.manufacturer} · ` : ''}{ship.model}
          </div>
        </div>

        {/* Status badge — click to change */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setStatusMenu(!statusMenu)}
            className="nexus-tooltip"
            data-tooltip={cfg.desc}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', background: cfg.bg,
              border: `0.5px solid ${cfg.border}`, borderRadius: 'var(--r-md)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, animation: ship.status === 'AVAILABLE' ? 'pulse 2.5s ease-in-out infinite' : 'none' }} />
            <span style={{ color: cfg.color, fontSize: 9, letterSpacing: '0.1em', fontWeight: 600 }}>{ship.status}</span>
          </button>

          {statusMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setStatusMenu(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 28, zIndex: 20,
                background: 'var(--bg2)', border: '0.5px solid var(--b2)',
                borderRadius: 'var(--r-lg)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: 140,
              }}>
                <div style={{ padding: '4px 8px', color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em' }}>CHANGE STATUS</div>
                {ALL_STATUSES.map(s => {
                  const sc = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s} onClick={() => handleStatusChange(s)} disabled={saving}
                      style={{
                        padding: '6px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                        fontFamily: 'var(--font)', fontSize: 10, letterSpacing: '0.06em',
                        background: s === ship.status ? sc.bg : 'transparent',
                        border: 'none', color: sc.color, textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                      <span>{s}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ color: 'var(--t3)', fontSize: 8 }}>{sc.desc}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '0.5px solid var(--b0)', borderBottom: '0.5px solid var(--b0)' }}>
        {[
          { icon: Package, label: 'CARGO', value: ship.cargo_scu ? `${ship.cargo_scu} SCU` : '—', color: 'var(--info)', tip: 'Cargo capacity in Standard Cargo Units' },
          { icon: Users, label: 'CREW', value: ship.crew_size || '—', color: '#9DA1CD', tip: 'Maximum crew complement' },
          { icon: Gauge, label: 'CLASS', value: cls.label.toUpperCase(), color: 'var(--acc)', tip: 'Ship role classification' },
        ].map((stat, i) => (
          <div key={stat.label} className="nexus-tooltip" data-tooltip={stat.tip} style={{
            padding: '8px 10px', textAlign: 'center', cursor: 'default',
            borderRight: i < 2 ? '0.5px solid var(--b0)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 3 }}>
              <stat.icon size={9} style={{ color: 'var(--t3)' }} />
              <span style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.1em' }}>{stat.label}</span>
            </div>
            <div style={{ color: stat.color, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Assigned pilot row */}
      {ship.assigned_to_callsign && (
        <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid var(--b0)' }}>
          <User size={10} style={{ color: 'var(--t3)' }} />
          <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>PILOT</span>
          <span style={{ color: 'var(--acc)', fontSize: 10, fontWeight: 600 }}>{ship.assigned_to_callsign}</span>
        </div>
      )}

      {/* Action row */}
      <div style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="nexus-btn"
          style={{ flex: 1, padding: '4px 8px', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {expanded ? <><ChevronUp size={10} /> LESS</> : <><ChevronDown size={10} /> DETAILS</>}
        </button>
        {onEdit && (
          <button onClick={() => onEdit(ship)} className="nexus-btn nexus-tooltip" data-tooltip="Edit ship details" style={{ padding: '4px 8px' }}>
            <Edit2 size={10} />
          </button>
        )}
        {onRefresh && (
          <button onClick={handleDelete} className="nexus-btn nexus-btn-danger nexus-tooltip" data-tooltip="Remove from roster" style={{ padding: '4px 8px' }}>
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: '0.5px solid var(--b0)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ship.notes && (
            <div style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 'var(--r-md)', border: '0.5px solid var(--b0)' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 4 }}>NOTES</div>
              <div style={{ color: 'var(--t1)', fontSize: 10 }}>{ship.notes}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ padding: '6px 8px', background: 'var(--bg2)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.08em' }}>FLEETYARDS ID</div>
              <div style={{ color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{ship.fleetyards_id || '—'}</div>
            </div>
            <div style={{ padding: '6px 8px', background: 'var(--bg2)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.08em' }}>LAST SYNCED</div>
              <div style={{ color: 'var(--t1)', fontSize: 10, marginTop: 2 }}>{ship.last_synced ? new Date(ship.last_synced).toLocaleDateString() : '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}