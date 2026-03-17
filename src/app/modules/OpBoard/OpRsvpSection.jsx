/**
 * OpRsvpSection — RSVP management for op detail view
 * Props: { op, rsvps, callsign, discordId, rank }
 *
 * Shows role slots, RSVP button (if not RSVPd and op is PUBLISHED),
 * or "Already RSVPd" pill + "Leave op" link.
 * Inline role selector panel that slides down when RSVP is clicked.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

function getRoleColor(roleName) {
  const lower = (roleName || '').toLowerCase();
  if (lower.includes('mining')) return 'var(--info)';
  if (lower.includes('escort')) return 'var(--danger)';
  if (lower.includes('fabricator')) return 'var(--acc2)';
  if (lower.includes('scout')) return 'var(--live)';
  if (lower.includes('hauler')) return 'var(--warn)';
  return 'var(--b2)';
}

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

export default function OpRsvpSection({ op, rsvps = [], callsign, discordId, rank }) {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedShip, setSelectedShip] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [leaveConfirming, setLeaveConfirming] = useState(false);

  const normalizedSlots = normalizeRoleSlots(op.role_slots);
  const confirmedRsvps = rsvps.filter(r => r.status === 'CONFIRMED');
  
  // Count filled slots per role
  const filledByRole = {};
  confirmedRsvps.forEach(rsvp => {
    if (rsvp.role) {
      filledByRole[rsvp.role] = (filledByRole[rsvp.role] || 0) + 1;
    }
  });

  // Check if current user already RSVPd
  const myRsvp = confirmedRsvps.find(r => r.discord_id === discordId);

  // Can only RSVP if op is PUBLISHED and not already RSVPd
  const canRsvp = op.status === 'PUBLISHED' && !myRsvp;

  const handleConfirmRsvp = async () => {
    if (!selectedRole || !discordId) return;
    setConfirming(true);
    try {
      await base44.entities.OpRsvp.create({
        op_id: op.id,
        discord_id: discordId,
        callsign,
        role: selectedRole,
        status: 'CONFIRMED',
      });
      setShowRoleSelector(false);
      setSelectedRole(null);
      // Trigger refresh via parent callback if needed
      window.dispatchEvent(new CustomEvent('op-rsvp-updated', { detail: { op_id: op.id } }));
    } catch {
      // Handle error
    } finally {
      setConfirming(false);
    }
  };

  const handleLeaveOp = async () => {
    if (!myRsvp) return;
    try {
      await base44.entities.OpRsvp.update(myRsvp.id, { status: 'DECLINED' });
      // Trigger refresh
      window.dispatchEvent(new CustomEvent('op-rsvp-updated', { detail: { op_id: op.id } }));
    } catch {
      // Handle error
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Role Slots List */}
      <div>
        <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, fontFamily: 'var(--font)' }}>
          Role Slots
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {normalizedSlots.map((slot, i) => {
            const filled = filledByRole[slot.name] || 0;
            const isFull = filled >= slot.capacity;
            const fillPct = (filled / slot.capacity) * 100;
            const barColor = isFull ? 'var(--live)' : 'var(--acc)';

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < normalizedSlots.length - 1 ? '0.5px solid var(--b0)' : 'none',
                }}
              >
                {/* Colour dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getRoleColor(slot.name),
                    flexShrink: 0,
                  }}
                />

                {/* Role name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--t0)', fontSize: 11, fontFamily: 'var(--font)', marginBottom: 4 }}>
                    {slot.name}
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 2,
                      background: 'var(--b1)',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, fillPct)}%`,
                        background: barColor,
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                </div>

                {/* Filled/Total count */}
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--t3)',
                    fontFamily: 'var(--font)',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {filled} / {slot.capacity}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RSVP Section */}
      {canRsvp ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            className="nexus-btn primary"
            style={{
              width: '100%',
              padding: '10px 0',
              fontSize: 11,
              letterSpacing: '0.08em',
            }}
          >
            RSVP FOR THIS OP →
          </button>

          {/* Role Selector Panel */}
          {showRoleSelector && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px',
                background: 'var(--bg2)',
                border: '0.5px solid var(--b1)',
                borderRadius: 6,
                animation: 'nexus-fade-in 150ms ease-out both',
              }}
            >
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'var(--font)' }}>
                Select Your Role
              </div>

              {normalizedSlots.map((slot) => {
                const filled = filledByRole[slot.name] || 0;
                const remaining = slot.capacity - filled;
                const isSelected = selectedRole === slot.name;

                return (
                  <button
                    key={slot.name}
                    onClick={() => setSelectedRole(slot.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: isSelected ? 'var(--bg3)' : 'transparent',
                      border: `0.5px solid ${isSelected ? 'var(--acc)' : 'var(--b1)'}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(var(--bg3-rgb), 0.5)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isSelected ? 'var(--bg3)' : 'transparent';
                    }}
                  >
                    {/* Colour dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getRoleColor(slot.name),
                        flexShrink: 0,
                      }}
                    />

                    {/* Role name + remaining count */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: 'var(--t1)', fontSize: 11, fontFamily: 'var(--font)' }}>
                        {slot.name}
                      </div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, fontFamily: 'var(--font)' }}>
                        {remaining} slot{remaining !== 1 ? 's' : ''} available
                      </div>
                    </div>
                  </button>
                );
              })}

              <button
                onClick={handleConfirmRsvp}
                disabled={!selectedRole || confirming}
                className="nexus-btn primary"
                style={{
                  width: '100%',
                  padding: '8px 0',
                  fontSize: 10,
                  marginTop: 6,
                  opacity: !selectedRole || confirming ? 0.5 : 1,
                  cursor: !selectedRole || confirming ? 'not-allowed' : 'pointer',
                }}
              >
                {confirming ? 'CONFIRMING...' : 'CONFIRM RSVP →'}
              </button>
            </div>
          )}
        </div>
      ) : myRsvp ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Already RSVPd pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(var(--live-rgb), 0.1)',
              border: '0.5px solid rgba(var(--live-rgb), 0.3)',
              borderRadius: 6,
              flex: 1,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--live)',
              }}
            />
            <span style={{ color: 'var(--live)', fontSize: 11, fontFamily: 'var(--font)', fontWeight: 500 }}>
              {myRsvp.role || 'Role TBD'}
            </span>
          </div>

          {/* Leave op link */}
          <button
            onClick={handleLeaveOp}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--t3)',
              fontSize: 9,
              fontFamily: 'var(--font)',
              textDecoration: 'none',
              transition: 'color 150ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--t3)';
            }}
          >
            Leave op
          </button>
        </div>
      ) : null}
    </div>
  );
}