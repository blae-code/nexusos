/**
 * Crafting Cost Calculator
 * Estimate aUEC cost to craft: material prices × SCU + refinery costs vs buying.
 */
import React, { useState, useMemo } from 'react';
import { Calculator, TrendingDown, TrendingUp, Package, HelpCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { usePriceLookup, computeCraftAnalysis, fmtAuec as fmtAuecShared } from '@/core/data/usePriceLookup';

export default function CraftingCostCalc({ blueprints = [], materials = [] }) {
  const { prices, loading: pricesLoading } = usePriceLookup();
  const [selectedBp, setSelectedBp] = useState('');

  const bp = blueprints.find(b => b.id === selectedBp);

  // Use shared pricing engine
  const analysis = useMemo(() => {
    if (!bp) return null;
    return computeCraftAnalysis(bp, prices);
  }, [bp, prices]);

  const fmtAuec = fmtAuecShared;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Calculator size={16} style={{ color: 'var(--acc)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700 }}>CRAFTING COST CALCULATOR</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>COMPARE CRAFT COST VS MARKET PRICE</div>
          </div>
        </div>

        <div>
          <span className="nexus-label">SELECT BLUEPRINT</span>
          <select className="nexus-input" value={selectedBp} onChange={e => setSelectedBp(e.target.value)} style={{ maxWidth: 400 }}>
            <option value="">— Select a blueprint —</option>
            {blueprints.map(b => <option key={b.id} value={b.id}>{b.item_name} ({b.tier} · {b.category})</option>)}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {!analysis ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <Calculator size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div>Select a blueprint to see cost analysis.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'MATERIAL COST', value: fmtAuec(analysis.totalMaterialCost), color: 'var(--warn)', tip: 'Sum of material purchase costs from live UEX data' },
                { label: 'REFINERY EST.', value: fmtAuec(analysis.refineryCostEst), color: 'var(--t2)', tip: '~10% overhead for refining raw materials' },
                { label: 'TOTAL CRAFT', value: fmtAuec(analysis.totalCraftCost), color: 'var(--danger)', tip: 'Total cost to craft from scratch' },
                { label: 'MARKET VALUE', value: fmtAuec(analysis.marketValue), color: 'var(--info)', tip: analysis.marketValueSource === 'LIVE' ? 'Live sell price from UEX data' : 'Estimated value from blueprint data', sub: analysis.marketValueSource === 'LIVE' ? '● LIVE' : analysis.marketValueSource === 'ESTIMATE' ? '○ EST' : '' },
                { label: 'PROFIT', value: `${analysis.profit >= 0 ? '+' : ''}${fmtAuec(analysis.profit)}`, color: analysis.profit >= 0 ? 'var(--live)' : 'var(--danger)', tip: 'Market value minus craft cost' },
              ].map(s => (
                <div key={s.label} className="nexus-tooltip" data-tooltip={s.tip} style={{
                  flex: '1 1 100px', minWidth: 90, padding: '8px 10px', background: 'var(--bg1)', border: '0.5px solid var(--b0)',
                  borderRadius: 'var(--r-lg)', cursor: 'default',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>{s.label}</span>
                    {s.sub && <span style={{ fontSize: 7, color: s.sub.startsWith('●') ? 'var(--live)' : 'var(--t3)', fontWeight: 600 }}>{s.sub}</span>}
                  </div>
                  <div style={{ color: s.color, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Verdict */}
            <div className="nexus-card" style={{ padding: '12px', borderLeft: `3px solid ${analysis.cheaperToBuy ? 'var(--danger)' : 'var(--live)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              {analysis.cheaperToBuy ? <TrendingDown size={18} style={{ color: 'var(--danger)' }} /> : <TrendingUp size={18} style={{ color: 'var(--live)' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>
                  {analysis.cheaperToBuy ? 'CHEAPER TO BUY' : 'PROFITABLE TO CRAFT'}
                </div>
                <div style={{ color: 'var(--t3)', fontSize: 10 }}>
                  {analysis.margin}% margin · {analysis.cheaperToBuy ? `Costs ${fmtAuec(Math.abs(analysis.profit))} more to craft` : `Save ${fmtAuec(analysis.profit)} vs buying`}
                </div>
              </div>
              {!analysis.allPriced && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <AlertTriangle size={11} style={{ color: 'var(--warn)' }} />
                  <span style={{ fontSize: 8, color: 'var(--warn)' }}>Partial pricing</span>
                </div>
              )}
            </div>

            {/* Material breakdown */}
            <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)', display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 80px', gap: 8, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>
                <span>MATERIAL</span><span>SCU</span><span>PRICE/SCU</span><span>TOTAL</span><span>STATION</span>
              </div>
              {analysis.breakdown.map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 80px', gap: 8, alignItems: 'center', borderBottom: '0.5px solid var(--b0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'var(--t0)', fontSize: 11 }}>{r.name}</span>
                    {r.alertType === 'SPIKE' && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: 'rgba(192,57,43,0.12)', color: '#C0392B', fontWeight: 700 }}>SPIKE</span>}
                    {r.alertType === 'DROP' && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: 'rgba(74,140,92,0.12)', color: '#4A8C5C', fontWeight: 700 }}>DROP</span>}
                  </div>
                  <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{r.scu.toFixed(4)}</span>
                  <span style={{ color: r.hasPrice ? 'var(--t1)' : 'var(--t3)', fontSize: 10 }}>
                    {r.hasPrice ? `${fmtAuec(r.pricePerScu)}/SCU` : 'No data'}
                  </span>
                  <span style={{ color: 'var(--warn)', fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtAuec(r.total)} aUEC
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.station || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}