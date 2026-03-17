/**
 * LiveOpCrewTab — CREW tab for LiveOp
 * Shows confirmed RSVPs grouped by role, with ship/cargo info.
 * Op Leader can add a quick session log note from here.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const ROLE_ORDER = ['mining', 'escort', 'hauler', 'fabricator', 'medic', 'scout', 'roc_operator', 'hand_miner', 'refinery_coord', 'logistics', 'salvage'];

const SHIP_CLASS_COLOR = {
  FIGHTER:       'var(--danger)',
  HEAVY_FIGHTER: 'var(--danger)',
  MINER:         'var(--warn)',
  HAULER:        'var(--info)',
  SALVAGER:      'var(--acc2)',
  MEDICAL:       'var(--live)',
  EXPLORER:      'var(--t1)',
  GROUND_VEHICLE:'var(--warn)',
  OTHER:         'var(--t2)',
};

function CrewCard({ rsvp }) {
  const scColor = SHIP_CLASS_COLOR[rsvp.ship_class] || 'var(--t2)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px',
      background: 'var(--bg1)',
      border: '0.5px solid var(--b0)',
      borderRadius: 6,
      transition: 'background 0.1s, border-color 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--b1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg1)'; e.currentTarget.style.borderColor = 'var(--b0)'; }}
    >
      {/* Status dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: rsvp.status === 'CONFIRMED' ? 'var(--live)' : rsvp.status === 'TENTATIVE' ? 'var(--warn)' : 'var(--t3)',
        flexShrink: 0,
      }} />

      {/* Callsign */}
      <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, minWidth: 120, flexShrink: 0 }}>
        {rsvp.callsign || rsvp.discord_id}
      </span>

      {/* Ship */}
      {rsvp.ship && (
        <span style={{ color: scColor, fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rsvp.ship}
        </span>
      )}

      {/* SCU */}
      {rsvp.cargo_scu_available > 0 && (
        <span style={{ color: 'var(--t2)', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
          {rsvp.cargo_scu_available} SCU
        </span>
      )}
    </div>
  );
}

function RoleGroup({ role, rsvps, capacity }) {
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED').length;
  const filled = confirmed >= (capacity || 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{role}</span>
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 3,
          background: filled ? 'rgba(var(--live-rgb), 0.08)' : 'var(--bg3)',
          border: `0.5px solid ${filled ? 'rgba(var(--live-rgb), 0.25)' : 'var(--b2)'}`,
          color: filled ? 'var(--live)' : 'var(--t2)',
        }}>
          {confirmed}/{capacity || '?'}
        </span>
        <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rsvps.map(r => <CrewCard key={r.id} rsvp={r} />)}
        {rsvps.length === 0 && (
          <div style={{ color: 'var(--t3)', fontSize: 10, padding: '4px 10px' }}>No crew assigned</div>
        )}
      </div>
    </div>
  );
}

export default function LiveOpCrewTab({ op, rsvps, canEdit }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  // Group rsvps by role
  const roleSlots = op.role_slots || {};
  const allRoles = [
    ...ROLE_ORDER.filter(r => roleSlots[r] !== undefined),
    ...Object.keys(roleSlots).filter(r => !ROLE_ORDER.includes(r)),
  ];

  // RSVPs that have no role or an unrecognised role
  const assignedRoleIds = new Set(rsvps.filter(r => r.role && roleSlots[r.role] !== undefined).map(r => r.id));
  const unassigned = rsvps.filter(r => !assignedRoleIds.has(r.id));

  const totalConfirmed = rsvps.filter(r => r.status === 'CONFIRMED').length;
  const totalScu = rsvps.reduce((s, r) => s + (r.cargo_scu_available || 0), 0);

  const handleLogNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    const entry = {
      type: 'note',
      t: new Date().toISOString(),
      author: 'OP LEADER',
      text: noteText.trim(),
    };
    const updated = [...(op.session_log || []), entry];
    await base44.entities.Op.update(op.id, { session_log: updated });
    setNoteText('');
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 0' }}>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'CONFIRMED', value: totalConfirmed, color: 'var(--live)' },
          { label: 'TOTAL ROSTER', value: rsvps.length, color: 'var(--t0)' },
          { label: 'HAULING CAP', value: `${totalScu} SCU`, color: 'var(--info)' },
          { label: 'ROLES FILLED', value: `${allRoles.filter(r => rsvps.some(rv => rv.role === r && rv.status === 'CONFIRMED')).length}/${allRoles.length}`, color: 'var(--t1)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '8px 12px',
            background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontSize: 16, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role groups */}
      <div>
        {allRoles.map(role => (
          <RoleGroup
            key={role}
            role={role}
            capacity={roleSlots[role]}
            rsvps={rsvps.filter(r => r.role === role)}
          />
        ))}
        {unassigned.length > 0 && (
          <RoleGroup role="UNASSIGNED" rsvps={unassigned} capacity={null} />
        )}
        {rsvps.length === 0 && (
          <div style={{ color: 'var(--t2)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
            No RSVPs yet
          </div>
        )}
      </div>

      {/* Quick log note */}
      {canEdit && (
        <div style={{ borderTop: '0.5px solid var(--b1)', paddingTop: 12 }}>
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>LOG NOTE</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="nexus-input"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLogNote(); }}
              placeholder="Quick session note…"
              style={{ flex: 1, fontSize: 11 }}
            />
            <button
              onClick={handleLogNote}
              disabled={saving || !noteText.trim()}
              className="nexus-btn"
              style={{ padding: '6px 12px', fontSize: 10, opacity: noteText.trim() ? 1 : 0.4 }}
            >
              LOG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}