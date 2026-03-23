/**
 * TradeIntelPanel — Historical trade profitability analysis with route intel.
 */
import React, { useState } from 'react';
import { Star, TrendingUp, MapPin } from 'lucide-react';

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

const RATING_META = {
  TOP_TIER:   { label: 'TOP TIER',   color: '#4AE830', bg: 'rgba(74,232,48,0.08)' },
  PROFITABLE: { label: 'PROFITABLE', color: '#C8A84B', bg: 'rgba(200,168,75,0.06)' },
  MARGINAL:   { label: 'MARGINAL',   color: 'var(--t2)', bg: 'var(--bg3)' },
  AVOID:      { label: 'AVOID',      color: '#C0392B', bg: 'rgba(192,57,43,0.06)' },
};

export default function TradeIntelPanel({ data }) {
  const [expanded, setExpanded] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>
        No cargo log history available. Log trades in the Cargo Tracker to see trade intelligence.
      </div>
    );
  }

  const topTier = data.filter(d => d.rating === 'TOP_TIER');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Top performers */}
      {topTier.length > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 4,
          background: 'rgba(74,232,48,0.06)', border: '0.5px solid rgba(74,232,48,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Star size={12} style={{ color: '#4AE830' }} />
          <span style={{ fontSize: 10, color: '#4AE830', fontWeight: 600 }}>
            Top performers: {topTier.map(t => t.commodity).join(', ')}
          </span>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map(d => {
          const rating = RATING_META[d.rating] || RATING_META.MARGINAL;
          const isExpanded = expanded === d.commodity;

          return (
            <div key={d.commodity} style={{
              background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 4,
              overflow: 'hidden',
            }}>
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 0.6fr 0.7fr 0.8fr 0.7fr 0.7fr',
                  gap: 8, padding: '8px 12px', alignItems: 'center',
                  cursor: 'pointer', fontSize: 10,
                }}
                onClick={() => setExpanded(isExpanded ? null : d.commodity)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--t0)', fontWeight: 500 }}>{d.commodity}</span>
                  <span style={{
                    padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700,
                    color: rating.color, background: rating.bg,
                  }}>
                    {rating.label}
                  </span>
                </div>

                <div style={{ textAlign: 'right', color: 'var(--t2)', fontSize: 9 }}>
                  {d.trade_count} trades
                </div>

                <div style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--t1)' }}>
                  {fmt(d.total_volume_scu)} SCU
                </div>

                <div style={{
                  textAlign: 'right', fontFamily: 'monospace', fontWeight: 600,
                  color: d.total_profit > 0 ? '#4AE830' : '#C0392B',
                }}>
                  {d.total_profit > 0 ? '+' : ''}{fmt(d.total_profit)}
                </div>

                <div style={{
                  textAlign: 'right', fontFamily: 'monospace', fontSize: 9,
                  color: d.avg_margin_pct > 15 ? '#4AE830' : d.avg_margin_pct > 0 ? '#C8A84B' : 'var(--t3)',
                }}>
                  {d.avg_margin_pct}%
                </div>

                <div style={{ textAlign: 'right', color: 'var(--t3)', fontSize: 9 }}>
                  {d.uex_cax_score != null ? `CAX ${Math.round(d.uex_cax_score)}` : '—'}
                </div>
              </div>

              {/* Expanded: best routes */}
              {isExpanded && d.best_routes && d.best_routes.length > 0 && (
                <div style={{
                  padding: '8px 12px', borderTop: '0.5px solid var(--b0)',
                  background: 'var(--bg2)',
                }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>
                    BEST ROUTES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {d.best_routes.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
                        background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 3, fontSize: 10,
                      }}>
                        <MapPin size={9} style={{ color: 'var(--acc2)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--t0)', flex: 1 }}>{r.route}</span>
                        <span style={{ color: '#4AE830', fontFamily: 'monospace', fontSize: 9 }}>
                          +{fmt(r.profit)}
                        </span>
                        <span style={{ color: 'var(--t3)', fontSize: 8 }}>{r.count} runs · {fmt(r.scu)} SCU</span>
                      </div>
                    ))}
                  </div>

                  {/* UEX reference prices */}
                  {(d.uex_buy_avg || d.uex_sell_avg) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 9, color: 'var(--t2)' }}>
                      {d.uex_buy_avg && <span>UEX Buy Avg: <span style={{ color: 'var(--t1)', fontFamily: 'monospace' }}>{fmt(d.uex_buy_avg)}</span></span>}
                      {d.uex_sell_avg && <span>UEX Sell Avg: <span style={{ color: '#C8A84B', fontFamily: 'monospace' }}>{fmt(d.uex_sell_avg)}</span></span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}