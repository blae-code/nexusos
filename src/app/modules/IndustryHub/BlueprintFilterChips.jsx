/**
 * Small UI atoms shared across Blueprints sub-components.
 * No closed-over variables — props only.
 */
import React from 'react';

// ─── Small UI atoms ───────────────────────────────────────────────────────────

export function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 9px', fontSize: 9, letterSpacing: '0.08em',
        borderRadius: 5, border: `0.5px solid ${active ? 'var(--b3)' : 'var(--b1)'}`,
        background: active ? 'var(--bg4)' : 'var(--bg2)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
      }}
    >{label}</button>
  );
}

export function TierBadge({ tier }) {
  const isT2 = tier === 'T2';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
      border: `0.5px solid ${isT2 ? 'var(--live-b)' : 'var(--b2)'}`,
      background: isT2 ? 'var(--live-bg)' : 'var(--bg3)',
      color: isT2 ? 'var(--live)' : 'var(--t2)',
      letterSpacing: '0.05em',
    }}>{tier || 'T1'}</span>
  );
}

export function CategoryTag({ category }) {
  return (
    <span className="nexus-tag" style={{ letterSpacing: '0.06em' }}>{category}</span>
  );
}

export function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}
