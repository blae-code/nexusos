/**
 * RevenueTrendChart — Bar chart of revenue per completed op (most recent 20).
 */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function fmtAuec(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

const CustomTooltip = ({ active = false, payload = [] } = {}) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#141410', border: '0.5px solid rgba(200,170,100,0.15)',
      borderRadius: 2, padding: '8px 12px', fontSize: 10, lineHeight: 1.6,
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      <div style={{ color: '#E8E4DC', fontWeight: 600 }}>{d.name}</div>
      <div style={{ color: '#4A8C5C' }}>Revenue: {fmtAuec(d.revenue)} aUEC</div>
      <div style={{ color: '#E04848' }}>Expenses: {fmtAuec(d.expenses)} aUEC</div>
      <div style={{ color: '#C8A84B' }}>Net: {fmtAuec(d.netProfit)} aUEC</div>
    </div>
  );
};

export default function RevenueTrendChart({ ops }) {
  const chartData = [...ops].reverse().slice(-20).map(o => ({
    name: o.name.length > 14 ? o.name.slice(0, 14) + '…' : o.name,
    fullName: o.name,
    revenue: o.revenue,
    expenses: o.expenses,
    netProfit: o.netProfit,
  }));

  if (chartData.length === 0) {
    return <div style={{ color: '#5A5850', fontSize: 11, padding: 20, textAlign: 'center' }}>No revenue data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.06)" />
        <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={{ stroke: 'rgba(200,170,100,0.08)' }} tickLine={false} />
        <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtAuec} width={45} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,170,100,0.04)' }} />
        <Bar dataKey="revenue" fill="#4A8C5C" radius={[2, 2, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" fill="#E04848" radius={[2, 2, 0, 0]} maxBarSize={28} opacity={0.6} />
      </BarChart>
    </ResponsiveContainer>
  );
}
