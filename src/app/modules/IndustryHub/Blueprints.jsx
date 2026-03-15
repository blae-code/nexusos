/**
 * Blueprints tab — Industry Hub
 * Full registry with recipe panel, priority tracking, gap analysis.
 * Props: { blueprints, materials, rank, callsign, onRefresh }
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, ChevronDown, ChevronUp, Plus, X, Search, Wrench } from 'lucide-react';

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
  { id: 'OWNED',    label: 'OWNED',    matches: b => !!(b.owned_by || b.owned_by_callsign) },
  { id: 'UNOWNED',  label: 'UNOWNED',  matches: b => !(b.owned_by || b.owned_by_callsign) },
  { id: 'PRIORITY', label: 'PRIORITY', matches: b => !!b.is_priority },
];

// ─── Shared style objects ─────────────────────────────────────────────────────

const LABEL = { color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 };

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Check ingredient against org material stock. Returns 'OK' | 'LOW' | 'NONE' */
function ingredientStatus(ingredient, materials) {
  const match = materials.find(
    m => (m.material_name || '').toLowerCase() === (ingredient.material_name || '').toLowerCase()
  );
  if (!match || (match.quantity_scu || 0) === 0) return 'NONE';
  if ((match.quality_pct || 0) < (ingredient.min_quality || 0)) return 'LOW';
  return 'OK';
}

/** Count recipe ingredients with zero org stock */
function countMissingIngredients(bp, materials) {
  return (bp.recipe_materials || []).filter(
    ing => ingredientStatus(ing, materials) === 'NONE'
  ).length;
}

// ─── Dialog overlay — position:absolute, scoped to positioned container ───────
// Same pattern as KeyManagement. No position:fixed.
function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,8,11,0.86)', zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      {children}
    </div>
  );
}

function DialogCard({ children, width = 480 }) {
  return (
    <div
      className="nexus-fade-in"
      style={{
        width, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 10, padding: 24, maxHeight: '85vh', overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

function DialogHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>{title}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 9px', fontSize: 9, letterSpacing: '0.08em',
        borderRadius: 5, border: `0.5px solid ${active ? 'var(--b3)' : 'var(--b1)'}`,
        background: active ? 'var(--bg4)' : 'var(--bg2)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
      }}
    >{label}</button>
  );
}

function TierBadge({ tier }) {
  const isT2 = tier === 'T2';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
      border: `0.5px solid ${isT2 ? 'rgba(39,201,106,0.4)' : 'var(--b2)'}`,
      background: isT2 ? 'rgba(39,201,106,0.1)' : 'var(--bg3)',
      color: isT2 ? 'var(--live)' : 'var(--t2)',
      letterSpacing: '0.05em',
    }}>{tier || 'T1'}</span>
  );
}

function CategoryTag({ category }) {
  return (
    <span style={{
      fontSize: 9, padding: '1px 6px', borderRadius: 4,
      border: '0.5px solid var(--b1)', background: 'var(--bg3)',
      color: 'var(--t2)', letterSpacing: '0.06em',
    }}>{category}</span>
  );
}

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

// ─── Autocomplete input ───────────────────────────────────────────────────────

function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, style: extraStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="nexus-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        style={extraStyle}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: 'var(--bg3)', border: '0.5px solid var(--b2)',
          borderRadius: '0 0 6px 6px', maxHeight: 180, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              style={{ padding: '7px 10px', color: 'var(--t0)', fontSize: 12, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recipe panel (lazy — renders only when expanded) ─────────────────────────

function RecipePanel({ blueprint, materials, callsign, onCraftQueued }) {
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
    } catch (e) {
      console.error('[Blueprints] craft queue create failed:', e);
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
              className="nexus-btn"
              style={{
                padding: '4px 12px', fontSize: 10,
                background: 'rgba(39,201,106,0.08)', borderColor: 'rgba(39,201,106,0.3)',
                color: 'var(--live)',
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

// ─── Single blueprint row ─────────────────────────────────────────────────────

function BlueprintRow({ blueprint, isPioneer, materials, callsign, onTogglePriority, onCraftQueued }) {
  const [expanded, setExpanded] = useState(false);

  const owned      = !!(blueprint.owned_by || blueprint.owned_by_callsign);
  const isPriority = !!blueprint.is_priority;

  // Dot colour: warn=priority, acc2=owned (not priority), t3=unowned
  const dotColor = isPriority ? 'var(--warn)' : owned ? 'var(--acc2)' : 'var(--t3)';

  return (
    <>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 12px',
          borderBottom: '0.5px solid var(--b0)',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* 6px status dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />

        {/* Item name */}
        <span style={{
          flex: 1, fontSize: 12, fontWeight: owned ? 500 : 400,
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
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: 'var(--bg3)', border: '0.5px solid var(--b2)',
            color: 'var(--acc)', letterSpacing: '0.04em', flexShrink: 0,
          }}>
            {blueprint.owned_by_callsign || '—'}
          </span>
        ) : (
          <span style={{ color: 'var(--t3)', fontSize: 10, flexShrink: 0 }}>Unowned</span>
        )}

        {/* Priority toggle — Pioneer+ only */}
        {isPioneer && (
          <button
            onClick={() => onTogglePriority(blueprint)}
            title={isPriority ? 'Remove priority' : 'Mark as priority'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 3,
              color: isPriority ? 'var(--warn)' : 'var(--t3)',
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <Star size={13} fill={isPriority ? 'var(--warn)' : 'none'} />
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

// ─── Priority flag panel (Pioneer+ only, collapsible) ─────────────────────────

function PriorityPanel({ blueprints, materials, onClearPriority }) {
  const [open, setOpen] = useState(true);
  const priorityBPs = blueprints.filter(b => b.is_priority);

  if (priorityBPs.length === 0) return null;

  return (
    <div style={{ border: '0.5px solid rgba(232,160,32,0.3)', borderRadius: 7, overflow: 'hidden', marginBottom: 0 }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'rgba(232,160,32,0.06)', border: 'none',
          borderBottom: open ? '0.5px solid rgba(232,160,32,0.2)' : 'none',
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
                <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {bp.item_name}
                </span>
                <CategoryTag category={bp.category} />
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  background: `${gapColor}12`, border: `0.5px solid ${gapColor}40`,
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

// ─── Gap analysis sidebar ─────────────────────────────────────────────────────

function GapSidebar({ blueprints, materials }) {
  const owned       = blueprints.filter(b => !!(b.owned_by || b.owned_by_callsign)).length;
  const t2Total     = blueprints.filter(b => b.tier === 'T2').length;
  const t2Owned     = blueprints.filter(b => b.tier === 'T2' && !!(b.owned_by || b.owned_by_callsign)).length;
  const priorityGaps = blueprints.filter(b => b.is_priority && !(b.owned_by || b.owned_by_callsign));

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
      <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 12 }}>CRAFTING GAPS</div>
        <CoverageStat label="COVERAGE"    num={owned}   denom={blueprints.length} />
        <CoverageStat label="T2 COVERAGE" num={t2Owned} denom={t2Total} />
      </div>

      {/* Priority gaps */}
      {priorityGaps.length > 0 && (
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '12px 14px' }}>
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

// ─── Add Blueprint dialog (Pioneer+ only) ─────────────────────────────────────

function AddBlueprintDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    item_name: '', wiki_item_id: '', category: 'WEAPON',
    tier: 'T1', owned_by_callsign: '', owned_by: null,
  });
  const [recipe, setRecipe]           = useState([{ material_name: '', min_quality: 80, quantity_scu: '' }]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [callsignSuggestions, setCallsignSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Debounce ref for autocomplete
  const debounceRef = useRef(null);

  // Wiki item autocomplete — queries game_cache_items (not external API)
  const loadItemSuggestions = useCallback(async (query) => {
    if (query.length < 3) { setItemSuggestions([]); return; }
    try {
      const results = await base44.entities.game_cache_items.list('-item_name', 100);
      setItemSuggestions(
        (results || [])
          .filter(r => (r.item_name || r.name || '').toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10)
          .map(r => ({ label: r.item_name || r.name, id: r.id, item_name: r.item_name || r.name }))
      );
    } catch { setItemSuggestions([]); }
  }, []);

  // Callsign autocomplete — queries NexusUser
  const loadCallsignSuggestions = useCallback(async (query) => {
    if (query.length < 2) { setCallsignSuggestions([]); return; }
    try {
      const results = await base44.entities.NexusUser.list('-joined_at', 100);
      setCallsignSuggestions(
        (results || [])
          .filter(u => (u.callsign || '').toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
          .map(u => ({ label: u.callsign, id: u.discord_id, callsign: u.callsign }))
      );
    } catch { setCallsignSuggestions([]); }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addIngredient = () =>
    setRecipe(r => [...r, { material_name: '', min_quality: 80, quantity_scu: '' }]);

  const removeIngredient = (i) =>
    setRecipe(r => r.filter((_, idx) => idx !== i));

  const updateIngredient = (i, field, value) =>
    setRecipe(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const handleSubmit = async () => {
    if (!form.item_name.trim()) { setError('ITEM NAME REQUIRED'); return; }
    setLoading(true); setError('');
    try {
      const cleanRecipe = recipe
        .filter(r => r.material_name.trim())
        .map(r => ({
          material_name: r.material_name.trim(),
          min_quality:   parseFloat(r.min_quality) || 0,
          quantity_scu:  parseFloat(r.quantity_scu) || 0,
        }));

      await base44.entities.Blueprint.create({
        item_name:          form.item_name.trim(),
        wiki_item_id:       form.wiki_item_id || null,
        category:           form.category,
        tier:               form.tier,
        owned_by_callsign:  form.owned_by_callsign || null,
        owned_by:           form.owned_by || null,
        is_priority:        false,
        recipe_materials:   cleanRecipe,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e?.message || 'CREATE FAILED');
    }
    setLoading(false);
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' };

  return (
    <Overlay onDismiss={onClose}>
      <DialogCard width={500}>
        <DialogHeader title="ADD BLUEPRINT" onClose={onClose} />

        {error && (
          <div style={{ background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.3)', borderRadius: 5, padding: '7px 10px', color: 'var(--danger)', fontSize: 11, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Item name with wiki autocomplete */}
          <div>
            <label style={LABEL}>ITEM NAME</label>
            <AutocompleteInput
              value={form.item_name}
              placeholder="Search wiki items..."
              suggestions={itemSuggestions}
              onChange={v => {
                set('item_name', v);
                clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => loadItemSuggestions(v), 250);
              }}
              onSelect={s => { set('item_name', s.item_name); set('wiki_item_id', s.id); setItemSuggestions([]); }}
              style={inputStyle}
            />
          </div>

          {/* Category + tier row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>CATEGORY</label>
              <select
                className="nexus-input"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                style={{ cursor: 'pointer', width: '100%' }}
              >
                {['WEAPON', 'ARMOR', 'GEAR', 'COMPONENT', 'CONSUMABLE'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={LABEL}>TIER</label>
              <select
                className="nexus-input"
                value={form.tier}
                onChange={e => set('tier', e.target.value)}
                style={{ cursor: 'pointer', width: '100%' }}
              >
                <option value="T1">T1</option>
                <option value="T2">T2</option>
              </select>
            </div>
          </div>

          {/* Holder callsign with autocomplete */}
          <div>
            <label style={LABEL}>HOLDER CALLSIGN <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(optional)</span></label>
            <AutocompleteInput
              value={form.owned_by_callsign}
              placeholder="Who holds this blueprint?"
              suggestions={callsignSuggestions}
              onChange={v => {
                set('owned_by_callsign', v);
                clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => loadCallsignSuggestions(v), 250);
              }}
              onSelect={s => { set('owned_by_callsign', s.callsign); set('owned_by', s.id); setCallsignSuggestions([]); }}
              style={inputStyle}
            />
          </div>

          {/* Recipe materials — dynamic rows */}
          <div>
            <label style={LABEL}>RECIPE MATERIALS</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Column headers */}
              <div style={{ display: 'flex', gap: 6, padding: '0 0 2px' }}>
                <span style={{ flex: 2, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>MATERIAL</span>
                <span style={{ width: 80, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>MIN QUAL%</span>
                <span style={{ width: 80, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>QTY SCU</span>
                <span style={{ width: 24 }} />
              </div>
              {recipe.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    className="nexus-input"
                    style={{ flex: 2 }}
                    placeholder="Laranite"
                    value={row.material_name}
                    onChange={e => updateIngredient(i, 'material_name', e.target.value)}
                  />
                  <input
                    className="nexus-input"
                    style={{ width: 80 }}
                    type="number" min="0" max="100" step="1"
                    value={row.min_quality}
                    onChange={e => updateIngredient(i, 'min_quality', e.target.value)}
                  />
                  <input
                    className="nexus-input"
                    style={{ width: 80 }}
                    type="number" min="0" step="0.1"
                    placeholder="SCU"
                    value={row.quantity_scu}
                    onChange={e => updateIngredient(i, 'quantity_scu', e.target.value)}
                  />
                  <button
                    onClick={() => removeIngredient(i)}
                    disabled={recipe.length === 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, width: 24 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addIngredient}
              className="nexus-btn"
              style={{ padding: '3px 9px', fontSize: 9, marginTop: 8 }}
            >
              <Plus size={10} /> ADD INGREDIENT
            </button>
          </div>
        </div>

        {/* Submit row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', padding: '9px 0', fontSize: 11 }}>
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="nexus-btn primary"
            style={{ flex: 2, justifyContent: 'center', padding: '9px 0', fontSize: 11, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'SAVING...' : 'ADD BLUEPRINT →'}
          </button>
        </div>
      </DialogCard>
    </Overlay>
  );
}

// ─── Main Blueprints component ────────────────────────────────────────────────

export default function Blueprints({ blueprints, materials, rank, callsign, onRefresh }) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [search, setSearch]                 = useState('');
  const [showAddDialog, setShowAddDialog]   = useState(false);

  const isPioneer = PIONEER_RANKS.includes(rank);

  // ── Filter + sort ─────────────────────────────────────

  const categoryMatch = CATEGORY_FILTERS.find(f => f.id === categoryFilter) || CATEGORY_FILTERS[0];
  const ownershipMatch = OWNERSHIP_FILTERS.find(f => f.id === ownershipFilter) || OWNERSHIP_FILTERS[0];

  const filtered = blueprints
    .filter(b => categoryMatch.matches(b))
    .filter(b => ownershipMatch.matches(b))
    .filter(b => !search.trim() || (b.item_name || '').toLowerCase().includes(search.trim().toLowerCase()));

  // Sort: T2 first, then alphabetical within tier
  const sorted = [...filtered].sort((a, b) => {
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blueprints..."
              style={{
                background: 'var(--bg2)', border: '0.5px solid var(--b2)',
                color: 'var(--t0)', fontFamily: 'inherit', fontSize: 11,
                padding: '5px 10px 5px 26px', borderRadius: 5, outline: 'none', width: '100%',
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
              className="nexus-btn primary"
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
          <div style={{ border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 12px', background: 'var(--bg2)',
              borderBottom: '0.5px solid var(--b1)',
              color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em',
            }}>
              <div style={{ width: 6, flexShrink: 0 }} />
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
                isPioneer={isPioneer}
                materials={materials}
                callsign={callsign}
                onTogglePriority={handleTogglePriority}
                onCraftQueued={onRefresh}
              />
            ))}

            {sorted.length === 0 && (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--t2)', fontSize: 11, fontStyle: 'italic' }}>
                No blueprints match this filter
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
