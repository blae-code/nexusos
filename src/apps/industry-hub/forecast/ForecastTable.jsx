import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const RISK_STYLE = {
  CRITICAL: { bg: 'var(--danger-bg)', border: 'var(--danger-b)', color: 'var(--danger)' },
  HIGH:     { bg: 'var(--warn-bg)',   border: 'var(--warn-b)',   color: 'var(--warn)' },
  MEDIUM:   { bg: 'var(--info-bg)',   border: 'var(--info-b)',   color: 'var(--info)' },
  LOW:      { bg: 'var(--bg3)',       border: 'var(--b1)',       color: 'var(--t2)' },
  NONE:     { bg: 'var(--bg2)',       border: 'var(--b0)',       color: 'var(--t3)' },
};

function fmtScu(v) {
  if (v == null) return '—';
  return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1);
}

function fmtDays(d) {
  if (d == null) return '∞';
  if (d <= 0) return '0d';
  if (d < 1) return `${Math.round(d * 24)}h`;
  return `${d.toFixed(1)}d`;
}

function RiskBadge({ risk }) {
  const s = RISK_STYLE[risk] || RISK_STYLE.NONE;
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
      padding: '2px 8px', borderRadius: 2,
      background: s.bg, border: `0.5px solid ${s.border}`, color: s.color,
    }}>{risk}</span>
  );
}

const HEADERS = ['MATERIAL', 'STOCK', 'BURN/DAY', 'PENDING', 'INCOMING', 'DAYS LEFT', 'REORDER', 'RISK'];
const SORT_KEYS = ['material_name', 'current_stock_scu', 'daily_burn_rate', 'pending_demand_scu', 'incoming_supply_scu', 'days_until_stockout', 'reorder_scu', 'stockout_risk'];

export default function ForecastTable({ forecasts, filter }) {
  const [sortIdx, setSortIdx] = useState(7); // default: RISK
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = (forecasts || []).filter(f => {
    if (filter === 'ALL') return true;
    return f.stockout_risk === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    const key = SORT_KEYS[sortIdx];
    let va = a[key], vb = b[key];
    if (key === 'stockout_risk') {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
      va = order[va] ?? 5; vb = order[vb] ?? 5;
    }
    if (key === 'material_name') {
      va = (va || '').toLowerCase(); vb = (vb || '').toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    va = va ?? 999; vb = vb ?? 999;
    return sortAsc ? va - vb : vb - va;
  });

  const toggleSort = (idx) => {
    if (sortIdx === idx) setSortAsc(!sortAsc);
    else { setSortIdx(idx); setSortAsc(true); }
  };

  if (sorted.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>
        No materials match this filter.
      </div>
    );
  }

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid var(--warn)',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr repeat(6, 0.8fr) 90px',
        gap: 4, padding: '8px 12px',
        background: '#141410',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      }}>
        {HEADERS.map((h, i) => (
          <button
            key={h}
            onClick={() => toggleSort(i)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
              fontSize: 10, color: sortIdx === i ? 'var(--t0)' : 'var(--t2)',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: 0,
            }}
          >
            {h}
            {sortIdx === i && (sortAsc ? <ChevronUp size={9} /> : <ChevronDown size={9} />)}
          </button>
        ))}
      </div>

      {/* Rows */}
      {sorted.map(f => (
        <div
          key={f.material_name}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr repeat(6, 0.8fr) 90px',
            gap: 4, padding: '9px 12px', alignItems: 'center',
            borderBottom: '0.5px solid rgba(200,170,100,0.04)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.material_name}</div>
          <div style={{ color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtScu(f.current_stock_scu)}</div>
          <div style={{ color: f.daily_burn_rate > 0 ? 'var(--warn)' : 'var(--t3)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtScu(f.daily_burn_rate)}</div>
          <div style={{ color: f.pending_demand_scu > 0 ? 'var(--info)' : 'var(--t3)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtScu(f.pending_demand_scu)}</div>
          <div style={{ color: f.incoming_supply_scu > 0 ? 'var(--live)' : 'var(--t3)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtScu(f.incoming_supply_scu)}</div>
          <div style={{
            color: f.days_until_stockout !== null && f.days_until_stockout < 5 ? 'var(--danger)' : 'var(--t1)',
            fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
          }}>{fmtDays(f.days_until_stockout)}</div>
          <div style={{
            color: f.reorder_scu > 0 ? 'var(--warn)' : 'var(--t3)',
            fontSize: 11, fontVariantNumeric: 'tabular-nums',
          }}>{f.reorder_scu > 0 ? `${fmtScu(f.reorder_scu)} SCU` : '—'}</div>
          <RiskBadge risk={f.stockout_risk} />
        </div>
      ))}
    </div>
  );
}