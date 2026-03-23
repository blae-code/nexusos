import React from 'react';

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Math.round(Number(n)).toLocaleString();
}

function valueFrom(item, keys) {
  for (const key of keys) {
    if (item?.[key] != null && item[key] !== '') return item[key];
  }
  return null;
}

export default function MarketPricesTab({ commodities = [], loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      </div>
    );
  }

  const rows = Array.isArray(commodities) ? commodities : [];

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.1em' }}>
        MARKET PRICES
      </div>

      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['COMMODITY', 'CATEGORY', 'BUY AVG', 'SELL AVG', 'BUY BEST', 'SELL BEST'].map((label) => (
                <th
                  key={label}
                  style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)', whiteSpace: 'nowrap' }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No commodity market data available.
                </td>
              </tr>
            ) : rows.map((item, index) => (
              <tr key={item.id || item.id_commodity || item.name || index} style={{ borderBottom: '0.5px solid var(--b0)', background: index % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <td style={{ padding: '9px 12px', color: 'var(--t0)', fontWeight: 600 }}>{item.name || 'Unknown Commodity'}</td>
                <td style={{ padding: '9px 12px', color: 'var(--t2)' }}>{item.kind || item.category || item.section || '—'}</td>
                <td style={{ padding: '9px 12px', color: '#4AE830', fontFamily: 'monospace' }}>{fmt(valueFrom(item, ['price_buy_avg', 'buy_avg', 'price_buy']))}</td>
                <td style={{ padding: '9px 12px', color: '#C8A84B', fontFamily: 'monospace' }}>{fmt(valueFrom(item, ['price_sell_avg', 'sell_avg', 'price_sell']))}</td>
                <td style={{ padding: '9px 12px', color: 'var(--t1)', fontFamily: 'monospace' }}>{fmt(valueFrom(item, ['price_buy_min', 'buy_min', 'best_buy']))}</td>
                <td style={{ padding: '9px 12px', color: 'var(--t1)', fontFamily: 'monospace' }}>{fmt(valueFrom(item, ['price_sell_max', 'sell_max', 'best_sell']))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
