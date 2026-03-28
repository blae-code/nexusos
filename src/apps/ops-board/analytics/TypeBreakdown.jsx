/**
 * TypeBreakdown — Op type distribution with mini bar + stats.
 */
import React from 'react';

const TYPE_COLORS = {
  ROCKBREAKER: '#C0392B',
  MINING: '#C8A84B',
  SALVAGE: '#7AAECC',
  PATROL: '#E04848',
  COMBAT: '#E04848',
  ESCORT: '#9A9488',
  CARGO: '#4A8C5C',
  RECON: '#9DA1CD',
  RESCUE: '#E8A020',
  S17: '#C0392B',
};

function fmtAuec(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function TypeBreakdown({ breakdown, totalOps }) {
  if (!breakdown || breakdown.length === 0) {
    return <div style={{ color: '#5A5850', fontSize: 11, padding: 20, textAlign: 'center' }}>No data</div>;
  }

  const maxCount = Math.max(...breakdown.map(b => b.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {breakdown.map(b => {
        const color = TYPE_COLORS[b.type] || '#5A5850';
        const pct = totalOps > 0 ? Math.round((b.count / totalOps) * 100) : 0;
        const barWidth = maxCount > 0 ? (b.count / maxCount) * 100 : 0;

        return (
          <div key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
              color, width: 90, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{b.type.replace(/_/g, ' ')}</span>
            <div style={{ flex: 1, height: 14, background: '#0A0908', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${barWidth}%`, height: '100%', background: color, opacity: 0.35,
                borderRadius: 1, transition: 'width 300ms ease',
              }} />
              <span style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488',
                fontVariantNumeric: 'tabular-nums',
              }}>{b.count} ops · {fmtAuec(b.revenue)} aUEC</span>
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
              width: 32, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
            }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}