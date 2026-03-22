import React from 'react';
import { RefreshCw, TrendingUp, Package, DollarSign } from 'lucide-react';

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

function ScoreBar({ score, max = 100 }) {
  const pct = Math.min(100, ((score || 0) / max) * 100);
  const color = pct > 66 ? '#4AE830' : pct > 33 ? '#C8A84B' : '#C0392B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 9, color, fontFamily: 'monospace', minWidth: 24 }}>{Math.round(score || 0)}</span>
    </div>
  );
}

export default function OrgStockTab({ data, loading, onRefresh }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      </div>
    );
  }

  const stock = data?.stock || [];
  const totalValue = data?.total_est_value || 0;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {[
          { label: 'TOTAL EST. VALUE', value: `${fmt(totalValue)} aUEC`, icon: DollarSign, color: '#C8A84B' },
          { label: 'UNIQUE COMMODITIES', value: stock.length, icon: Package, color: 'var(--t1)' },
          { label: 'TOTAL SCU ON HAND', value: `${fmt(stock.reduce((s, i) => s + i.total_scu, 0))} SCU`, icon: TrendingUp, color: '#4AE830' },
          { label: 'UEX MATCHED', value: stock.filter(i => i.uex_sell_avg).length, icon: TrendingUp, color: 'var(--info)' },
        ].map(card => (
          <div key={card.label} style={{ padding: '12px 14px', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: card.color, fontFamily: 'monospace' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Table header + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '0.1em' }}>STOCK VALUATION — LIVE UEX PRICES</span>
        <button
          onClick={onRefresh}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, color: 'var(--t2)', fontSize: 10, cursor: 'pointer' }}
        >
          <RefreshCw size={11} /> REFRESH
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['COMMODITY', 'TYPE', 'SCU', 'AVG QUALITY', 'UEX BUY', 'UEX SELL', 'EST. VALUE', 'CAX SCORE'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stock.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>No org materials found — log materials in the Industry Hub first.</td></tr>
            ) : stock.map((item, idx) => (
              <tr key={item.name} style={{ borderBottom: '0.5px solid var(--b0)', background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <td style={{ padding: '9px 12px', color: 'var(--t0)', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: 'rgba(200,168,75,0.08)', color: 'var(--t2)', letterSpacing: '0.06em' }}>
                    {item.material_type || '—'}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: 'var(--t1)', fontFamily: 'monospace' }}>{fmt(item.total_scu)}</td>
                <td style={{ padding: '9px 12px', color: item.avg_quality >= 80 ? '#4AE830' : 'var(--t1)', fontFamily: 'monospace' }}>
                  {item.avg_quality != null ? `${item.avg_quality.toFixed(1)}%` : '—'}
                </td>
                <td style={{ padding: '9px 12px', color: '#4AE830', fontFamily: 'monospace' }}>{item.uex_buy_avg ? fmt(item.uex_buy_avg) : '—'}</td>
                <td style={{ padding: '9px 12px', color: '#C8A84B', fontFamily: 'monospace' }}>{item.uex_sell_avg ? fmt(item.uex_sell_avg) : '—'}</td>
                <td style={{ padding: '9px 12px', color: item.est_value ? '#E8E4DC' : 'var(--t3)', fontFamily: 'monospace', fontWeight: item.est_value ? 600 : 400 }}>
                  {item.est_value ? `${fmt(item.est_value)} aUEC` : '—'}
                </td>
                <td style={{ padding: '9px 12px', minWidth: 100 }}>
                  {item.uex_cax_score != null ? <ScoreBar score={item.uex_cax_score} /> : <span style={{ color: 'var(--t3)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}