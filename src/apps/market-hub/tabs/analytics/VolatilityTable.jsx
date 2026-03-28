/**
 * VolatilityTable — Shows commodities with the biggest recent price swings.
 * Useful for identifying arbitrage or risk-avoiding opportunities.
 */
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function VolatilityTable({ snapshots }) {
  const volatile = useMemo(() => {
    // Group snapshots by commodity and compute volatility metrics
    const groups = {};
    (snapshots || []).forEach(s => {
      const name = s.commodity_name;
      if (!name) return;
      if (!groups[name]) groups[name] = [];
      groups[name].push(s);
    });

    return Object.entries(groups)
      .map(([name, snaps]) => {
        const sorted = snaps.sort((a, b) =>
          new Date(a.snapped_at || a.created_date) - new Date(b.snapped_at || b.created_date)
        );
        const latest = sorted[sorted.length - 1];
        const sellPrices = sorted.map(s => s.curr_sell_avg || s.best_sell_price || 0).filter(v => v > 0);
        if (sellPrices.length < 2) return null;

        const min = Math.min(...sellPrices);
        const max = Math.max(...sellPrices);
        const avg = sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length;
        const volatility = avg > 0 ? ((max - min) / avg * 100) : 0;

        return {
          name,
          volatility,
          sellChange: latest.sell_change_pct || 0,
          buyChange: latest.buy_change_pct || 0,
          alert: latest.alert_type || 'NONE',
          snapCount: sorted.length,
          currentSell: latest.curr_sell_avg || latest.best_sell_price || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 15);
  }, [snapshots]);

  if (volatile.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 10, letterSpacing: '0.1em' }}>
        INSUFFICIENT SNAPSHOT DATA FOR VOLATILITY ANALYSIS
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.8fr 0.6fr',
        padding: '8px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
        letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>
        <span>COMMODITY</span><span>VOLATILITY</span><span>SELL Δ</span><span>BUY Δ</span><span>SIGNAL</span>
      </div>
      {volatile.map(v => {
        const volColor = v.volatility > 30 ? '#C0392B' : v.volatility > 15 ? '#C8A84B' : '#4A8C5C';
        return (
          <div key={v.name} style={{
            display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.8fr 0.6fr',
            padding: '8px 12px', alignItems: 'center',
            borderBottom: '0.5px solid rgba(200,170,100,0.04)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#E8E4DC' }}>
              {v.name}
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: volColor }}>
              {v.volatility.toFixed(1)}%
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              color: v.sellChange > 0 ? '#4A8C5C' : v.sellChange < 0 ? '#C0392B' : '#5A5850',
            }}>
              {v.sellChange > 0 ? <TrendingUp size={10} /> : v.sellChange < 0 ? <TrendingDown size={10} /> : null}
              {v.sellChange > 0 ? '+' : ''}{v.sellChange.toFixed(1)}%
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              color: v.buyChange > 0 ? '#C0392B' : v.buyChange < 0 ? '#4A8C5C' : '#5A5850',
            }}>
              {v.buyChange > 0 ? <TrendingUp size={10} /> : v.buyChange < 0 ? <TrendingDown size={10} /> : null}
              {v.buyChange > 0 ? '+' : ''}{v.buyChange.toFixed(1)}%
            </span>
            <span>
              {v.alert === 'SPIKE' && <AlertTriangle size={12} style={{ color: '#C0392B' }} />}
              {v.alert === 'DROP' && <TrendingDown size={12} style={{ color: '#C8A84B' }} />}
              {v.alert === 'NONE' && <span style={{ color: '#5A5850', fontSize: 9 }}>—</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}