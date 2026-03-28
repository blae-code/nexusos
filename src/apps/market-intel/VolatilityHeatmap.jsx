import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';

function volColor(v) {
  if (v > 20) return { bg: 'rgba(192,57,43,0.20)', text: '#C0392B' };
  if (v > 10) return { bg: 'rgba(200,168,75,0.18)', text: '#C8A84B' };
  if (v > 5) return { bg: 'rgba(93,156,236,0.14)', text: '#5D9CEC' };
  return { bg: 'rgba(74,140,92,0.10)', text: '#4A8C5C' };
}

export default function VolatilityHeatmap({ commodities, onSelect }) {
  const sorted = useMemo(() =>
    [...commodities].sort((a, b) => b.volatility - a.volatility),
  [commodities]);

  if (sorted.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--t3)', fontSize: 11 }}>
        No volatility data available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>
        Commodities ranked by price volatility (coefficient of variation). Higher volatility = more price movement = more opportunity and risk.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {sorted.map(c => {
          const vc = volColor(c.volatility);
          return (
            <div key={c.commodity_name} onClick={() => onSelect(c)}
              style={{
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: vc.bg, border: `0.5px solid ${vc.text}22`,
                cursor: 'pointer', transition: 'transform 100ms, box-shadow 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${vc.text}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.commodity_name}
                </span>
                <Activity size={10} style={{ color: vc.text, flexShrink: 0 }} />
              </div>

              {/* Volatility bar */}
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.2)', marginBottom: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, c.volatility * 3)}%`,
                  height: '100%', borderRadius: 2,
                  background: vc.text, transition: 'width 400ms ease',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                <span style={{ color: vc.text, fontWeight: 700 }}>{c.volatility.toFixed(1)}% vol</span>
                <span style={{ color: 'var(--t2)' }}>{c.volatility_rating}</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 9, color: 'var(--t2)' }}>
                <span>Sell: {c.current_sell?.toFixed(2) || '—'}</span>
                <span style={{ color: c.change_7d > 0 ? '#4AE830' : c.change_7d < 0 ? '#C0392B' : 'var(--t3)' }}>
                  7d: {c.change_7d > 0 ? '+' : ''}{c.change_7d?.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}