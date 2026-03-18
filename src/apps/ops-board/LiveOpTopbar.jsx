/**
 * LiveOpTopbar — dedicated topbar for live op view
 * Props: { op, isLive, phases, currentPhase, startedAt, layoutMode, onLayoutChange }
 */
import React, { useState, useEffect } from 'react';
import { Monitor, Maximize2 } from 'lucide-react';

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

export default function LiveOpTopbar({ op, isLive, phases, currentPhase, startedAt, layoutMode, onLayoutChange }) {
  const phaseLabel = (Array.isArray(phases) ? phases[currentPhase] : null) || 'Awaiting phase';

  return (
    <div
      style={{
        height: 44,
        background: 'linear-gradient(180deg, #0F0E0C 0%, #0A0908 100%)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 12,
      }}
    >
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

      {/* Right: Phase pill, layout toggle, elapsed time */}
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
                e.currentTarget.style.background = 'rgba(var(--bg3-rgb), 0.5)';
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
                e.currentTarget.style.background = 'rgba(var(--bg3-rgb), 0.5)';
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