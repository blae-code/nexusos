/**
 * ProfitRouteRanker — Calculates and ranks the most profitable trade routes
 * by combining buy/sell price spreads, jump distance, and risk levels.
 */
import React, { useMemo, useState } from 'react';
import { ArrowRight, Shield, Zap, Route } from 'lucide-react';

const RISK_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B' };
const RISK_PENALTY = { LOW: 1.0, MEDIUM: 0.8, HIGH: 0.55 };

function fmt(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
}

function computeRouteScore(route) {
  const profit = route.profit_per_scu || 0;
  const margin = route.margin_pct || 0;
  const jumps = route.jump_count || 1;
  const risk = route.risk_level || 'MEDIUM';
  const riskMul = RISK_PENALTY[risk] ?? 0.8;
  // Score: profit efficiency weighted by risk and distance
  const profitPerJump = profit / Math.max(jumps, 1);
  return profitPerJump * riskMul * (1 + margin / 100);
}

export default function ProfitRouteRanker({ routes, commodities }) {
  const [cargoScu, setCargoScu] = useState(96);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [maxJumps, setMaxJumps] = useState(10);

  const ranked = useMemo(() => {
    let list = (routes || []).filter(r => (r.profit_per_scu || 0) > 0);
    if (riskFilter !== 'ALL') {
      list = list.filter(r => r.risk_level === riskFilter);
    }
    if (maxJumps < 10) {
      list = list.filter(r => (r.jump_count || 0) <= maxJumps);
    }
    return list
      .map(r => ({
        ...r,
        score: computeRouteScore(r),
        totalProfit: (r.profit_per_scu || 0) * cargoScu,
        totalInvestment: (r.buy_price || 0) * cargoScu,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  }, [routes, riskFilter, maxJumps, cargoScu]);

  // Build commodity price lookup for display enrichment
  const commodityMap = useMemo(() => {
    const m = {};
    (commodities || []).forEach(c => { m[(c.name || '').toUpperCase()] = c; });
    return m;
  }, [commodities]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>CARGO (SCU)</div>
          <input
            type="number" min={1} max={9999} value={cargoScu}
            onChange={e => setCargoScu(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: 80, padding: '6px 8px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>MAX JUMPS</div>
          <select
            value={maxJumps} onChange={e => setMaxJumps(parseInt(e.target.value))}
            style={{
              padding: '6px 8px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
            }}
          >
            {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n === 10 ? 'ANY' : `≤ ${n}`}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map(r => (
            <button key={r} onClick={() => setRiskFilter(r)} style={{
              padding: '6px 10px', borderRadius: 2, cursor: 'pointer',
              background: riskFilter === r ? `${RISK_COLORS[r] || '#C0392B'}18` : '#141410',
              border: `0.5px solid ${riskFilter === r ? (RISK_COLORS[r] || '#C0392B') : 'rgba(200,170,100,0.12)'}`,
              color: riskFilter === r ? (RISK_COLORS[r] || '#E8E4DC') : '#5A5850',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {ranked.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5A5850', fontSize: 10, letterSpacing: '0.1em' }}>
          NO PROFITABLE ROUTES MATCH YOUR FILTERS
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranked.map((r, i) => {
            const profitColor = r.totalProfit > 100000 ? '#4A8C5C' : r.totalProfit > 20000 ? '#C8A84B' : '#9A9488';
            const riskColor = RISK_COLORS[r.risk_level] || '#5A5850';
            return (
              <div key={r.id || i} style={{
                display: 'grid', gridTemplateColumns: '32px 1.4fr 1fr 0.8fr 0.6fr 0.7fr',
                alignItems: 'center', gap: 10, padding: '10px 12px',
                background: '#0F0F0D',
                borderLeft: i < 3 ? '2px solid #C0392B' : '2px solid rgba(200,170,100,0.10)',
                borderTop: '0.5px solid rgba(200,170,100,0.06)',
                borderRight: '0.5px solid rgba(200,170,100,0.06)',
                borderBottom: '0.5px solid rgba(200,170,100,0.06)',
                borderRadius: 2,
              }}>
                {/* Rank */}
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
                  color: i < 3 ? '#C8A84B' : '#5A5850', textAlign: 'center',
                }}>#{i + 1}</div>

                {/* Route info */}
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                    color: '#E8E4DC', letterSpacing: '0.04em', marginBottom: 2,
                  }}>{r.commodity_name}</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488',
                  }}>
                    <span>{r.origin_terminal || '?'}</span>
                    <ArrowRight size={9} style={{ color: '#5A5850' }} />
                    <span>{r.destination_terminal || '?'}</span>
                  </div>
                </div>

                {/* Profit */}
                <div>
                  <div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em' }}>TOTAL PROFIT</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: profitColor }}>
                    {fmt(r.totalProfit)} <span style={{ fontSize: 9, fontWeight: 400 }}>aUEC</span>
                  </div>
                </div>

                {/* Margin */}
                <div>
                  <div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em' }}>MARGIN</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#C8A84B' }}>
                    {(r.margin_pct || 0).toFixed(1)}%
                  </div>
                </div>

                {/* Risk + Jumps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={9} style={{ color: riskColor }} />
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: riskColor,
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}>{r.risk_level || '?'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={9} style={{ color: '#5A5850' }} />
                    <span style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {r.jump_count || '?'} jumps
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div>
                  <div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em' }}>SCORE</div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
                    color: r.score > 500 ? '#4A8C5C' : r.score > 100 ? '#C8A84B' : '#9A9488',
                  }}>{Math.round(r.score)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
        letterSpacing: '0.06em', lineHeight: 1.5, padding: '8px 0',
      }}>
        Score = (profit/SCU ÷ jumps) × risk multiplier × (1 + margin%). Risk: LOW=1.0, MEDIUM=0.8, HIGH=0.55.
        Based on {cargoScu} SCU cargo capacity.
      </div>
    </div>
  );
}