/**
 * CrewRoster — CREW tab for LiveOp
 * Shows confirmed/declined/tentative crew by role with ship and cargo info.
 * Op Leaders can update RSVP status inline.
 */
import React, { useState } from 'react';
import { nexusWriteApi } from '@/core/data/nexus-write-api';

const ROLE_ICONS = {
  mining: '⛏', escort: '🛡', hauler: '📦', medic: '➕',
  salvage: '🔧', fabricator: '⚙', scout: '👁', roc_operator: '🚗',
  hand_miner: '🪨', refinery_coord: '⚗', logistics: '📦',
};

const STATUS_COLOR = {
  CONFIRMED: 'var(--live)',
  DECLINED:  'var(--danger)',
  TENTATIVE: 'var(--warn)',
};

function RsvpRow({ rsvp, canLead, onStatusChange }) {
  const icon = ROLE_ICONS[rsvp.role] || '●';
  const sc = STATUS_COLOR[rsvp.status] || 'var(--t2)';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 80px 90px 60px 80px',
      gap: 8,
      padding: '6px 10px',
      background: 'var(--bg1)',
      border: '0.5px solid var(--b0)',
      borderRadius: 5,
      marginBottom: 3,
      alignItems: 'center',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
    >
      <span style={{ fontSize: 12, textAlign: 'center' }}>{icon}</span>

      <div>
        <div style={{ color: 'var(--t0)', fontSize: 11 }}>{rsvp.callsign || rsvp.user_id || 'UNKNOWN'}</div>
        {rsvp.role && <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 1 }}>{rsvp.role.replace(/_/g, ' ').toUpperCase()}</div>}
      </div>

      <div style={{ color: 'var(--t1)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {rsvp.ship || '—'}
      </div>

      <div style={{ color: 'var(--t1)', fontSize: 10 }}>
        {rsvp.ship_class || '—'}
      </div>

      <div style={{ color: 'var(--t1)', fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {rsvp.cargo_scu_available > 0 ? `${rsvp.cargo_scu_available} SCU` : '—'}
      </div>

      <div>
        {canLead ? (
          <select
            value={rsvp.status}
            onChange={e => onStatusChange(rsvp.id, e.target.value)}
            style={{
              background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 4,
              color: sc, fontSize: 9, padding: '2px 4px', cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.06em',
            }}
          >
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="TENTATIVE">TENTATIVE</option>
            <option value="DECLINED">DECLINED</option>
          </select>
        ) : (
          <span style={{ color: sc, fontSize: 9, letterSpacing: '0.08em' }}>{rsvp.status}</span>
        )}
      </div>
    </div>
  );
}

export default function CrewRoster({ op, rsvps, canLead, onRsvpUpdate }) {
  const [, setUpdating] = useState(false);

  // Group by role order matching op.role_slots
  const roleOrder = Object.keys(op.role_slots || {});
  const grouped = {};
  rsvps.forEach(r => {
    const role = r.role || 'unassigned';
    if (!grouped[role]) grouped[role] = [];
    grouped[role].push(r);
  });

  // Sort roles by op.role_slots order, then unassigned at end
  const sortedRoles = [
    ...roleOrder.filter(r => grouped[r]),
    ...Object.keys(grouped).filter(r => !roleOrder.includes(r)),
  ];

  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const totalCargoCap = confirmed.reduce((s, r) => s + (r.cargo_scu_available || 0), 0);

  const handleStatusChange = async (rsvpId, newStatus) => {
    setUpdating(true);
    const target = rsvps.find((entry) => entry.id === rsvpId);
    if (target) {
      if (newStatus === 'DECLINED') {
        await nexusWriteApi.declineOpRsvp(op.id, {
          user_id: target.user_id,
          callsign: target.callsign,
        });
      } else {
        await nexusWriteApi.upsertOpRsvp({
          op_id: op.id,
          user_id: target.user_id,
          callsign: target.callsign,
          role: target.role || '',
          status: newStatus,
          ship: target.ship || '',
        });
      }
    }
    onRsvpUpdate && onRsvpUpdate();
    setUpdating(false);
  };

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'CONFIRMED', value: confirmed.length, color: 'var(--live)' },
          { label: 'TENTATIVE', value: rsvps.filter(r => r.status === 'TENTATIVE').length, color: 'var(--warn)' },
          { label: 'DECLINED',  value: rsvps.filter(r => r.status === 'DECLINED').length,  color: 'var(--danger)' },
          { label: 'TOTAL CARGO CAP', value: `${totalCargoCap} SCU`, color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6,
          }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role slot fill */}
      {roleOrder.length > 0 && (
        <div>
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 8 }}>ROLE FILL</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {roleOrder.map(role => {
              const cap = op.role_slots[role];
              const count = (grouped[role] || []).filter(r => r.status === 'CONFIRMED').length;
              const filled = count >= cap;
              return (
                <div key={role} style={{
                  padding: '3px 10px', borderRadius: 4,
                  background: filled ? 'rgba(var(--live-rgb), 0.07)' : 'var(--bg2)',
                  border: `0.5px solid ${filled ? 'rgba(var(--live-rgb), 0.25)' : 'var(--b1)'}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ color: filled ? 'var(--live)' : 'var(--t1)', fontSize: 10 }}>{role.replace(/_/g, ' ').toUpperCase()}</span>
                  <span style={{ color: filled ? 'var(--live)' : 'var(--warn)', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{count}/{cap}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Column header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 80px 90px 60px 80px', gap: 8,
        padding: '4px 10px', borderBottom: '0.5px solid var(--b1)',
      }}>
        {['', 'CALLSIGN / ROLE', 'SHIP', 'CLASS', 'CARGO', 'STATUS'].map(h => (
          <span key={h} style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>{h}</span>
        ))}
      </div>

      {/* Crew rows grouped by role */}
      {sortedRoles.map(role => (
        <div key={role}>
          {roleOrder.length > 1 && (
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 4, paddingLeft: 2 }}>
              {role.replace(/_/g, ' ').toUpperCase()}
            </div>
          )}
          {(grouped[role] || []).map(rsvp => (
            <RsvpRow key={rsvp.id} rsvp={rsvp} canLead={canLead} onStatusChange={handleStatusChange} />
          ))}
        </div>
      ))}

      {rsvps.length === 0 && (
        <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          No RSVPs yet
        </div>
      )}
    </div>
  );
}
