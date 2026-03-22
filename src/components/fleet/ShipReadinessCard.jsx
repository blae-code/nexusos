import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Zap, Shield, Users, Package, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE:   { color: '#4AE830', bg: 'rgba(74,232,48,0.08)',   border: 'rgba(74,232,48,0.25)',   label: 'AVAILABLE',   stripe: '#4AE830' },
  ASSIGNED:    { color: '#C8A84B', bg: 'rgba(200,168,75,0.08)',  border: 'rgba(200,168,75,0.25)',  label: 'ASSIGNED',    stripe: '#C8A84B' },
  MAINTENANCE: { color: '#FF6B35', bg: 'rgba(255,107,53,0.08)',  border: 'rgba(255,107,53,0.25)',  label: 'MAINTENANCE', stripe: '#FF6B35' },
  DESTROYED:   { color: '#C0392B', bg: 'rgba(192,57,43,0.08)',   border: 'rgba(192,57,43,0.25)',   label: 'DESTROYED',   stripe: '#C0392B' },
  ARCHIVED:    { color: '#8A8478', bg: 'rgba(138,132,120,0.06)', border: 'rgba(138,132,120,0.2)',  label: 'ARCHIVED',    stripe: '#8A8478' },
};

const CLASS_ICONS = {
  FIGHTER: '⚔', HEAVY_FIGHTER: '⚔⚔', MINER: '⛏',
  HAULER: '📦', SALVAGER: '♻', MEDICAL: '✚',
  EXPLORER: '🔭', GROUND_VEHICLE: '🚗', OTHER: '🛸',
};

const READINESS_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED', 'ARCHIVED'];

function StatBar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.06em', width: 60, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ color: 'var(--t2)', fontSize: 8, width: 36, textAlign: 'right', flexShrink: 0 }}>
        {value ? value.toLocaleString() : '—'}
      </span>
    </div>
  );
}

export default function ShipReadinessCard({ ship, hydrogenFuel }) {
  const cfg = STATUS_CONFIG[ship.status] || STATUS_CONFIG.AVAILABLE;
  const [expanded, setExpanded] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState(ship.status);
  const uex = ship.uex;

  const fuelCostEstimate = uex?.hydrogen_capacity && hydrogenFuel?.buy
    ? Math.round(uex.hydrogen_capacity * hydrogenFuel.buy)
    : null;

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await base44.entities.OrgShip.update(ship.id, { status: newStatus });
      setLocalStatus(newStatus);
    } finally {
      setSaving(false);
      setEditingStatus(false);
    }
  };

  const activeCfg = STATUS_CONFIG[localStatus] || cfg;

  return (
    <div style={{
      background: 'var(--bg1)',
      border: `0.5px solid ${activeCfg.border}`,
      borderLeft: `3px solid ${activeCfg.stripe}`,
      borderRadius: 5,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${activeCfg.stripe}22`}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
          {CLASS_ICONS[ship.class] || '🛸'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ship.name}
            </span>
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 9 }}>
            {ship.manufacturer ? `${ship.manufacturer} · ` : ''}{ship.model}
          </div>
          {uex?.role && (
            <div style={{ color: 'var(--t3)', fontSize: 8, marginTop: 1, letterSpacing: '0.05em' }}>
              {uex.role}
            </div>
          )}
        </div>

        {/* Status badge + edit */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {editingStatus ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 4, padding: 4, zIndex: 10 }}>
              {READINESS_STATUSES.map(s => {
                const sc = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={saving}
                    style={{
                      padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 8, letterSpacing: '0.08em',
                      background: s === localStatus ? sc.bg : 'transparent',
                      border: `0.5px solid ${s === localStatus ? sc.border : 'transparent'}`,
                      color: sc.color,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
              <button
                onClick={() => setEditingStatus(false)}
                style={{ padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 8, background: 'transparent', border: 'none', color: 'var(--t3)' }}
              >
                CANCEL
              </button>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', background: activeCfg.bg,
                border: `0.5px solid ${activeCfg.border}`, borderRadius: 3,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: activeCfg.color, animation: localStatus === 'AVAILABLE' ? 'pulse-dot 2.5s ease-in-out infinite' : 'none' }} />
                <span style={{ color: activeCfg.color, fontSize: 8, letterSpacing: '0.1em', fontWeight: 600 }}>{activeCfg.label}</span>
              </div>
              <button
                onClick={() => setEditingStatus(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 2, display: 'flex' }}
                title="Update status"
              >
                <Edit2 size={10} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0, borderTop: '0.5px solid var(--b0)', borderBottom: '0.5px solid var(--b0)',
      }}>
        {[
          { icon: Package, label: 'CARGO', value: ship.cargo_scu > 0 ? `${ship.cargo_scu} SCU` : '—', color: '#5297FF' },
          { icon: Users, label: 'CREW', value: ship.crew_size > 0 ? `${uex?.crew_min ?? ship.crew_size}–${ship.crew_size}` : '—', color: '#9DA1CD' },
          { icon: Zap, label: 'SCM', value: uex?.speed_scm > 0 ? `${uex.speed_scm}` : '—', color: '#C8A84B', unit: 'm/s' },
        ].map(({ icon: Icon, label, value, color, unit }, i) => (
          <div key={i} style={{
            padding: '7px 10px', textAlign: 'center',
            borderRight: i < 2 ? '0.5px solid var(--b0)' : 'none',
          }}>
            <div style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
            <div style={{ color, fontSize: 11, fontWeight: 600 }}>
              {value}{unit && value !== '—' ? <span style={{ fontSize: 8, color: 'var(--t3)', marginLeft: 2 }}>{unit}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Assigned pilot */}
      {ship.assigned_to_callsign && (
        <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid var(--b0)' }}>
          <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em' }}>PILOT</span>
          <span style={{ color: '#C8A84B', fontSize: 10, fontWeight: 500 }}>{ship.assigned_to_callsign}</span>
        </div>
      )}

      {/* Fuel cost estimate */}
      {fuelCostEstimate && (
        <div style={{ padding: '5px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--b0)' }}>
          <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em' }}>H² REFUEL EST.</span>
          <span style={{ color: 'var(--t1)', fontSize: 9, fontFamily: 'monospace' }}>
            ~{fuelCostEstimate.toLocaleString()} aUEC
            <span style={{ color: 'var(--t3)', marginLeft: 4 }}>({uex.hydrogen_capacity.toLocaleString()} L)</span>
          </span>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', padding: '6px 14px', background: 'none', border: 'none',
          borderTop: expanded ? '0.5px solid var(--b0)' : 'none',
          cursor: 'pointer', color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          fontFamily: 'inherit',
        }}
      >
        {expanded ? <><ChevronUp size={10} /> LESS</> : <><ChevronDown size={10} /> UEX SPECS</>}
      </button>

      {/* Expanded UEX stats */}
      {expanded && uex && (
        <div style={{ padding: '10px 14px 12px', borderTop: '0.5px solid var(--b0)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StatBar label="SHIELD HP" value={uex.shield_hp} max={10000} color="#5297FF" />
          <StatBar label="HULL HP" value={uex.hull_hp} max={50000} color="#9DA1CD" />
          <StatBar label="MAX SPD" value={uex.speed_max} max={1500} color="#C8A84B" />
          <StatBar label="H² FUEL" value={uex.hydrogen_capacity} max={100000} color="#4AE830" />
          <StatBar label="QT FUEL" value={uex.quantum_capacity} max={10000} color="#C0392B" />
          <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              ['SIZE', uex.size],
              ['MASS', uex.mass ? `${uex.mass.toLocaleString()} kg` : '—'],
              ['CREW MIN', uex.crew_min],
              ['CREW MAX', uex.crew_max],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '5px 8px', background: 'var(--bg2)', borderRadius: 3 }}>
                <div style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.08em' }}>{k}</div>
                <div style={{ color: 'var(--t1)', fontSize: 10, fontWeight: 500, marginTop: 1 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && !uex && (
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--b0)', color: 'var(--t3)', fontSize: 10, textAlign: 'center' }}>
          No UEX spec data found for "{ship.model}"
        </div>
      )}
    </div>
  );
}