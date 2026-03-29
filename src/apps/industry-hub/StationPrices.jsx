import React, { useState } from 'react';

export default function StationPrices({ priceData }) {
  const [sortBy, setSortBy] = useState('sell');

  if (!priceData?.prices || priceData.prices.length === 0) {
    return null;
  }

  const sortedPrices = [...priceData.prices].sort((a, b) => {
    const aVal = sortBy === 'buy' ? a.price_buy : a.price_sell;
    const bVal = sortBy === 'buy' ? b.price_buy : b.price_sell;
    return (aVal || 0) - (bVal || 0);
  });

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '0.5px solid var(--b1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>
          STATION PRICES
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            color: 'var(--t1)',
            fontSize: 10,
            padding: '4px 8px',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <option value="sell">Sort by Sell Price</option>
          <option value="buy">Sort by Buy Price</option>
        </select>
      </div>

      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
        {sortedPrices.slice(0, 15).map((price, idx) => (
          <div
            key={idx}
            style={{
              padding: '8px 16px',
              borderBottom: '0.5px solid var(--b0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10,
            }}
          >
            <div style={{ color: 'var(--t1)' }}>{price.station || 'Unknown'}</div>
            <div style={{ display: 'flex', gap: 16, color: 'var(--t2)' }}>
              {price.price_buy && (
                <span>
                  Buy:{' '}
                  <span style={{ color: 'var(--live)', fontWeight: 600 }}>
                    {Math.round(price.price_buy)}
                  </span>
                </span>
              )}
              {price.price_sell && (
                <span>
                  Sell:{' '}
                  <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
                    {Math.round(price.price_sell)}
                  </span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}