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
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isCurrent ? 'rgba(232,160,32,0.15)' : isDone ? 'rgba(39,201,106,0.15)' : 'var(--bg3)',
                  border: `0.5px solid ${isCurrent ? 'rgba(232,160,32,0.4)' : isDone ? 'rgba(39,201,106,0.3)' : 'var(--b2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 500,
                  color: isCurrent ? 'var(--warn)' : isDone ? 'var(--live)' : 'var(--t3)',
                  cursor: canEdit && (isCurrent || isDone) ? 'pointer' : 'default',
                  transition: 'all 0.12s',
                  position: 'relative',
                }}
              >
                {isDone ? '✓' : isCurrent ? '▶' : `${i + 1}`}

                {/* Current phase indicator glow */}
                {isCurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      border: '0.5px solid rgba(232,160,32,0.2)',
                      animation: 'pulse-live 2s ease-in-out infinite',
                    }}
                  />
                )}
              </div>

              {/* Phase label tooltip on hover */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -28,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b2)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 8,
                  color: 'var(--t1)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  opacity: 0,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.parentElement.style.opacity = '1'; }}
                onMouseLeave={e => { e.parentElement.style.opacity = '0'; }}
              >
                {name}
              </div>

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div
                  style={{
                    width: 12,
                    height: '0.5px',
                    background: isDone ? 'var(--live)' : isCurrent ? 'var(--warn)' : 'var(--b0)',
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
