/**
 * DurationCrewChart — Combined bar chart showing op duration + crew size.
 */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

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
      <div style={{ color: '#7AAECC' }}>Duration: {d.duration ?? '—'}m</div>
      <div style={{ color: '#C8A84B' }}>Crew: {d.crew}</div>
      <div style={{ color: '#9A9488' }}>Loot: {d.loot} SCU</div>
    </div>
  );
};

export default function DurationCrewChart({ ops }) {
  const chartData = [...ops].reverse().slice(-20).map(o => ({
    name: o.name.length > 14 ? o.name.slice(0, 14) + '…' : o.name,
    fullName: o.name,
    duration: o.durationMin,
    crew: o.crewCount,
    loot: o.totalLootSCU,
  }));

  if (chartData.length === 0) {
    return <div style={{ color: '#5A5850', fontSize: 11, padding: 20, textAlign: 'center' }}>No completed ops with timing data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.06)" />
        <XAxis dataKey="name" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={{ stroke: 'rgba(200,170,100,0.08)' }} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#5A5850', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,170,100,0.04)' }} />
        <Legend
          wrapperStyle={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", color: '#5A5850' }}
          formatter={(value) => <span style={{ color: '#9A9488', fontSize: 9 }}>{value}</span>}
        />
        <Bar yAxisId="left" dataKey="duration" name="Duration (min)" fill="#7AAECC" radius={[2, 2, 0, 0]} maxBarSize={24} />
        <Bar yAxisId="right" dataKey="crew" name="Crew Size" fill="#C8A84B" radius={[2, 2, 0, 0]} maxBarSize={24} opacity={0.7} />
      </BarChart>
    </ResponsiveContainer>
  );
}
