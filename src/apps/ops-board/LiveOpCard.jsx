import React from 'react';
import { Clock, ChevronRight, Users } from 'lucide-react';
import { normalizeRoleSlots, TypeTag, ElapsedTimer } from './opBoardHelpers';
import NexusToken from '@/core/design/NexusToken';
import { opTypeToken } from '@/core/data/tokenMap';

export default function LiveOpCard({ op, rsvps, onEnter }) {
  const slots     = normalizeRoleSlots(op.role_slots);
  const cap       = slots.reduce((s, r) => s + r.capacity, 0);
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED').length;
  const phases    = Array.isArray(op.phases) ? op.phases : [];
  const activePhase = phases[op.phase_current || 0] || null;
  const phaseName = typeof activePhase === 'object' ? activePhase?.name || null : activePhase;
  const readyPct  = cap > 0 ? Math.min((confirmed / cap) * 100, 100) : 0;
  const isReady   = readyPct >= 100;

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid rgba(var(--live-rgb), 0.25)',
      borderRadius: 10, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="pulse-live" style={{ flexShrink: 0 }} />
        <NexusToken src={opTypeToken(op.type)} size={20} alt={op.type} title={op.type} />
        <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.name}
        </span>
        <TypeTag type={op.type} />
        <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(var(--live-rgb), 0.3)', background: 'rgba(var(--live-rgb), 0.06)', flexShrink: 0 }}>LIVE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--t1)', fontSize: 11 }}>
          {[op.system_name, op.location].filter(Boolean).join(' · ')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Clock size={10} style={{ color: 'var(--t2)' }} />
          <ElapsedTimer startedAt={op.started_at} />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--t1)', fontSize: 11 }}>
          <Users size={10} style={{ color: 'var(--t2)' }} />
          {confirmed}/{cap} crew
        </span>
        {phaseName && (
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            border: '0.5px solid rgba(var(--warn-rgb), 0.35)', background: 'rgba(var(--warn-rgb), 0.06)',
            color: 'var(--warn)', letterSpacing: '0.07em', fontWeight: 600,
          }}>
            {phaseName.toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>READINESS GATE</span>
          <span style={{ color: isReady ? 'var(--live)' : 'var(--warn)', fontSize: 9, fontWeight: 600 }}>
            {readyPct.toFixed(0)}%{isReady ? ' — FULL' : ''}
          </span>
        </div>
        <div style={{ height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 1, transition: 'width 0.4s ease',
            width: `${readyPct}%`,
            background: isReady ? 'var(--live)' : 'var(--warn)',
          }} />
        </div>
      </div>

      <button
        onClick={onEnter}
        className="nexus-btn"
        style={{
          width: '100%', justifyContent: 'center', padding: '8px 0', fontSize: 11,
          background: 'rgba(var(--live-rgb), 0.06)', borderColor: 'rgba(var(--live-rgb), 0.25)',
          color: 'var(--live)', letterSpacing: '0.08em',
        }}
      >
        ENTER OP <ChevronRight size={12} />
      </button>
    </div>
  );
}
