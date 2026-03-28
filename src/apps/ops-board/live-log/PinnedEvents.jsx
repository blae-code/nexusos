/**
 * PinnedEvents — sticky bar showing pinned critical events
 */
import React from 'react';
import { Pin } from 'lucide-react';

export default function PinnedEvents({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div style={{
      flexShrink: 0, marginBottom: 8, padding: '6px 10px',
      background: 'rgba(200,170,100,0.05)', border: '0.5px solid var(--b1)',
      borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--acc)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <Pin size={8} /> PINNED ({events.length})
      </div>
      {events.slice(-3).map((e, i) => (
        <div key={e.id || i} style={{ fontSize: 10, color: 'var(--t1)', lineHeight: 1.4, display: 'flex', gap: 6 }}>
          <span style={{ color: 'var(--t3)', fontWeight: 600, flexShrink: 0 }}>{e.callsign}</span>
          <span>{e.message}</span>
        </div>
      ))}
    </div>
  );
}