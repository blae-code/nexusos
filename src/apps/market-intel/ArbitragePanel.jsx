import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';

function fmtPrice(v) {
  if (!v) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(2);
}

export default function ArbitragePanel({ arbitrage, onSelect }) {
  if (!arbitrage || arbitrage.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--t3)', fontSize: 11 }}>
        No arbitrage opportunities detected
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>
        Best buy-low-sell-high station pairs by margin. Profit per SCU shown for quick run comparison.
      </div>

      {arbitrage.map((c, i) => {
        const arb = c.arbitrage;
        const profitColor = arb.margin_pct > 20 ? '#4AE830' : arb.margin_pct > 10 ? '#4A8C5C' : '#C8A84B';

        return (
          <div key={c.commodity_name} onClick={() => onSelect(c)}
            style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'var(--bg1)', border: '0.5px solid var(--b1)',
              borderLeft: `3px solid ${profitColor}`,
              cursor: 'pointer', transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg1)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: `${profitColor}15`, color: profitColor,
                  fontSize: 10, fontWeight: 700,
                }}>{i + 1}</span>
                <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{c.commodity_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={11} style={{ color: profitColor }} />
                <span style={{ color: profitColor, fontSize: 14, fontWeight: 700 }}>
                  +{fmtPrice(arb.profit_per_scu)}/SCU
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em' }}>BUY AT</span>
                <span style={{ color: '#4AE830', fontWeight: 500 }}>{arb.buy_station || '—'}</span>
                <span style={{ color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(arb.buy_price)} aUEC</span>
              </div>

              <ArrowRight size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em' }}>SELL AT</span>
                <span style={{ color: '#C0392B', fontWeight: 500 }}>{arb.sell_station || '—'}</span>
                <span style={{ color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(arb.sell_price)} aUEC</span>
              </div>

              <div style={{
                padding: '6px 12px', borderRadius: 'var(--r-sm)',
                background: `${profitColor}12`, border: `0.5px solid ${profitColor}33`,
                textAlign: 'center',
              }}>
                <div style={{ color: 'var(--t3)', fontSize: 7, letterSpacing: '0.08em' }}>MARGIN</div>
                <div style={{ color: profitColor, fontSize: 14, fontWeight: 700 }}>{arb.margin_pct.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}