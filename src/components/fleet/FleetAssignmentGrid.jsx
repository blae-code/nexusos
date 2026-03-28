import React from 'react';
import { User, Ship, AlertTriangle } from 'lucide-react';

const STATUS_STYLE = {
  AVAILABLE: { color: 'var(--live)', bg: 'var(--live-bg)', border: 'var(--live-b)', label: 'AVAIL' },
  ASSIGNED: { color: 'var(--warn)', bg: 'var(--warn-bg)', border: 'var(--warn-b)', label: 'ASSIGNED' },
  MAINTENANCE: { color: '#FF6B35', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.25)', label: 'MAINT' },
  DESTROYED: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-b)', label: 'DESTR' },
  ARCHIVED: { color: 'var(--t3)', bg: 'var(--bg3)', border: 'var(--b1)', label: 'ARCH' },
};

function AssignmentCard({ ship }) {
  const st = STATUS_STYLE[ship.status] || STATUS_STYLE.AVAILABLE;
  return (
    <div style={{
      background: 'var(--bg1)', border: `0.5px solid var(--b0)`,
      borderLeft: `2px solid ${st.color}`,
      borderRadius: 'var(--r-lg)', padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'border-color 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Ship size={11} style={{ color: st.color, flexShrink: 0 }} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--t0)',
          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ship.name || ship.model}
        </span>
        <span style={{
          fontSize: 8, padding: '2px 5px', borderRadius: 2,
          background: st.bg, border: `0.5px solid ${st.border}`,
          color: st.color, letterSpacing: '0.1em', fontWeight: 600,
        }}>
          {st.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: 'var(--t2)' }}>{ship.model}</span>
        {ship.manufacturer && (
          <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em' }}>
            {ship.manufacturer}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
          {(ship.class || '').replace(/_/g, ' ')}
        </span>
      </div>

      {ship.status === 'ASSIGNED' && ship.assigned_to_callsign ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', background: 'var(--bg2)', borderRadius: 'var(--r-md)',
          border: '0.5px solid var(--b0)',
        }}>
          <User size={10} style={{ color: 'var(--warn)' }} />
          <span style={{ fontSize: 10, color: 'var(--t1)', fontWeight: 500 }}>
            {ship.assigned_to_callsign}
          </span>
        </div>
      ) : ship.status === 'MAINTENANCE' ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', background: 'rgba(255,107,53,0.06)', borderRadius: 'var(--r-md)',
          border: '0.5px solid rgba(255,107,53,0.15)',
        }}>
          <AlertTriangle size={10} style={{ color: '#FF6B35' }} />
          <span style={{ fontSize: 9, color: '#FF6B35' }}>Under maintenance</span>
        </div>
      ) : null}

      {(ship.cargo_scu > 0 || ship.crew_size > 0) && (
        <div style={{ display: 'flex', gap: 10, fontSize: 9, color: 'var(--t3)' }}>
          {ship.cargo_scu > 0 && <span>{ship.cargo_scu} SCU</span>}
          {ship.crew_size > 0 && <span>{ship.crew_size} crew</span>}
        </div>
      )}
    </div>
  );
}

export default function FleetAssignmentGrid({ ships }) {
  const assigned = ships.filter(s => s.status === 'ASSIGNED');
  const available = ships.filter(s => s.status === 'AVAILABLE');
  const maintenance = ships.filter(s => s.status === 'MAINTENANCE');
  const other = ships.filter(s => !['ASSIGNED', 'AVAILABLE', 'MAINTENANCE'].includes(s.status));

  const sections = [
    { label: 'ACTIVE ASSIGNMENTS', ships: assigned, show: assigned.length > 0 },
    { label: 'AVAILABLE FOR TASKING', ships: available, show: available.length > 0 },
    { label: 'IN MAINTENANCE', ships: maintenance, show: maintenance.length > 0 },
    { label: 'OTHER', ships: other, show: other.length > 0 },
  ];

  if (ships.length === 0) {
    return (
      <div className="nexus-card" style={{ padding: 16, textAlign: 'center' }}>
        <Ship size={28} style={{ color: 'var(--t3)', opacity: 0.3, margin: '20px auto 12px' }} />
        <div style={{ color: 'var(--t2)', fontSize: 11 }}>No ships registered yet</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.filter(s => s.show).map(section => (
        <div key={section.label}>
          <div className="nexus-section-header" style={{ marginBottom: 10 }}>
            {section.label}
            <span style={{ color: 'var(--t3)', fontSize: 9, fontWeight: 400, marginLeft: 4 }}>
              ({section.ships.length})
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 8,
          }}>
            {section.ships.map(ship => (
              <AssignmentCard key={ship.id} ship={ship} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}