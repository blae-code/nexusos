import React, { useEffect, useState } from 'react';

/**
 * TaskTimeline — multi-step workflow visualiser
 *
 * Props:
 *   steps     Array<{ id, label, status: 'pending'|'active'|'complete'|'error', detail?, startedAt? }>
 *   compact   boolean — reduces padding and hides detail text
 *   style     object — applied to container
 */

function useElapsed(startedAt, active) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  return elapsed;
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const STATUS_COLOR = {
  pending: 'var(--t3)',
  active: 'var(--warn)',
  complete: 'var(--live)',
  error: 'var(--danger)',
};

const STATUS_GLYPH = {
  pending: '○',
  active: '◈',
  complete: '◆',
  error: '✕',
};

function StepRow({ step, isLast, compact }) {
  const isActive = step.status === 'active';
  const isDone = step.status === 'complete' || step.status === 'error';
  const elapsed = useElapsed(step.startedAt, isActive || isDone);
  const color = STATUS_COLOR[step.status] || STATUS_COLOR.pending;

  return (
    <div style={{ display: 'flex', gap: compact ? 8 : 10, position: 'relative' }}>
      {/* Connector line + glyph column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 16 }}>
        <span
          style={{
            fontSize: compact ? 9 : 10,
            color,
            lineHeight: 1,
            transition: 'color 0.2s',
            animation: isActive ? 'nexus-timeline-pulse 1.4s ease-in-out infinite' : 'none',
          }}
        >
          {STATUS_GLYPH[step.status] || STATUS_GLYPH.pending}
        </span>
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: '0.5px',
              background: isDone ? 'var(--b2)' : 'var(--b1)',
              marginTop: 4,
              minHeight: compact ? 12 : 16,
            }}
          />
        )}
      </div>

      {/* Step content */}
      <div style={{ paddingBottom: isLast ? 0 : compact ? 10 : 14, flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: compact ? 9 : 10,
              color: step.status === 'pending' ? 'var(--t2)' : 'var(--t0)',
              letterSpacing: '0.08em',
              fontWeight: step.status === 'active' ? 600 : 400,
              transition: 'color 0.2s',
            }}
          >
            {step.label}
          </span>
          {(isActive || isDone) && step.startedAt && (
            <span style={{ fontSize: 8, color: 'var(--t2)', flexShrink: 0 }}>
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>
        {!compact && step.detail && (
          <div
            style={{
              marginTop: 3,
              fontSize: 9,
              color: step.status === 'error' ? 'var(--danger)' : 'var(--t2)',
              lineHeight: 1.5,
            }}
          >
            {step.detail}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskTimeline({ steps = [], compact = false, style }) {
  return (
    <>
      <style>{`
        @keyframes nexus-timeline-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div
        style={{
          background: 'var(--bg1)',
          border: '0.5px solid var(--b1)',
          borderRadius: 8,
          padding: compact ? '10px 12px' : '14px 16px',
          fontFamily: 'inherit',
          ...style,
        }}
      >
        {steps.map((step, i) => (
          <StepRow
            key={step.id ?? i}
            step={step}
            isLast={i === steps.length - 1}
            compact={compact}
          />
        ))}
        {steps.length === 0 && (
          <div style={{ fontSize: 10, color: 'var(--t2)' }}>No steps defined.</div>
        )}
      </div>
    </>
  );
}

export default TaskTimeline;
