/**
 * Crafting Cost Calculator
 * Estimate aUEC cost to craft: material prices × SCU + refinery costs vs buying.
 */
import React, { useState, useMemo } from 'react';
import { Calculator, TrendingDown, TrendingUp, Package, HelpCircle } from 'lucide-react';

export default function CraftingCostCalc({ blueprints = [], materials = [], priceSnapshots = [] }) {
  const [selectedBp, setSelectedBp] = useState('');

  const bp = blueprints.find(b => b.id === selectedBp);
  const recipe = bp && Array.isArray(bp.recipe_materials) ? bp.recipe_materials : [];

  // Build price lookup from snapshots
  const prices = useMemo(() => {
    const map = {};
    priceSnapshots.forEach(p => {
      map[(p.commodity_name || '').toLowerCase()] = {
        buy: p.best_buy_price || p.curr_buy_avg || 0,
        sell: p.best_sell_price || p.curr_sell_avg || 0,
      };
    });
    return map;
  }, [priceSnapshots]);

  // Calculate costs
  const analysis = useMemo(() => {
    if (!bp || recipe.length === 0) return null;

    let totalMaterialCost = 0;
    const breakdown = recipe.map(r => {
      const matName = (r.material_name || r.material || '').toLowerCase();
      const price = prices[matName];
      const scuNeeded = r.quantity_scu || 0;
      const costPerScu = price?.buy || 0;
      const lineCost = costPerScu * scuNeeded;
      totalMaterialCost += lineCost;
      return { name: r.material_name || r.material, scu: scuNeeded, pricePerScu: costPerScu, total: lineCost, hasPrice: !!price };
    });

    const refineryCostEst = totalMaterialCost * 0.1; // ~10% refinery overhead estimate
    const totalCraftCost = totalMaterialCost + refineryCostEst;
    const marketValue = bp.aUEC_value_est || 0;
    const profit = marketValue - totalCraftCost;
    const margin = marketValue > 0 ? Math.round((profit / marketValue) * 100) : 0;

    return { breakdown, totalMaterialCost, refineryCostEst, totalCraftCost, marketValue, profit, margin };
  }, [bp, recipe, prices]);

  const fmtAuec = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString();

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
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'MATERIAL COST', value: fmtAuec(analysis.totalMaterialCost), color: 'var(--warn)', tip: 'Sum of material purchase costs' },
                { label: 'REFINERY EST.', value: fmtAuec(analysis.refineryCostEst), color: 'var(--t2)', tip: '~10% overhead for refining raw materials' },
                { label: 'TOTAL CRAFT', value: fmtAuec(analysis.totalCraftCost), color: 'var(--danger)', tip: 'Total cost to craft from scratch' },
                { label: 'MARKET VALUE', value: fmtAuec(analysis.marketValue), color: 'var(--info)', tip: 'Estimated market selling price' },
                { label: 'PROFIT', value: `${analysis.profit >= 0 ? '+' : ''}${fmtAuec(analysis.profit)}`, color: analysis.profit >= 0 ? 'var(--live)' : 'var(--danger)', tip: 'Market value minus craft cost' },
              ].map(s => (
                <div key={s.label} className="nexus-tooltip" data-tooltip={s.tip} style={{
                  flex: 1, padding: '8px 10px', background: 'var(--bg1)', border: '0.5px solid var(--b0)',
                  borderRadius: 'var(--r-lg)', cursor: 'default',
                }}>
                  <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Verdict */}
            <div className="nexus-card" style={{ padding: '12px', borderLeft: `3px solid ${analysis.profit >= 0 ? 'var(--live)' : 'var(--danger)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              {analysis.profit >= 0 ? <TrendingUp size={18} style={{ color: 'var(--live)' }} /> : <TrendingDown size={18} style={{ color: 'var(--danger)' }} />}
              <div>
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>
                  {analysis.profit >= 0 ? 'PROFITABLE TO CRAFT' : 'CHEAPER TO BUY'}
                </div>
                <div style={{ color: 'var(--t3)', fontSize: 10 }}>
                  {analysis.margin}% margin · {analysis.profit >= 0 ? `Save ${fmtAuec(analysis.profit)} vs buying` : `Costs ${fmtAuec(Math.abs(analysis.profit))} more to craft`}
                </div>
              </div>
            </div>

            {/* Material breakdown */}
            <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)', display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px', gap: 8, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>
                <span>MATERIAL</span><span>SCU</span><span>PRICE/SCU</span><span>TOTAL</span>
              </div>
              {analysis.breakdown.map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px', gap: 8, alignItems: 'center', borderBottom: '0.5px solid var(--b0)' }}>
                  <span style={{ color: 'var(--t0)', fontSize: 11 }}>{r.name}</span>
                  <span style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{r.scu.toFixed(4)}</span>
                  <span style={{ color: r.hasPrice ? 'var(--t1)' : 'var(--t3)', fontSize: 10 }}>
                    {r.hasPrice ? `${fmtAuec(r.pricePerScu)}/SCU` : 'No data'}
                  </span>
                  <span style={{ color: 'var(--warn)', fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtAuec(r.total)} aUEC
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