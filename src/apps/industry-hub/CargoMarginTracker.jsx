import React, { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Package } from 'lucide-react';

const COMMON_SHIPS = [
  'Caterpillar', 'Hull C', 'Hull B', 'Freelancer MAX', 'Cutlass Black',
  'Constellation Taurus', 'RAFT', 'Hercules C2', 'MSR', 'Carrack',
];

const COMMON_DESTINATIONS = [
  'Port Olisar', 'Grim Hex', 'Lorville', 'Area18', 'New Babbage',
  'Pyro Gateway', 'Ruin Station', 'Checkmate Station', 'TDD Lorville', 'TDD Area18',
];

const EMPTY_ROW = {
  id: null,
  ship: '',
  commodity: '',
  quantity_scu: '',
  buy_price: '',
  sell_price: '',
  destination: '',
};

function calcRow(row) {
  const qty = parseFloat(row.quantity_scu) || 0;
  const buy = parseFloat(row.buy_price) || 0;
  const sell = parseFloat(row.sell_price) || 0;
  const cost = qty * buy;
  const revenue = qty * sell;
  const profit = revenue - cost;
  const margin = cost > 0 ? ((profit / cost) * 100) : 0;
  return { cost, revenue, profit, margin };
}

export default function CargoMarginTracker() {
  const [rows, setRows] = useState([{ ...EMPTY_ROW, id: Date.now() }]);

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW, id: Date.now() }]);

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const updateRow = (id, field, value) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const totals = rows.reduce(
    (acc, row) => {
      const c = calcRow(row);
      return { cost: acc.cost + c.cost, revenue: acc.revenue + c.revenue, profit: acc.profit + c.profit };
    },
    { cost: 0, revenue: 0, profit: 0 }
  );

  const totalMargin = totals.cost > 0 ? ((totals.profit / totals.cost) * 100) : 0;

  const fmt = (n) => n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const inputStyle = {
    width: '100%',
    padding: '7px 9px',
    background: 'var(--bg2)',
    border: '0.5px solid var(--b1)',
    borderRadius: 3,
    color: 'var(--t0)',
    fontSize: 11,
    fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { label: 'TOTAL COST', value: fmt(totals.cost), color: 'var(--t1)' },
          { label: 'TOTAL REVENUE', value: fmt(totals.revenue), color: '#C8A84B' },
          { label: 'NET PROFIT', value: fmt(totals.profit), color: totals.profit >= 0 ? '#4AE830' : '#C0392B' },
          { label: 'MARGIN', value: `${totalMargin.toFixed(1)}%`, color: totalMargin >= 0 ? '#5297FF' : '#C0392B' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '12px 14px',
            background: 'var(--bg1)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '130px 130px 90px 100px 100px 140px 1fr auto',
          gap: 8,
          padding: '0 4px',
          fontSize: 9,
          color: 'var(--t3)',
          letterSpacing: '0.1em',
        }}>
          <span>SHIP</span>
          <span>COMMODITY</span>
          <span>QTY (SCU)</span>
          <span>BUY (aUEC/SCU)</span>
          <span>SELL (aUEC/SCU)</span>
          <span>DESTINATION</span>
          <span>PROFIT</span>
          <span />
        </div>

        {rows.map(row => {
          const c = calcRow(row);
          const hasData = row.quantity_scu && row.buy_price && row.sell_price;
          return (
            <div key={row.id} style={{
              display: 'grid',
              gridTemplateColumns: '130px 130px 90px 100px 100px 140px 1fr auto',
              gap: 8,
              alignItems: 'center',
              padding: '10px 4px',
              background: 'var(--bg1)',
              border: '0.5px solid var(--b1)',
              borderRadius: 4,
            }}>
              {/* Ship */}
              <input
                list={`ships-${row.id}`}
                value={row.ship}
                onChange={e => updateRow(row.id, 'ship', e.target.value)}
                placeholder="Ship name"
                style={inputStyle}
              />
              <datalist id={`ships-${row.id}`}>
                {COMMON_SHIPS.map(s => <option key={s} value={s} />)}
              </datalist>

              {/* Commodity */}
              <input
                value={row.commodity}
                onChange={e => updateRow(row.id, 'commodity', e.target.value)}
                placeholder="Commodity"
                style={inputStyle}
              />

              {/* Qty */}
              <input
                type="number"
                min="0"
                value={row.quantity_scu}
                onChange={e => updateRow(row.id, 'quantity_scu', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />

              {/* Buy */}
              <input
                type="number"
                min="0"
                value={row.buy_price}
                onChange={e => updateRow(row.id, 'buy_price', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />

              {/* Sell */}
              <input
                type="number"
                min="0"
                value={row.sell_price}
                onChange={e => updateRow(row.id, 'sell_price', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />

              {/* Destination */}
              <input
                list={`dest-${row.id}`}
                value={row.destination}
                onChange={e => updateRow(row.id, 'destination', e.target.value)}
                placeholder="Destination"
                style={inputStyle}
              />
              <datalist id={`dest-${row.id}`}>
                {COMMON_DESTINATIONS.map(d => <option key={d} value={d} />)}
              </datalist>

              {/* Profit */}
              <div style={{
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
                color: !hasData ? 'var(--t3)' : c.profit >= 0 ? '#4AE830' : '#C0392B',
                minWidth: 80,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <span>{hasData ? fmt(c.profit) : '—'}</span>
                {hasData && (
                  <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 400 }}>
                    {c.margin.toFixed(1)}% margin
                  </span>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => rows.length > 1 && removeRow(row.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: rows.length > 1 ? 'pointer' : 'default',
                  color: rows.length > 1 ? '#C0392B' : 'var(--b1)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: rows.length > 1 ? 1 : 0.3,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Row */}
      <button
        onClick={addRow}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '9px 14px',
          background: 'transparent',
          border: '0.5px dashed var(--b2)',
          borderRadius: 4,
          color: 'var(--t2)',
          fontSize: 10,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          fontFamily: 'inherit',
          width: '100%',
        }}
      >
        <Plus size={12} /> ADD CARGO RUN
      </button>

      <div style={{ fontSize: 9, color: 'var(--t3)', textAlign: 'right', marginTop: -8 }}>
        Calculations are local only — not saved to database
      </div>
    </div>
  );
}