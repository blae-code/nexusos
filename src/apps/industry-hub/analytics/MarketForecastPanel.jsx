/**
 * MarketForecastPanel — Price trend analysis with momentum signals.
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

const SIGNAL_META = {
  STRONG_BUY:  { label: 'STRONG BUY',  color: '#4AE830', bg: 'rgba(74,232,48,0.10)', border: 'rgba(74,232,48,0.25)' },
  BUY:         { label: 'BUY',         color: '#4AE830', bg: 'rgba(74,232,48,0.06)', border: 'rgba(74,232,48,0.15)' },
  HOLD:        { label: 'HOLD',        color: '#C8A84B', bg: 'rgba(200,168,75,0.06)', border: 'rgba(200,168,75,0.15)' },
  SELL:        { label: 'SELL',        color: '#C0392B', bg: 'rgba(192,57,43,0.06)', border: 'rgba(192,57,43,0.15)' },
  STRONG_SELL: { label: 'STRONG SELL', color: '#C0392B', bg: 'rgba(192,57,43,0.10)', border: 'rgba(192,57,43,0.25)' },
};

function SignalBadge({ signal }) {
  const meta = SIGNAL_META[signal] || SIGNAL_META.HOLD;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 3, fontSize: 8, fontWeight: 700,
      letterSpacing: '0.06em',
      color: meta.color, background: meta.bg, border: `0.5px solid ${meta.border}`,
    }}>
      {meta.label}
    </span>
  );
}

function TrendArrow({ slope }) {
  if (slope > 0.01) return <TrendingUp size={12} style={{ color: '#4AE830' }} />;
  if (slope < -0.01) return <TrendingDown size={12} style={{ color: '#C0392B' }} />;
  return <Minus size={12} style={{ color: 'var(--t3)' }} />;
}

function ConfidenceBar({ pct }) {
  return (
    <div style={{ width: 40, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%',
        background: pct > 60 ? '#4AE830' : pct > 30 ? '#C8A84B' : 'var(--t3)',
      }} />
    </div>
  );
}

export default function MarketForecastPanel({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>
        No price snapshot data available yet. The price tracker needs historical snapshots to generate forecasts.
      </div>
    );
  }

  const strongSignals = data.filter(f => f.signal === 'STRONG_BUY' || f.signal === 'STRONG_SELL');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Alert banner for strong signals */}
      {strongSignals.length > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 4,
          background: 'rgba(200,168,75,0.08)', border: '0.5px solid rgba(200,168,75,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10, color: '#C8A84B', fontWeight: 600 }}>
            {strongSignals.length} strong signal{strongSignals.length !== 1 ? 's' : ''} detected
          </span>
          <span style={{ fontSize: 9, color: 'var(--t2)' }}>
            {strongSignals.map(f => f.commodity).join(', ')}
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 0.7fr 0.8fr 0.8fr 0.8fr 0.6fr 0.5fr 0.8fr',
          gap: 6, padding: '8px 12px',
          background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)',
          fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em', fontWeight: 600,
        }}>
          <div>COMMODITY</div>
          <div style={{ textAlign: 'center' }}>SIGNAL</div>
          <div style={{ textAlign: 'right' }}>CURRENT SELL</div>
          <div style={{ textAlign: 'right' }}>24H FORECAST</div>
          <div style={{ textAlign: 'right' }}>TREND</div>
          <div style={{ textAlign: 'center' }}>CONF.</div>
          <div style={{ textAlign: 'right' }}>VOL.</div>
          <div style={{ textAlign: 'right' }}>AVG PROFIT</div>
        </div>

        {data.map(f => {
          const sellDelta = f.sell_forecast_24h - f.current_sell;
          const deltaPct = f.current_sell > 0 ? (sellDelta / f.current_sell) * 100 : 0;
          return (
            <div key={f.commodity} style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 0.7fr 0.8fr 0.8fr 0.8fr 0.6fr 0.5fr 0.8fr',
              gap: 6, padding: '7px 12px', alignItems: 'center',
              borderBottom: '0.5px solid var(--b0)', fontSize: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendArrow slope={f.sell_trend_slope} />
                <span style={{ color: 'var(--t0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.commodity}
                </span>
                <span style={{ color: 'var(--t3)', fontSize: 8 }}>{f.data_points}pts</span>
              </div>

              <div style={{ textAlign: 'center' }}><SignalBadge signal={f.signal} /></div>

              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--t1)', fontSize: 10 }}>
                {fmt(f.current_sell)}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--t1)', fontSize: 10 }}>{fmt(f.sell_forecast_24h)}</span>
                <span style={{
                  marginLeft: 4, fontSize: 8,
                  color: deltaPct > 0 ? '#4AE830' : deltaPct < 0 ? '#C0392B' : 'var(--t3)',
                }}>
                  {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                </span>
              </div>

              <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 9, color: f.sell_trend_slope > 0 ? '#4AE830' : f.sell_trend_slope < 0 ? '#C0392B' : 'var(--t3)' }}>
                {f.sell_trend_slope > 0 ? '+' : ''}{f.sell_trend_slope}/h
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                <ConfidenceBar pct={f.trend_confidence} />
                <span style={{ fontSize: 8, color: 'var(--t3)' }}>{f.trend_confidence}%</span>
              </div>

              <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 9, color: 'var(--t2)' }}>
                {f.trade_volume_scu > 0 ? `${fmt(f.trade_volume_scu)}` : '—'}
              </div>

              <div style={{
                textAlign: 'right', fontFamily: 'monospace', fontSize: 9,
                color: f.avg_trade_profit > 0 ? '#4AE830' : f.avg_trade_profit < 0 ? '#C0392B' : 'var(--t3)',
              }}>
                {f.avg_trade_profit !== 0 ? `${f.avg_trade_profit > 0 ? '+' : ''}${fmt(f.avg_trade_profit)}` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}