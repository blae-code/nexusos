/**
 * CrewGrid — 2-column grid of confirmed crew cards.
 * Props: { rsvps, op }
 *
 * Each card: avatar initials + callsign + role tag + ship + phase progress bar.
 * Design decision: "current objective" shown as current phase name (no
 * per-member objective schema exists). "online" indicator not shown — no
 * real-time presence data available; green border reserved for actual live data.
 * Voice channel shown at bottom based on op type routing from spec.
 */
import React from 'react';
import NexusToken from '@/components/ui/NexusToken';
import { roleToken } from '@/lib/tokenMap';

// ─── Role colour map ──────────────────────────────────────────────────────────

const ROLE_COLORS = {
  mining:       'var(--info)',
  escort:       'var(--danger)',
  fabricator:   'var(--acc2)',
  scout:        'var(--live)',
  combat:       'var(--danger)',
  support:      'var(--acc)',
  salvage:      'var(--warn)',
  rescue:       'var(--live)',
  medical:      'var(--live)',
};

function roleColor(role) {
  return ROLE_COLORS[(role || '').toLowerCase()] || 'var(--t2)';
}

// ─── Voice channel routing ────────────────────────────────────────────────────

function voiceChannel(opType) {
  const t = (opType || '').toUpperCase();
  if (['INDUSTRY', 'MINING', 'ROCKBREAKER', 'SALVAGE'].includes(t)) return 'Industry Bonfire';
  if (['PATROL', 'COMBAT', 'ESCORT', 'S17', 'RESCUE'].includes(t))  return 'Rangers Bonfire';
  return 'Redscar Only';
}

// ─── Initials avatar ──────────────────────────────────────────────────────────

function Avatar({ callsign }) {
  const initials = (callsign || '??').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'var(--bg3)', border: '0.5px solid var(--b2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: 'var(--acc2)',
      letterSpacing: '0.04em',
    }}>
      {initials}
    </div>
  );
}

// ─── Single crew card ─────────────────────────────────────────────────────────

function CrewCard({ rsvp, op }) {
  const phases      = Array.isArray(op.phases) ? op.phases : [];
  const currentPhase = op.phase_current || 0;
  const phasePct    = phases.length > 0 ? Math.round((currentPhase / phases.length) * 100) : 0;
  const phaseName   = phases[currentPhase] || '—';
  const rCol        = roleColor(rsvp.role);

  return (
    <div style={{
      background: 'var(--bg2)', border: '0.5px solid var(--b1)',
      borderRadius: 7, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      {/* Top row: avatar + callsign + role */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar callsign={rsvp.callsign} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: 'var(--t0)', fontSize: 12, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {rsvp.callsign || '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {rsvp.role && (
              <>
                <NexusToken
                  src={roleToken(rsvp.role.toUpperCase())}
                  size={22}
                  alt={rsvp.role}
                />
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 4,
                  border: `0.5px solid ${rCol}50`,
                  background: `${rCol}12`,
                  color: rCol, letterSpacing: '0.06em', fontWeight: 600,
                }}>
                  {rsvp.role.toUpperCase()}
                </span>
              </>
            )}
            {rsvp.ship && (
              <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.04em' }}>
                {rsvp.ship}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current objective (phase name) */}
      <div style={{ color: 'var(--t1)', fontSize: 10, letterSpacing: '0.04em' }}>
        {phaseName}
      </div>

      {/* Phase progress bar */}
      <div style={{ height: 2, background: 'var(--b0)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 1,
          width: `${phasePct}%`,
          background: 'var(--acc)',
          transition: 'width 0.4s ease',
        }} />
      </div>
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
