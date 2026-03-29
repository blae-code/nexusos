import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import Sparkline from './Sparkline';

const SIGNAL_STYLES = {
  STRONG_BUY:  { color: '#4AE830', bg: 'rgba(74,232,48,0.10)', label: 'STRONG BUY' },
  BUY:         { color: '#4A8C5C', bg: 'rgba(74,140,92,0.10)', label: 'BUY' },
  HOLD:        { color: 'var(--t2)', bg: 'var(--bg3)', label: 'HOLD' },
  SELL:        { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)', label: 'SELL' },
  STRONG_SELL: { color: '#C0392B', bg: 'rgba(192,57,43,0.10)', label: 'STRONG SELL' },
};

const SORT_FIELDS = ['commodity_name', 'current_sell', 'change_1d', 'change_7d', 'volatility', 'momentum', 'signal'];

function fmtPrice(v) {
  if (!v) return '—';
  if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(2);
}

function ChangeCell({ value }) {
  if (value === 0 || value == null) return <span style={{ color: 'var(--t3)' }}>—</span>;
  const color = value > 0 ? '#4AE830' : '#C0392B';
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ color, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
      <Icon size={9} />
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

export default function TrendTable({ commodities, onSelect }) {
  const [sortField, setSortField] = useState('momentum');
  const [sortDir, setSortDir] = useState(-1);

  const sorted = useMemo(() => {
    return [...commodities].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (sortField === 'signal') {
        const order = { STRONG_BUY: 5, BUY: 4, HOLD: 3, SELL: 2, STRONG_SELL: 1 };
        return ((order[bv] || 0) - (order[av] || 0)) * sortDir;
      }
      if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
      return ((bv || 0) - (av || 0)) * sortDir;
    });
  }, [commodities, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d * -1);
    else { setSortField(field); setSortDir(-1); }
  };

  const SortIcon = sortDir === -1 ? ChevronDown : ChevronUp;

  const HEADERS = [
    { field: 'commodity_name', label: 'COMMODITY', width: '1fr' },
    { field: 'current_sell', label: 'SELL PRICE', width: '90px' },
    { field: 'change_1d', label: '1D', width: '70px' },
    { field: 'change_7d', label: '7D', width: '70px' },
    { field: 'volatility', label: 'VOL', width: '60px' },
    { field: 'momentum', label: 'MOM', width: '60px' },
    { field: null, label: 'TREND', width: '100px' },
    { field: 'signal', label: 'SIGNAL', width: '100px' },
  ];

  if (commodities.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 }}>
        <BarChart3 size={28} style={{ color: 'var(--t3)' }} />
        <div style={{ color: 'var(--t2)', fontSize: 12 }}>No price history data yet</div>
        <div style={{ color: 'var(--t3)', fontSize: 10, maxWidth: 300, textAlign: 'center', lineHeight: 1.5 }}>
          Click SNAPSHOT to capture current PriceSnapshot data, or wait for the automated sync. Trend analysis requires at least 2 data points per commodity.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 'var(--r-md)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: HEADERS.map(h => h.width).join(' '),
        gap: 8, padding: '8px 14px',
        background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)',
      }}>
        {HEADERS.map((h, i) => (
          <button key={i} onClick={h.field ? () => toggleSort(h.field) : undefined}
            style={{
              background: 'none', border: 'none', cursor: h.field ? 'pointer' : 'default',
              color: sortField === h.field ? 'var(--t0)' : 'var(--t3)',
              fontSize: 8, fontWeight: 600, letterSpacing: '0.12em',
              fontFamily: "'Barlow Condensed', sans-serif",
              display: 'flex', alignItems: 'center', gap: 3, padding: 0,
              textAlign: 'left',
            }}>
            {h.label}
            {sortField === h.field && <SortIcon size={8} />}
          </button>
        ))}
      </div>

      {/* Rows */}
      {sorted.map(c => {
        const sig = SIGNAL_STYLES[c.signal] || SIGNAL_STYLES.HOLD;
        const volColor = c.volatility_rating === 'HIGH' ? '#C0392B' : c.volatility_rating === 'MEDIUM' ? '#C8A84B' : 'var(--t2)';
        const momColor = c.momentum > 0 ? '#4AE830' : c.momentum < 0 ? '#C0392B' : 'var(--t3)';

        return (
          <div key={c.commodity_name}
            onClick={() => onSelect(c)}
            style={{
              display: 'grid',
              gridTemplateColumns: HEADERS.map(h => h.width).join(' '),
              gap: 8, padding: '10px 14px', alignItems: 'center',
              borderBottom: '0.5px solid var(--b0)',
              cursor: 'pointer', transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.commodity_name}
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
              {fmtPrice(c.current_sell)}
            </div>
            <ChangeCell value={c.change_1d} />
            <ChangeCell value={c.change_7d} />
            <span style={{ color: volColor, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{c.volatility.toFixed(1)}%</span>
            <span style={{ color: momColor, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
              {c.momentum > 0 ? '+' : ''}{c.momentum.toFixed(1)}
            </span>
            <Sparkline data={c.sparkline || []} color={c.trend_direction === 'UP' ? '#4AE830' : c.trend_direction === 'DOWN' ? '#C0392B' : '#5A5850'} />
            <span style={{
              padding: '3px 8px', borderRadius: 2, fontSize: 8, fontWeight: 600,
              letterSpacing: '0.06em', background: sig.bg, color: sig.color,
              textAlign: 'center',
            }}>{sig.label}</span>
          </div>
        );
      })}
    </div>
  );
}