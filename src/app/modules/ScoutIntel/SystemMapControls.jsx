/**
 * SystemMapControls — Chip and IconBtn helpers used by SystemMap toolbar.
 */
import React from 'react';

const SYSTEM_ACTIVE_BORDER = {
  STANTON: 'var(--info)',
  PYRO:    'var(--danger)',
  NYX:     'var(--acc2)',
};

export function Chip({ label, active, onClick, systemChip }) {
  const systemKey = systemChip && label ? label.toUpperCase() : null;
  const activeBorder = systemKey && SYSTEM_ACTIVE_BORDER[systemKey]
    ? SYSTEM_ACTIVE_BORDER[systemKey]
    : 'var(--acc)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--bg2)'; }}
      style={{
        padding: '4px 10px', fontSize: 10, letterSpacing: '0.07em',
        borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
        border: active ? `0.5px solid ${activeBorder}` : '0.5px solid var(--b1)',
        background: active ? `color-mix(in srgb, ${activeBorder} 8%, transparent)` : 'var(--bg2)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  );
}

export function IconBtn({ icon: Icon, active, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
        border: active ? '0.5px solid var(--b3)' : '0.5px solid var(--b1)',
        background: active ? 'var(--bg4)' : 'var(--bg2)',
        color: active ? 'var(--warn)' : 'var(--t2)',
      }}
    >
      <Icon size={11} />
    </button>
  );
}