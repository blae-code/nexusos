/**
 * Blueprints tab — Industry Hub
 * Full registry with recipe panel, priority tracking, gap analysis.
 * Props: { blueprints, materials, rank, callsign, onRefresh }
 */
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { Plus, Search } from 'lucide-react';
import NexusToken from '@/core/design/NexusToken';
import { T } from '@/core/data/tokenMap';
import { Chip } from './BlueprintFilterChips';
import BlueprintRow from './BlueprintRow';
import PriorityPanel from './PriorityPanel';
import GapSidebar from './GapSidebar';
import AddBlueprintDialog from './AddBlueprintDialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];

const CATEGORY_FILTERS = [
  { id: 'ALL',          label: 'ALL',          matches: () => true },
  { id: 'WEAPONS',      label: 'WEAPONS',      matches: b => b.category === 'WEAPON' },
  { id: 'ARMOR_GEAR',   label: 'ARMOR & GEAR', matches: b => b.category === 'ARMOR' || b.category === 'GEAR' },
  { id: 'GEAR',         label: 'GEAR',         matches: b => b.category === 'GEAR' },
  { id: 'COMPONENTS',   label: 'COMPONENTS',   matches: b => b.category === 'COMPONENT' },
  { id: 'CONSUMABLES',  label: 'CONSUMABLES',  matches: b => b.category === 'CONSUMABLE' },
];

const OWNERSHIP_FILTERS = [
  { id: 'ALL',      label: 'ALL',      matches: () => true },
  { id: 'OWNED',    label: 'OWNED',    matches: b => !!(b.owned_by_user_id || b.owned_by || b.owned_by_callsign) },
  { id: 'UNOWNED',  label: 'UNOWNED',  matches: b => !(b.owned_by_user_id || b.owned_by || b.owned_by_callsign) },
  { id: 'PRIORITY', label: 'PRIORITY', matches: b => !!b.is_priority },
];

// ─── Main Blueprints component ────────────────────────────────────────────────

export default function Blueprints({ blueprints, materials, rank, callsign, onRefresh }) {
  const [searchParams] = useSearchParams();
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [search, setSearch]                 = useState('');
  const [showAddDialog, setShowAddDialog]   = useState(false);
  const focusedBlueprintId = searchParams.get('blueprint') || '';

  const isPioneer = PIONEER_RANKS.includes(rank);

  // ── Filter + sort ─────────────────────────────────────

  const categoryMatch = CATEGORY_FILTERS.find(f => f.id === categoryFilter) || CATEGORY_FILTERS[0];
  const ownershipMatch = OWNERSHIP_FILTERS.find(f => f.id === ownershipFilter) || OWNERSHIP_FILTERS[0];

  const filtered = blueprints
    .filter(b => b.id === focusedBlueprintId || categoryMatch.matches(b))
    .filter(b => b.id === focusedBlueprintId || ownershipMatch.matches(b))
    .filter(b => b.id === focusedBlueprintId || !search.trim() || (b.item_name || '').toLowerCase().includes(search.trim().toLowerCase()));

  // Sort: T2 first, then alphabetical within tier
  const sorted = [...filtered].sort((a, b) => {
    if (a.id === focusedBlueprintId || b.id === focusedBlueprintId) {
      return a.id === focusedBlueprintId ? -1 : 1;
    }
    if (a.tier !== b.tier) return a.tier === 'T2' ? -1 : 1;
    return (a.item_name || '').localeCompare(b.item_name || '');
  });

  // ── Priority toggle ───────────────────────────────────

  const handleTogglePriority = async (bp) => {
    await base44.entities.Blueprint.update(bp.id, { is_priority: !bp.is_priority });
    onRefresh();
  };

  // ── Render ────────────────────────────────────────────

  return (
    // position:relative so Overlay (position:absolute) is scoped here
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* ── Header bar ───────────────────────────────── */}
      <div style={{
        padding: '10px 16px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)', flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* Row 1: search + category chips + ownership chips + add button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 180 }}>
            <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)', pointerEvents: 'none' }} />
            <input
              className="nexus-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blueprints..."
              style={{
                width: '100%',
                height: 30,
                padding: '0 10px 0 26px',
                fontSize: 11,
              }}
            />
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 3 }}>
            {CATEGORY_FILTERS.map(f => (
              <Chip key={f.id} label={f.label} active={categoryFilter === f.id} onClick={() => setCategoryFilter(f.id)} />
            ))}
          </div>

          {/* Ownership chips */}
          <div style={{ display: 'flex', gap: 3 }}>
            {OWNERSHIP_FILTERS.map(f => (
              <Chip key={f.id} label={f.label} active={ownershipFilter === f.id} onClick={() => setOwnershipFilter(f.id)} />
            ))}
          </div>

          {/* Add Blueprint — Pioneer+ only */}
          {isPioneer && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="nexus-btn nexus-btn-solid"
              style={{ padding: '4px 12px', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}
            >
              <Plus size={11} /> ADD BLUEPRINT
            </button>
          )}
        </div>
      </div>

      {/* ── Main content area ─────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>
        <div style={{ flex: 1, minWidth: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Priority flag panel — Pioneer+ only */}
          {isPioneer && (
            <PriorityPanel
              blueprints={blueprints}
              materials={materials}
              onClearPriority={bp => handleTogglePriority(bp)}
            />
          )}

          {/* Blueprint list */}
          <div style={{ border: '0.5px solid var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 12px', background: 'var(--bg2)',
              borderBottom: '0.5px solid var(--b1)',
              color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em',
            }}>
              <div style={{ width: 18, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>BLUEPRINT</div>
              <div style={{ width: 32 }}>TIER</div>
              <div style={{ width: 80 }}>CATEGORY</div>
              <div style={{ width: 90 }}>HOLDER</div>
              {isPioneer && <div style={{ width: 20 }} />}
              <div style={{ width: 20 }} />
            </div>

            {sorted.map(bp => (
              <BlueprintRow
                key={bp.id}
                blueprint={bp}
                focused={bp.id === focusedBlueprintId}
                isPioneer={isPioneer}
                materials={materials}
                callsign={callsign}
                onTogglePriority={handleTogglePriority}
                onCraftQueued={onRefresh}
              />
            ))}

            {sorted.length === 0 && (
              <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <NexusToken
                  src={blueprints.length === 0 ? T('square-grey') : T('square-orange')}
                  size={32}
                  opacity={0.35}
                  alt="No blueprints"
                />
                <span style={{ color: 'var(--t2)', fontSize: 11 }}>
                  {blueprints.length === 0
                    ? 'No blueprints registered — add one to start tracking crafting capacity'
                    : 'No blueprints match this filter'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Gap analysis sidebar (240px) ──────────── */}
        <div style={{ width: 240, flexShrink: 0, borderLeft: '0.5px solid var(--b1)', padding: '12px 14px', overflowY: 'auto' }}>
          <GapSidebar blueprints={blueprints} materials={materials} />
        </div>
      </div>

      {/* ── Add Blueprint dialog (position:absolute, scoped) ── */}
      {showAddDialog && (
        <AddBlueprintDialog
          onClose={() => setShowAddDialog(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}
