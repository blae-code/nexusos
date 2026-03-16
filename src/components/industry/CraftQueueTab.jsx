import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';

const STATUS_COLORS = {
  OPEN:        'var(--info)',
  CLAIMED:     'var(--warn)',
  IN_PROGRESS: 'var(--live)',
  COMPLETE:    'var(--t2)',
  CANCELLED:   'var(--danger)',
};

const FEASIBILITY_STYLE = {
  READY:   { color: 'var(--live)',   bg: 'rgba(39,201,106,0.08)',  border: 'rgba(39,201,106,0.25)' },
  PARTIAL: { color: 'var(--warn)',   bg: 'rgba(232,160,32,0.08)', border: 'rgba(232,160,32,0.25)' },
  BLOCKED: { color: 'var(--danger)', bg: 'rgba(224,72,72,0.08)',  border: 'rgba(224,72,72,0.2)'   },
};

const PRIORITY_COLORS = {
  CRITICAL: 'var(--danger)',
  HIGH:     'var(--warn)',
  NORMAL:   'var(--info)',
  LOW:      'var(--t2)',
};

// ── Optimised row ─────────────────────────────────────────────────────────────
function OptimisedRow({ item, rank, original, onClaim, callsign }) {
  const feasStyle = FEASIBILITY_STYLE[item.feasibility] || FEASIBILITY_STYLE.PARTIAL;
  const priorityColor = PRIORITY_COLORS[item.priority] || 'var(--t2)';

  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Rank */}
      <td style={{ padding: '8px 12px', width: 36 }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: rank <= 3 ? 'var(--bg4)' : 'var(--bg2)',
          border: `0.5px solid ${rank === 1 ? 'var(--warn)' : 'var(--b2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: rank === 1 ? 'var(--warn)' : 'var(--t2)',
          fontSize: 9,
          fontWeight: 500,
        }}>
          {rank}
        </div>
      </td>

      {/* Priority dot */}
      <td style={{ padding: '8px 4px', width: 8 }}>
        {original?.priority_flag && (
          <div style={{ width: 4, height: 16, background: 'var(--warn)', borderRadius: 2 }} />
        )}
      </td>

      {/* Item name + reason */}
      <td style={{ padding: '8px 14px' }}>
        <div style={{ color: 'var(--t0)', fontSize: 12 }}>{item.blueprint_name}</div>
        <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2, fontStyle: 'normal' }}>{item.reason}</div>
      </td>

      {/* Requested by */}
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>
        {original?.requested_by_callsign || '—'}
      </td>

      {/* Claimed by */}
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>
        {original?.claimed_by_callsign || '—'}
      </td>

      {/* Qty */}
      <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>
        {original?.quantity || 1}
      </td>

      {/* Est. value */}
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>
        {item.estimated_aUEC
          ? `${Math.round(item.estimated_aUEC).toLocaleString()} aUEC`
          : original?.aUEC_value_est
            ? `${original.aUEC_value_est.toLocaleString()} aUEC`
            : '—'}
      </td>

      {/* Priority */}
      <td style={{ padding: '8px 14px' }}>
        <span style={{ color: priorityColor, fontSize: 10, letterSpacing: '0.08em' }}>
          {item.priority}
        </span>
      </td>

      {/* Feasibility */}
      <td style={{ padding: '8px 14px' }}>
        <span
          className="nexus-tag"
          style={{
            color: feasStyle.color,
            background: feasStyle.bg,
            borderColor: feasStyle.border,
          }}
        >
          {item.feasibility}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: '8px 14px' }}>
        <span
          className="nexus-tag"
          style={{ color: STATUS_COLORS[original?.status] || 'var(--t2)', borderColor: 'transparent', background: 'transparent' }}
        >
          {original?.status || '—'}
        </span>
      </td>

      {/* Action */}
      <td style={{ padding: '8px 14px' }}>
        {original?.status === 'OPEN' && (
          <button
            onClick={() => onClaim(original.id)}
            className="nexus-btn"
            style={{ padding: '3px 8px', fontSize: 10 }}
          >
            CLAIM
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Default row (unchanged from original) ────────────────────────────────────
function DefaultRow({ item, onClaim }) {
  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '8px 12px', width: 36 }} />
      <td style={{ padding: '8px 4px', width: 8 }}>
        {item.priority_flag && (
          <div style={{ width: 4, height: 16, background: 'var(--warn)', borderRadius: 2 }} />
        )}
      </td>
      <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{item.blueprint_name}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{item.requested_by_callsign}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{item.claimed_by_callsign || '—'}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{item.quantity}</td>
      <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>
        {item.aUEC_value_est ? `${item.aUEC_value_est.toLocaleString()} aUEC` : '—'}
      </td>
      <td colSpan={2} />
      <td style={{ padding: '8px 14px' }}>
        <span className="nexus-tag" style={{ color: STATUS_COLORS[item.status], borderColor: 'transparent', background: 'transparent' }}>
          {item.status}
        </span>
      </td>
      <td style={{ padding: '8px 14px' }}>
        {item.status === 'OPEN' && (
          <button onClick={() => onClaim(item.id)} className="nexus-btn" style={{ padding: '3px 8px', fontSize: 10 }}>
            CLAIM
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CraftQueueTab({ craftQueue, callsign }) {
  const [optimising, setOptimising]         = useState(false);
  const [suggestedOrder, setSuggestedOrder] = useState(null); // null = off, [] = loaded
  const [optimiseError, setOptimiseError]   = useState('');

  const statusOrder = { IN_PROGRESS: 0, CLAIMED: 1, OPEN: 2, COMPLETE: 3, CANCELLED: 4 };

  // Default sort for non-optimised view
  const defaultSorted = [...craftQueue].sort((a, b) => {
    if (b.priority_flag !== a.priority_flag) return b.priority_flag ? 1 : -1;
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
  });

  // Build a lookup map from blueprint_id / queue_id → original queue item
  const queueById = {};
  craftQueue.forEach(c => { queueById[c.id] = c; });

  const handleOptimise = async () => {
    setOptimising(true);
    setOptimiseError('');
    setSuggestedOrder(null);
    try {
      const res = await base44.functions.invoke('craftingOptimiser', {});
      const order = res?.data?.recommended_order || [];
      setSuggestedOrder(order);
    } catch (e) {
      setOptimiseError('Optimiser unavailable — using default order.');
    }
    setOptimising(false);
  };

  const handleClearSuggestion = () => {
    setSuggestedOrder(null);
    setOptimiseError('');
  };

  const handleClaim = async (id) => {
    await base44.entities.CraftQueue.update(id, {
      status: 'CLAIMED',
      claimed_by_callsign: callsign,
    });
  };

  const isOptimised = suggestedOrder !== null && suggestedOrder.length > 0;
  const openCount   = craftQueue.filter(c => c.status === 'OPEN').length;

  // Build display rows for optimised view:
  // suggestedOrder gives us the rank/reason/feasibility metadata;
  // we match back to the full craftQueue item by queue_id
  const optimisedRows = isOptimised
    ? suggestedOrder.map(rec => ({
        rec,
        original: queueById[rec.queue_id] || craftQueue.find(c => c.blueprint_name === rec.blueprint_name) || null,
      })).filter(r => r.original)
    : [];

  // Any queue items NOT in the suggestion (e.g. already CLAIMED/IN_PROGRESS)
  const suggestedIds = new Set(optimisedRows.map(r => r.original?.id).filter(Boolean));
  const remainingRows = isOptimised
    ? craftQueue.filter(c => !suggestedIds.has(c.id) && !['COMPLETE', 'CANCELLED'].includes(c.status))
    : [];

  return (
    <div className="p-4 flex flex-col gap-3">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Optimise button */}
        {!isOptimised ? (
          <button
            onClick={handleOptimise}
            disabled={optimising || openCount === 0}
            className="nexus-btn"
            style={{
              padding: '6px 14px',
              fontSize: 11,
              borderColor: optimising ? 'var(--b2)' : 'rgba(74,143,208,0.4)',
              color: optimising ? 'var(--t2)' : 'var(--info)',
              background: optimising ? 'var(--bg2)' : 'rgba(74,143,208,0.06)',
              opacity: openCount === 0 ? 0.4 : 1,
            }}
          >
            <Zap size={11} style={{ flexShrink: 0 }} />
            {optimising ? 'ANALYSING...' : 'OPTIMISE ORDER'}
          </button>
        ) : (
          <button
            onClick={handleClearSuggestion}
            className="nexus-btn"
            style={{ padding: '6px 14px', fontSize: 11 }}
          >
            CLEAR SUGGESTION
          </button>
        )}

        {/* Mode indicator */}
        {isOptimised && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--info)',
            fontSize: 10,
            letterSpacing: '0.08em',
          }}>
            <Zap size={10} />
            SUGGESTED ORDER ACTIVE
          </span>
        )}

        {optimiseError && (
          <span style={{ color: 'var(--warn)', fontSize: 10 }}>{optimiseError}</span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {/* rank, dot, item, req-by, claimed-by, qty, value, priority, feasibility, status, action */}
              {['#', '', 'ITEM', 'REQUESTED BY', 'CLAIMED BY', 'QTY', 'EST. VALUE',
                ...(isOptimised ? ['PRIORITY', 'FEASIBILITY'] : []),
                'STATUS', 'ACTION',
              ].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 14px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    borderBottom: '0.5px solid var(--b1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Optimised view */}
            {isOptimised && optimisedRows.map(({ rec, original }, idx) => (
              <OptimisedRow
                key={original?.id || idx}
                item={rec}
                rank={idx + 1}
                original={original}
                onClaim={handleClaim}
                callsign={callsign}
              />
            ))}

            {/* Remaining (non-OPEN) items not in suggestion */}
            {isOptimised && remainingRows.map(item => (
              <DefaultRow key={item.id} item={item} onClaim={handleClaim} />
            ))}

            {/* Default view */}
            {!isOptimised && defaultSorted.map(c => (
              <DefaultRow key={c.id} item={c} onClaim={handleClaim} />
            ))}

            {craftQueue.length === 0 && (
              <tr>
                <td
                  colSpan={isOptimised ? 11 : 9}
                  style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}
                >
                  Craft queue is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}