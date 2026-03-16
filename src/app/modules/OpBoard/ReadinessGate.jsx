import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';

const EDIT_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];
const PRIORITY_BORDER = {
  high: 'var(--danger)',
  warn: 'var(--warn)',
  low: 'var(--t3)',
};

function GateItem({ item, canEdit, onToggle }) {
  const locked = Boolean(item.locked);
  const isDone = Boolean(item.done);
  const canInteract = canEdit && !locked;
  const statusText = isDone ? 'DONE' : item.priority === 'high' ? 'WARN' : 'OPEN';
  const statusColor = isDone ? 'var(--live)' : locked ? 'var(--t3)' : item.priority === 'high' ? 'var(--warn)' : 'var(--t3)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 11px',
        background: 'var(--bg1)',
        border: '0.5px solid var(--b0)',
        borderRadius: 6,
        cursor: canInteract ? 'pointer' : locked ? 'not-allowed' : 'default',
        transition: 'all .12s',
        opacity: locked ? 0.5 : 1,
        userSelect: 'none',
        pointerEvents: locked ? 'none' : 'auto',
      }}
      onMouseEnter={(event) => {
        if (canInteract) {
          event.currentTarget.style.background = 'var(--bg2)';
          event.currentTarget.style.borderColor = 'var(--b1)';
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'var(--bg1)';
        event.currentTarget.style.borderColor = 'var(--b0)';
      }}
      onClick={() => {
        if (canInteract) {
          onToggle(item.id);
        }
      }}
    >
      <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: PRIORITY_BORDER[item.priority] || 'var(--t3)', flexShrink: 0 }} />

      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `0.5px solid ${isDone ? 'var(--live-b)' : 'var(--b2)'}`,
          background: isDone ? 'var(--live-bg)' : 'var(--bg2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isDone ? <span className="nexus-tick" style={{ color: 'var(--live)', fontSize: 10 }}>✓</span> : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: isDone ? 'var(--t2)' : 'var(--t1)', fontSize: 11, textDecoration: isDone ? 'line-through' : 'none' }}>
          {item.title}
        </div>
        {item.detail ? <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 1 }}>{item.detail}</div> : null}
      </div>

      {item.assignee ? (
        <div
          className="nexus-avatar"
          style={{
            width: 18,
            height: 18,
            fontSize: 8,
            borderColor: isDone ? 'var(--live)' : 'var(--b2)',
            color: 'var(--t1)',
          }}
        >
          {String(item.assignee).slice(0, 1).toUpperCase()}
        </div>
      ) : null}

      <span style={{ color: statusColor, fontSize: 9, whiteSpace: 'nowrap' }}>{statusText}</span>
    </div>
  );
}

export default function ReadinessGate({ op, rank, onUpdate }) {
  const canEdit = EDIT_RANKS.includes(rank);
  const [goFired, setGoFired] = useState(false);
  const gate = op.readiness_gate || {};
  const items = Array.isArray(gate.items) ? gate.items : [];
  const done = items.filter((item) => item.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const isGo = pct === 100;

  const toggleItem = async (itemId) => {
    const nextGate = {
      ...gate,
      items: items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    };

    try {
      await base44.entities.Op.update(op.id, { readiness_gate: nextGate });
      onUpdate?.();
    } catch (error) {
      console.error('[ReadinessGate] toggle failed:', error);
    }
  };

  const handleGo = () => {
    setGoFired(true);
    base44.functions.invoke('heraldBot', {
      action: 'opGo',
      payload: { op_id: op.id, op_name: op.name },
    }).catch((error) => console.warn('[ReadinessGate] heraldBot opGo failed:', error.message));
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 8,
          border: `0.5px solid ${isGo ? 'var(--live-b)' : 'var(--b2)'}`,
          background: isGo ? 'var(--live-bg)' : 'var(--bg1)',
          transition: 'all .3s',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: isGo ? 'var(--live)' : 'var(--warn)' }}>
          {pct}%
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: isGo ? 'var(--live)' : 'var(--t0)', fontSize: 12, fontWeight: 500, marginBottom: 2 }}>READINESS GATE</div>
          <div style={{ color: 'var(--t2)', fontSize: 9 }}>{done}/{items.length} items complete</div>
        </div>
        <div style={{ flex: 1, maxWidth: 120 }}>
          <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: isGo ? 'var(--live)' : 'var(--warn)', transition: 'width .5s ease-out' }} />
          </div>
        </div>
        {isGo && canEdit && !goFired ? (
          <button
            onClick={handleGo}
            className="nexus-btn nexus-btn-go"
            style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}
          >
            <Zap size={12} />
            GO - PUBLISH TO DISCORD
          </button>
        ) : null}
        {isGo && goFired ? <span style={{ color: 'var(--live)', fontSize: 11 }}>✓ SENT</span> : null}
      </div>

      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <div style={{ color: 'var(--t2)', fontSize: 11, padding: '8px 0' }}>No gate items defined.</div>
        ) : (
          items.map((item) => (
            <GateItem key={item.id} item={item} canEdit={canEdit} onToggle={toggleItem} />
          ))
        )}
      </div>
    </div>
  );
}
