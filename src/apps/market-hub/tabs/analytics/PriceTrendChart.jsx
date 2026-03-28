/**
 * PriceTrendChart — Displays price history for a selected commodity using PriceSnapshot data.
 */
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import moment from 'moment';

const TOOLTIP_STYLE = {
  background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
  borderRadius: 2, color: '#E8E4DC', fontSize: 11,
};

export default function PriceTrendChart({ snapshots, commodityName }) {
  const data = useMemo(() => {
    if (!commodityName) return [];
    return snapshots
      .filter(s => (s.commodity_name || '').toUpperCase() === commodityName.toUpperCase())
      .sort((a, b) => new Date(a.snapped_at || a.created_date) - new Date(b.snapped_at || b.created_date))
      .map(s => ({
        date: moment(s.snapped_at || s.created_date).format('MMM D HH:mm'),
        buy: s.curr_buy_avg || s.best_buy_price || 0,
        sell: s.curr_sell_avg || s.best_sell_price || 0,
        margin: s.margin_pct || 0,
      }));
  }, [snapshots, commodityName]);

  if (!commodityName) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 10, letterSpacing: '0.1em' }}>
        SELECT A COMMODITY TO VIEW PRICE TRENDS
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5A5850', fontSize: 10, letterSpacing: '0.1em' }}>
        NO SNAPSHOT HISTORY FOR {commodityName.toUpperCase()}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: '#E8E4DC', fontWeight: 600 }}>{commodityName.toUpperCase()}</span>
        <span style={{ fontSize: 9 }}>— {data.length} snapshots</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(200,170,100,0.06)" />
          <XAxis dataKey="date" tick={{ fill: '#5A5850', fontSize: 8 }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fill: '#5A5850', fontSize: 9 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10, color: '#9A9488' }} />
          <Line type="monotone" dataKey="buy" name="Buy Avg" stroke="#C8A84B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="sell" name="Sell Avg" stroke="#4A8C5C" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}