import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const CLASS_COLORS = {
  FIGHTER: '#7AAECC',
  HEAVY_FIGHTER: '#5A8CAA',
  MINER: '#C8A84B',
  HAULER: '#2edb7a',
  SALVAGER: '#FF6B35',
  MEDICAL: '#E87D7D',
  EXPLORER: '#B888E0',
  GROUND_VEHICLE: '#7A9470',
  OTHER: '#5A5850',
};

const CLASS_LABELS = {
  FIGHTER: 'Fighter',
  HEAVY_FIGHTER: 'Heavy Ftr',
  MINER: 'Miner',
  HAULER: 'Hauler',
  SALVAGER: 'Salvager',
  MEDICAL: 'Medical',
  EXPLORER: 'Explorer',
  GROUND_VEHICLE: 'Ground',
  OTHER: 'Other',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg3)', border: '0.5px solid var(--b2)',
      borderRadius: 'var(--r-md)', padding: '6px 10px',
      fontSize: 10, color: 'var(--t0)',
    }}>
      <span style={{ color: d.color, fontWeight: 600 }}>{d.fullLabel}</span>: {d.count} ships
      <br />
      <span style={{ color: 'var(--t2)' }}>Cargo: {d.totalCargo.toLocaleString()} SCU</span>
    </div>
  );
}

export default function FleetClassBreakdown({ ships }) {
  if (ships.length === 0) return null;

  const counts = {};
  ships.forEach(s => {
    const cls = s.class || 'OTHER';
    if (!counts[cls]) counts[cls] = { count: 0, totalCargo: 0 };
    counts[cls].count++;
    counts[cls].totalCargo += s.cargo_scu || 0;
  });

  const data = Object.entries(counts)
    .map(([cls, v]) => ({
      cls,
      label: CLASS_LABELS[cls] || cls,
      fullLabel: cls.replace(/_/g, ' '),
      count: v.count,
      totalCargo: v.totalCargo,
      color: CLASS_COLORS[cls] || 'var(--t3)',
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="nexus-card" style={{ padding: 16 }}>
      <div className="nexus-section-header">SHIP CLASS BREAKDOWN</div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={72}
              tick={{ fill: 'var(--t2)', fontSize: 9, letterSpacing: '0.05em' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={14}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}