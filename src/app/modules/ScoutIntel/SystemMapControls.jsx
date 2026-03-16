/**
 * SystemMapControls — Chip and IconBtn helpers used by SystemMap toolbar.
 */
import React from 'react';

export function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px', fontSize: 9, letterSpacing: '0.07em',
        borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
        border: active ? '0.5px solid var(--b3)' : '0.5px solid var(--b1)',
        background: active ? 'var(--bg4)' : 'var(--bg2)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
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
