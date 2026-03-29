import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Sparkline from './Sparkline';

const SIGNAL_CONFIG = {
  STRONG_BUY:  { color: '#4AE830', bg: 'rgba(74,232,48,0.08)', icon: TrendingUp, label: 'STRONG BUY', desc: 'Price accelerating upward with strong momentum' },
  BUY:         { color: '#4A8C5C', bg: 'rgba(74,140,92,0.08)', icon: TrendingUp, label: 'BUY', desc: 'Upward trend confirmed by moving average crossover' },
  SELL:        { color: '#C8A84B', bg: 'rgba(200,168,75,0.08)', icon: TrendingDown, label: 'SELL', desc: 'Downward trend with MA crossing below baseline' },
  STRONG_SELL: { color: '#C0392B', bg: 'rgba(192,57,43,0.08)', icon: TrendingDown, label: 'STRONG SELL', desc: 'Price declining rapidly with strong downward momentum' },
};

export default function SignalsPanel({ signals, onSelect }) {
  if (!signals || signals.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--t3)', fontSize: 11 }}>
        No active trading signals — all commodities at HOLD
      </div>
    );
  }

  const buys = signals.filter(s => s.signal === 'STRONG_BUY' || s.signal === 'BUY');
  const sells = signals.filter(s => s.signal === 'STRONG_SELL' || s.signal === 'SELL');

  const renderGroup = (items, title) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(c => {
            const cfg = SIGNAL_CONFIG[c.signal] || SIGNAL_CONFIG.BUY;
            const Icon = cfg.icon;
            return (
              <div key={c.commodity_name} onClick={() => onSelect(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  background: cfg.bg, border: `0.5px solid ${cfg.color}22`,
                  borderLeft: `3px solid ${cfg.color}`,
                  cursor: 'pointer', transition: 'background 100ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}14`; }}
                onMouseLeave={e => { e.currentTarget.style.background = cfg.bg; }}
              >
                <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{c.commodity_name}</span>
                    <span style={{
                      padding: '2px 6px', borderRadius: 2, fontSize: 8, fontWeight: 700,
                      background: `${cfg.color}20`, color: cfg.color, letterSpacing: '0.06em',
                    }}>{cfg.label}</span>
                  </div>
                  <div style={{ color: 'var(--t2)', fontSize: 9, lineHeight: 1.4 }}>{cfg.desc}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <span style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 500 }}>
                    {c.current_sell?.toFixed(2)} aUEC
                  </span>
                  <span style={{ color: cfg.color, fontSize: 9 }}>
                    Trend strength: {c.trend_strength}%
                  </span>
                </div>

                <Sparkline data={c.sparkline || []} color={cfg.color} width={80} height={28} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>
        Active trading signals based on moving average crossovers, trend regression, and momentum analysis.
        Signals are algorithmic — not financial advice.
      </div>
      {renderGroup(buys, 'BUY SIGNALS')}
      {renderGroup(sells, 'SELL SIGNALS')}
    </div>
  );
}