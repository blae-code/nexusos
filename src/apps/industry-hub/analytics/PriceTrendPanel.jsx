/**
 * PriceTrendPanel — displays price movement signals from PriceSnapshot data.
 * Highlights commodities with spikes, drops, and high-margin opportunities.
 */
import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from 'lucide-react';

const SIGNAL_CONFIG = {
  SPIKE:  { color: '#4A8C5C', bg: 'rgba(74,140,92,0.12)', label: 'PRICE SPIKE', icon: TrendingUp },
  DROP:   { color: '#C0392B', bg: 'rgba(192,57,43,0.12)', label: 'PRICE DROP', icon: TrendingDown },
  MARGIN: { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)', label: 'HIGH MARGIN', icon: Zap },
  STABLE: { color: '#5A5850', bg: 'rgba(200,170,100,0.06)', label: 'STABLE', icon: Minus },
};

export default function PriceTrendPanel({ priceSnapshots }) {
  const [filter, setFilter] = useState('all');

  const signals = useMemo(() => {
    const snaps = priceSnapshots || [];
    return snaps.map(snap => {
      const sellChange = snap.sell_change_pct || 0;
      const buyChange = snap.buy_change_pct || 0;
      const margin = snap.margin_pct || 0;

      let signal = 'STABLE';
      if (sellChange > 5 || buyChange > 5) signal = 'SPIKE';
      else if (sellChange < -5 || buyChange < -5) signal = 'DROP';
      else if (margin > 15) signal = 'MARGIN';

      return {
        commodity: snap.commodity_name || 'UNKNOWN',
        sellPrice: snap.curr_sell_avg || snap.best_sell_price || 0,
        buyPrice: snap.curr_buy_avg || snap.best_buy_price || 0,
        sellChange,
        buyChange,
        margin,
        bestSellStation: snap.best_sell_station || '',
        bestBuyStation: snap.best_buy_station || '',
        alertType: snap.alert_type || 'NONE',
        signal,
        snappedAt: snap.snapped_at,
      };
    }).sort((a, b) => {
      const order = { SPIKE: 0, DROP: 1, MARGIN: 2, STABLE: 3 };
      return (order[a.signal] ?? 9) - (order[b.signal] ?? 9);
    });
  }, [priceSnapshots]);

  const filtered = filter === 'all' ? signals : signals.filter(s => s.signal === filter.toUpperCase());
  const spikeCount = signals.filter(s => s.signal === 'SPIKE').length;
  const dropCount = signals.filter(s => s.signal === 'DROP').length;
  const marginCount = signals.filter(s => s.signal === 'MARGIN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SummaryChip label="SPIKES" value={spikeCount} color="#4A8C5C" />
        <SummaryChip label="DROPS" value={dropCount} color="#C0392B" />
        <SummaryChip label="HIGH MARGIN" value={marginCount} color="#C8A84B" />
        <SummaryChip label="TOTAL" value={signals.length} color="#9A9488" />
      </div>

      {/* Quick filters */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'ALL' },
          { id: 'spike', label: 'SPIKES ONLY' },
          { id: 'drop', label: 'DROPS ONLY' },
          { id: 'margin', label: 'HIGH MARGIN' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '3px 8px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              background: filter === f.id ? 'rgba(192,57,43,0.12)' : 'transparent',
              border: `0.5px solid ${filter === f.id ? '#C0392B' : 'rgba(200,170,100,0.10)'}`,
              color: filter === f.id ? '#E8E4DC' : '#5A5850',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 90px 90px 80px 80px 1.5fr 100px',
          padding: '8px 14px', background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <span>COMMODITY</span><span>SELL</span><span>BUY</span>
          <span>Δ SELL</span><span>MARGIN</span><span>BEST STATION</span><span>SIGNAL</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
            {signals.length === 0 ? 'No price snapshots recorded yet' : 'No signals match this filter'}
          </div>
        ) : filtered.map((s, i) => {
          const cfg = SIGNAL_CONFIG[s.signal];
          return (
            <div key={`${s.commodity}-${i}`} style={{
              display: 'grid', gridTemplateColumns: '2fr 90px 90px 80px 80px 1.5fr 100px',
              padding: '10px 14px', alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.06)',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#E8E4DC' }}>{s.commodity}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8A84B', fontVariantNumeric: 'tabular-nums' }}>
                {s.sellPrice > 0 ? `${Math.round(s.sellPrice)}` : '—'}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488', fontVariantNumeric: 'tabular-nums' }}>
                {s.buyPrice > 0 ? `${Math.round(s.buyPrice)}` : '—'}
              </span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontVariantNumeric: 'tabular-nums',
                color: s.sellChange > 0 ? '#4A8C5C' : s.sellChange < 0 ? '#C0392B' : '#5A5850',
              }}>
                {s.sellChange !== 0 ? `${s.sellChange > 0 ? '+' : ''}${s.sellChange.toFixed(1)}%` : '—'}
              </span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontVariantNumeric: 'tabular-nums',
                color: s.margin > 15 ? '#C8A84B' : '#5A5850',
              }}>
                {s.margin > 0 ? `${s.margin.toFixed(0)}%` : '—'}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.bestSellStation || '—'}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                color: cfg.color, background: cfg.bg, borderRadius: 2, padding: '2px 6px',
                border: `0.5px solid ${cfg.color}40`, letterSpacing: '0.08em',
              }}>
                <cfg.icon size={9} />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryChip({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
      background: '#0F0F0D', borderLeft: `2px solid ${color}`,
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}