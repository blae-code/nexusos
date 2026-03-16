/**
 * Shared atoms and utilities for Op Board sub-components.
 * Import from here rather than duplicating across files.
 */
import React, { useState, useEffect } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = new Date(isoStr) - Date.now();
  if (diff < 0) {
    const past = Math.abs(diff);
    const h = Math.floor(past / 3600000);
    const m = Math.floor((past % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ${m}m ago`;
    return `${m}m ago`;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return <span style={{ color: 'var(--warn)' }}>in {m}m</span>;
}

export function utcString(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toUTCString().replace(':00 GMT', ' UTC');
}

export function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, val]) => ({
    name,
    capacity: typeof val === 'number' ? val : (val?.capacity || 1),
  }));
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

export function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

export function TypeTag({ type }) {
  return (
    <span style={{
      fontSize: 9, padding: '1px 6px', borderRadius: 4,
      border: '0.5px solid var(--b2)', background: 'var(--bg3)',
      color: 'var(--t2)', letterSpacing: '0.06em', flexShrink: 0,
    }}>{type}</span>
  );
}

export function ElapsedTimer({ startedAt }) {
  const [secs, setSecs] = useState(() =>
    startedAt ? Math.floor((Date.now() - new Date(startedAt)) / 1000) : 0
  );

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() =>
      setSecs(Math.floor((Date.now() - new Date(startedAt)) / 1000)), 1000
    );
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const str = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--live)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>
      {str}
    </span>
  );
}

export function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,8,11,0.86)', zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      {children}
    </div>
  );
}

export function DialogCard({ children, width = 420 }) {
  return (
    <div className="nexus-fade-in" style={{
      width, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
      borderRadius: 10, padding: 24, maxHeight: '80vh', overflowY: 'auto',
    }}>
      {children}
    </div>
  );
}
