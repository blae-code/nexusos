/**
 * LootEfficiencyChart — SCU per crew member per op (efficiency metric).
 */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active = false, payload = [] } = {}) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#141410', border: '0.5px solid rgba(200,170,100,0.15)',
      borderRadius: 2, padding: '8px 12px', fontSize: 10, lineHeight: 1.6,
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      <div style={{ color: '#E8E4DC', fontWeight: 600 }}>{d.fullName}</div>
      <div style={{ color: '#C8A84B' }}>SCU/Crew: {d.efficiency.toFixed(1)}</div>
      <div style={{ color: '#9A9488' }}>Total: {d.loot} SCU · {d.crew} crew</div>
    </div>
  );
};

export default function LootEfficiencyChart({ ops }) {
  const chartData = [...ops]
    .filter(o => o.crewCount > 0 && o.totalLootSCU > 0)
    .reverse()
    .slice(-20)
    .map(o => ({
      name: o.name.length > 14 ? o.name.slice(0, 14) + '…' : o.name,
      fullName: o.name,
      efficiency: o.totalLootSCU / o.crewCount,
      loot: o.totalLootSCU,
      crew: o.crewCount,
    }));

  if (chartData.length === 0) {
    return <div style={{ color: '#5A5850', fontSize: 11, padding: 20, textAlign: 'center' }}>No loot data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.06)" />
        <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={{ stroke: 'rgba(200,170,100,0.08)' }} tickLine={false} />
        <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,170,100,0.04)' }} />
        <Bar dataKey="efficiency" fill="#C8A84B" radius={[2, 2, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
