/**
 * SCU Cargo Planner for Crafting Runs
 * Calculate total SCU needed for a batch of crafts against ship cargo capacity.
 */
import React, { useState, useMemo } from 'react';
import { Package, Trash2, Ship, AlertTriangle, Check } from 'lucide-react';

export default function CargoSCUPlanner({ blueprints = [], ships = [] }) {
  const [craftList, setCraftList] = useState([]);
  const [shipCapacity, setShipCapacity] = useState('');
  const [selectedShip, setSelectedShip] = useState('');

  const addCraft = (bpId) => {
    if (!bpId) return;
    const existing = craftList.find(c => c.bpId === bpId);
    if (existing) {
      setCraftList(craftList.map(c => c.bpId === bpId ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCraftList([...craftList, { bpId, qty: 1 }]);
    }
  };

  const updateQty = (bpId, qty) => {
    if (qty <= 0) {
      setCraftList(craftList.filter(c => c.bpId !== bpId));
    } else {
      setCraftList(craftList.map(c => c.bpId === bpId ? { ...c, qty } : c));
    }
  };

  const handleShipSelect = (name) => {
    setSelectedShip(name);
    const ship = ships.find(s => s.name === name);
    if (ship) setShipCapacity(String(ship.cargo_scu || 0));
  };

  // Calculate total SCU needed
  const analysis = useMemo(() => {
    const materialTotals = {};
    let totalSCU = 0;

    craftList.forEach(({ bpId, qty }) => {
      const bp = blueprints.find(b => b.id === bpId);
      if (!bp || !Array.isArray(bp.recipe_materials)) return;
      bp.recipe_materials.forEach(r => {
        const name = r.material_name || r.material || 'Unknown';
        const scu = (r.quantity_scu || 0) * qty;
        materialTotals[name] = (materialTotals[name] || 0) + scu;
        totalSCU += scu;
      });
    });

    const capacity = parseFloat(shipCapacity) || 0;
    const fits = capacity > 0 ? totalSCU <= capacity : null;
    const remaining = capacity > 0 ? capacity - totalSCU : null;

    return { materialTotals, totalSCU, capacity, fits, remaining };
  }, [craftList, blueprints, shipCapacity]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ship size={16} style={{ color: 'var(--acc)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700 }}>CARGO SCU PLANNER</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>PLAN MATERIAL RUNS — WILL IT FIT IN YOUR SHIP?</div>
          </div>
        </div>

        {/* Ship selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 400 }}>
          <div>
            <span className="nexus-label">SHIP</span>
            <select className="nexus-input" value={selectedShip} onChange={e => handleShipSelect(e.target.value)}>
              <option value="">Manual entry</option>
              {ships.filter(s => s.cargo_scu > 0).sort((a, b) => (b.cargo_scu || 0) - (a.cargo_scu || 0)).map(s => (
                <option key={s.id} value={s.name}>{s.name} ({s.cargo_scu} SCU)</option>
              ))}
            </select>
          </div>
          <div>
            <span className="nexus-label">CARGO CAPACITY (SCU)</span>
            <input className="nexus-input" type="number" min="0" value={shipCapacity} onChange={e => { setShipCapacity(e.target.value); setSelectedShip(''); }} placeholder="46" />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {/* Add crafts */}
        <div style={{ marginBottom: 14 }}>
          <span className="nexus-label">ADD BLUEPRINT TO MANIFEST</span>
          <select className="nexus-input" onChange={e => { addCraft(e.target.value); e.target.value = ''; }} style={{ maxWidth: 400 }}>
            <option value="">— Select blueprint —</option>
            {blueprints.filter(b => Array.isArray(b.recipe_materials) && b.recipe_materials.length > 0).map(b => (
              <option key={b.id} value={b.id}>{b.item_name} ({b.tier})</option>
            ))}
          </select>
        </div>

        {/* Craft list */}
        {craftList.length > 0 && (
          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)', display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>
              <span>BLUEPRINT</span><span>QTY</span><span></span>
            </div>
            {craftList.map(({ bpId, qty }) => {
              const bp = blueprints.find(b => b.id === bpId);
              return (
                <div key={bpId} style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, alignItems: 'center', borderBottom: '0.5px solid var(--b0)' }}>
                  <span style={{ color: 'var(--t0)', fontSize: 11 }}>{bp?.item_name || '?'}</span>
                  <input className="nexus-input" type="number" min="1" value={qty} onChange={e => updateQty(bpId, parseInt(e.target.value) || 0)} style={{ height: 28 }} />
                  <button onClick={() => updateQty(bpId, 0)} className="nexus-btn nexus-btn-danger" style={{ padding: '4px 6px' }}><Trash2 size={10} /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Results */}
        {craftList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Verdict card */}
            {analysis.capacity > 0 && (
              <div className="nexus-card" style={{ padding: '12px', borderLeft: `3px solid ${analysis.fits ? 'var(--live)' : 'var(--danger)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                {analysis.fits ? <Check size={18} style={{ color: 'var(--live)' }} /> : <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />}
                <div>
                  <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>
                    {analysis.fits ? 'IT FITS!' : 'EXCEEDS CARGO CAPACITY'}
                  </div>
                  <div style={{ color: 'var(--t3)', fontSize: 10 }}>
                    {analysis.totalSCU.toFixed(4)} / {analysis.capacity} SCU
                    {analysis.fits ? ` · ${analysis.remaining?.toFixed(4)} SCU remaining` : ` · ${Math.abs(analysis.remaining || 0).toFixed(4)} SCU over`}
                  </div>
                </div>
              </div>
            )}

            {/* Capacity bar */}
            {analysis.capacity > 0 && (
              <div>
                <div className="nexus-bar-bg" style={{ height: 6 }}>
                  <div className={`nexus-bar-fill ${analysis.fits ? 'nexus-bar-live' : ''}`} style={{
                    width: `${Math.min((analysis.totalSCU / analysis.capacity) * 100, 100)}%`,
                    background: analysis.fits ? 'var(--live)' : 'var(--danger)',
                  }} />
                </div>
              </div>
            )}

            {/* Material manifest */}
            <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>MATERIAL MANIFEST</div>
              {Object.entries(analysis.materialTotals).sort((a, b) => b[1] - a[1]).map(([name, scu]) => (
                <div key={name} style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid var(--b0)' }}>
                  <span style={{ color: 'var(--t0)', fontSize: 11 }}>{name}</span>
                  <span style={{ color: 'var(--acc)', fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{scu.toFixed(4)} SCU</span>
                </div>
              ))}
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', background: 'var(--bg2)' }}>
                <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 700 }}>TOTAL</span>
                <span style={{ color: 'var(--acc)', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{analysis.totalSCU.toFixed(4)} SCU</span>
              </div>
            </div>
          </div>
        )}

        {craftList.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <Package size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div>Add blueprints above to calculate cargo requirements.</div>
          </div>
        )}
      </div>
    </div>
  );
}