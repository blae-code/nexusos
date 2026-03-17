/**
 * Shared dialog overlay/card/header primitives — Blueprints.
 * No closed-over variables — props only.
 */
import React from 'react';
import { X } from 'lucide-react';

// ─── Dialog overlay — position:absolute, scoped to positioned container ───────
// Shell-scoped overlay pattern only. No position:fixed.
export function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(var(--bg0-rgb), 0.86)', zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      {children}
    </div>
  );
}

export function DialogCard({ children, width = 480 }) {
  return (
    <div
      className="nexus-fade-in"
      style={{
        width, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 10, padding: 24, maxHeight: '85vh', overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>{title}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}
