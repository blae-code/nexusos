import React from 'react';
import { Wrench } from 'lucide-react';

export default function ProductionThroughputCard({ craftQueue, blueprints, onNavigate }) {
  const queue = craftQueue || [];
  const open = queue.filter(c => c.status === 'OPEN').length;
  const claimed = queue.filter(c => c.status === 'CLAIMED').length;
  const inProgress = queue.filter(c => c.status === 'IN_PROGRESS').length;
  const completed = queue.filter(c => c.status === 'COMPLETE').length;
  const activeTotal = open + claimed + inProgress;
  const totalValue = queue
    .filter(c => c.status === 'COMPLETE')
    .reduce((s, c) => s + (c.aUEC_value_est || 0), 0);

  const segments = [
    { label: 'OPEN', count: open, color: '#9A9488' },
    { label: 'CLAIMED', count: claimed, color: '#C8A84B' },
    { label: 'IN PROGRESS', count: inProgress, color: '#C0392B' },
    { label: 'COMPLETE', count: completed, color: '#4A8C5C' },
  ];
  const total = Math.max(1, open + claimed + inProgress + completed);

  return (
    <div
      className="nexus-card-clickable"
      onClick={onNavigate}
      style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '20px 22px', cursor: 'pointer',
        transition: 'border-color 150ms, transform 150ms, background 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Wrench size={14} style={{ color: '#C0392B' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
          color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>PRODUCTION THROUGHPUT</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 36, color: '#E8E4DC', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{activeTotal}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
          fontSize: 13, color: '#9A9488', textTransform: 'uppercase',
        }}>IN QUEUE</span>
      </div>

      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5A5850', marginBottom: 14 }}>
        {completed} completed · {totalValue > 0 ? `${(totalValue / 1000).toFixed(0)}K aUEC produced` : 'no output value yet'}
      </div>

      {/* Stacked bar */}
      <div style={{ height: 6, background: 'rgba(200,170,100,0.06)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        {segments.filter(s => s.count > 0).map(s => (
          <div key={s.label} style={{
            height: '100%',
            width: `${(s.count / total) * 100}%`,
            background: s.color,
            transition: 'width 0.6s ease-out',
          }} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
              letterSpacing: '0.06em',
            }}>{s.label} {s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}