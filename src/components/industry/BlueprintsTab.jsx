import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Star } from 'lucide-react';

const CATEGORY_COLOURS = {
  WEAPON:         '#ff6b35',
  ARMOR:          'var(--cyan)',
  GEAR:           'var(--info)',
  COMPONENT:      'var(--warn)',
  CONSUMABLE:     'var(--live)',
  FOCUSING_LENS:  '#a855f7',
  SHIP_COMPONENT: 'var(--acc)',
  OTHER:          'var(--t2)',
};

export default function BlueprintsTab({ blueprints, materials, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const filtered = (blueprints || []).filter(b => {
    const catMatch = categoryFilter === 'all' || b.category === categoryFilter;
    const tierMatch = tierFilter === 'all' || b.tier === tierFilter;
    return catMatch && tierMatch;
  });

  const handleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)', display: 'flex', gap: 10 }}>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            color: 'var(--t1)',
            fontSize: 10,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Categories</option>
          {Object.keys(CATEGORY_COLOURS).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            color: 'var(--t1)',
            fontSize: 10,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Tiers</option>
          <option value="T1">Tier 1</option>
          <option value="T2">Tier 2</option>
        </select>
        <button className="nexus-btn" style={{ padding: '6px 12px', fontSize: 10, marginLeft: 'auto' }}>
          <Plus size={10} style={{ marginRight: 4 }} /> Add Blueprint
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', position: 'sticky', top: 0 }}>
              {['Item Name', 'Category', 'Tier', 'Output', 'Time (min)', 'Est. Value', 'Owned By', 'Priority', 'Systems'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    borderBottom: '0.5px solid var(--b1)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const catColor = CATEGORY_COLOURS[b.category] || CATEGORY_COLOURS.OTHER;
              const isExpanded = expandedId === b.id;
              
              return (
                <React.Fragment key={b.id}>
                  <tr
                    style={{ borderBottom: '0.5px solid var(--b0)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 12px', color: 'var(--t0)', fontSize: 11 }}>
                      <button
                        onClick={() => handleExpand(b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t1)', marginRight: 6 }}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {b.item_name}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        color: catColor,
                        background: `${catColor}22`,
                        border: `0.5px solid ${catColor}55`,
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: 9,
                      }}>
                        {b.category}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 11 }}>
                      {b.tier === 'T2' ? (
                        <span style={{ color: 'var(--cyan)' }}>T2</span>
                      ) : (
                        'T1'
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 11 }}>
                      {b.output_quantity || 1}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                      {b.crafting_time_min || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                      {b.aUEC_value_est ? b.aUEC_value_est.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: b.owned_by ? 'var(--t0)' : 'var(--t2)', fontSize: 11 }}>
                      {b.owned_by_callsign || 'UNOWNED'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {b.is_priority ? (
                        <Star size={12} style={{ color: 'var(--warn)' }} />
                      ) : (
                        <span style={{ color: 'var(--t3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {(b.available_systems || []).map(sys => (
                        <span
                          key={sys}
                          style={{
                            color: 'var(--t2)',
                            fontSize: 8,
                            background: 'var(--bg2)',
                            border: '0.5px solid var(--b1)',
                            padding: '1px 4px',
                            borderRadius: 2,
                          }}
                        >
                          {sys}
                        </span>
                      ))}
                    </td>
                  </tr>
                  
                  {isExpanded && b.recipe_materials && (
                    <tr style={{ background: 'var(--bg2)' }}>
                      <td colSpan={9} style={{ padding: 14 }}>
                        <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 8, letterSpacing: '0.08em' }}>
                          RECIPE
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', color: 'var(--t3)', fontSize: 9, paddingBottom: 4 }}>Material</th>
                              <th style={{ textAlign: 'left', color: 'var(--t3)', fontSize: 9, paddingBottom: 4 }}>SCU Required</th>
                              <th style={{ textAlign: 'left', color: 'var(--t3)', fontSize: 9, paddingBottom: 4 }}>Min Quality</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.recipe_materials.map((rm, i) => (
                              <tr key={i} style={{ borderTop: '0.5px solid var(--b0)' }}>
                                <td style={{ padding: '4px 0', color: 'var(--t0)' }}>{rm.material}</td>
                                <td style={{ padding: '4px 0', color: 'var(--t1)', fontFamily: 'monospace' }}>
                                  {rm.quantity_scu?.toFixed(1)}
                                </td>
                                <td style={{ padding: '4px 0', color: 'var(--t1)', fontFamily: 'monospace' }}>
                                  {rm.min_quality ? `${rm.min_quality}%` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)' }}>
                  No blueprints found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
