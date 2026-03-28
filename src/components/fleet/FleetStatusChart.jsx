import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS = {
  AVAILABLE: 'var(--live)',
  ASSIGNED: 'var(--warn)',
  MAINTENANCE: '#FF6B35',
  DESTROYED: 'var(--danger)',
  ARCHIVED: 'var(--t3)',
};

const STATUS_LABELS = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  MAINTENANCE: 'Maintenance',
  DESTROYED: 'Destroyed',
  ARCHIVED: 'Archived',
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
      <span style={{ color: d.color, fontWeight: 600 }}>{d.label}</span>: {d.value} ships ({d.pct}%)
    </div>
  );
}

export default function FleetStatusChart({ ships }) {
  const total = ships.length;
  if (total === 0) return null;

  const counts = {};
  ships.forEach(s => { counts[s.status || 'AVAILABLE'] = (counts[s.status || 'AVAILABLE'] || 0) + 1; });

  const data = Object.entries(counts)
    .map(([status, value]) => ({
      status,
      label: STATUS_LABELS[status] || status,
      value,
      pct: Math.round((value / total) * 100),
      color: STATUS_COLORS[status] || 'var(--t3)',
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="nexus-card" style={{ padding: 16 }}>
      <div className="nexus-section-header">AVAILABILITY STATUS</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={54}
                dataKey="value"
                stroke="none"
                paddingAngle={2}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          {data.map(d => (
            <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--t1)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', fontVariantNumeric: 'tabular-nums' }}>
                {d.value}
              </span>
              <span style={{ fontSize: 9, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
                {d.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}