/**
 * Gap analysis sidebar — blueprint coverage stats and unowned priority list.
 * No closed-over variables — props only.
 */
import React from 'react';
import { TierBadge } from './BlueprintFilterChips';
import { ingredientStatus } from './RecipePanel';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Count recipe ingredients with zero org stock */
function countMissingIngredients(bp, materials) {
  return (bp.recipe_materials || []).filter(
    ing => ingredientStatus(ing, materials) === 'NONE'
  ).length;
}

// ─── Gap analysis sidebar ─────────────────────────────────────────────────────

export default function GapSidebar({ blueprints, materials }) {
  const owned       = blueprints.filter(b => !!(b.owned_by_user_id || b.owned_by || b.owned_by_callsign)).length;
  const t2Total     = blueprints.filter(b => b.tier === 'T2').length;
  const t2Owned     = blueprints.filter(b => b.tier === 'T2' && !!(b.owned_by_user_id || b.owned_by || b.owned_by_callsign)).length;
  const priorityGaps = blueprints.filter(b => b.is_priority && !(b.owned_by_user_id || b.owned_by || b.owned_by_callsign));

  function CoverageStat({ label, num, denom }) {
    const pct = denom > 0 ? (num / denom) * 100 : 0;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.08em' }}>{label}</span>
          <span style={{ color: 'var(--t0)', fontSize: 11 }}>{num}<span style={{ color: 'var(--t2)' }}>/{denom}</span></span>
        </div>
        <div style={{ height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? 'var(--live)' : pct >= 50 ? 'var(--acc)' : 'var(--warn)', borderRadius: 1, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Coverage stats */}
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 8, padding: '11px 12px' }}>
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 12 }}>CRAFTING GAPS</div>
        <CoverageStat label="COVERAGE"    num={owned}   denom={blueprints.length} />
        <CoverageStat label="T2 COVERAGE" num={t2Owned} denom={t2Total} />
      </div>

      {/* Priority gaps */}
      {priorityGaps.length > 0 && (
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 8, padding: '11px 12px' }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 10 }}>UNOWNED PRIORITY</div>
          {priorityGaps.map(bp => {
            const missing = countMissingIngredients(bp, materials);
            const total   = (bp.recipe_materials || []).length;
            return (
              <div key={bp.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bp.item_name}
                  </span>
                  <TierBadge tier={bp.tier} />
                </div>
                {total > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${((total - missing) / total) * 100}%`, background: missing === 0 ? 'var(--live)' : 'var(--danger)', borderRadius: 1 }} />
                    </div>
                    <span style={{ color: 'var(--t2)', fontSize: 10, flexShrink: 0 }}>
                      {missing}/{total} missing
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
