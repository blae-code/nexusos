/**
 * ShipRoleDisplay — read-only ship role board visible to ALL crew.
 * Groups crew by assigned ship and shows their station role.
 * Props: { rsvps, members }
 */
import React, { useMemo } from 'react';
import { Anchor, Ship } from 'lucide-react';
import PresenceDot from '@/components/PresenceDot';

const ROLE_COLORS = {
  PILOT: '#3498DB', GUNNER: '#C0392B', ENGINEER: '#C8A84B', MEDIC: '#4A8C5C',
  SCANNER: '#8E44AD', TURRET_OP: '#E67E22', LOADMASTER: '#9A9488', UNASSIGNED: '#5A5850',
};

const ROLE_ICONS = {
  PILOT: '✈', GUNNER: '⊕', ENGINEER: '⚙', MEDIC: '✚',
  SCANNER: '◎', TURRET_OP: '⊗', LOADMASTER: '▦', UNASSIGNED: '—',
};

function CrewChip({ rsvp, members }) {
  const member = (members || []).find(m => m.callsign === rsvp.callsign);
  const role = rsvp.ship_role || 'UNASSIGNED';
  const color = ROLE_COLORS[role] || '#5A5850';
  const icon = ROLE_ICONS[role] || '—';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
      background: '#141410', borderRadius: 2,
      borderLeft: `2px solid ${color}`,
    }}>
      <PresenceDot lastSeenAt={member?.last_seen_at} size={5} />
      <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
        color: '#E8E4DC', flex: 1,
      }}>{rsvp.callsign || '—'}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color, letterSpacing: '0.06em',
      }}>{role === 'UNASSIGNED' ? '—' : role.replace('_', ' ')}</span>
    </div>
  );
}

export default function ShipRoleDisplay({ rsvps = [], members = [] }) {
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');

  // Group by assigned ship
  const grouped = useMemo(() => {
    const ships = {};
    const unassigned = [];

    confirmed.forEach(r => {
      if (r.assigned_ship_name) {
        const key = r.assigned_ship_id || r.assigned_ship_name;
        if (!ships[key]) ships[key] = { name: r.assigned_ship_name, crew: [] };
        ships[key].crew.push(r);
      } else {
        unassigned.push(r);
      }
    });

    return { ships: Object.values(ships), unassigned };
  }, [confirmed]);

  const hasAssignments = confirmed.some(r => r.ship_role && r.ship_role !== 'UNASSIGNED');

  if (!hasAssignments) {
    return (
      <div style={{ padding: '12px 0', textAlign: 'center', color: '#5A5850', fontSize: 10 }}>
        Ship role assignments pending. Ops lead will assign stations.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Anchor size={11} style={{ color: '#3498DB' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
          color: '#E8E4DC', letterSpacing: '0.06em',
        }}>STATION ASSIGNMENTS</span>
      </div>

      {/* By ship */}
      {grouped.ships.map((ship, i) => (
        <div key={i}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#C8A84B', letterSpacing: '0.1em', fontWeight: 600,
          }}>
            <Ship size={9} /> {ship.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {ship.crew.map(r => <CrewChip key={r.id} rsvp={r} members={members} />)}
          </div>
        </div>
      ))}

      {/* Unassigned to ship but have a role */}
      {grouped.unassigned.filter(r => r.ship_role && r.ship_role !== 'UNASSIGNED').length > 0 && (
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#5A5850', letterSpacing: '0.1em', marginBottom: 4,
          }}>NO SHIP ASSIGNED</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {grouped.unassigned.filter(r => r.ship_role && r.ship_role !== 'UNASSIGNED').map(r => (
              <CrewChip key={r.id} rsvp={r} members={members} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}