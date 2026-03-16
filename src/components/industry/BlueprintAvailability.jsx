import React, { useMemo } from 'react';

/**
 * BlueprintAvailability
 * Given a blueprint with recipe_materials and the current material stockpile,
 * renders a compact availability indicator showing which ingredients are met.
 *
 * Props:
 *   blueprint  — Blueprint entity record (must have recipe_materials array)
 *   materials  — full Material[] stockpile
 *   compact    — if true, renders just a single status pill (for list views)
 */

function buildMatLookup(materials) {
  // Aggregate by material_name (case-insensitive), sum SCU, track best quality
  const map = {};
  materials.filter(m => !m.is_archived).forEach(m => {
    const key = (m.material_name || '').toLowerCase();
    if (!map[key]) map[key] = { scu: 0, best_quality: 0 };
    map[key].scu          += (m.quantity_scu || 0);
    map[key].best_quality  = Math.max(map[key].best_quality, m.quality_pct || 0);
  });
  return map;
}

function checkIngredient(ingredient, matLookup) {
  const key     = (ingredient.material || '').toLowerCase();
  const needed  = ingredient.quantity || 0;
  const minQual = ingredient.min_quality || 0;
  const stock   = matLookup[key];

  if (!stock) return { met: false, reason: 'missing' };
  if (stock.scu < needed) return { met: false, reason: 'low_scu' };
  if (stock.best_quality < minQual) return { met: false, reason: 'low_quality' };
  return { met: true };
}

export function useBlueprintAvailability(blueprint, materials) {
  return useMemo(() => {
    const recipe = blueprint?.recipe_materials || [];
    if (recipe.length === 0) return { status: 'NO_RECIPE', all_met: false, results: [] };

    const lookup = buildMatLookup(materials);
    const results = recipe.map(ing => ({
      ...ing,
      ...checkIngredient(ing, lookup),
      stock: lookup[(ing.material || '').toLowerCase()] || null,
    }));

    const allMet     = results.every(r => r.met);
    const noneMet    = results.every(r => !r.met);
    const partialMet = !allMet && !noneMet;

    const status = allMet ? 'READY' : partialMet ? 'PARTIAL' : 'BLOCKED';
    return { status, all_met: allMet, results };
  }, [blueprint, materials]);
}

const STATUS_STYLE = {
  READY:     { color: 'var(--live)',   border: 'rgba(39,201,106,0.3)',  bg: 'rgba(39,201,106,0.08)'  },
  PARTIAL:   { color: 'var(--warn)',   border: 'rgba(232,160,32,0.3)', bg: 'rgba(232,160,32,0.08)' },
  BLOCKED:   { color: 'var(--danger)', border: 'rgba(224,72,72,0.3)',  bg: 'rgba(224,72,72,0.06)'  },
  NO_RECIPE: { color: 'var(--t2)',     border: 'var(--b2)',            bg: 'transparent'            },
};

// Compact pill — for list rows
export function AvailabilityPill({ blueprint, materials }) {
  const { status } = useBlueprintAvailability(blueprint, materials);
  const s = STATUS_STYLE[status];
  const label = status === 'READY' ? 'MATERIALS MET' : status === 'PARTIAL' ? 'PARTIAL' : status === 'BLOCKED' ? 'BLOCKED' : '—';
  return (
    <span className="nexus-tag" style={{ color: s.color, borderColor: s.border, background: s.bg, fontSize: 9 }}>
      {label}
    </span>
  );
}

// Full breakdown — for detail/hover views
export default function BlueprintAvailability({ blueprint, materials }) {
  const { status, results } = useBlueprintAvailability(blueprint, materials);

  if (!blueprint?.recipe_materials?.length) {
    return (
      <div style={{ color: 'var(--t2)', fontSize: 10 }}>No recipe data</div>
    );
  }

  const s = STATUS_STYLE[status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Overall status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        <span style={{ color: s.color, fontSize: 10, letterSpacing: '0.08em' }}>
          {status === 'READY' ? 'ALL MATERIALS MET' : status === 'PARTIAL' ? 'PARTIALLY MET' : 'MATERIALS BLOCKED'}
        </span>
      </div>

      {/* Per-ingredient rows */}
      {results.map((r, i) => {
        const stockScu  = r.stock?.scu || 0;
        const stockQual = r.stock?.best_quality || 0;
        const needed    = r.quantity || 0;
        const minQual   = r.min_quality || 0;
        const scuOk     = stockScu >= needed;
        const qualOk    = stockQual >= minQual;
        const rowColor  = r.met ? 'var(--live)' : (!r.stock ? 'var(--danger)' : 'var(--warn)');

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 8px',
            background: r.met ? 'rgba(39,201,106,0.04)' : 'var(--bg1)',
            border: `0.5px solid ${r.met ? 'rgba(39,201,106,0.15)' : 'var(--b0)'}`,
            borderRadius: 5,
          }}>
            {/* Status dot */}
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: rowColor, flexShrink: 0 }} />

            {/* Material name */}
            <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.material}
            </span>

            {/* SCU needed vs have */}
            <span style={{ color: scuOk ? 'var(--t1)' : 'var(--danger)', fontSize: 10, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
              {stockScu.toFixed(1)} / {needed} SCU
            </span>

            {/* Quality */}
            {minQual > 0 && (
              <span style={{ color: qualOk ? 'var(--t2)' : 'var(--warn)', fontSize: 10, fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right' }}>
                {stockQual.toFixed(0)}% / {minQual}%
              </span>
            )}

            {/* Reason tag */}
            {!r.met && (
              <span className="nexus-tag" style={{
                color: r.reason === 'missing' ? 'var(--danger)' : 'var(--warn)',
                borderColor: 'transparent', background: 'transparent', fontSize: 9,
              }}>
                {r.reason === 'missing' ? 'MISSING' : r.reason === 'low_scu' ? 'LOW SCU' : 'LOW QUAL'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}