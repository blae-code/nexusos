import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { sendNexusNotification } from '@/core/data/nexus-notify';
import NexusToken from '@/core/design/NexusToken';
import { phaseToken } from '@/core/data/tokenMap';
import { OPS_LEADER_RANKS } from './rankPolicies';

function PhaseNode({ label, index, status }) {
  const tokenState = status === 'done' ? 'DONE' : status === 'active' ? 'ACTIVE' : 'LOCKED';
  const labelColor = status === 'active' ? 'var(--t0)' : 'var(--t3)';

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
      <NexusToken
        src={phaseToken(index + 1, tokenState)}
        size={36}
        opacity={tokenState === 'LOCKED' ? 0.35 : 1}
        pulse={tokenState === 'ACTIVE' ? 'live' : false}
        alt={`Phase ${index + 1}`}
        title={label}
      />

      {/* Phase label */}
      <span
        style={{
          fontSize: 10,
          color: labelColor,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 500,
          textTransform: 'uppercase',
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

export default function PhaseTracker({ phases = [], currentPhase = 0, opId, opName, rank, onAdvance }) {
  const canAdvance = OPS_LEADER_RANKS.includes(rank);
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
      const nextLabel = typeof phases[nextPhase] === 'object' ? phases[nextPhase]?.name : phases[nextPhase];
      await sendNexusNotification({
        type: 'OP_PHASE_ADVANCE',
        title: 'Operation Phase Advanced',
        body: `${opName || 'Operation'} advanced to phase ${nextPhase + 1}${nextLabel ? ` · ${nextLabel}` : ''}.`,
        severity: 'INFO',
        target_user_id: null,
        source_module: 'OPS',
        source_id: opId,
      });
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
      {/* Connector line container */}
      <div style={{ position: 'relative', minWidth: 'max-content' }}>
        {/* Background line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(200,170,100,0.10)',
            zIndex: 0,
            transform: 'translateY(-50%)',
          }}
        />

        {/* Completed segment — green fill progresses left-to-right */}
        {currentPhase > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              height: 1,
              background: 'var(--live)',
              zIndex: 1,
              transform: 'translateY(-50%)',
              width: `${(currentPhase / (phases.length - 1)) * 100}%`,
              transition: 'width 300ms ease',
            }}
          />
        )}

        {/* Phase nodes */}
        <div style={{ display: 'flex', gap: 12, padding: '8px 0', position: 'relative', zIndex: 2 }}>
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
