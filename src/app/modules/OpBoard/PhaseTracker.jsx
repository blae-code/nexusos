import React from 'react';
import { base44 } from '@/api/base44Client';
import NexusToken from '@/components/ui/NexusToken';
import { phaseToken } from '@/lib/tokenMap';

const SCOUT_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

function PhaseNode({ label, index, status, canAdvance, onClick }) {
  const isDone = status === 'done';
  const isActive = status === 'active';
  const isLocked = status === 'locked';
  const clickable = isActive && canAdvance;

  const labelColor = isActive ? 'var(--t1)' : 'var(--t3)';
  const subLabelColor = isDone ? 'var(--live)' : isActive ? 'var(--warn)' : 'var(--t3)';
  const subLabel = isDone ? 'DONE' : isActive ? 'ACTIVE' : 'LOCKED';

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: clickable ? 'pointer' : isLocked ? 'not-allowed' : 'default',
        opacity: isLocked ? 0.35 : 1,
      }}
      onClick={clickable ? onClick : undefined}
      title={clickable ? 'Advance phase' : undefined}
    >
      <NexusToken
        src={phaseToken(index + 1, status.toUpperCase())}
        size={36}
        pulse={isActive ? 'live' : false}
        alt={`Phase ${index + 1} — ${subLabel}`}
      />

      <span style={{ fontSize: 8, color: labelColor, letterSpacing: '.06em', textAlign: 'center', lineHeight: 1.3, maxWidth: 72 }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: subLabelColor, textAlign: 'center', minHeight: 10 }}>{subLabel}</span>
    </div>
  );
}

export default function PhaseTracker({ phases = [], currentPhase = 0, opId, rank, onAdvance }) {
  const canAdvance = SCOUT_RANKS.includes(rank);

  const handleClick = async () => {
    const nextPhase = currentPhase + 1;
    if (nextPhase >= phases.length) return;

    try {
      await base44.entities.Op.update(opId, { phase_current: nextPhase });
      base44.functions.invoke('heraldBot', {
        action: 'phaseAdvance',
        payload: {
          op_id: opId,
          phase: phases[nextPhase],
          phase_index: nextPhase,
        },
      }).catch((error) => console.warn('[PhaseTracker] heraldBot failed:', error.message));
      onAdvance?.(nextPhase);
    } catch {
      // phase update failed — UI stays on current phase
    }
  };

  if (phases.length === 0) {
    return <div style={{ color: 'var(--t2)', fontSize: 11, padding: '12px 0' }}>No phases defined for this op.</div>;
  }

  const doneCount  = Math.min(currentPhase, phases.length);
  const isComplete = currentPhase >= phases.length;
  const activeName = !isComplete ? (phases[currentPhase]?.name || phases[currentPhase] || '') : '';

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Phase counter strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 18px 2px',
        color: 'var(--t2)', fontSize: 10,
      }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          PHASE{' '}
          <span style={{ color: isComplete ? 'var(--live)' : 'var(--t1)', fontWeight: 600 }}>
            {isComplete ? phases.length : doneCount + 1}
          </span>
          {' / '}
          <span>{phases.length}</span>
        </span>
        {activeName && (
          <>
            <span style={{ color: 'var(--b2)' }}>·</span>
            <span style={{ color: 'var(--warn)', letterSpacing: '0.06em' }}>{activeName}</span>
          </>
        )}
        {isComplete && (
          <>
            <span style={{ color: 'var(--b2)' }}>·</span>
            <span style={{ color: 'var(--live)', letterSpacing: '0.06em' }}>OP COMPLETE</span>
          </>
        )}
        {canAdvance && !isComplete && (
          <button
            onClick={handleClick}
            title="Advance to next phase"
            style={{
              marginLeft: 'auto',
              padding: '2px 10px', fontSize: 9, letterSpacing: '0.1em',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(var(--live-rgb), 0.06)',
              border: '0.5px solid rgba(var(--live-rgb), 0.3)',
              color: 'var(--live)',
            }}
          >
            ADVANCE →
          </button>
        )}
      </div>

      <div style={{ display: 'flex', padding: '12px 18px', position: 'relative', minWidth: 'max-content', gap: 10 }}>
        <div style={{ position: 'absolute', top: '50%', left: 18, right: 18, height: '0.5px', background: 'var(--b0)', zIndex: 0, transform: 'translateY(-50%)' }} />
        {phases.map((phase, index) => {
          const status = index < currentPhase ? 'done' : index === currentPhase ? 'active' : 'locked';
          const label  = typeof phase === 'object' ? (phase.name || `Phase ${index + 1}`) : phase;
          return (
            <PhaseNode
              key={`${label}-${index}`}
              label={label}
              index={index}
              status={status}
              canAdvance={canAdvance}
              onClick={handleClick}
            />
          );
        })}
      </div>
    </div>
  );
}
