/**
 * Shared atoms, constants, and sub-components for OpCreator.
 * Import from here rather than duplicating inside OpCreator.jsx.
 */
import React, { useState } from 'react';
import { X, GripVertical } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { opTypeToken } from '@/lib/tokenMap';

// ─── Constants ────────────────────────────────────────────────────────────────

export const OP_TYPES = [
  'INDUSTRY', 'MINING', 'ROCKBREAKER', 'SALVAGE',
  'PATROL', 'COMBAT', 'ESCORT', 'S17', 'RESCUE', 'RACING',
];

export const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

export const RANK_GATES = [
  { value: 'AFFILIATE', label: 'Any rank' },
  { value: 'SCOUT',     label: 'Scout+' },
  { value: 'VOYAGER',   label: 'Voyager+' },
  { value: 'PIONEER',   label: 'Founder+' },
];

const OP_TYPE_DEFAULTS = {
  ROCKBREAKER: {
    roles:  [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Hauler', capacity: 2 }, { name: 'Refinery Coord', capacity: 1 }],
    phases: ['Staging', 'Breach & Clear', 'Power Up', 'Craft Lenses', 'Fire Laser', 'Harvest & Extract'],
  },
  MINING: {
    roles:  [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Fabricator', capacity: 1 }, { name: 'Scout', capacity: 1 }],
    phases: ['Staging', 'Transit', 'Mining', 'Extraction', 'Refinery Run'],
  },
  PATROL: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  COMBAT: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  ESCORT: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  S17: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  SALVAGE: {
    roles:  [{ name: 'Salvage', capacity: 3 }, { name: 'Escort', capacity: 2 }],
    phases: ['Staging', 'Main Op', 'Extraction'],
  },
  RESCUE: {
    roles:  [{ name: 'Rescue', capacity: 3 }, { name: 'Medical', capacity: 1 }],
    phases: ['Staging', 'Main Op', 'Extraction'],
  },
};

const DEFAULT_DEFAULTS = {
  roles:  [{ name: '', capacity: 1 }],
  phases: ['Staging', 'Main Op', 'Extraction'],
};

export function getDefaults(type) {
  return OP_TYPE_DEFAULTS[type] || DEFAULT_DEFAULTS;
}

// ─── Style atoms ──────────────────────────────────────────────────────────────

export const LABEL = {
  color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em',
  display: 'block', marginBottom: 5,
};

export function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

export function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

export function SegmentedControl({ options, value, onChange, tokenFn = null }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 3,
      background: 'var(--bg3)', border: '0.5px solid var(--b2)',
      borderRadius: 8, padding: 3,
    }}>
      {options.map(opt => {
        const val    = typeof opt === 'object' ? opt.value : opt;
        const lbl    = typeof opt === 'object' ? opt.label : opt;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            style={{
              padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.07em',
              border: active ? '0.5px solid var(--b3)' : '0.5px solid transparent',
              background: active ? 'var(--bg5)' : 'transparent',
              color: active ? 'var(--t0)' : 'var(--t2)',
              transition: 'all 0.12s', fontWeight: active ? 600 : 400,
              display: tokenFn ? 'inline-flex' : undefined,
              alignItems: tokenFn ? 'center' : undefined,
              gap: tokenFn ? 4 : undefined,
            }}
          >
            {tokenFn && <NexusToken src={tokenFn(val)} size={16} alt={val} />}
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({ label, description = '', checked, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', background: 'var(--bg2)',
      border: '0.5px solid var(--b1)', borderRadius: 6,
    }}>
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 12 }}>{label}</div>
        {description && <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
          background: checked ? 'var(--live)' : 'var(--bg4)',
          border: `0.5px solid ${checked ? 'var(--live)' : 'var(--b3)'}`,
          position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: 'var(--bg0)',
          position: 'absolute', top: 2, left: checked ? 18 : 2, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// ─── Role slot editor ─────────────────────────────────────────────────────────

function getRoleColour(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('mining'))    return 'var(--info)';
  if (lower.includes('escort'))    return 'var(--danger)';
  if (lower.includes('fabricator')) return 'var(--acc2)';
  if (lower.includes('scout'))     return 'var(--live)';
  if (lower.includes('hauler'))    return 'var(--warn)';
  return 'var(--b2)';
}

export function RoleSlotEditor({ slots, onChange, error = null }) {
  const adjust = (i, delta) => {
    const next = [...slots];
    next[i] = { ...next[i], capacity: Math.max(1, Math.min(10, (next[i].capacity || 1) + delta)) };
    onChange(next);
  };
  const rename = (i, name) => {
    const next = [...slots];
    next[i] = { ...next[i], name };
    onChange(next);
  };
  const remove = (i) => onChange(slots.filter((_, idx) => idx !== i));
  const add    = () => onChange([...slots, { name: '', capacity: 1 }]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: 'inherit' }}>
        Role Slots
      </div>
      {slots.map((slot, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
            borderBottom: '0.5px solid var(--b0)',
          }}
        >
          {/* Colour dot */}
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: getRoleColour(slot.name), flexShrink: 0,
            }}
          />

          {/* Role name input */}
          <input
            className="nexus-input"
            style={{ flex: 1, height: 32, fontSize: 11, borderColor: error ? 'var(--warn)' : undefined }}
            placeholder="Role name e.g. Mining Lead"
            value={slot.name}
            onChange={e => rename(i, e.target.value)}
          />

          {/* Capacity controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button
              type="button"
              onClick={() => adjust(i, -1)}
              style={{
                width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                color: 'var(--t1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit', fontSize: 11,
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
            >−</button>
            <span style={{
              color: 'var(--t0)', fontSize: 11, minWidth: 28, textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {slot.capacity}
            </span>
            <button
              type="button"
              onClick={() => adjust(i, 1)}
              style={{
                width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                color: 'var(--t1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit', fontSize: 11,
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
            >+</button>
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={slots.length === 1}
            style={{
              width: 24, height: 24, background: 'none', border: 'none',
              cursor: slots.length > 1 ? 'pointer' : 'not-allowed',
              color: slots.length > 1 ? 'var(--t3)' : 'var(--t3)', padding: 0,
              borderRadius: 4, fontFamily: 'inherit', fontSize: 14,
              opacity: slots.length === 1 ? 0.4 : 1,
              transition: 'color 120ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { if (slots.length > 1) e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          width: '100%', background: 'none', border: '0.5px dashed var(--b1)',
          cursor: 'pointer', color: 'var(--t2)', fontSize: 10, fontFamily: 'inherit',
          letterSpacing: '0.08em', padding: '8px 0', borderRadius: 4,
          transition: 'border-color 120ms',
          textTransform: 'uppercase',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--acc-rgb), 0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b1)'; }}
      >
        + Add Role Slot
      </button>
    </div>
  );
}

// ─── Phase editor (drag to reorder) ──────────────────────────────────────────

export function PhaseEditor({ phases, onChange }) {
  const [dragging, setDragging] = useState(null);

  const handleDrop = (e, target) => {
    e.preventDefault();
    if (dragging === null || dragging === target) { setDragging(null); return; }
    const next = [...phases];
    const [item] = next.splice(dragging, 1);
    next.splice(target, 0, item);
    onChange(next);
    setDragging(null);
  };

  const updateName = (i, val) => {
    const next = [...phases];
    next[i] = val;
    onChange(next);
  };

  const remove = (i) => onChange(phases.filter((_, idx) => idx !== i));
  const add    = () => onChange([...phases, '']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {phases.map((phase, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => setDragging(i)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, i)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 0', borderBottom: '0.5px solid var(--b0)',
            background: dragging === i ? 'var(--bg3)' : 'transparent',
            border: dragging === i ? '0.5px solid var(--b2)' : 'none',
            borderRadius: dragging === i ? 6 : 0,
            opacity: dragging === i ? 0.9 : 1,
            cursor: 'grab',
            transition: 'all 120ms',
          }}
        >
          {/* Drag handle */}
          <div style={{ color: 'var(--t3)', fontSize: 12, flexShrink: 0, cursor: 'grab', marginRight: 4, fontFamily: 'inherit', userSelect: 'none' }}>
            ⠿
          </div>

          {/* Phase name input */}
          <input
            className="nexus-input"
            value={phase}
            onChange={e => updateName(i, e.target.value)}
            style={{ flex: 1, height: 28, fontSize: 11 }}
            placeholder="Phase name"
          />

          {/* Delete button */}
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={phases.length === 1}
            style={{
              background: 'none', border: 'none', cursor: phases.length > 1 ? 'pointer' : 'not-allowed',
              color: 'var(--t3)', padding: 0, opacity: phases.length === 1 ? 0.4 : 1,
              fontFamily: 'inherit', fontSize: 14,
              transition: 'color 120ms',
            }}
            onMouseEnter={e => { if (phases.length > 1) e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          width: '100%', background: 'none', border: '0.5px dashed var(--b1)',
          cursor: 'pointer', color: 'var(--t2)', fontSize: 10, fontFamily: 'inherit',
          letterSpacing: '0.08em', padding: '8px 0', borderRadius: 4,
          transition: 'border-color 120ms',
          textTransform: 'uppercase',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--acc-rgb), 0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b1)'; }}
      >
        + Add Phase
      </button>
    </div>
  );
}