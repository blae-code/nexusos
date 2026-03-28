/**
 * ShipRoleDisplay — read-only view of ship role assignments grouped by vessel.
 * Visible to all crew. Shows who is doing what on each ship.
 */
import React, { useMemo } from 'react';
import { Anchor, User } from 'lucide-react';

const ROLE_COLORS = {
  PILOT: '#3498DB', GUNNER: '#C0392B', ENGINEER: '#C8A84B',
  MEDIC: '#4A8C5C', NAVIGATOR: '#8E44AD', LOADMASTER: '#E67E22', UNASSIGNED: '#5A5850',
};

const ROLE_ICONS = {
  PILOT: '✈', GUNNER: '⊕', ENGINEER: '⚙', MEDIC: '✚', NAVIGATOR: '◎', LOADMASTER: '☰',
};

export default function ShipRoleDisplay({ rsvps }) {
  const confirmed = useMemo(() =>
    (rsvps || []).filter(r => r.status === 'CONFIRMED'),
    [rsvps]
  );

  // Group by assigned ship
  const grouped = useMemo(() => {
    const groups = {};
    confirmed.forEach(r => {
      const ship = r.assigned_ship_name || null;
      const key = ship || '__unassigned__';
      if (!groups[key]) groups[key] = { ship, members: [] };
      groups[key].members.push(r);
    });

    // Sort: ships with assignments first, unassigned last
    return Object.values(groups).sort((a, b) => {
      if (!a.ship && b.ship) return 1;
      if (a.ship && !b.ship) return -1;
      return (a.ship || '').localeCompare(b.ship || '');
    });
  }, [confirmed]);

  // Only show if anyone has a ship role or assigned ship
  const hasAssignments = confirmed.some(r => (r.ship_role && r.ship_role !== 'UNASSIGNED') || r.assigned_ship_name);
  if (!hasAssignments) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: '#3498DB', fontWeight: 700, letterSpacing: '0.1em',
      }}>
        <Anchor size={11} /> SHIP STATIONS
      </div>

      {grouped.map((group, gi) => (
        <div key={gi} style={{
          background: '#0F0F0D', borderRadius: 2, overflow: 'hidden',
          border: group.ship ? '0.5px solid rgba(52,152,219,0.15)' : '0.5px solid rgba(200,170,100,0.06)',
          borderLeft: group.ship ? '2px solid #3498DB' : '2px solid #5A5850',
        }}>
          {/* Ship header */}
          <div style={{
            padding: '6px 10px', background: '#141410',
            borderBottom: '0.5px solid rgba(200,170,100,0.06)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              color: group.ship ? '#E8E4DC' : '#5A5850', fontWeight: 600,
              letterSpacing: '0.04em',
            }}>{group.ship || 'UNASSIGNED'}</span>
            <span style={{ fontSize: 8, color: '#5A5850' }}>{group.members.length} crew</span>
          </div>

          {/* Members */}
          {group.members.map(r => {
            const shipRole = r.ship_role || 'UNASSIGNED';
            const color = ROLE_COLORS[shipRole] || '#5A5850';
            const icon = ROLE_ICONS[shipRole] || '';

            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px',
                borderBottom: '0.5px solid rgba(200,170,100,0.03)',
              }}>
                <span style={{ fontSize: 10, width: 14, textAlign: 'center', color }}>{icon || '·'}</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                  color: '#E8E4DC', fontWeight: 500, flex: 1,
                }}>{r.callsign || '—'}</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                  color, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '1px 6px', borderRadius: 2,
                  background: `${color}12`, border: `0.5px solid ${color}33`,
                }}>{shipRole}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}