/**
 * "What Can I Craft?" Calculator
 * Input: current material inventory → shows which blueprints you can fully/partially fabricate.
 */
import React, { useState, useMemo } from 'react';
import { Search, Check, AlertTriangle, Package, HelpCircle } from 'lucide-react';

const STATUS_COLORS = {
  CRAFTABLE: { bg: 'var(--live-bg)', border: 'var(--live-b)', color: 'var(--live)', label: 'READY TO CRAFT' },
  PARTIAL: { bg: 'var(--warn-bg)', border: 'var(--warn-b)', color: 'var(--warn)', label: 'PARTIAL MATERIALS' },
  MISSING: { bg: 'var(--danger-bg)', border: 'var(--danger-b)', color: 'var(--danger)', label: 'CANNOT CRAFT' },
};

function MaterialBar({ name, have, need, quality, minQuality }) {
  const pct = need > 0 ? Math.min((have / need) * 100, 100) : 0;
  const met = have >= need;
  const qualMet = !minQuality || quality >= minQuality;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ color: 'var(--t2)', fontSize: 10, width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: met ? 'var(--live)' : 'var(--warn)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ color: met ? 'var(--live)' : 'var(--warn)', fontSize: 9, fontVariantNumeric: 'tabular-nums', width: 70, textAlign: 'right' }}>
        {have.toFixed(2)} / {need.toFixed(2)}
      </span>
      {minQuality > 0 && (
        <span style={{ color: qualMet ? 'var(--t3)' : 'var(--danger)', fontSize: 8, width: 40 }}>
          Q{quality || 0}/{minQuality}
        </span>
      )}
    </div>
  );
}

export default function CraftabilityCalc({ blueprints = [], materials = [] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showQuality, setShowQuality] = useState(true);

  // Build material inventory lookup
  const inventory = useMemo(() => {
    const inv = {};
    materials.filter(m => !m.is_archived).forEach(m => {
      const key = (m.material_name || '').toLowerCase();
      if (!inv[key]) inv[key] = { scu: 0, quality: 0, count: 0 };
      inv[key].scu += m.quantity_scu || 0;
      inv[key].quality = Math.max(inv[key].quality, m.quality_score || 0);
      inv[key].count++;
    });
    return inv;
  }, [materials]);

  // Analyze each blueprint
  const analyzed = useMemo(() => {
    return blueprints.map(bp => {
      const recipe = Array.isArray(bp.recipe_materials) ? bp.recipe_materials : [];
      if (recipe.length === 0) return { bp, status: 'MISSING', pct: 0, gaps: [], met: 0, total: 0 };

      let met = 0;
      const gaps = [];

      recipe.forEach(r => {
        const matName = (r.material_name || r.material || '').toLowerCase();
        const need = r.quantity_scu || 0;
        const minQ = r.min_quality || 0;
        const inv = inventory[matName] || { scu: 0, quality: 0 };
        const hasScu = inv.scu >= need;
        const hasQual = !minQ || inv.quality >= minQ;

        if (hasScu && hasQual) {
          met++;
        } else {
          gaps.push({
            name: r.material_name || r.material,
            need, have: inv.scu,
            minQuality: minQ, quality: inv.quality,
          });
        }
      });

      const pct = recipe.length > 0 ? Math.round((met / recipe.length) * 100) : 0;
      const status = met === recipe.length ? 'CRAFTABLE' : met > 0 ? 'PARTIAL' : 'MISSING';

      return { bp, status, pct, gaps, met, total: recipe.length };
    }).sort((a, b) => {
      const order = { CRAFTABLE: 0, PARTIAL: 1, MISSING: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.pct - a.pct;
    });
  }, [blueprints, inventory]);

  const filtered = analyzed.filter(a => {
    if (filter !== 'ALL' && a.status !== filter) return false;
    if (search.trim()) {
      return a.bp.item_name?.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const counts = { CRAFTABLE: 0, PARTIAL: 0, MISSING: 0 };
  analyzed.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Package size={16} style={{ color: 'var(--acc)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700 }}>WHAT CAN I CRAFT?</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>
              CROSS-REFERENCES YOUR MATERIAL INVENTORY AGAINST ALL BLUEPRINTS
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
            <div
              key={key}
              onClick={() => setFilter(filter === key ? 'ALL' : key)}
              className="nexus-tooltip" data-tooltip={cfg.label}
              style={{
                padding: '6px 12px', background: cfg.bg, border: `0.5px solid ${cfg.border}`,
                borderRadius: 'var(--r-md)', cursor: 'pointer', minWidth: 80,
                outline: filter === key ? `1px solid ${cfg.color}` : 'none',
              }}
            >
              <div style={{ color: cfg.color, fontSize: 18, fontWeight: 700 }}>{counts[key] || 0}</div>
              <div style={{ color: cfg.color, fontSize: 8, letterSpacing: '0.1em', opacity: 0.7 }}>{cfg.label}</div>
            </div>
          ))}
          <div
            onClick={() => setFilter('ALL')}
            style={{
              padding: '6px 12px', background: 'var(--bg1)', border: '0.5px solid var(--b0)',
              borderRadius: 'var(--r-md)', cursor: 'pointer',
              outline: filter === 'ALL' ? '1px solid var(--acc)' : 'none',
            }}
          >
            <div style={{ color: 'var(--t0)', fontSize: 18, fontWeight: 700 }}>{analyzed.length}</div>
            <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>TOTAL</div>
          </div>
        </div>

        {/* Quality toggle + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
            <input className="nexus-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search blueprints…" style={{ paddingLeft: 28, height: 32, fontSize: 10 }} />
          </div>
          <div className="nexus-toggle" onClick={() => setShowQuality(!showQuality)}>
            <div className={`nexus-toggle-track ${showQuality ? 'on' : ''}`}>
              <div className="nexus-toggle-thumb" />
            </div>
            <span className="nexus-toggle-label">Quality check</span>
          </div>
        </div>
      </div>

      {/* Blueprint list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <Package size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div>No blueprints match this filter.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(({ bp, status, pct, gaps, met, total }) => {
              const cfg = STATUS_COLORS[status];
              const recipe = Array.isArray(bp.recipe_materials) ? bp.recipe_materials : [];
              return (
                <div key={bp.id} className="nexus-card" style={{ padding: 0, borderLeft: `3px solid ${cfg.color}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {status === 'CRAFTABLE' ? <Check size={14} style={{ color: cfg.color }} /> : <AlertTriangle size={14} style={{ color: cfg.color }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bp.item_name}</div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>{bp.category}</span>
                        <span>{bp.tier}</span>
                        {bp.owned_by_callsign && <span style={{ color: 'var(--live)' }}>Owned: {bp.owned_by_callsign}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: cfg.color, fontSize: 14, fontWeight: 700 }}>{pct}%</div>
                      <div style={{ color: 'var(--t3)', fontSize: 8 }}>{met}/{total} materials</div>
                    </div>
                  </div>

                  {/* Material breakdown */}
                  {recipe.length > 0 && (
                    <div style={{ padding: '0 14px 10px' }}>
                      {recipe.map((r, i) => {
                        const matName = (r.material_name || r.material || '').toLowerCase();
                        const inv = inventory[matName] || { scu: 0, quality: 0 };
                        return (
                          <MaterialBar key={i}
                            name={r.material_name || r.material}
                            have={inv.scu} need={r.quantity_scu || 0}
                            quality={showQuality ? inv.quality : 999}
                            minQuality={showQuality ? (r.min_quality || 0) : 0}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Gap summary */}
                  {gaps.length > 0 && (
                    <div style={{ padding: '6px 14px 10px', borderTop: '0.5px solid var(--b0)' }}>
                      <div style={{ color: 'var(--warn)', fontSize: 9, letterSpacing: '0.08em' }}>
                        MISSING: {gaps.map(g => `${g.name} (need ${g.need.toFixed(2)} SCU)`).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}