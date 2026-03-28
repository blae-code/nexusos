/**
 * RouteInputForm — commodity/location selector with auto-populated prices.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight, Zap } from 'lucide-react';

// SC 4.7 trade terminals
const TERMINALS = [
  'Seraphim Station', 'Grim Hex', 'Baijini Point', 'Port Tressler', 'Everus Harbor',
  'Area18', 'Lorville', 'New Babbage', 'Orison',
  'TDD Area18', 'TDD Lorville', 'TDD New Babbage', 'TDD Orison',
  'Ruin Station', 'Checkmate Station', 'Pyro Gateway',
  'Levski',
];

const LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};

export default function RouteInputForm({ commodities, commodityMap, snapshotMap, onCalculate }) {
  const [commodity, setCommodity] = useState('');
  const [buyLocation, setBuyLocation] = useState('');
  const [sellLocation, setSellLocation] = useState('');
  const [scu, setScu] = useState('100');
  const [buyOverride, setBuyOverride] = useState('');
  const [sellOverride, setSellOverride] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);

  const commodityNames = useMemo(() =>
    commodities.map(c => c.name).filter(Boolean).sort(),
    [commodities]
  );

  // Auto-fill best buy/sell locations when commodity changes
  useEffect(() => {
    const key = (commodity || '').toUpperCase();
    const comm = commodityMap[key];
    const snap = snapshotMap[key];
    if (comm?.best_buy_terminal && !buyLocation) setBuyLocation(comm.best_buy_terminal);
    if (comm?.best_sell_terminal && !sellLocation) setSellLocation(comm.best_sell_terminal);
    if (snap?.best_buy_station && !buyLocation) setBuyLocation(snap.best_buy_station);
    if (snap?.best_sell_station && !sellLocation) setSellLocation(snap.best_sell_station);
  }, [commodity]);

  // Current prices for display
  const key = (commodity || '').toUpperCase();
  const comm = commodityMap[key];
  const snap = snapshotMap[key];
  const currentBuy = snap?.best_buy_price || comm?.buy_price_uex || comm?.npc_avg_buy || 0;
  const currentSell = snap?.best_sell_price || comm?.sell_price_uex || comm?.npc_avg_sell || 0;
  const trend = comm?.price_trend;

  const canCalculate = commodity.trim() && buyLocation.trim() && sellLocation.trim() && parseFloat(scu) > 0;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!canCalculate) return;
    onCalculate({
      commodity: commodity.trim(),
      buyLocation: buyLocation.trim(),
      sellLocation: sellLocation.trim(),
      scu,
      buyPriceOverride: parseFloat(buyOverride) || 0,
      sellPriceOverride: parseFloat(sellOverride) || 0,
    });
  };

  const trendColor = trend === 'UP' ? '#4A8C5C' : trend === 'DOWN' ? '#C0392B' : '#9A9488';

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#0F0F0D', borderLeft: '2px solid #C8A84B',
      border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Row 1: Commodity + SCU */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 2 }}>
          <span style={LABEL}>COMMODITY</span>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
            <input
              list="commodity-list"
              value={commodity}
              onChange={e => { setCommodity(e.target.value); setBuyLocation(''); setSellLocation(''); }}
              placeholder="Search commodity..."
              className="nexus-input"
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 28 }}
            />
            <datalist id="commodity-list">
              {commodityNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          {comm && (
            <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 9, color: '#5A5850' }}>
              <span>Buy: <span style={{ color: '#3498DB' }}>{currentBuy.toFixed(2)}</span></span>
              <span>Sell: <span style={{ color: '#4A8C5C' }}>{currentSell.toFixed(2)}</span></span>
              {trend && <span style={{ color: trendColor }}>● {trend}</span>}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <span style={LABEL}>CARGO (SCU)</span>
          <input
            type="number" min="1" value={scu}
            onChange={e => setScu(e.target.value)}
            className="nexus-input"
            style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>
      </div>

      {/* Row 2: Buy → Sell locations */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <span style={LABEL}>BUY LOCATION</span>
          <input
            list="buy-terminals"
            value={buyLocation}
            onChange={e => setBuyLocation(e.target.value)}
            placeholder="Where to buy..."
            className="nexus-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <datalist id="buy-terminals">
            {TERMINALS.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <ArrowRight size={16} style={{ color: '#C8A84B', flexShrink: 0, marginBottom: 8 }} />
        <div style={{ flex: 1 }}>
          <span style={LABEL}>SELL LOCATION</span>
          <input
            list="sell-terminals"
            value={sellLocation}
            onChange={e => setSellLocation(e.target.value)}
            placeholder="Where to sell..."
            className="nexus-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <datalist id="sell-terminals">
            {TERMINALS.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      {/* Optional price overrides */}
      <div>
        <button type="button" onClick={() => setShowOverrides(s => !s)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#C8A84B', letterSpacing: '0.08em',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}>
          {showOverrides ? 'HIDE PRICE OVERRIDES' : 'OVERRIDE PRICES MANUALLY'}
        </button>
        {showOverrides && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>BUY PRICE (aUEC/SCU)</span>
              <input type="number" min="0" step="0.01" value={buyOverride}
                onChange={e => setBuyOverride(e.target.value)}
                placeholder={currentBuy ? currentBuy.toFixed(2) : '0.00'}
                className="nexus-input"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>SELL PRICE (aUEC/SCU)</span>
              <input type="number" min="0" step="0.01" value={sellOverride}
                onChange={e => setSellOverride(e.target.value)}
                placeholder={currentSell ? currentSell.toFixed(2) : '0.00'}
                className="nexus-input"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </div>
          </div>
        )}
      </div>

      {/* Calculate button */}
      <button type="submit" disabled={!canCalculate} style={{
        padding: '10px 20px', borderRadius: 2,
        background: canCalculate ? '#C8A84B' : '#5A5850',
        border: 'none', color: '#0F0F0D',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        cursor: canCalculate ? 'pointer' : 'not-allowed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 150ms',
      }}>
        <Zap size={13} /> CALCULATE PROFIT ROUTE
      </button>
    </form>
  );
}