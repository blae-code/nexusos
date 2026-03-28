import React, { useMemo } from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, Activity, Zap, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine, CartesianGrid } from 'recharts';

function fmtPrice(v) {
  if (!v) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(2);
}

const TOOLTIP_STYLE = {
  background: 'var(--bg4)', border: '0.5px solid var(--b3)', borderRadius: 3,
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: 'var(--t0)', padding: '8px 12px',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {fmtPrice(p.value)}</div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--r-sm)',
      background: `${color}0A`, borderLeft: `2px solid ${color}`, flex: 1, minWidth: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {Icon && <Icon size={10} style={{ color }} />}
        <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--t2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function CommodityDetailPanel({ commodity, onBack }) {
  const c = commodity;
  const history = c.history || [];
  const predictions = c.predictions || [];

  const chartData = useMemo(() => {
    const data = history.map(h => ({
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sell: h.sell,
      buy: h.buy,
    }));
    // Add predictions
    predictions.forEach((p, i) => {
      data.push({
        date: `+${i + 1}d`,
        predicted: p,
      });
    });
    return data;
  }, [history, predictions]);

  const trendColor = c.trend_direction === 'UP' ? '#4AE830' : c.trend_direction === 'DOWN' ? '#C0392B' : 'var(--t2)';
  const TrendIcon = c.trend_direction === 'UP' ? TrendingUp : c.trend_direction === 'DOWN' ? TrendingDown : Activity;

  return (
    <div className="nexus-fade-in" style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{
          background: 'var(--bg2)', border: '0.5px solid var(--b1)',
          borderRadius: 'var(--r-sm)', padding: '5px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'var(--t2)', fontSize: 10,
        }}>
          <ChevronLeft size={11} /> BACK
        </button>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700 }}>{c.commodity_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span style={{ color: trendColor, fontSize: 10, fontWeight: 600 }}>{c.trend_direction}</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>{c.data_points} data points</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>R² = {c.trend_r2}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard icon={Target} label="SELL PRICE" value={fmtPrice(c.current_sell)} sub="Current avg" color="var(--t0)" />
        <StatCard icon={TrendIcon} label="MOMENTUM" value={`${c.momentum > 0 ? '+' : ''}${c.momentum.toFixed(1)}%`} sub="Short-term MA velocity" color={trendColor} />
        <StatCard icon={Activity} label="VOLATILITY" value={`${c.volatility.toFixed(1)}%`} sub={c.volatility_rating} color={c.volatility_rating === 'HIGH' ? '#C0392B' : '#C8A84B'} />
        <StatCard icon={Zap} label="ARBITRAGE" value={`+${fmtPrice(c.arbitrage?.profit_per_scu)}/SCU`} sub={c.arbitrage?.margin_pct ? `${c.arbitrage.margin_pct.toFixed(1)}% margin` : '—'} color="#4AE830" />
      </div>

      {/* Price chart */}
      <div style={{
        background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 'var(--r-md)',
        padding: '14px', minHeight: 260,
      }}>
        <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.12em', marginBottom: 10 }}>
          PRICE HISTORY + 7-DAY FORECAST
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sellGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9DA1CD" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#9DA1CD" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.06)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--t3)', fontSize: 8 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--t3)', fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => fmtPrice(v)} />
            <Tooltip content={<CustomTooltip />} />
            {c.ma7_current > 0 && <ReferenceLine y={c.ma7_current} stroke="#C8A84B" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'MA7', position: 'right', fill: '#C8A84B', fontSize: 8 }} />}
            {c.ma14_current > 0 && <ReferenceLine y={c.ma14_current} stroke="#5D9CEC" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'MA14', position: 'right', fill: '#5D9CEC', fontSize: 8 }} />}
            <Area type="monotone" dataKey="sell" stroke={trendColor} fill="url(#sellGrad)" strokeWidth={2} name="Sell" dot={false} />
            <Area type="monotone" dataKey="buy" stroke="#5D9CEC" fill="none" strokeWidth={1} strokeDasharray="3 3" name="Buy" dot={false} />
            <Area type="monotone" dataKey="predicted" stroke="#9DA1CD" fill="url(#predGrad)" strokeWidth={2} strokeDasharray="5 3" name="Predicted" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Change periods */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: '1 DAY', value: c.change_1d },
          { label: '7 DAYS', value: c.change_7d },
          { label: '30 DAYS', value: c.change_30d },
        ].map(p => {
          const color = p.value > 0 ? '#4AE830' : p.value < 0 ? '#C0392B' : 'var(--t3)';
          return (
            <div key={p.label} style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'var(--bg1)', border: '0.5px solid var(--b1)' }}>
              <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em' }}>{p.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                {p.value > 0 ? '+' : ''}{p.value?.toFixed(1) ?? '—'}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Arbitrage detail */}
      {c.arbitrage?.profit_per_scu > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 'var(--r-md)',
          background: 'rgba(74,232,48,0.04)', border: '0.5px solid rgba(74,232,48,0.15)',
          borderLeft: '3px solid #4AE830',
        }}>
          <div style={{ fontSize: 8, color: '#4AE830', letterSpacing: '0.12em', marginBottom: 6 }}>ARBITRAGE OPPORTUNITY</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 10 }}>
            <div>
              <span style={{ color: 'var(--t3)' }}>Buy: </span>
              <span style={{ color: 'var(--t0)', fontWeight: 500 }}>{c.arbitrage.buy_station}</span>
              <span style={{ color: 'var(--t2)' }}> @ {fmtPrice(c.arbitrage.buy_price)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--t3)' }}>Sell: </span>
              <span style={{ color: 'var(--t0)', fontWeight: 500 }}>{c.arbitrage.sell_station}</span>
              <span style={{ color: 'var(--t2)' }}> @ {fmtPrice(c.arbitrage.sell_price)}</span>
            </div>
            <div>
              <span style={{ color: '#4AE830', fontWeight: 700 }}>+{fmtPrice(c.arbitrage.profit_per_scu)}/SCU</span>
              <span style={{ color: 'var(--t2)' }}> ({c.arbitrage.margin_pct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Predictions */}
      {predictions.length > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 'var(--r-md)',
          background: 'rgba(157,161,205,0.04)', border: '0.5px solid rgba(157,161,205,0.15)',
        }}>
          <div style={{ fontSize: 8, color: '#9DA1CD', letterSpacing: '0.12em', marginBottom: 8 }}>
            7-DAY PRICE FORECAST (LINEAR REGRESSION)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {predictions.map((p, i) => {
              const diff = p - (c.current_sell || 0);
              const color = diff > 0 ? '#4AE830' : diff < 0 ? '#C0392B' : 'var(--t2)';
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg2)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ fontSize: 7, color: 'var(--t3)' }}>+{i + 1}d</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(p)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 6, textAlign: 'center' }}>
            R² confidence: {(c.trend_r2 * 100).toFixed(0)}% — higher = more reliable prediction
          </div>
        </div>
      )}
    </div>
  );
}