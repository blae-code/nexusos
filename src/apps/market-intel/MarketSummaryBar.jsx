import React from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3 } from 'lucide-react';

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={11} style={{ color }} />
      <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ color, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function MarketSummaryBar({ summary }) {
  if (!summary) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      padding: '10px 16px', background: 'var(--bg1)',
      borderBottom: '0.5px solid var(--b1)', flexShrink: 0,
    }}>
      <Stat icon={BarChart3} label="TRACKED" value={summary.total_commodities} color="var(--t0)" />
      <Stat icon={TrendingUp} label="TRENDING UP" value={summary.trending_up} color="#4AE830" />
      <Stat icon={TrendingDown} label="TRENDING DOWN" value={summary.trending_down} color="#C0392B" />
      <Stat icon={Activity} label="HIGH VOLATILITY" value={summary.high_volatility} color="#C8A84B" />
      <Stat icon={Zap} label="ACTIVE SIGNALS" value={summary.strong_signals} color="#5D9CEC" />
      <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginLeft: 'auto' }}>
        30-DAY WINDOW
      </span>
    </div>
  );
}