import React from 'react';
import { base44 } from '@/api/base44Client';

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];

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
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `0.5px solid ${isDone ? 'var(--live-b)' : isActive ? 'var(--acc2)' : 'var(--b1)'}`,
          background: isDone ? 'var(--live-bg)' : isActive ? 'var(--bg4)' : 'var(--bg2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDone ? 'var(--live)' : isActive ? 'var(--warn)' : 'var(--t2)',
          transition: 'border-color .12s, background .12s, box-shadow .12s',
          boxShadow: isActive ? '0 0 0 2px var(--bg0), 0 0 0 3px var(--b2)' : 'none',
        }}
      >
        {isDone ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2.5 7l3.5 3.5 5.5-7" stroke="var(--live)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : isActive ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 2L8.8 7H3.2L6 2Z" stroke="var(--warn)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600 }}>{index + 1}</span>
        )}
      </div>

      <span style={{ fontSize: 8, color: labelColor, letterSpacing: '.06em', textAlign: 'center', lineHeight: 1.3, maxWidth: 72 }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: subLabelColor, textAlign: 'center', minHeight: 10 }}>{subLabel}</span>
    </div>
  );
}

export default function PhaseTracker({ phases = [], currentPhase = 0, opId, rank, onAdvance }) {
  const canAdvance = PIONEER_RANKS.includes(rank);

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
    } catch (error) {
      console.error('[PhaseTracker] phase update failed:', error);
    }
  };

  if (phases.length === 0) {
    return <div style={{ color: 'var(--t2)', fontSize: 11, padding: '12px 0' }}>No phases defined for this op.</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', padding: '12px 18px', position: 'relative', minWidth: 'max-content', gap: 10 }}>
        <div style={{ position: 'absolute', top: '50%', left: 18, right: 18, height: '0.5px', background: 'var(--b0)', zIndex: 0, transform: 'translateY(-50%)' }} />
        {phases.map((phase, index) => {
          const status = index < currentPhase ? 'done' : index === currentPhase ? 'active' : 'locked';
          return (
            <PhaseNode
              key={`${phase}-${index}`}
              label={phase}
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
