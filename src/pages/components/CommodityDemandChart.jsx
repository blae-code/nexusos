import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const DEMAND_DATA = [
  { name: 'Medical Supplies', demand: 8500, trend: 'up' },
  { name: 'Food Rations', demand: 7200, trend: 'up' },
  { name: 'Ammunition', demand: 6800, trend: 'stable' },
  { name: 'Consumer Goods', demand: 5400, trend: 'down' },
  { name: 'Rare Minerals', demand: 9200, trend: 'up' },
  { name: 'Electronics', demand: 6100, trend: 'stable' },
  { name: 'Fuel', demand: 7900, trend: 'up' },
  { name: 'Water', demand: 4300, trend: 'down' },
];

const PRICE_TREND = [
  { hour: '12am', medical: 150, minerals: 340, fuel: 85 },
  { hour: '4am', medical: 155, minerals: 345, fuel: 88 },
  { hour: '8am', medical: 160, minerals: 350, fuel: 90 },
  { hour: '12pm', medical: 165, minerals: 355, fuel: 92 },
  { hour: '4pm', medical: 170, minerals: 360, fuel: 95 },
  { hour: '8pm', medical: 175, minerals: 365, fuel: 98 },
  { hour: '11pm', medical: 172, minerals: 362, fuel: 96 },
];

export default function CommodityDemandChart() {
  const [chartType, setChartType] = useState('demand');

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>
          COMMODITY TRENDS
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['demand', 'prices'].map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              style={{
                padding: '4px 8px',
                background: chartType === type ? 'var(--bg3)' : 'transparent',
                border: `0.5px solid ${chartType === type ? 'var(--b2)' : 'var(--b0)'}`,
                borderRadius: 3,
                color: chartType === type ? 'var(--t0)' : 'var(--t2)',
                fontSize: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {type === 'demand' ? 'Demand' : 'Prices'}
            </button>
          ))}
        </div>
      </div>

      {chartType === 'demand' ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={DEMAND_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--t2)' }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--t2)' }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg2)',
                border: '0.5px solid var(--b1)',
                borderRadius: 4,
              }}
              labelStyle={{ color: 'var(--t0)' }}
            />
            <Bar dataKey="demand" fill="#C0392B" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={PRICE_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,170,100,0.1)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--t2)' }} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--t2)' }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg2)',
                border: '0.5px solid var(--b1)',
                borderRadius: 4,
              }}
              labelStyle={{ color: 'var(--t0)' }}
            />
            <Line type="monotone" dataKey="medical" stroke="#C0392B" strokeWidth={2} dot={false} name="Medical" />
            <Line type="monotone" dataKey="minerals" stroke="#C8A84B" strokeWidth={2} dot={false} name="Minerals" />
            <Line type="monotone" dataKey="fuel" stroke="#4A8C5C" strokeWidth={2} dot={false} name="Fuel" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {chartType === 'demand' && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {DEMAND_DATA.slice(0, 4).map((item) => (
            <div key={item.name} style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 4 }}>
              <div style={{ color: 'var(--t2)', fontSize: 8, marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: item.trend === 'up' ? '#C0392B' : item.trend === 'down' ? '#C8A84B' : 'var(--t1)' }}>
                {item.demand.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}