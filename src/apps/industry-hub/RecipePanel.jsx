/**
 * Recipe panel — lazy-rendered when a blueprint row is expanded.
 * No closed-over variables — props only.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Wrench } from 'lucide-react';
import { SectionHeader } from './BlueprintFilterChips';

// ─── Shared helper (duplicated from Blueprints.jsx to keep this file self-contained) ──

/**
 * Check ingredient against org material stock.
 * Returns 'OK' | 'LOW' | 'NONE'
 */
export function ingredientStatus(ingredient, materials) {
  const match = materials.find(
    m => (m.material_name || '').toLowerCase() === (ingredient.material_name || '').toLowerCase()
  );
  if (!match || (match.quantity_scu || 0) === 0) return 'NONE';
  const qualityOk = (match.quality_pct  || 0) >= (ingredient.min_quality   || 0);
  const qtyOk     = (match.quantity_scu || 0) >= (ingredient.quantity_scu  || 0);
  if (qualityOk && qtyOk) return 'OK';
  return 'LOW';
}

// ─── Recipe panel (lazy — renders only when expanded) ─────────────────────────

export default function RecipePanel({ blueprint, materials, callsign, onCraftQueued }) {
  const [crafting, setCrafting] = useState(false);
  const [craftDone, setCraftDone] = useState(false);

  const recipe = blueprint.recipe_materials || [];
  const owned  = !!(blueprint.owned_by || blueprint.owned_by_callsign);

  // Stock cross-reference fires here, on expand, not on page load
  const statusColor = { OK: 'var(--live)', LOW: 'var(--warn)', NONE: 'var(--danger)' };
  const statusLabel = { OK: 'IN STOCK', LOW: 'LOW QUAL', NONE: 'NO STOCK' };

  const handleCraft = async () => {
    setCrafting(true);
    try {
      await base44.entities.CraftQueue.create({
        blueprint_id:           blueprint.id,
        blueprint_name:         blueprint.item_name,
        status:                 'OPEN',
        requested_by_callsign:  callsign,
        quantity:               1,
        priority_flag:          false,
      });
      setCraftDone(true);
      onCraftQueued?.();
    } catch {
      // craft queue create failed
    }
    setCrafting(false);
  };

  return (
    <div style={{
      background: 'var(--bg1)', borderTop: '0.5px solid var(--b0)',
      padding: '10px 16px 12px 36px',
    }}>
      <SectionHeader label="RECIPE" />

      {recipe.length === 0 ? (
        <div style={{ color: 'var(--t2)', fontSize: 11 }}>No recipe data logged.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {recipe.map((ing, i) => {
            const status = ingredientStatus(ing, materials);
            const col    = statusColor[status];
            return (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', borderBottom: '0.5px solid var(--b0)' }}
              >
                <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11 }}>{ing.material_name}</span>
                {/* Min quality badge — green/amber/red based on org stock */}
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: `${col}14`, border: `0.5px solid ${col}50`,
                  color: col, letterSpacing: '0.05em',
                }}>
                  {statusLabel[status]}
                  {ing.min_quality ? ` ≥${ing.min_quality}%` : ''}
                </span>
                <span style={{ color: 'var(--t2)', fontSize: 11, minWidth: 48, textAlign: 'right' }}>
                  {ing.quantity_scu ? `${ing.quantity_scu} SCU` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* "Craft this" only shown when owned_by is set */}
      {owned && (
        <div style={{ marginTop: 10 }}>
          {craftDone ? (
            <span style={{ color: 'var(--live)', fontSize: 11 }}>Added to craft queue.</span>
          ) : (
            <button
              onClick={handleCraft}
              disabled={crafting}
              className="nexus-btn nexus-btn-go"
              style={{
                padding: '4px 12px', fontSize: 10,
              }}
            >
              <Wrench size={11} />
              {crafting ? 'QUEUING...' : 'CRAFT THIS →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
