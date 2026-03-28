/**
 * CofferTrendAnalysis — visualises revenue and expense trends from coffer logs.
 * Shows weekly income/expense breakdown, top earners, and profit trend line.
 */
import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const POSITIVE = ['SALE', 'CRAFT_SALE', 'OP_SPLIT', 'DEPOSIT', 'TREASURY_DEPOSIT'];

function fmt(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function weekKey(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `W${String(week).padStart(2, '0')}`;
}

export default function CofferTrendAnalysis({ cofferLogs }) {
  const analysis = useMemo(() => {
    const logs = (cofferLogs || []).filter(l => l.logged_at);

    // Weekly aggregation
    const weekMap = {};
    let totalIncome = 0;
    let totalExpense = 0;
    const commodityRevenue = {};

    for (const log of logs) {
      const wk = weekKey(log.logged_at);
      if (!weekMap[wk]) weekMap[wk] = { income: 0, expense: 0, net: 0 };

      const isPositive = POSITIVE.includes(log.entry_type);
      const amount = Math.abs(log.amount_aUEC || 0);

      if (isPositive) {
        weekMap[wk].income += amount;
        totalIncome += amount;
      } else {
        weekMap[wk].expense += amount;
        totalExpense += amount;
      }

      // Track commodity sales
      if ((log.entry_type === 'SALE' || log.entry_type === 'CRAFT_SALE') && log.commodity) {
        const c = log.commodity.toUpperCase();
        commodityRevenue[c] = (commodityRevenue[c] || 0) + amount;
      }
    }

    for (const w of Object.values(weekMap)) {
      w.net = w.income - w.expense;
    }

    // Sorted chart data
    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, data]) => ({ week: wk, ...data }));

    // Running balance
    let running = 0;
    const balanceLine = weeks.map(w => {
      running += w.net;
      return { week: w.week, balance: running };
    });

    // Top commodities
    const topCommodities = Object.entries(commodityRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, revenue]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, revenue }));

    // Profit trend
    const recentWeeks = weeks.slice(-4);
    const olderWeeks = weeks.slice(-8, -4);
    const recentAvg = recentWeeks.length > 0 ? recentWeeks.reduce((s, w) => s + w.net, 0) / recentWeeks.length : 0;
    const olderAvg = olderWeeks.length > 0 ? olderWeeks.reduce((s, w) => s + w.net, 0) / olderWeeks.length : 0;
    const trendDirection = recentAvg > olderAvg * 1.1 ? 'UP' : recentAvg < olderAvg * 0.9 ? 'DOWN' : 'FLAT';

    return {
      weeks, balanceLine, topCommodities,
      totalIncome, totalExpense, netProfit: totalIncome - totalExpense,
      trendDirection, recentAvg,
    };
  }, [cofferLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100 }}>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard label="TOTAL INCOME" value={`${fmt(analysis.totalIncome)} aUEC`} color="#4A8C5C" />
        <KpiCard label="TOTAL EXPENSE" value={`${fmt(analysis.totalExpense)} aUEC`} color="#C0392B" />
        <KpiCard label="NET PROFIT" value={`${fmt(analysis.netProfit)} aUEC`} color={analysis.netProfit >= 0 ? '#4A8C5C' : '#C0392B'} />
        <KpiCard label="TREND" value={analysis.trendDirection} color={analysis.trendDirection === 'UP' ? '#4A8C5C' : analysis.trendDirection === 'DOWN' ? '#C0392B' : '#C8A84B'} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Weekly Income/Expense */}
        {analysis.weeks.length > 0 && (
          <div style={{
            background: '#0F0F0D', borderLeft: '2px solid #C0392B',
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
            padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 10, color: '#C8A84B', letterSpacing: '0.22em', marginBottom: 12,
            }}>WEEKLY INCOME VS EXPENSE</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={analysis.weeks} margin={{ left: 0, right: 0, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={50} />
                <Tooltip
                  contentStyle={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2, fontSize: 10 }}
                  formatter={(val, name) => [`${fmt(val)} aUEC`, name === 'income' ? 'Income' : 'Expense']}
                />
                <Area type="monotone" dataKey="income" stroke="#4A8C5C" fill="rgba(74,140,92,0.2)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="expense" stroke="#C0392B" fill="rgba(192,57,43,0.15)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top revenue commodities */}
        {analysis.topCommodities.length > 0 && (
          <div style={{
            background: '#0F0F0D', borderLeft: '2px solid #C0392B',
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
            padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 10, color: '#C8A84B', letterSpacing: '0.22em', marginBottom: 12,
            }}>TOP REVENUE COMMODITIES</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analysis.topCommodities} margin={{ left: 0, right: 0, bottom: 0 }} layout="vertical">
                <XAxis type="number" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9A9488', fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2, fontSize: 10 }}
                  formatter={(val) => [`${fmt(val)} aUEC`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#C8A84B" radius={[0, 2, 2, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Balance trend */}
      {analysis.balanceLine.length > 0 && (
        <div style={{
          background: '#0F0F0D', borderLeft: '2px solid #C0392B',
          border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 10, color: '#C8A84B', letterSpacing: '0.22em', marginBottom: 12,
          }}>CUMULATIVE BALANCE</div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={analysis.balanceLine} margin={{ left: 0, right: 0, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={50} />
              <Tooltip
                contentStyle={{ background: '#141410', border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2, fontSize: 10 }}
                formatter={(val) => [`${fmt(val)} aUEC`, 'Balance']}
              />
              <Area type="monotone" dataKey="balance" stroke="#C8A84B" fill="rgba(200,168,75,0.12)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {(cofferLogs || []).length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
          No coffer logs recorded yet — log sales and expenses to see trends
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 16px',
      background: '#0F0F0D', borderLeft: `2px solid ${color}`,
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, minWidth: 130,
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}