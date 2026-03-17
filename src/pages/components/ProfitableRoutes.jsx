import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

const ROUTE_EXAMPLES = [
  { from: 'New Babbage', to: 'Levski', profit: 45000, margin: '42%', volume: 850, risk: 'LOW' },
  { from: 'Port Olisar', to: 'Grim Hex', profit: 38500, margin: '38%', volume: 620, risk: 'MEDIUM' },
  { from: 'Area 18', to: 'Loreville', profit: 52000, margin: '48%', volume: 1200, risk: 'LOW' },
  { from: 'Klescher', to: 'Arccorp', profit: 28000, margin: '31%', volume: 450, risk: 'HIGH' },
  { from: 'Levski', to: 'New Babbage', profit: 41500, margin: '40%', volume: 920, risk: 'LOW' },
];

export default function ProfitableRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading profitable routes from historical data
    setTimeout(() => {
      setRoutes(ROUTE_EXAMPLES.sort((a, b) => b.profit - a.profit));
      setLoading(false);
    }, 500);
  }, []);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'LOW':
        return '#4A8C5C';
      case 'MEDIUM':
        return '#C8A84B';
      case 'HIGH':
        return '#C0392B';
      default:
        return 'var(--t2)';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg2)' }}>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={12} style={{ color: '#C0392B' }} />
          TOP PROFIT ROUTES (by recent activity)
        </div>
      </div>

      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {routes.map((route, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              borderBottom: '0.5px solid var(--b0)',
              background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr',
              gap: 16,
              alignItems: 'center',
            }}
          >
            {/* Route */}
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>
                {route.from} → {route.to}
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                {route.volume} SCU demand
              </div>
            </div>

            {/* Profit */}
            <div>
              <div style={{ color: '#C0392B', fontSize: 12, fontWeight: 700 }}>
                {route.profit.toLocaleString()} aUEC
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 9 }}>gross</div>
            </div>

            {/* Margin */}
            <div>
              <div style={{ color: '#C8A84B', fontSize: 12, fontWeight: 700 }}>
                {route.margin}
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 9 }}>margin</div>
            </div>

            {/* Risk */}
            <div>
              <div style={{ color: getRiskColor(route.risk), fontSize: 10, fontWeight: 600 }}>
                {route.risk}
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 9 }}>risk level</div>
            </div>

            {/* Action */}
            <div>
              <button
                style={{
                  padding: '6px 10px',
                  background: 'var(--bg2)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 4,
                  color: 'var(--t1)',
                  fontSize: 9,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                SELECT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}