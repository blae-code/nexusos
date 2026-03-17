import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { normalizeRoleSlots, TypeTag, relativeTime, utcString } from './opBoardHelpers';
import NexusToken from '@/components/ui/NexusToken';
import { opTypeToken } from '@/lib/tokenMap';

export default function UpcomingCard({ op, userRsvp, onRsvp, onView }) {
  const slots      = normalizeRoleSlots(op.role_slots);
  const rsvpStatus = userRsvp?.status;

  const rsvpColor = rsvpStatus === 'CONFIRMED' ? 'var(--live)'
    : rsvpStatus === 'DECLINED'  ? 'var(--danger)'
    : null;

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--b1)',
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <NexusToken
          src={opTypeToken(op.type)}
          size={22}
          alt={op.type}
          title={`Op type: ${op.type || 'UNCLASSIFIED'}`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {op.name}
            </span>
            <TypeTag type={op.type} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10 }}>
            {[op.system_name, op.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        {rsvpColor && (
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
            border: `0.5px solid ${rsvpColor}50`, background: `${rsvpColor}12`,
            color: rsvpColor, letterSpacing: '0.07em', fontWeight: 600,
          }}>
            {rsvpStatus}
          </span>
        )}
      </div>

      <div
        title={utcString(op.scheduled_at)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--t1)', fontSize: 11, marginBottom: 10, cursor: 'default' }}
      >
        <Clock size={10} style={{ color: 'var(--t2)', flexShrink: 0 }} />
        {relativeTime(op.scheduled_at)}
        {op.buy_in_cost > 0 && (
          <span style={{ marginLeft: 6, color: 'var(--warn)', fontSize: 10 }}>
            {op.buy_in_cost.toLocaleString()} aUEC
          </span>
        )}
      </div>

      {slots.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {slots.map((slot, i) => (
            <span key={i} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 4,
              border: '0.5px solid var(--b2)', background: 'var(--bg3)',
              color: 'var(--t1)', letterSpacing: '0.05em',
            }}>
              {slot.name.toUpperCase()} ×{slot.capacity}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onRsvp}
          className="nexus-btn"
          style={{
            flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: 10,
            background: rsvpStatus === 'CONFIRMED' ? 'rgba(39,201,106,0.06)' : 'var(--bg3)',
            borderColor: rsvpStatus === 'CONFIRMED' ? 'rgba(39,201,106,0.3)' : 'var(--b2)',
            color: rsvpStatus === 'CONFIRMED' ? 'var(--live)' : 'var(--t0)',
          }}
        >
          {rsvpStatus === 'CONFIRMED' ? 'CHANGE RSVP' : rsvpStatus === 'DECLINED' ? 'CHANGE RSVP' : 'RSVP'}
        </button>
        <button
          onClick={onView}
          className="nexus-btn"
          style={{ flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: 10 }}
        >
          VIEW DETAILS <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
