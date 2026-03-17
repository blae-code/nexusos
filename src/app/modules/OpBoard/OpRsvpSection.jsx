/**
 * OpRsvpSection — RSVP management for op detail view
 * Props: { op, rsvps, callsign, discordId, rank }
 *
 * Shows role slots, RSVP button (if not RSVPd and op is PUBLISHED),
 * or "Already RSVPd" pill + "Leave op" link.
 * Inline role selector panel with ship selection.
 * Roster section showing confirmed crew with timestamps.
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

function formatTimestamp(isoStr) {
  if (!isoStr) return '—';
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return new Date(isoStr).toLocaleDateString();
}

export default function OpRsvpSection({ op, rsvps = [], callsign, discordId }) {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedShip, setSelectedShip] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [leaveConfirming, setLeaveConfirming] = useState(false);
  const [rsvpError, setRsvpError] = useState('');
  const [highlightRole, setHighlightRole] = useState(null);
  const [popSlot, setPopSlot] = useState(null);
  const [popCrew, setPopCrew] = useState(false);

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

  const totalCapacity = normalizedSlots.reduce((sum, slot) => sum + slot.capacity, 0);
  const isFull = confirmedRsvps.length === totalCapacity && totalCapacity > 0;

  const handleConfirmRsvp = async () => {
    if (!selectedRole || !discordId) return;
    setConfirming(true);
    setRsvpError('');
    try {
      await base44.entities.OpRsvp.create({
        op_id: op.id,
        discord_id: discordId,
        callsign,
        role: selectedRole,
        ship: selectedShip || null,
        status: 'CONFIRMED',
      });
      
      // Trigger highlight on the role slot row
      setHighlightRole(selectedRole);
      setTimeout(() => setHighlightRole(null), 900);
      
      // Trigger pop on slot count
      setPopSlot(selectedRole);
      setTimeout(() => setPopSlot(null), 200);
      
      // Trigger pop on crew count pill
      setPopCrew(true);
      setTimeout(() => setPopCrew(false), 200);
      
      setShowRoleSelector(false);
      setSelectedRole(null);
      setSelectedShip('');
      window.dispatchEvent(new CustomEvent('op-rsvp-updated', { detail: { op_id: op.id } }));
    } catch {
      setRsvpError('Could not confirm your RSVP. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleLeaveOp = async () => {
    if (!myRsvp) return;
    setLeaveConfirming(false);
    try {
      await base44.entities.OpRsvp.update(myRsvp.id, { status: 'DECLINED' });
      window.dispatchEvent(new CustomEvent('op-rsvp-updated', { detail: { op_id: op.id } }));
    } catch {
      // Handle error
    }
  };

  const handleLeaveClick = () => {
    setLeaveConfirming(true);
    setTimeout(() => {
      setLeaveConfirming(false);
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        @keyframes rsvp-highlight {
          0% { border-color: var(--live); background: rgba(var(--live-rgb), 0.08); }
          100% { border-color: var(--b0); background: transparent; }
        }
        @keyframes number-pop {
          0% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .rsvp-slot-highlight {
          animation: rsvp-highlight 900ms ease-out forwards;
        }
        .number-pop {
          animation: number-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
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
            const isHighlighted = highlightRole === slot.name;

            return (
              <div
                key={i}
                className={isHighlighted ? 'rsvp-slot-highlight' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < normalizedSlots.length - 1 ? '0.5px solid var(--b0)' : 'none',
                  border: isHighlighted ? `0.5px solid var(--live)` : undefined,
                  background: isHighlighted ? 'rgba(var(--live-rgb), 0.08)' : 'transparent',
                  borderRadius: 4,
                  paddingLeft: 4,
                  paddingRight: 4,
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
                  className={popSlot === slot.name ? 'number-pop' : ''}
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

              {/* Ship Selection — appears when role selected */}
              {selectedRole && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginTop: 4,
                    paddingTop: 8,
                    borderTop: '0.5px solid var(--b0)',
                    animation: 'nexus-fade-in 150ms ease-out both',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <label style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'var(--font)' }}>
                      Your Ship
                    </label>
                    <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)' }}>
                      (optional)
                    </span>
                  </div>
                  <input
                    className="nexus-input"
                    type="text"
                    value={selectedShip}
                    onChange={e => setSelectedShip(e.target.value)}
                    placeholder="e.g. Prospector, MOLE, Cutlass Black"
                    style={{ height: 32, fontSize: 11 }}
                  />
                </div>
              )}

              <button
                onClick={handleConfirmRsvp}
                disabled={!selectedRole || confirming}
                className="nexus-btn primary"
                style={{
                  width: '100%',
                  padding: '8px 0',
                  fontSize: 10,
                  marginTop: selectedRole ? 4 : 6,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            background: 'rgba(var(--live-rgb), 0.04)',
            border: '0.5px solid var(--live)',
            borderLeft: '3px solid var(--live)',
            borderRadius: 4,
          }}
        >
          {/* Live dot */}
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--live)',
              flexShrink: 0,
            }}
          />

          {/* Role name */}
          <span style={{ color: 'var(--t0)', fontSize: 11, fontFamily: 'var(--font)', fontWeight: 500 }}>
            {myRsvp.role || 'Role TBD'}
          </span>

          {/* Ship name (if provided) */}
          {myRsvp.ship && (
            <span style={{ color: 'var(--t3)', fontSize: 9, fontFamily: 'var(--font)' }}>
              {myRsvp.ship}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Leave op link with confirmation state */}
          <button
            onClick={leaveConfirming ? handleLeaveOp : handleLeaveClick}
            onBlur={() => setLeaveConfirming(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: leaveConfirming ? 'var(--warn)' : 'var(--t3)',
              fontSize: 9,
              fontFamily: 'var(--font)',
              textDecoration: 'none',
              transition: 'color 150ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!leaveConfirming) {
                e.currentTarget.style.color = 'var(--danger)';
              }
            }}
            onMouseLeave={e => {
              if (!leaveConfirming) {
                e.currentTarget.style.color = 'var(--t3)';
              }
            }}
          >
            {leaveConfirming ? 'Are you sure? Confirm →' : 'Leave op'}
          </button>
        </div>
      ) : null}

      {/* Roster Section */}
      <div style={{ marginTop: 4 }}>
        {/* Total capacity pill */}
        <div style={{ marginBottom: 12 }}>
          <div
            className={popCrew ? 'number-pop' : ''}
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: isFull ? 'rgba(var(--live-rgb), 0.08)' : 'var(--bg3)',
              border: `0.5px solid ${isFull ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b2)'}`,
              borderRadius: 4,
              fontSize: 9,
              color: isFull ? 'var(--live)' : 'var(--t2)',
              fontFamily: 'var(--font)',
              fontVariantNumeric: 'tabular-nums',
              transition: 'all 300ms ease',
            }}
          >
            {confirmedRsvps.length} / {totalCapacity} crew
          </div>
        </div>

        {/* Roster label */}
        <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10, fontFamily: 'var(--font)' }}>
          Confirmed Crew
        </div>

        {/* Roster list or empty state */}
        {confirmedRsvps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--t3)', fontSize: 10, fontFamily: 'var(--font)' }}>
            No crew confirmed yet. Be the first to RSVP.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {confirmedRsvps.map((rsvp, idx) => (
              <div
                key={rsvp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 40,
                  borderBottom: idx < confirmedRsvps.length - 1 ? '0.5px solid var(--b0)' : 'none',
                  transition: 'background 150ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(var(--bg0-rgb), 0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Role colour dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getRoleColor(rsvp.role),
                    flexShrink: 0,
                  }}
                />

                {/* Callsign */}
                <span style={{ color: 'var(--t0)', fontSize: 11, fontFamily: 'var(--font)', fontWeight: 500, minWidth: 0 }}>
                  {rsvp.callsign || '—'}
                </span>

                {/* Role name */}
                <span style={{ color: 'var(--t3)', fontSize: 9, fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                  {rsvp.role || '—'}
                </span>

                {/* Ship name (italic if provided) */}
                {rsvp.ship ? (
                  <span style={{ color: 'var(--t2)', fontSize: 9, fontFamily: 'var(--font)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                    {rsvp.ship}
                  </span>
                ) : null}

                <div style={{ flex: 1 }} />

                {/* Joined timestamp */}
                {rsvp.created_date && (
                  <span
                    style={{
                      color: 'var(--t3)',
                      fontSize: 9,
                      fontFamily: 'var(--font)',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    title={new Date(rsvp.created_date).toLocaleString()}
                  >
                    {formatTimestamp(rsvp.created_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}