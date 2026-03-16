/**
 * ReadinessGate — pre-op checklist with live % counter.
 * Props: { op, rank, onUpdate }
 *
 * readiness_gate JSON format:
 *   { items: [{ id, title, detail, priority, done, assignee, locked }] }
 *   priority: 'high' | 'warn' | 'low'
 *
 * At 100%: header turns green, "GO — PUBLISH TO DISCORD" button appears.
 * GO button invokes heraldBot action 'opGo' (non-fatal).
 * Design decision: GO button does NOT change op.status — it only fires
 * the Discord announcement. Activating the op uses the "ACTIVATE" button
 * in the LiveOp topbar.
 */
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Zap } from 'lucide-react';

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];

const PRIORITY_BORDER = {
  high: 'var(--danger)',
  warn: 'var(--warn)',
  low:  'var(--t3)',
};

// ─── Gate item row ────────────────────────────────────────────────────────────

function GateItem({ item, canEdit, onToggle }) {
  const borderColor = PRIORITY_BORDER[item.priority] || 'var(--t3)';
  const locked = !!item.locked;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 12px',
      borderLeft: `3px solid ${locked ? 'var(--b1)' : borderColor}`,
      borderBottom: '0.5px solid var(--b0)',
      opacity: locked ? 0.5 : 1,
      background: item.done ? 'rgba(39,201,106,0.03)' : 'transparent',
      transition: 'background 0.15s',
    }}>
      {/* Checkbox */}
      <div
        onClick={() => !locked && canEdit && onToggle(item.id)}
        style={{
          width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1,
          border: `0.5px solid ${item.done ? 'var(--live)' : 'var(--b3)'}`,
          background: item.done ? 'rgba(39,201,106,0.15)' : 'var(--bg3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: locked || !canEdit ? 'default' : 'pointer',
        }}
      >
        {item.done && <Check size={10} style={{ color: 'var(--live)' }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: item.done ? 'var(--t2)' : 'var(--t0)',
          fontSize: 12, fontWeight: item.done ? 400 : 500,
          textDecoration: item.done ? 'line-through' : 'none',
        }}>
          {item.title}
        </div>
        {item.detail && (
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
            {item.detail}
          </div>
        )}
      </div>

      {/* Assignee */}
      {item.assignee && (
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
          border: '0.5px solid var(--b2)', background: 'var(--bg3)',
          color: 'var(--acc)', letterSpacing: '0.05em',
        }}>
          {item.assignee}
        </span>
      )}

      {/* Status */}
      {locked && (
        <span style={{ color: 'var(--t3)', fontSize: 9, flexShrink: 0 }}>LOCKED</span>
      )}
    </div>
  );
}

// ─── ReadinessGate ────────────────────────────────────────────────────────────

export default function ReadinessGate({ op, rank, onUpdate }) {
  const canEdit  = PIONEER_RANKS.includes(rank) || ['VOYAGER'].includes(rank);
  const [goFired, setGoFired] = useState(false);

  const gate  = op.readiness_gate || {};
  const items = Array.isArray(gate.items) ? gate.items : [];

  const total    = items.length;
  const done     = items.filter(i => i.done).length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const isGo     = pct === 100;

  const headerBg = isGo
    ? 'rgba(39,201,106,0.07)'
    : 'rgba(232,160,32,0.05)';
  const headerBorder = isGo
    ? 'rgba(39,201,106,0.25)'
    : 'rgba(232,160,32,0.2)';
  const pctColor = isGo ? 'var(--live)' : 'var(--warn)';

  const toggleItem = async (itemId) => {
    const newItems = items.map(i =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    const newGate = { ...gate, items: newItems };
    try {
      await base44.entities.Op.update(op.id, { readiness_gate: newGate });
      onUpdate?.();
    } catch (e) {
      console.error('[ReadinessGate] toggle failed:', e);
    }
  };

  const handleGo = () => {
    setGoFired(true);
    base44.functions.invoke('heraldBot', {
      action:  'opGo',
      payload: { op_id: op.id, op_name: op.name },
    }).catch(e => console.warn('[ReadinessGate] heraldBot opGo failed:', e.message));
  };

  return (
    <div style={{
      border: `0.5px solid ${headerBorder}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: headerBg, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* % counter */}
          <span style={{
            fontSize: 28, fontWeight: 500, color: pctColor,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {pct}%
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500 }}>
              READINESS GATE
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 1 }}>
              {done}/{total} items complete
            </div>
          </div>
          {/* GO button — only at 100% */}
          {isGo && !goFired && canEdit && (
            <button
              onClick={handleGo}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6,
                background: 'rgba(39,201,106,0.1)',
                border: '0.5px solid rgba(39,201,106,0.4)',
                color: 'var(--live)', fontFamily: 'inherit',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              <Zap size={12} />
              GO — PUBLISH TO DISCORD
            </button>
          )}
          {isGo && goFired && (
            <span style={{ color: 'var(--live)', fontSize: 11, letterSpacing: '0.08em' }}>
              ✓ SENT
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 10, height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 1,
            width: `${pct}%`,
            background: pctColor,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div style={{ padding: '14px', color: 'var(--t2)', fontSize: 11, textAlign: 'center' }}>
          No gate items defined.
        </div>
      ) : (
        <div style={{ background: 'var(--bg1)' }}>
          {items.map(item => (
            <GateItem
              key={item.id}
              item={item}
              canEdit={canEdit}
              onToggle={toggleItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
