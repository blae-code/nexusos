/**
 * Priority flag panel — collapsible list of priority blueprints with gap analysis.
 * Pioneer+ only.  No closed-over variables — props only.
 */
import React, { useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { blueprintToken } from '@/lib/tokenMap';
import { CategoryTag } from './BlueprintFilterChips';
import { ingredientStatus } from './RecipePanel';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Count recipe ingredients with zero org stock */
function countMissingIngredients(bp, materials) {
  return (bp.recipe_materials || []).filter(
    ing => ingredientStatus(ing, materials) === 'NONE'
  ).length;
}

// ─── Priority flag panel (Pioneer+ only, collapsible) ─────────────────────────

export default function PriorityPanel({ blueprints, materials, onClearPriority }) {
  const [open, setOpen] = useState(true);
  const priorityBPs = blueprints.filter(b => b.is_priority);

  if (priorityBPs.length === 0) return null;

  return (
    <div style={{ border: '0.5px solid var(--warn-b)', borderRadius: 8, overflow: 'hidden', marginBottom: 0, background: 'var(--bg1)' }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'var(--warn-bg)', border: 'none',
          borderBottom: open ? '0.5px solid var(--warn-b)' : 'none',
          color: 'var(--warn)', fontFamily: 'inherit', fontSize: 10,
          padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.1em',
        }}
      >
        <Star size={11} fill="var(--warn)" />
        PRIORITY TARGETS
        <span style={{ color: 'var(--t2)', marginLeft: 4 }}>({priorityBPs.length})</span>
        {open
          ? <ChevronUp   size={11} style={{ marginLeft: 'auto' }} />
          : <ChevronDown size={11} style={{ marginLeft: 'auto' }} />
        }
      </button>

      {open && (
        <div style={{ background: 'var(--bg1)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {priorityBPs.map(bp => {
            const owned   = !!(bp.owned_by || bp.owned_by_callsign);
            const missing = countMissingIngredients(bp, materials);
            // Gap analysis chip
            let gapLabel, gapColor;
            if (!owned) {
              gapLabel = 'NO HOLDER'; gapColor = 'var(--danger)';
            } else if (missing > 0) {
              gapLabel = 'MATERIALS SHORT'; gapColor = 'var(--warn)';
            } else {
              gapLabel = 'READY TO CRAFT'; gapColor = 'var(--live)';
            }
            return (
              <div key={bp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--b0)' }}>
                <NexusToken src={blueprintToken(owned, true)} size={18} alt="priority status" />
                <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {bp.item_name}
                </span>
                <CategoryTag category={bp.category} />
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: gapColor === 'var(--live)' ? 'var(--live-bg)' : gapColor === 'var(--warn)' ? 'var(--warn-bg)' : 'var(--danger-bg)',
                  border: `0.5px solid ${gapColor === 'var(--live)' ? 'var(--live-b)' : gapColor === 'var(--warn)' ? 'var(--warn-b)' : 'var(--danger-b)'}`,
                  color: gapColor, letterSpacing: '0.05em', flexShrink: 0,
                }}>{gapLabel}</span>
                <button
                  onClick={() => onClearPriority(bp)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--t3)', fontSize: 9, fontFamily: 'inherit', padding: '1px 4px',
                  }}
                >CLEAR ×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
