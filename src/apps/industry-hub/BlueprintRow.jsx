/**
 * Single blueprint row with lazy-loaded recipe panel.
 * No closed-over variables — props only.
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { computeCraftAnalysis, fmtAuec } from '@/core/data/usePriceLookup';
import {
  BlueprintPriorityTag,
} from '@/apps/industry-hub/IndustryVisuals';
import NexusToken from '@/core/design/NexusToken';
import { blueprintToken } from '@/core/data/tokenMap';
import { CategoryTag } from './BlueprintFilterChips';
import RecipePanel from './RecipePanel';

// ─── Single blueprint row ─────────────────────────────────────────────────────

export default function BlueprintRow({ blueprint, focused = false, isPioneer, materials, callsign, onTogglePriority, onCraftQueued, prices }) {
  const [expanded, setExpanded] = useState(false);

  const owned      = !!(blueprint.owned_by_user_id || blueprint.owned_by || blueprint.owned_by_callsign);
  const isPriority = !!blueprint.is_priority;

  // Dynamic pricing analysis
  const analysis = prices ? computeCraftAnalysis(blueprint, prices) : null;

  useEffect(() => {
    if (focused) {
      setExpanded(true);
    }
  }, [focused]);

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
          borderLeft: focused ? '2px solid var(--acc)' : '2px solid transparent',
          background: focused ? 'rgba(200,168,75,0.08)' : 'transparent',
          transition: 'background 0.12s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.background = focused ? 'rgba(200,168,75,0.10)' : 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = focused ? 'rgba(200,168,75,0.08)' : 'transparent'}
      >
        <NexusToken src={blueprintToken(owned, isPriority)} size={18} alt="blueprint status" />

        {/* Item name */}
        <span style={{
          flex: 1, fontSize: 11,
          color: 'var(--t0)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {blueprint.item_name}
        </span>

        {/* Tier badge */}
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
          fontWeight: 600, letterSpacing: '0.06em',
          background: blueprint.tier === 'T2' ? 'rgba(var(--acc-rgb, 74,143,208), 0.10)' : 'var(--bg3)',
          color: blueprint.tier === 'T2' ? 'var(--acc)' : 'var(--t2)',
          border: `0.5px solid ${blueprint.tier === 'T2' ? 'var(--b2)' : 'var(--b1)'}`,
        }}>
          {blueprint.tier || 'T1'}
        </span>

        {/* Category tag */}
        <CategoryTag category={blueprint.category} />

        {/* Holder callsign or "unowned" */}
        {owned ? (
          <span style={{ color: 'var(--t2)', fontSize: 9, flexShrink: 0 }}>
            {blueprint.owned_by_callsign || '—'}
          </span>
        ) : (
          <span style={{ color: 'var(--t3)', fontSize: 9, flexShrink: 0 }}>unowned</span>
        )}

        {isPriority ? <BlueprintPriorityTag /> : null}

        {/* Market value + craft signal */}
        {analysis && analysis.marketValue > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              color: 'var(--t1)', fontFamily: "'Barlow Condensed', sans-serif",
            }}>{fmtAuec(analysis.marketValue)}</span>
            {analysis.cheaperToBuy ? (
              <span style={{
                fontSize: 8, padding: '1px 5px', borderRadius: 2,
                background: 'rgba(192,57,43,0.12)', border: '0.5px solid rgba(192,57,43,0.3)',
                color: '#C0392B', fontWeight: 600, letterSpacing: '0.06em',
                fontFamily: "'Barlow Condensed', sans-serif",
                display: 'flex', alignItems: 'center', gap: 2,
              }}><TrendingDown size={8} />BUY</span>
            ) : analysis.allPriced ? (
              <span style={{
                fontSize: 8, padding: '1px 5px', borderRadius: 2,
                background: 'rgba(74,140,92,0.12)', border: '0.5px solid rgba(74,140,92,0.3)',
                color: '#4A8C5C', fontWeight: 600, letterSpacing: '0.06em',
                fontFamily: "'Barlow Condensed', sans-serif",
                display: 'flex', alignItems: 'center', gap: 2,
              }}><TrendingUp size={8} />CRAFT</span>
            ) : null}
          </div>
        )}

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
          prices={prices}
        />
      )}
    </>
  );
}