/**
 * FleetReadinessBar — visual segmented bar showing fleet status distribution.
 */
import React, { useMemo } from 'react';

const STATUS_COLORS = {
  AVAILABLE: '#4A8C5C',
  ASSIGNED: '#C8A84B',
  MAINTENANCE: '#FF6B35',
  DESTROYED: '#E04848',
};

export default function FleetReadinessBar({ ships }) {
  const segments = useMemo(() => {
    const total = ships.length;
    if (total === 0) return [];
    const counts = {};
    ships.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED']
      .filter(s => counts[s])
      .map(s => ({
        status: s,
        count: counts[s],
        pct: (counts[s] / total) * 100,
        color: STATUS_COLORS[s] || '#5A5850',
      }));
  }, [ships]);

  if (segments.length === 0) return null;

  return (
    <div style={{
      padding: '6px 16px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      background: '#0A0908', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>FLEET READINESS</span>
        <div style={{ flex: 1 }} />
        {segments.map(s => (
          <span key={s.status} style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
            color: s.color, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 1, background: s.color, flexShrink: 0, opacity: 0.7 }} />
            {s.status} {s.count} ({Math.round(s.pct)}%)
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', height: 6, borderRadius: 1, overflow: 'hidden', gap: 1 }}>
        {segments.map(s => (
          <div key={s.status} style={{
            width: `${s.pct}%`, height: '100%', background: s.color, opacity: 0.6,
            transition: 'width 300ms ease',
          }} />
        ))}
      </div>
    </div>
  );
}