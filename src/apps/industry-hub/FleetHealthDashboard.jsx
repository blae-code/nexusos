/**
 * FleetHealthDashboard — Visualizes org fleet health from OrgShip entity.
 * Shows status distribution, cargo capacity, crew readiness, and dispatch-ready ships.
 */
import React, { useMemo } from 'react';
import { Ship, Package, Users, AlertTriangle, CheckCircle2, Wrench, XCircle, Archive } from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE:   { color: '#4A8C5C', bg: 'rgba(74,140,92,0.12)',   border: 'rgba(74,140,92,0.3)',   icon: CheckCircle2, label: 'AVAILABLE' },
  ASSIGNED:    { color: '#7AAECC', bg: 'rgba(122,174,204,0.12)', border: 'rgba(122,174,204,0.3)', icon: Ship,          label: 'ASSIGNED' },
  MAINTENANCE: { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)',  border: 'rgba(200,168,75,0.25)', icon: Wrench,        label: 'MAINTENANCE' },
  DESTROYED:   { color: '#C0392B', bg: 'rgba(192,57,43,0.12)',   border: 'rgba(192,57,43,0.3)',   icon: XCircle,       label: 'DESTROYED' },
  ARCHIVED:    { color: '#5A5850', bg: 'rgba(90,88,80,0.15)',    border: 'rgba(90,88,80,0.25)',   icon: Archive,       label: 'ARCHIVED' },
};

const CLASS_ICONS = {
  MINER: '⛏', HAULER: '📦', SALVAGER: '🔩', FIGHTER: '⚔', HEAVY_FIGHTER: '🛡',
  MEDICAL: '🏥', EXPLORER: '🧭', GROUND_VEHICLE: '🚗', OTHER: '•',
};

function StatusBar({ ships }) {
  const total = ships.length;
  if (total === 0) return null;

  const counts = {};
  ships.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#1A1A18' }}>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ARCHIVED;
          return (
            <div key={status} style={{
              width: `${(count / total) * 100}%`,
              background: cfg.color,
              transition: 'width 400ms ease-out',
              minWidth: count > 0 ? 3 : 0,
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ARCHIVED;
          return (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                color: '#9A9488', letterSpacing: '0.08em',
              }}>{cfg.label} {count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color = '#E8E4DC', sub }) {
  return (
    <div style={{
      background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.06)',
      borderRadius: 2, padding: '12px 14px', flex: '1 1 140px', minWidth: 120,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <Icon size={11} style={{ color: '#5A5850' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.12em',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22,
        fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', marginTop: 4,
        }}>{sub}</div>
      )}
    </div>
  );
}

function ShipRow({ ship }) {
  const cfg = STATUS_CONFIG[ship.status] || STATUS_CONFIG.ARCHIVED;
  const Icon = cfg.icon;
  const isReady = ship.status === 'AVAILABLE';
  const classIcon = CLASS_ICONS[ship.class] || '•';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 80px 70px 100px 90px',
      gap: 8, padding: '10px 12px', alignItems: 'center',
      borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      borderLeft: isReady ? '2px solid #4A8C5C' : '2px solid transparent',
      background: isReady ? 'rgba(74,140,92,0.03)' : 'transparent',
      transition: 'background 150ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = isReady ? 'rgba(74,140,92,0.06)' : '#1A1A16'; }}
    onMouseLeave={e => { e.currentTarget.style.background = isReady ? 'rgba(74,140,92,0.03)' : 'transparent'; }}
    >
      {/* Ship name + model */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12 }}>{classIcon}</span>
          <span style={{
            color: '#E8E4DC', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{ship.name}</span>
        </div>
        <div style={{
          color: '#5A5850', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif",
          marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{[ship.manufacturer, ship.model].filter(Boolean).join(' ')}</div>
      </div>

      {/* Class */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#9A9488', letterSpacing: '0.06em',
      }}>{ship.class}</span>

      {/* Cargo SCU */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: (ship.cargo_scu || 0) > 0 ? '#E8E4DC' : '#5A5850' }}>
          {ship.cargo_scu || 0}
        </span>
        <span style={{ fontSize: 9, color: '#5A5850', marginLeft: 3 }}>SCU</span>
      </div>

      {/* Crew */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Users size={10} style={{ color: '#5A5850' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: '#9A9488', fontVariantNumeric: 'tabular-nums',
        }}>{ship.crew_size || 1}</span>
      </div>

      {/* Assigned to */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: ship.assigned_to_callsign ? '#C8A84B' : '#3A3830',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{ship.assigned_to_callsign || '—'}</span>

      {/* Status */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        fontWeight: 600, letterSpacing: '0.08em',
        padding: '3px 8px', borderRadius: 2,
        background: cfg.bg, border: `0.5px solid ${cfg.border}`, color: cfg.color,
        display: 'inline-flex', alignItems: 'center', gap: 4, justifySelf: 'start',
      }}>
        <Icon size={9} />
        {cfg.label}
      </span>
    </div>
  );
}

export default function FleetHealthDashboard({ orgShips = [] }) {
  const stats = useMemo(() => {
    const active = orgShips.filter(s => s.status !== 'ARCHIVED' && s.status !== 'DESTROYED');
    const available = orgShips.filter(s => s.status === 'AVAILABLE');
    const assigned = orgShips.filter(s => s.status === 'ASSIGNED');
    const maintenance = orgShips.filter(s => s.status === 'MAINTENANCE');
    const totalCargo = active.reduce((sum, s) => sum + (s.cargo_scu || 0), 0);
    const availableCargo = available.reduce((sum, s) => sum + (s.cargo_scu || 0), 0);
    const totalCrew = active.reduce((sum, s) => sum + (s.crew_size || 1), 0);
    const totalValue = active.reduce((sum, s) => sum + (s.estimated_value_aUEC || 0), 0);
    const dispatchReady = available.filter(s => (s.cargo_scu || 0) > 0);
    return { active, available, assigned, maintenance, totalCargo, availableCargo, totalCrew, totalValue, dispatchReady };
  }, [orgShips]);

  const sorted = useMemo(() => {
    const order = { AVAILABLE: 0, ASSIGNED: 1, MAINTENANCE: 2, DESTROYED: 3, ARCHIVED: 4 };
    return [...orgShips].sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));
  }, [orgShips]);

  if (orgShips.length === 0) {
    return (
      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '32px 16px', textAlign: 'center',
      }}>
        <Ship size={18} style={{ color: '#3A3830', margin: '0 auto 8px' }} />
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>NO FLEET DATA</div>
        <div style={{
          fontFamily: "'Barlow', sans-serif", fontSize: 10,
          color: '#3A3830', marginTop: 4,
        }}>Register ships in Fleet Hub to populate fleet health</div>
      </div>
    );
  }

  const fmtValue = (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <MiniStat icon={Ship} label="FLEET SIZE" value={stats.active.length}
          sub={`${stats.available.length} available · ${stats.assigned.length} assigned`}
          color="#E8E4DC" />
        <MiniStat icon={CheckCircle2} label="DISPATCH READY" value={stats.dispatchReady.length}
          sub={stats.dispatchReady.length > 0 ? `${stats.availableCargo} SCU ready to load` : 'No ships ready for dispatch'}
          color={stats.dispatchReady.length > 0 ? '#4A8C5C' : '#C0392B'} />
        <MiniStat icon={Package} label="TOTAL CARGO" value={`${stats.totalCargo}`}
          sub={`${stats.availableCargo} SCU available now`}
          color="#C8A84B" />
        <MiniStat icon={Users} label="CREW NEEDED" value={stats.totalCrew}
          sub={`${fmtValue(stats.totalValue)} aUEC fleet value`}
          color="#7AAECC" />
      </div>

      {/* Dispatch readiness banner */}
      {stats.maintenance.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 2,
          background: 'rgba(200,168,75,0.06)',
          border: '0.5px solid rgba(200,168,75,0.15)',
          borderLeft: '2px solid #C8A84B',
        }}>
          <AlertTriangle size={12} style={{ color: '#C8A84B', flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#C8A84B',
          }}>
            {stats.maintenance.length} ship{stats.maintenance.length > 1 ? 's' : ''} in maintenance —{' '}
            {stats.maintenance.map(s => s.name).join(', ')}
          </span>
        </div>
      )}

      {/* Status distribution bar */}
      <StatusBar ships={orgShips.filter(s => s.status !== 'ARCHIVED')} />

      {/* Ship list */}
      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {/* Column header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 80px 70px 100px 90px',
          gap: 8, padding: '8px 12px',
          background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          {['SHIP', 'CLASS', 'CARGO', 'CREW', 'PILOT', 'STATUS'].map(h => (
            <span key={h} style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10,
              color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.2em',
            }}>{h}</span>
          ))}
        </div>
        {sorted.map(ship => <ShipRow key={ship.id} ship={ship} />)}
      </div>
    </div>
  );
}