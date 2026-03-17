/**
 * Shared table style constants and column header primitives — Materials.
 * No closed-over variables — props only.
 */
import React from 'react';

// ─── Shared style constants ────────────────────────────────────────────────────

/** @type {import('react').CSSProperties} */
export const TH = {
  padding: '7px 12px',
  textAlign: 'left',
  color: 'var(--t2)',
  fontSize: 9,
  letterSpacing: '0.1em',
  fontWeight: 600,
  borderBottom: '0.5px solid var(--b1)',
  whiteSpace: 'nowrap',
  background: 'var(--bg2)',
};

/** @type {import('react').CSSProperties} */
export const TD = { padding: '6px 12px' };

// ─── T2 eligibility badge ─────────────────────────────────────────────────────

export function T2Badge({ t2_eligible }) {
  if (t2_eligible) {
    return (
      <span style={{
        fontSize: 9, fontWeight: 700,
        padding: '1px 6px', borderRadius: 10,
        border: '0.5px solid rgba(39,201,106,0.4)',
        background: 'rgba(39,201,106,0.1)',
        color: 'var(--live)', letterSpacing: '0.05em',
      }}>T2</span>
    );
  }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      padding: '1px 6px', borderRadius: 10,
      border: '0.5px solid rgba(232,160,32,0.4)',
      background: 'rgba(232,160,32,0.08)',
      color: 'var(--warn)', letterSpacing: '0.05em',
    }}>T1</span>
  );
}

// ─── Sort arrow indicator ─────────────────────────────────────────────────────

export function SortArrow({ active, dir }) {
  return (
    <span style={{ marginLeft: 3, fontSize: 8, color: active ? 'var(--t0)' : 'var(--t3)' }}>
      {active ? (dir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );
}

// ─── Sort column header ────────────────────────────────────────────────────────

export function SortableColHeader({ col, label, title, sortBy, sortDir, onToggle }) {
  const active = sortBy === col;
  return (
    <th
      onClick={() => onToggle(col)}
      title={title}
      style={{
        ...TH,
        cursor: 'pointer',
        color: active ? 'var(--t0)' : 'var(--t2)',
        userSelect: 'none',
      }}
    >
      {label}<SortArrow active={active} dir={sortDir} />
    </th>
  );
}

export function StaticColHeader({ label, title, right = false }) {
  if (right) {
    return <th title={title} style={{ ...TH, textAlign: 'right' }}>{label}</th>;
  }

  return <th title={title} style={TH}>{label}</th>;
}
