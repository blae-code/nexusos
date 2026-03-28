/**
 * RefineryTimingAdvisor — analyses historical refinery throughput vs market prices
 * to recommend optimal batch timing windows and refinery method selection.
 */
import React, { useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function fmt(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

const METHOD_COLORS = {
  DINYX_SOLVATION: '#4A8C5C',
  FERRON_EXCHANGE: '#C8A84B',
  PYROMETRIC_CHROMALYSIS: '#9A9488',
};

export default function RefineryTimingAdvisor({ refineryOrders, priceSnapshots, cofferLogs, materials }) {

  const analysis = useMemo(() => {
    const orders = refineryOrders || [];
    const snapshots = priceSnapshots || [];
    const logs = cofferLogs || [];

    // 1. Refinery throughput by material
    const throughput = {};
    for (const ro of orders) {
      const name = (ro.material_name || '').toUpperCase();
      if (!name) continue;
      if (!throughput[name]) throughput[name] = { total_scu: 0, batches: 0, methods: {}, avg_yield: 0, yields: [] };
      throughput[name].total_scu += ro.quantity_scu || 0;
      throughput[name].batches += 1;
      throughput[name].methods[ro.method || 'UNKNOWN'] = (throughput[name].methods[ro.method || 'UNKNOWN'] || 0) + 1;
      const y = ro.expected_yield_ratio || (ro.yield_pct ? ro.yield_pct / 100 : null);
      if (y) throughput[name].yields.push(y);
    }
    for (const t of Object.values(throughput)) {
      t.avg_yield = t.yields.length > 0 ? t.yields.reduce((a, b) => a + b, 0) / t.yields.length : 0;
    }

    // 2. Price trend per material from snapshots
    const priceTrend = {};
    for (const snap of snapshots) {
      const name = (snap.commodity_name || '').toUpperCase();
      if (!name) continue;
      if (!priceTrend[name]) priceTrend[name] = { latest_sell: 0, best_sell_station: '', sell_change_pct: 0, margin_pct: 0 };
      priceTrend[name].latest_sell = snap.curr_sell_avg || snap.best_sell_price || 0;
      priceTrend[name].best_sell_station = snap.best_sell_station || '';
      priceTrend[name].sell_change_pct = snap.sell_change_pct || 0;
      priceTrend[name].margin_pct = snap.margin_pct || 0;
    }

    // 3. Recent sale revenue from coffer logs (last 30 entries)
    const recentSales = logs
      .filter(l => l.entry_type === 'SALE' || l.entry_type === 'CRAFT_SALE')
      .slice(0, 30);
    const saleByCommodity = {};
    for (const sale of recentSales) {
      const name = (sale.commodity || '').toUpperCase();
      if (!name) continue;
      if (!saleByCommodity[name]) saleByCommodity[name] = { revenue: 0, scu: 0, count: 0 };
      saleByCommodity[name].revenue += sale.amount_aUEC || 0;
      saleByCommodity[name].scu += sale.quantity_scu || 0;
      saleByCommodity[name].count += 1;
    }

    // 4. Build recommendations
    const allMats = new Set([...Object.keys(throughput), ...Object.keys(priceTrend), ...Object.keys(saleByCommodity)]);
    const recommendations = [];

    for (const mat of allMats) {
      const tp = throughput[mat];
      const pt = priceTrend[mat];
      const sc = saleByCommodity[mat];

      // Determine best method
      let bestMethod = null;
      if (tp?.methods) {
        bestMethod = Object.entries(tp.methods).sort((a, b) => b[1] - a[1])[0]?.[0];
      }

      const sellPrice = pt?.latest_sell || 0;
      const priceDirection = (pt?.sell_change_pct || 0) > 2 ? 'UP' : (pt?.sell_change_pct || 0) < -2 ? 'DOWN' : 'STABLE';
      const avgYield = tp?.avg_yield || 0;
      const estProfit = sellPrice * avgYield * (tp?.total_scu || 0) / Math.max(1, tp?.batches || 1);

      // Timing advice
      let timing = 'NORMAL';
      let advice = 'Standard processing — no urgency.';
      if (priceDirection === 'UP' && sellPrice > 0) {
        timing = 'RUSH';
        advice = `Prices rising (+${(pt?.sell_change_pct || 0).toFixed(1)}%) — refine and sell soon to capture upswing.`;
      } else if (priceDirection === 'DOWN' && sellPrice > 0) {
        timing = 'HOLD';
        advice = `Prices declining (${(pt?.sell_change_pct || 0).toFixed(1)}%) — consider delaying sales or stockpiling.`;
      } else if (pt?.margin_pct > 15) {
        timing = 'RUSH';
        advice = `High margin route available (${pt.margin_pct.toFixed(0)}%) — process and sell at ${pt.best_sell_station || 'best station'}.`;
      }

      recommendations.push({
        material: mat,
        batches: tp?.batches || 0,
        totalScu: tp?.total_scu || 0,
        avgYield: avgYield,
        bestMethod,
        sellPrice,
        priceChange: pt?.sell_change_pct || 0,
        priceDirection,
        bestStation: pt?.best_sell_station || '',
        marginPct: pt?.margin_pct || 0,
        recentRevenue: sc?.revenue || 0,
        estProfitPerBatch: estProfit,
        timing,
        advice,
      });
    }

    recommendations.sort((a, b) => {
      const timingOrder = { RUSH: 0, HOLD: 1, NORMAL: 2 };
      return (timingOrder[a.timing] ?? 9) - (timingOrder[b.timing] ?? 9) || b.estProfitPerBatch - a.estProfitPerBatch;
    });

    // Build chart data — top 8 by est profit
    const chartData = recommendations
      .filter(r => r.estProfitPerBatch > 0)
      .slice(0, 8)
      .map(r => ({
        name: r.material.length > 12 ? r.material.slice(0, 12) + '…' : r.material,
        profit: Math.round(r.estProfitPerBatch),
        timing: r.timing,
      }));

    return { recommendations, chartData };
  }, [refineryOrders, priceSnapshots, cofferLogs, materials]);

  const rushCount = analysis.recommendations.filter(r => r.timing === 'RUSH').length;
  const holdCount = analysis.recommendations.filter(r => r.timing === 'HOLD').length;

  const TIMING_CONFIG = {
    RUSH:   { color: '#4A8C5C', bg: 'rgba(74,140,92,0.12)', label: 'RUSH — SELL NOW' },
    HOLD:   { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)', label: 'HOLD — WAIT' },
    NORMAL: { color: '#9A9488', bg: 'rgba(200,170,100,0.06)', label: 'NORMAL' },
  };

  const CHART_COLORS = { RUSH: '#4A8C5C', HOLD: '#C8A84B', NORMAL: '#5A5850' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SummaryChip icon={Zap} label="RUSH" value={rushCount} color="#4A8C5C" />
        <SummaryChip icon={Clock} label="HOLD" value={holdCount} color="#C8A84B" />
        <SummaryChip icon={Minus} label="NORMAL" value={analysis.recommendations.length - rushCount - holdCount} color="#9A9488" />
      </div>

      {/* Profit chart */}
      {analysis.chartData.length > 0 && (
        <div style={{
          background: '#0F0F0D', borderLeft: '2px solid #C0392B',
          border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 10, color: '#C8A84B', letterSpacing: '0.22em', marginBottom: 12,
          }}>EST. PROFIT PER BATCH (aUEC)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analysis.chartData} margin={{ left: 10, right: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={50} />
              <Tooltip
                contentStyle={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2, fontSize: 11 }}
                labelStyle={{ color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif" }}
                formatter={(val) => [`${fmt(val)} aUEC`, 'Est Profit']}
              />
              <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                {analysis.chartData.map((entry, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[entry.timing] || '#5A5850'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations table */}
      <div style={{
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 70px 70px 90px 100px 90px 120px',
          padding: '8px 14px', background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <span>MATERIAL</span><span>BATCHES</span><span>YIELD</span>
          <span>SELL PRICE</span><span>TREND</span><span>ACTION</span><span>ADVICE</span>
        </div>

        {analysis.recommendations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
            No refinery or price data available to analyze
          </div>
        ) : analysis.recommendations.map(r => {
          const tc = TIMING_CONFIG[r.timing];
          const TrendIcon = r.priceDirection === 'UP' ? TrendingUp : r.priceDirection === 'DOWN' ? TrendingDown : Minus;
          const trendColor = r.priceDirection === 'UP' ? '#4A8C5C' : r.priceDirection === 'DOWN' ? '#C0392B' : '#5A5850';
          return (
            <div key={r.material} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 70px 70px 90px 100px 90px 120px',
              padding: '10px 14px', alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.06)',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title={r.advice}>
              <div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#E8E4DC' }}>{r.material}</span>
                {r.bestMethod && (
                  <div style={{ fontSize: 9, color: METHOD_COLORS[r.bestMethod] || '#5A5850', fontWeight: 600, marginTop: 1 }}>
                    {r.bestMethod?.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488', fontVariantNumeric: 'tabular-nums' }}>{r.batches}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488', fontVariantNumeric: 'tabular-nums' }}>{r.avgYield > 0 ? `${Math.round(r.avgYield * 100)}%` : '—'}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: r.sellPrice > 0 ? '#C8A84B' : '#5A5850', fontVariantNumeric: 'tabular-nums' }}>
                {r.sellPrice > 0 ? `${fmt(r.sellPrice)} aUEC` : '—'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendIcon size={10} style={{ color: trendColor }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: trendColor, fontVariantNumeric: 'tabular-nums' }}>
                  {r.priceChange !== 0 ? `${r.priceChange > 0 ? '+' : ''}${r.priceChange.toFixed(1)}%` : 'STABLE'}
                </span>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                color: tc.color, background: tc.bg, borderRadius: 2, padding: '2px 6px',
                border: `0.5px solid ${tc.color}40`, letterSpacing: '0.06em',
              }}>{r.timing}</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.advice.split('—')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryChip({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
      background: '#0F0F0D', borderLeft: `2px solid ${color}`,
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
    }}>
      <Icon size={13} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}