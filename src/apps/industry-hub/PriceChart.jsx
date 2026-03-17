import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PriceChart({ priceData }) {
  if (!priceData?.prices || priceData.prices.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg1)',
          border: '0.5px solid var(--b1)',
          borderRadius: 6,
          padding: '12px 16px',
          color: 'var(--t2)',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        No price history available
      </div>
    );
  }

  // Prepare chart data from station prices
  const chartData = priceData.prices
    .slice(0, 30)
    .map((price, idx) => ({
      name: price.station?.toUpperCase() || `Station ${idx}`,
      buy: price.price_buy || 0,
      sell: price.price_sell || 0,
    }));

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        padding: '12px 16px',
        flex: 1,
      }}
    >
      <div
        style={{
          color: 'var(--t2)',
          fontSize: 10,
          letterSpacing: '0.1em',
          marginBottom: 12,
          fontWeight: 600,
        }}
      >
        PRICE TREND
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.1)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: 'var(--t2)' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 9, fill: 'var(--t2)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--b1)',
              borderRadius: 4,
            }}
            labelStyle={{ color: 'var(--t0)' }}
            formatter={(value) => Math.round(value)}
          />
          <Line
            type="monotone"
            dataKey="buy"
            stroke="var(--live)"
            strokeWidth={2}
            dot={false}
            name="Buy Price"
          />
          <Line
            type="monotone"
            dataKey="sell"
            stroke="var(--warn)"
            strokeWidth={2}
            dot={false}
            name="Sell Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}