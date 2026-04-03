/**
 * LiveOpTopbar — dedicated topbar for live op view
 * Props: { op, isLive, phases, currentPhase, startedAt, layoutMode, onLayoutChange, actions }
 */
import React, { useState, useEffect } from 'react';
import { Monitor, Maximize2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ElapsedTimer({ startedAt }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000)));
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAt]);

  if (!startedAt) {
    return <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>—</span>;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const value = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return <span style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--t3)', fontSize: 9 }}>{value}</span>;
}

function ActionButton({ label, tone = 'neutral', busy = false, onClick }) {
  const tones = {
    neutral: {
      color: 'var(--t1)',
      background: 'rgba(200,170,100,0.04)',
      border: 'rgba(200,170,100,0.12)',
    },
    warn: {
      color: 'var(--warn)',
      background: 'rgba(var(--warn-rgb), 0.08)',
      border: 'rgba(var(--warn-rgb), 0.26)',
    },
    live: {
      color: 'var(--live)',
      background: 'rgba(var(--live-rgb), 0.08)',
      border: 'rgba(var(--live-rgb), 0.26)',
    },
    danger: {
      color: 'var(--danger)',
      background: 'rgba(var(--danger-rgb), 0.08)',
      border: 'rgba(var(--danger-rgb), 0.28)',
    },
  };
  const style = tones[tone] || tones.neutral;

  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        padding: '6px 10px',
        minHeight: 30,
        background: style.background,
        border: `0.5px solid ${style.border}`,
        borderRadius: 3,
        cursor: busy ? 'not-allowed' : 'pointer',
        color: style.color,
        fontSize: 9,
        fontFamily: 'var(--font)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        opacity: busy ? 0.6 : 1,
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {busy ? 'WORKING...' : label}
    </button>
  );
}

export default function LiveOpTopbar({ op, isLive, phases, currentPhase, startedAt, layoutMode, onLayoutChange, actions = [] }) {
  const navigate = useNavigate();
  const activePhase = Array.isArray(phases) ? phases[currentPhase] : null;
  const phaseLabel = typeof activePhase === 'object'
    ? (activePhase?.name || `Phase ${currentPhase + 1}`)
    : (activePhase || 'Awaiting phase');

  return (
    <div
      style={{
        minHeight: 44,
        background: '#0A0908',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 6,
        paddingBottom: 6,
        gap: 12,
      }}
    >
      {/* Back link */}
      <button
        onClick={() => navigate('/app/ops')}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--t3)', fontSize: 9, fontFamily: 'var(--font)',
          letterSpacing: '0.10em', textTransform: 'uppercase', flexShrink: 0,
          padding: '4px 2px',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; }}
      >
        <ChevronLeft size={12} />OPS
      </button>
      <div style={{ width: '0.5px', height: 16, background: 'var(--b1)', flexShrink: 0 }} />

      {/* Left: Live indicator + Op name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        {isLive && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--live)',
              flexShrink: 0,
              animation: 'pulse-dot 2.5s ease-in-out infinite',
            }}
          />
        )}
        {isLive && (
          <span
            style={{
              fontSize: 9,
              color: 'var(--live)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontFamily: 'var(--font)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            LIVE
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: 'var(--t0)',
            fontFamily: 'var(--font)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {op.name}
        </span>
      </div>

      {/* Right: Phase pill, op actions, layout toggle, elapsed time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Phase pill */}
        <div
          className="nexus-tag"
          style={{
            background: 'rgba(var(--warn-rgb), 0.06)',
            border: `0.5px solid rgba(var(--warn-rgb), 0.3)`,
            color: 'var(--warn)',
            fontSize: 9,
            fontFamily: 'var(--font)',
            whiteSpace: 'nowrap',
          }}
        >
          {phaseLabel}
        </div>

        {actions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {actions.map((action) => (
              <ActionButton
                key={action.id}
                label={action.label}
                tone={action.tone}
                busy={action.busy}
                onClick={action.onClick}
              />
            ))}
          </div>
        )}

        {/* Layout mode toggle */}
        <div style={{ display: 'flex', gap: 3 }}>
          <button
            onClick={() => onLayoutChange('ALT-TAB')}
            title="Standard layout"
            style={{
              width: 32,
              height: 32,
              background: layoutMode === 'ALT-TAB' ? 'var(--bg3)' : 'transparent',
              border: `0.5px solid ${layoutMode === 'ALT-TAB' ? 'var(--b2)' : 'transparent'}`,
              borderRadius: 3,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: layoutMode === 'ALT-TAB' ? 'var(--t0)' : 'var(--t2)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              if (layoutMode !== 'ALT-TAB') {
                e.currentTarget.style.background = 'rgba(200,170,100,0.06)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = layoutMode === 'ALT-TAB' ? 'var(--bg3)' : 'transparent';
            }}
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => onLayoutChange('2ND MONITOR')}
            title="2nd monitor layout"
            style={{
              width: 32,
              height: 32,
              background: layoutMode === '2ND MONITOR' ? 'var(--bg3)' : 'transparent',
              border: `0.5px solid ${layoutMode === '2ND MONITOR' ? 'var(--b2)' : 'transparent'}`,
              borderRadius: 3,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: layoutMode === '2ND MONITOR' ? 'var(--t0)' : 'var(--t2)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              if (layoutMode !== '2ND MONITOR') {
                e.currentTarget.style.background = 'rgba(200,170,100,0.06)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = layoutMode === '2ND MONITOR' ? 'var(--bg3)' : 'transparent';
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Elapsed time */}
        <ElapsedTimer startedAt={startedAt} />
      </div>
    </div>
  );
}
