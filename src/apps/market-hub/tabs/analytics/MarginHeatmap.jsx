/**
 * MarginHeatmap — Visualizes margin % changes over time from PriceSnapshot data.
 * Shows which commodities have improving or declining margins.
 */
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const TOOLTIP_STYLE = {
  background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
  borderRadius: 2, color: '#E8E4DC', fontSize: 11,
};

export default function MarginHeatmap({ snapshots }) {
  const data = useMemo(() => {
    // Get the latest snapshot for each commodity and show margin + change
    const latest = {};
    (snapshots || []).forEach(s => {
      const name = s.commodity_name;
      if (!name) return;
      const existing = latest[name];
      const ts = new Date(s.snapped_at || s.created_date).getTime();
      if (!existing || ts > existing.ts) {
        latest[name] = {
          ts,
          name,
          margin: s.margin_pct || 0,
          sellChange: s.sell_change_pct || 0,
          buyChange: s.buy_change_pct || 0,
          alert: s.alert_type || 'NONE',
        };
      }
    });
    return Object.values(latest)
      .filter(d => d.margin > 0)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 20);
  }, [snapshots]);

  if (data.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 10, letterSpacing: '0.1em' }}>
        NO MARGIN DATA FROM SNAPSHOTS
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 24 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid stroke="rgba(200,170,100,0.06)" />
          <XAxis type="number" tick={{ fill: '#5A5850', fontSize: 9 }} unit="%" />
          <YAxis type="category" dataKey="name" tick={{ fill: '#9A9488', fontSize: 9 }} width={80} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
          />
          <Bar dataKey="margin" name="Margin %" radius={[0, 2, 2, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.margin > 30 ? '#4A8C5C' : entry.margin > 15 ? '#C8A84B' : '#5A5850'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}