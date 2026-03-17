import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';

const SCOUT_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

function PhaseNode({ label, index, status, totalPhases }) {
  const isDone = status === 'done';
  const isActive = status === 'active';

  const nodeBg = isDone ? 'var(--live)' : isActive ? 'var(--acc)' : 'var(--bg3)';
  const nodeBorder = isDone || isActive ? 'none' : '0.5px solid var(--b2)';
  const labelColor = isDone ? 'var(--live)' : isActive ? 'var(--t0)' : 'var(--t2)';

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* Phase node circle */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: nodeBg,
          border: nodeBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...(isActive && {
            boxShadow: '0 0 0 2px var(--bg0), 0 0 0 3px var(--b2)',
            animation: 'node-pulse 2s ease-in-out infinite',
          }),
        }}
      >
        {isDone ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline
              points="3 8 5 10 9 3"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : isActive ? (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
        ) : (
          <span style={{ color: 'var(--t3)', fontSize: 9, fontFamily: 'var(--font)', fontWeight: 600 }}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Phase label */}
      <span
        style={{
          fontSize: 9,
          color: labelColor,
          fontFamily: 'var(--font)',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: 80,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function PhaseTracker({ phases = [], currentPhase = 0, opId, rank, onAdvance }) {
  const canAdvance = SCOUT_RANKS.includes(rank);
  const [confirmingPhase, setConfirmingPhase] = useState(false);
  const [advancingIndex, setAdvancingIndex] = useState(null);

  useEffect(() => {
    if (!confirmingPhase) return;
    const timer = setTimeout(() => setConfirmingPhase(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmingPhase]);

  const handleAdvanceClick = () => {
    if (confirmingPhase) {
      // User confirmed — execute advance
      performAdvance();
      setConfirmingPhase(false);
    } else {
      // First click — show confirmation
      setConfirmingPhase(true);
    }
  };

  const performAdvance = async () => {
    const nextPhase = currentPhase + 1;
    if (nextPhase >= phases.length) return;

    setAdvancingIndex(currentPhase);
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
    } finally {
      setTimeout(() => setAdvancingIndex(null), 300);
    }
  };

  if (phases.length === 0) {
    return <div style={{ color: 'var(--t2)', fontSize: 11, fontFamily: 'var(--font)', padding: '12px 0' }}>No phases defined for this op.</div>;
  }

  const isComplete = currentPhase >= phases.length;
  const activeName = !isComplete ? (typeof phases[currentPhase] === 'object' ? phases[currentPhase].name : phases[currentPhase]) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 2px var(--bg0), 0 0 0 3px var(--b2); }
          50% { box-shadow: 0 0 0 2px var(--bg0), 0 0 0 4px var(--acc); }
        }
      `}</style>

      {/* Connector line container */}
      <div style={{ position: 'relative', minWidth: 'max-content' }}>
        {/* Background line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '0.5px',
            background: 'var(--b1)',
            zIndex: 0,
            transform: 'translateY(-50%)',
          }}
        />

        {/* Completed segment overlay */}
        {currentPhase > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              height: '0.5px',
              background: 'var(--live)',
              zIndex: 1,
              transform: 'translateY(-50%)',
              width: `${(currentPhase / (phases.length - 1)) * 100}%`,
              transition: 'width 300ms ease',
            }}
          />
        )}

        {/* Phase nodes */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 0', position: 'relative', zIndex: 2 }}>
          {phases.map((phase, index) => {
            const status = index < currentPhase ? 'done' : index === currentPhase ? 'active' : 'locked';
            const label = typeof phase === 'object' ? (phase.name || `Phase ${index + 1}`) : phase;
            const isAnimating = advancingIndex === index;

            return (
              <div
                key={`${label}-${index}`}
                style={{
                  flex: 1,
                  opacity: isAnimating ? 0.8 : 1,
                  transition: 'opacity 300ms ease',
                }}
              >
                <PhaseNode label={label} index={index} status={status} totalPhases={phases.length} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase info + advance button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0' }}>
        <div style={{ fontSize: 9, color: 'var(--t2)', fontFamily: 'var(--font)', letterSpacing: '0.1em' }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            PHASE{' '}
            <span style={{ color: isComplete ? 'var(--live)' : 'var(--t1)', fontWeight: 600 }}>
              {isComplete ? phases.length : currentPhase + 1}
            </span>
            {' / '}
            <span>{phases.length}</span>
          </span>
          {activeName && (
            <>
              <span style={{ marginLeft: 8, marginRight: 8, color: 'var(--b1)' }}>·</span>
              <span style={{ color: 'var(--t1)', letterSpacing: '0.06em' }}>{activeName}</span>
            </>
          )}
          {isComplete && (
            <>
              <span style={{ marginLeft: 8, marginRight: 8, color: 'var(--b1)' }}>·</span>
              <span style={{ color: 'var(--live)', letterSpacing: '0.06em' }}>OP COMPLETE</span>
            </>
          )}
        </div>

        {canAdvance && !isComplete && (
          <button
            onClick={handleAdvanceClick}
            onBlur={() => setConfirmingPhase(false)}
            className="nexus-btn primary"
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              fontSize: 10,
              letterSpacing: '0.08em',
              background: confirmingPhase ? 'rgba(var(--warn-rgb), 0.08)' : undefined,
              borderColor: confirmingPhase ? 'rgba(var(--warn-rgb), 0.3)' : undefined,
              color: confirmingPhase ? 'var(--warn)' : undefined,
              transition: 'all 150ms ease',
            }}
          >
            {confirmingPhase ? 'CONFIRM ADVANCE →' : 'ADVANCE PHASE →'}
          </button>
        )}
      </div>
    </div>
  );
}