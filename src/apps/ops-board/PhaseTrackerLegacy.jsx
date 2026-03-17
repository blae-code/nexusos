import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PhaseTracker({ op, canEdit, onPhaseChange }) {
  const phases = op.phases || [];
  const current = op.phase_current || 0;
  const [postingBrief, setPostingBrief] = useState(false);

  if (phases.length === 0) return null;

  const handlePhaseChange = async (newPhase) => {
    setPostingBrief(true);
    try {
      await onPhaseChange(newPhase);
    } finally {
      setPostingBrief(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', flexShrink: 0 }}>
        PHASE PROGRESS
      </span>

      {/* Phase visualization */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'auto', flex: 1 }}>
        {phases.map((p, i) => {
          const name = typeof p === 'object' ? p.name : p;
          const isCurrent = i === current;
          const isDone = i < current;

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              {/* Phase bubble */}
              <div
                title={name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isCurrent ? 'var(--warn-bg)' : isDone ? 'var(--live-bg)' : 'transparent',
                  border: `0.5px solid ${isCurrent ? 'var(--warn-b)' : isDone ? 'var(--live-b)' : 'var(--b2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 500,
                  color: isCurrent ? 'var(--warn)' : isDone ? 'var(--live)' : 'var(--t3)',
                  cursor: canEdit && (isCurrent || isDone) ? 'pointer' : 'default',
                  transition: 'all 0.12s',
                  animation: isCurrent ? 'node-pulse 2s ease-in-out infinite' : undefined,
                }}
              >
                {isDone ? '✓' : isCurrent ? '▶' : `${i + 1}`}
              </div>

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div
                  style={{
                    width: 12,
                    height: '0.5px',
                    background: isDone ? 'var(--live)' : 'var(--b2)',
                    flexShrink: 0,
                    transition: 'all 0.12s',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button
            onClick={() => handlePhaseChange(Math.max(0, current - 1))}
            disabled={current === 0 || postingBrief}
            className="nexus-btn"
            style={{
              padding: '3px 7px',
              fontSize: 10,
              opacity: current === 0 || postingBrief ? 0.3 : 1,
              cursor: current === 0 || postingBrief ? 'not-allowed' : 'pointer',
            }}
            title="Previous phase"
          >
            <ChevronLeft size={10} />
          </button>
          <button
            onClick={() => handlePhaseChange(Math.min(phases.length - 1, current + 1))}
            disabled={current >= phases.length - 1 || postingBrief}
            className="nexus-btn"
            style={{
              padding: '3px 7px',
              fontSize: 10,
              opacity: current >= phases.length - 1 || postingBrief ? 0.3 : 1,
              cursor: current >= phases.length - 1 || postingBrief ? 'not-allowed' : 'pointer',
            }}
            title="Next phase"
          >
            {postingBrief ? (
              <div className="nexus-loading-dots" style={{ fontSize: 10, color: 'var(--t1)' }}>
                <span />
              </div>
            ) : (
              <ChevronRight size={10} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
