/**
 * ShipRoleCard — single crew member's ship role assignment card.
 */
import React from 'react';
import PresenceDot from '@/components/PresenceDot';

const SHIP_ROLES = ['PILOT', 'GUNNER', 'ENGINEER', 'MEDIC', 'SCANNER', 'TURRET_OP', 'LOADMASTER', 'UNASSIGNED'];

const ROLE_COLORS = {
  PILOT: '#3498DB', GUNNER: '#C0392B', ENGINEER: '#C8A84B', MEDIC: '#4A8C5C',
  SCANNER: '#8E44AD', TURRET_OP: '#E67E22', LOADMASTER: '#9A9488', UNASSIGNED: '#5A5850',
};

const ROLE_ICONS = {
  PILOT: '✈', GUNNER: '⊕', ENGINEER: '⚙', MEDIC: '✚',
  SCANNER: '◎', TURRET_OP: '⊗', LOADMASTER: '▦', UNASSIGNED: '—',
};

const SPEC_FIT = {
  COMBAT: ['GUNNER', 'TURRET_OP', 'PILOT'],
  MINING: ['SCANNER', 'ENGINEER', 'PILOT'],
  SALVAGE: ['ENGINEER', 'SCANNER', 'PILOT'],
  HAULING: ['LOADMASTER', 'PILOT', 'ENGINEER'],
  MEDICAL: ['MEDIC', 'ENGINEER'],
  EXPLORATION: ['SCANNER', 'PILOT'],
  CRAFTING: ['ENGINEER', 'LOADMASTER'],
  RACING: ['PILOT'],
  LEADERSHIP: ['PILOT'],
};

export default function ShipRoleCard({ rsvp, members, ships, canEdit, onAssign }) {
  const member = (members || []).find(m => m.callsign === rsvp.callsign);
  const spec = member?.specialization || rsvp.specialization || 'UNASSIGNED';
  const currentRole = rsvp.ship_role || 'UNASSIGNED';
  const color = ROLE_COLORS[currentRole] || '#5A5850';
  const icon = ROLE_ICONS[currentRole] || '—';

  // Highlight recommended roles based on specialization
  const recommended = SPEC_FIT[spec] || [];

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: `2px solid ${color}`,
      border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'border-color 150ms',
    }}>
      {/* Top row: callsign + presence + spec badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <PresenceDot lastSeenAt={member?.last_seen_at} size={6} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600,
          color: '#E8E4DC', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{rsvp.callsign || '—'}</span>
        {spec !== 'UNASSIGNED' && (
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 2,
            background: 'rgba(52,152,219,0.10)', border: '0.5px solid rgba(52,152,219,0.25)',
            color: '#3498DB', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            letterSpacing: '0.04em',
          }}>{spec}</span>
        )}
        {rsvp.rank && (
          <span style={{ fontSize: 8, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif" }}>{rsvp.rank}</span>
        )}
      </div>

      {/* Current ship role display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14, color, lineHeight: 1 }}>{icon}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
          color, letterSpacing: '0.06em',
        }}>{currentRole === 'UNASSIGNED' ? 'NOT ASSIGNED' : currentRole.replace('_', ' ')}</span>
        {rsvp.assigned_ship_name && (
          <span style={{
            fontSize: 9, color: '#C8A84B', fontFamily: "'Barlow Condensed', sans-serif",
            marginLeft: 'auto',
          }}>on {rsvp.assigned_ship_name}</span>
        )}
      </div>

      {/* Role selector — only for leads */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
          {SHIP_ROLES.filter(r => r !== 'UNASSIGNED').map(r => {
            const isActive = currentRole === r;
            const isRec = recommended.includes(r);
            const rc = ROLE_COLORS[r];
            return (
              <button key={r} onClick={() => onAssign(rsvp.id, r, null)} style={{
                padding: '3px 7px', borderRadius: 2, cursor: 'pointer', fontSize: 8,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                background: isActive ? `${rc}20` : isRec ? `${rc}08` : '#141410',
                border: `0.5px solid ${isActive ? rc : isRec ? `${rc}40` : 'rgba(200,170,100,0.06)'}`,
                color: isActive ? rc : isRec ? `${rc}BB` : '#5A5850',
                letterSpacing: '0.04em', transition: 'all 100ms',
                outline: isRec && !isActive ? `1px dotted ${rc}30` : 'none',
              }}>
                {ROLE_ICONS[r]} {r.replace('_', ' ')}
              </button>
            );
          })}
          {currentRole !== 'UNASSIGNED' && (
            <button onClick={() => onAssign(rsvp.id, 'UNASSIGNED', null)} style={{
              padding: '3px 7px', borderRadius: 2, cursor: 'pointer', fontSize: 8,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              background: 'transparent', border: '0.5px solid rgba(200,170,100,0.06)',
              color: '#5A5850',
            }}>CLEAR</button>
          )}
        </div>
      )}

      {/* Ship assignment */}
      {canEdit && ships && ships.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <select
            value={rsvp.assigned_ship_id || ''}
            onChange={e => {
              const ship = ships.find(s => s.id === e.target.value);
              onAssign(rsvp.id, currentRole, ship ? { id: ship.id, name: `${ship.name} (${ship.model})` } : null);
            }}
            style={{
              width: '100%', padding: '4px 8px', fontSize: 9,
              background: '#141410', border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            <option value="">— assign to ship —</option>
            {ships.map(s => <option key={s.id} value={s.id}>{s.name} — {s.model}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}