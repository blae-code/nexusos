/**
 * Single blueprint row with lazy-loaded recipe panel.
 * No closed-over variables — props only.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  BlueprintHolderChip,
  BlueprintPriorityTag,
} from '@/components/industry/IndustryVisuals';
import NexusToken from '@/components/ui/NexusToken';
import { blueprintToken } from '@/lib/tokenMap';
import { TierBadge, CategoryTag } from './BlueprintFilterChips';
import RecipePanel from './RecipePanel';

// ─── Single blueprint row ─────────────────────────────────────────────────────

export default function BlueprintRow({ blueprint, isPioneer, materials, callsign, onTogglePriority, onCraftQueued }) {
  const [expanded, setExpanded] = useState(false);

  const owned      = !!(blueprint.owned_by || blueprint.owned_by_callsign);
  const isPriority = !!blueprint.is_priority;

  // Dot colour: warn=priority, acc2=owned (not priority), t3=unowned
  return (
    <>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 7px',
          height: 40,
          borderBottom: '0.5px solid var(--b0)',
          borderRadius: 5,
          transition: 'background 0.12s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <NexusToken src={blueprintToken(owned, isPriority)} size={18} alt="blueprint status" />

        {/* Item name */}
        <span style={{
          flex: 1, fontSize: 11, fontWeight: owned ? 500 : 400,
          color: owned ? 'var(--t0)' : 'var(--t2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {blueprint.item_name}
        </span>

        {/* Tier badge */}
        <TierBadge tier={blueprint.tier} />

        {/* Category tag */}
        <CategoryTag category={blueprint.category} />

        {/* Holder callsign chip or "Unowned" dim text */}
        {owned ? (
          <BlueprintHolderChip holder={blueprint.owned_by_callsign || '—'} />
        ) : (
          <span style={{ color: 'var(--t3)', fontSize: 9, flexShrink: 0 }}>unowned</span>
        )}

        {isPriority ? <BlueprintPriorityTag /> : null}

        {/* Priority toggle — Pioneer+ only */}
        {isPioneer && (
          <button
            onClick={() => onTogglePriority(blueprint)}
            title={isPriority ? 'Remove priority' : 'Mark as priority'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 3,
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill={isPriority ? 'var(--warn)' : 'none'} stroke={isPriority ? 'var(--warn)' : 'var(--b2)'} strokeWidth="1.2" strokeLinejoin="round">
              <polygon points="8,1.5 9.9,6.2 15,6.5 11.2,10 12.5,15 8,12.2 3.5,15 4.8,10 1,6.5 6.1,6.2" />
            </svg>
          </button>
        )}

        {/* Expand chevron */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 3,
            color: 'var(--t2)', display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Recipe panel — only rendered when expanded (lazy) */}
      {expanded && (
        <RecipePanel
          blueprint={blueprint}
          materials={materials}
          callsign={callsign}
          onCraftQueued={onCraftQueued}
        />
      )}
    </>
  );
}