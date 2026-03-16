/**
 * PhaseTracker — horizontal phase strip for live ops.
 * Props: { phases, currentPhase, opId, rank, onAdvance }
 * Click on the active node to advance to next phase (Pioneer/Founder only).
 * heraldBot 'phaseAdvance' fires on advance, wrapped in .catch().
 */
import React from 'react';
import { base44 } from '@/api/base44Client';

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];

// ─── Single phase node ────────────────────────────────────────────────────────

function PhaseNode({ label, index, status, canAdvance, onClick }) {
  const isDone   = status === 'done';
  const isActive = status === 'active';
  const isLocked = status === 'locked';

  const ringColor = isDone   ? 'var(--live)'
    : isActive               ? 'var(--acc2)'
    : 'var(--b2)';

  const bgColor   = isDone   ? 'rgba(39,201,106,0.15)'
    : isActive               ? 'var(--bg4)'
    : 'var(--bg2)';

  const labelColor = isDone  ? 'var(--live)'
    : isActive               ? 'var(--t0)'
    : 'var(--t3)';

  const sublabel   = isDone  ? 'DONE'
    : isActive               ? 'ACTIVE'
    : '';

  const clickable  = isActive && canAdvance;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      opacity: isLocked ? 0.35 : 1,
      flexShrink: 0, minWidth: 68,
    }}>
      <div
        onClick={clickable ? onClick : undefined}
        title={clickable ? 'Click to advance phase' : undefined}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `0.5px solid ${ringColor}`,
          background: bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: clickable ? 'pointer' : 'default',
          color: isDone ? 'var(--live)' : isActive ? 'var(--t0)' : 'var(--t3)',
          fontSize: 13, fontWeight: 700,
          transition: 'border-color 0.15s, background 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (clickable) e.currentTarget.style.borderColor = 'var(--live)'; }}
        onMouseLeave={e => { if (clickable) e.currentTarget.style.borderColor = ringColor; }}
      >
        {isDone ? '✓' : index + 1}
      </div>

      <span style={{
        fontSize: 9, letterSpacing: '0.06em', textAlign: 'center',
        color: labelColor, maxWidth: 68, lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {label}
      </span>

      <span style={{
        fontSize: 8, letterSpacing: '0.08em', fontWeight: 600,
        color: isActive ? 'var(--warn)' : isDone ? 'var(--live)' : 'transparent',
        height: 10,
      }}>
        {sublabel || '.'}
      </span>
    </div>
  );
}

// ─── Connector line ───────────────────────────────────────────────────────────

function Connector({ done }) {
  return (
    <div style={{
      flex: 1, height: 1, alignSelf: 'center', marginBottom: 36,
      background: done ? 'var(--live)' : 'var(--b1)',
      minWidth: 12, maxWidth: 40,
      transition: 'background 0.3s',
    }} />
  );
}

// ─── PhaseTracker ─────────────────────────────────────────────────────────────

export default function PhaseTracker({ phases = [], currentPhase = 0, opId, rank, onAdvance }) {
  const canAdvance = PIONEER_RANKS.includes(rank);

  const handleClick = async () => {
    const newPhase = currentPhase + 1;
    if (newPhase >= phases.length) return; // already at last phase
    try {
      await base44.entities.Op.update(opId, { phase_current: newPhase });
    } catch (e) {
      console.error('[PhaseTracker] phase update failed:', e);
      return;
    }
    // heraldBot — non-fatal
    base44.functions.invoke('heraldBot', {
      action:  'phaseAdvance',
      payload: {
        op_id:       opId,
        phase:       phases[newPhase],
        phase_index: newPhase,
      },
    }).catch(e => console.warn('[PhaseTracker] heraldBot failed:', e.message));

    onAdvance?.(newPhase);
  };

  if (phases.length === 0) {
    return (
      <div style={{ color: 'var(--t2)', fontSize: 11, padding: '12px 0' }}>
        No phases defined for this op.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', padding: '4px 2px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
        {phases.map((phase, i) => {
          const status = i < currentPhase ? 'done' : i === currentPhase ? 'active' : 'locked';
          return (
            <React.Fragment key={i}>
              {i > 0 && <Connector done={i <= currentPhase} />}
              <PhaseNode
                label={phase}
                index={i}
                status={status}
                canAdvance={canAdvance}
                onClick={handleClick}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
