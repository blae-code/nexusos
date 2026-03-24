import React, { useState } from 'react';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { X, Check } from 'lucide-react';
import { normalizeRoleSlots, Overlay, DialogCard } from './opBoardHelpers';
import NexusToken from '@/core/design/NexusToken';
import { roleToken } from '@/core/data/tokenMap';

export default function RSVPDialog({ op, rsvps, sessionUserId, onClose, onRefresh }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [ship, setShip] = useState('');

  const slots    = normalizeRoleSlots(op.role_slots);
  const existing = rsvps.find(r => String(r.user_id) === String(sessionUserId));

  const submit = async (role, status = 'CONFIRMED') => {
    setSubmitting(true);
    try {
      await nexusWriteApi.upsertOpRsvp({
        op_id: op.id,
        role,
        status,
        ship: ship.trim() || existing?.ship || '',
      });
      setDone(true);
      onRefresh?.();
      setTimeout(onClose, 800);
    } catch {
      setSubmitting(false);
    }
    setSubmitting(false);
  };

  const decline = async () => {
    setSubmitting(true);
    try {
      await nexusWriteApi.declineOpRsvp(op.id);
      setDone(true);
      onRefresh?.();
      setTimeout(onClose, 800);
    } catch {
      setSubmitting(false);
    }
    setSubmitting(false);
  };

  return (
    <Overlay onDismiss={onClose}>
      <DialogCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>
            RSVP — {op.name}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Check size={24} style={{ color: 'var(--live)', margin: '0 auto 8px' }} />
            <div style={{ color: 'var(--live)', fontSize: 12 }}>RSVP recorded.</div>
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 10 }}>SELECT YOUR ROLE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {slots.map((slot, i) => {
                const filled   = rsvps.filter(r => r.role === slot.name && r.status === 'CONFIRMED').length;
                const full     = filled >= slot.capacity;
                const selected = existing?.role === slot.name && existing?.status === 'CONFIRMED';
                return (
                  <button
                    key={i}
                    onClick={() => !full && submit(slot.name)}
                    disabled={full || submitting}
                    title={full ? `${slot.name} — slot full (${filled}/${slot.capacity})` : `Sign up as ${slot.name}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', borderRadius: 6, cursor: full ? 'not-allowed' : 'pointer',
                      background: selected ? 'rgba(var(--live-rgb), 0.08)' : 'var(--bg3)',
                      border: `0.5px solid ${selected ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b2)'}`,
                      opacity: full ? 0.5 : 1, fontFamily: 'inherit',
                    }}
                  >
                    <NexusToken
                      src={roleToken(slot.name.toUpperCase().replace(/\s+/g, '_'))}
                      size={16}
                      opacity={full ? 0.4 : 1}
                      alt={slot.name}
                    />
                    <span style={{ flex: 1, color: selected ? 'var(--live)' : 'var(--t0)', fontSize: 12, fontWeight: selected ? 600 : 400, letterSpacing: '0.05em', textAlign: 'left' }}>
                      {slot.name.toUpperCase()}
                      {selected && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--live)' }}>✓ SELECTED</span>}
                    </span>
                    <span style={{ color: full ? 'var(--danger)' : 'var(--t1)', fontSize: 11, flexShrink: 0 }}>
                      {filled}/{slot.capacity}{full ? ' — FULL' : ''}
                    </span>
                  </button>
                );
              })}
              {slots.length === 0 && (
                <div style={{ color: 'var(--t2)', fontSize: 11, padding: '8px 0' }}>No roles defined for this op.</div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}>SHIP</div>
              <input
                className="nexus-input"
                style={{ width: '100%', fontSize: 11, padding: '7px 10px', boxSizing: 'border-box' }}
                placeholder="e.g. Prospector, Cutlass Black"
                value={ship}
                onChange={e => setShip(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button
              onClick={decline}
              disabled={submitting}
              style={{
                width: '100%', padding: '7px 0', borderRadius: 6,
                background: 'transparent', border: '0.5px solid var(--b2)',
                color: 'var(--t2)', fontSize: 11, letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              DECLINE OP
            </button>
          </>
        )}
      </DialogCard>
    </Overlay>
  );
}
