/**
 * CrewGrid — responsive crew roster cards.
 * Props: { rsvps, op, layoutMode }
 */
import React from 'react';

const ROLE_COLORS = {
  mining:       'var(--info)',
  escort:       'var(--danger)',
  fabricator:   'var(--acc2)',
  scout:        'var(--live)',
  combat:       'var(--danger)',
  support:      'var(--acc)',
  salvage:      'var(--warn)',
  hauler:       'var(--warn)',
  refinery:     'var(--info)',
  medic:        'var(--live)',
  rescue:       'var(--live)',
  medical:      'var(--live)',
};

function roleColor(role) {
  return ROLE_COLORS[(role || '').toLowerCase()] || 'var(--b2)';
}

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

function CrewCard({ rsvp, op }) {
  const isExclusive = op.access_type === 'EXCLUSIVE';
  const rCol = roleColor(rsvp.role);

  return (
    <div className="nexus-card" style={{ padding: 12, gap: 8, display: 'flex', flexDirection: 'column' }}>
      {/* Top row: dot + callsign + online dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: rCol,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--t0)', fontFamily: 'var(--font)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rsvp.callsign || '—'}
        </span>
        {/* Online indicator — placeholder for future real-time presence */}
        {/* <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', flexShrink: 0, animation: 'pulse-dot 2.5s ease-in-out infinite' }} /> */}
      </div>

      {/* Role name */}
      {rsvp.role && (
        <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {rsvp.role}
        </span>
      )}

      {/* Ship name */}
      {rsvp.ship && (
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
      <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
        {roleName}
      </span>
      <span style={{ fontSize: 8, color: 'var(--b2)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        OPEN
      </span>
    </div>
  );
}

// ─── CrewGrid ─────────────────────────────────────────────────────────────────

export default function CrewGrid({ rsvps = [], op = {} }) {
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Crew grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
      }}>
        {confirmed.map(r => (
          <CrewCard key={r.id} rsvp={r} op={op} />
        ))}
        {confirmed.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', color: 'var(--t2)', fontSize: 11,
            padding: '16px 0', textAlign: 'center',
          }}>
            No confirmed crew
          </div>
        )}
      </div>

      {/* Voice channel assignment */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 6,
        background: 'var(--bg2)', border: '0.5px solid var(--b1)',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--info)', flexShrink: 0 }} />
        <div>
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>VOICE COMMS</div>
          <div style={{ color: 'var(--info)', fontSize: 11, marginTop: 1 }}>
            {voiceChannel(op.type)}
          </div>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--t2)', fontSize: 10 }}>
          {confirmed.length} crew
        </span>
      </div>
    </div>
  );
}