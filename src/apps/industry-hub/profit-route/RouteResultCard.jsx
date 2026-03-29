/**
 * RouteResultCard — displays the computed profit route analysis.
 */
import React from 'react';
import { TrendingUp, TrendingDown, Clock, Activity, Zap, ArrowRight } from 'lucide-react';

const RISK_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B' };
const VOL_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B' };

function Stat({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#141410',
      border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, flex: 1, minWidth: 120,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {Icon && <Icon size={10} style={{ color: color || '#5A5850' }} />}
        <span style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#E8E4DC', fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: '#5A5850', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function RouteResultCard({ result }) {
  const r = result;
  const profitable = r.totalProfit > 0;

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: `2px solid ${profitable ? '#4A8C5C' : '#C0392B'}`,
      border: '0.5px solid rgba(200,170,100,0.12)',
      borderRadius: 2, overflow: 'hidden',
      animation: 'nexus-fade-in 200ms ease-out both',
    }}>
      {/* Route header */}
      <div style={{
        padding: '12px 16px', background: '#141410',
        borderBottom: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
            fontWeight: 700, color: '#E8E4DC', letterSpacing: '0.06em',
          }}>{r.commodity}</span>
          <span style={{ fontSize: 10, color: '#5A5850' }}>×{r.quantity} SCU</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9A9488' }}>
          <span>{r.buyLocation}</span>
          <ArrowRight size={12} style={{ color: '#C8A84B' }} />
          <span>{r.sellLocation}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Primary metrics */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Stat label="TOTAL PROFIT" value={`${fmt(r.totalProfit)} aUEC`}
            sub={`${r.profitPerScu.toFixed(2)} per SCU`}
            color={profitable ? '#4A8C5C' : '#C0392B'}
            icon={profitable ? TrendingUp : TrendingDown} />
          <Stat label="MARGIN" value={`${r.marginPct.toFixed(1)}%`}
            sub={`Investment: ${fmt(r.investment)}`}
            color={r.marginPct >= 10 ? '#4A8C5C' : r.marginPct >= 0 ? '#C8A84B' : '#C0392B'}
            icon={Activity} />
          <Stat label="PROFIT / MIN" value={`${fmt(r.profitPerMinute)}`}
            sub={`~${r.travelMinutes}min travel`}
            color="#3498DB" icon={Clock} />
          <Stat label="ROUTE SCORE" value={r.routeScore.toFixed(1)}
            sub="Risk-adjusted"
            color={r.routeScore >= 50 ? '#4A8C5C' : r.routeScore >= 10 ? '#C8A84B' : '#C0392B'}
            icon={Zap} />
        </div>

        {/* Risk & volatility strip */}
        <div style={{
          display: 'flex', gap: 10, padding: '10px 12px',
          background: '#0F0F0D', borderRadius: 2,
          border: '0.5px solid rgba(200,170,100,0.06)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 4 }}>PRICES</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span>Buy: <span style={{ color: '#3498DB', fontFamily: 'monospace' }}>{r.buyPrice.toFixed(2)}</span></span>
              <span>Sell: <span style={{ color: '#4A8C5C', fontFamily: 'monospace' }}>{r.sellPrice.toFixed(2)}</span></span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 4 }}>TRAVEL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11 }}>{r.jumpCount} jump{r.jumpCount !== 1 ? 's' : ''}</span>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 2,
                color: RISK_COLORS[r.riskLevel] || '#5A5850',
                background: `${RISK_COLORS[r.riskLevel] || '#5A5850'}18`,
                border: `0.5px solid ${RISK_COLORS[r.riskLevel] || '#5A5850'}40`,
              }}>{r.riskLevel} RISK</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 4 }}>VOLATILITY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 2,
                color: VOL_COLORS[r.volatilityRating] || '#5A5850',
                background: `${VOL_COLORS[r.volatilityRating] || '#5A5850'}18`,
                border: `0.5px solid ${VOL_COLORS[r.volatilityRating] || '#5A5850'}40`,
              }}>{r.volatilityRating}</span>
              <span style={{ fontSize: 10, color: '#5A5850' }}>
                {r.trend === 'UP' ? '↑' : r.trend === 'DOWN' ? '↓' : '→'} {r.trend}
              </span>
              {r.sellChange !== 0 && (
                <span style={{ fontSize: 9, color: r.sellChange > 0 ? '#4A8C5C' : '#C0392B' }}>
                  sell {r.sellChange > 0 ? '+' : ''}{r.sellChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Best stations hint */}
        {(r.bestBuyStation || r.bestSellStation) && (
          <div style={{ fontSize: 9, color: '#5A5850', padding: '4px 0' }}>
            {r.bestBuyStation && <span>Best buy: <span style={{ color: '#3498DB' }}>{r.bestBuyStation}</span></span>}
            {r.bestBuyStation && r.bestSellStation && <span> · </span>}
            {r.bestSellStation && <span>Best sell: <span style={{ color: '#4A8C5C' }}>{r.bestSellStation}</span></span>}
          </div>
        )}
      </div>
    </div>
  );
}