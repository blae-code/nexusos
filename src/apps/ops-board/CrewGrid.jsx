/**
 * CrewGrid — responsive crew roster cards.
 * Props: { rsvps, op, layoutMode }
 */
import React from 'react';
import { RankBadge } from '@/core/design';
import NexusToken from '@/core/design/NexusToken';
import { roleToken } from '@/core/data/tokenMap';
import PresenceDot from '@/components/PresenceDot';

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

const SHIP_ROLE_COLORS = {
  PILOT: '#3498DB', GUNNER: '#C0392B', ENGINEER: '#C8A84B',
  MEDIC: '#4A8C5C', NAVIGATOR: '#8E44AD', LOADMASTER: '#E67E22',
};

function CrewCard({ rsvp, op, members }) {
  const isExclusive = op.access_type === 'EXCLUSIVE';
  const memberRecord = members?.find(m => m.callsign === rsvp.callsign);
  const shipRole = rsvp.ship_role && rsvp.ship_role !== 'UNASSIGNED' ? rsvp.ship_role : null;
  const shipRoleColor = shipRole ? (SHIP_ROLE_COLORS[shipRole] || '#5A5850') : null;

  return (
    <div className="nexus-card" style={{ padding: 12, gap: 8, display: 'flex', flexDirection: 'column' }}>
      {/* Top row: role token + callsign + rank badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NexusToken
          src={roleToken((rsvp.role || 'UNASSIGNED').toUpperCase())}
          size={22}
          alt={rsvp.role || 'unassigned'}
          title={rsvp.role || 'Unassigned'}
        />
        <span style={{ fontSize: 11, color: 'var(--t0)', fontFamily: 'var(--font)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rsvp.callsign || '—'}
        </span>
        {rsvp.rank && <RankBadge rank={rsvp.rank} size={12} />}
        <PresenceDot lastSeenAt={memberRecord?.last_seen_at} size={6} />
      </div>

      {/* Role name */}
      {rsvp.role && (
        <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {rsvp.role}
        </span>
      )}

      {/* Ship role badge */}
      {shipRole && (
        <span style={{
          fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 2,
          color: shipRoleColor, background: `${shipRoleColor}12`,
          border: `0.5px solid ${shipRoleColor}33`,
          fontFamily: 'var(--font)', letterSpacing: '0.06em',
        }}>
          {shipRole}{rsvp.assigned_ship_name ? ` · ${rsvp.assigned_ship_name}` : ''}
        </span>
      )}

      {/* Ship name */}
      {!shipRole && rsvp.ship && (
        <span style={{ fontSize: 9, color: 'var(--t2)', fontFamily: 'var(--font)', fontStyle: 'italic' }}>
          {rsvp.ship}
        </span>
      )}

      {/* Buy-in status (exclusive ops only) */}
      {isExclusive && (
        <div style={{ marginTop: 4 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: 8,
              fontFamily: 'var(--font)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              padding: '2px 8px',
              borderRadius: 3,
              background: 'rgba(var(--live-rgb), 0.08)',
              border: '0.5px solid rgba(var(--live-rgb), 0.3)',
              color: 'var(--live)',
            }}
          >
            PAID
          </span>
        </div>
      )}
    </div>
  );
}

function EmptySlotCard({ roleName }) {
  return (
    <div
      className="nexus-card"
      style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 100,
        background: 'var(--bg1)',
        border: '0.5px dashed var(--b1)',
      }}
    >
      <NexusToken
        src={roleToken((roleName || 'UNASSIGNED').toUpperCase())}
        size={22}
        opacity={0.3}
        alt={roleName}
      />
      <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
        {roleName}
      </span>
      <span style={{ fontSize: 8, color: 'var(--b2)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        OPEN
      </span>
    </div>
  );
}

export default function CrewGrid({ rsvps = [], op = {}, layoutMode = 'ALT-TAB', members = [] }) {
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const normalizedSlots = normalizeRoleSlots(op.role_slots);

  // Count filled slots per role
  const filledByRole = {};
  confirmed.forEach(rsvp => {
    if (rsvp.role) {
      filledByRole[rsvp.role] = (filledByRole[rsvp.role] || 0) + 1;
    }
  });

  // Build grid items: confirmed crew + empty slots
  const gridItems = [];

  // Add confirmed crew
  confirmed.forEach(rsvp => {
    gridItems.push({ type: 'crew', data: rsvp });
  });

  // Add empty slots
  normalizedSlots.forEach(slot => {
    const filled = filledByRole[slot.name] || 0;
    const remaining = slot.capacity - filled;
    for (let i = 0; i < remaining; i++) {
      gridItems.push({ type: 'empty', data: slot.name });
    }
  });

  const gridColumns = layoutMode === '2ND MONITOR' ? '1fr 1fr 1fr' : '1fr 1fr';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Crew grid */}
      {gridItems.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: 8,
          }}
        >
          {gridItems.map((item, idx) =>
            item.type === 'crew' ? (
              <CrewCard key={item.data.id} rsvp={item.data} op={op} members={members} />
            ) : (
              <EmptySlotCard key={`empty-${idx}`} roleName={item.data} />
            )
          )}
        </div>
      ) : (
        <div style={{ color: 'var(--t2)', fontSize: 11, fontFamily: 'var(--font)', padding: '12px 0', textAlign: 'center' }}>
          No crew confirmed
        </div>
      )}
    </div>
  );
}