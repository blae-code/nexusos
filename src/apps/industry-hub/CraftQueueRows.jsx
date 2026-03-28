/**
 * CraftQueueRows — OptimisedRow and DefaultRow table row sub-components
 * for CraftQueueTab.
 */
import React from 'react';
import NexusToken from '@/core/design/NexusToken';
import { priorityToken, T } from '@/core/data/tokenMap';

const STATUS_COLORS = {
  OPEN:        'var(--info)',
  CLAIMED:     'var(--warn)',
  IN_PROGRESS: 'var(--live)',
  COMPLETE:    'var(--t2)',
  CANCELLED:   'var(--danger)',
};

const FEASIBILITY_STYLE = {
  READY:   { color: 'var(--live)',   bg: 'rgba(var(--live-rgb), 0.08)',  border: 'rgba(var(--live-rgb), 0.25)' },
  PARTIAL: { color: 'var(--warn)',   bg: 'rgba(var(--warn-rgb), 0.08)', border: 'rgba(var(--warn-rgb), 0.25)' },
  BLOCKED: { color: 'var(--danger)', bg: 'rgba(var(--danger-rgb), 0.08)',  border: 'rgba(var(--danger-rgb), 0.2)'   },
};

const PRIORITY_COLORS = {
  CRITICAL: 'var(--danger)',
  HIGH:     'var(--warn)',
  NORMAL:   'var(--info)',
  LOW:      'var(--t2)',
};

// ── Optimised row ─────────────────────────────────────────────────────────────
export function OptimisedRow({ item, rank, original, onClaim, callsign }) {
  const feasStyle = FEASIBILITY_STYLE[item.feasibility] || FEASIBILITY_STYLE.PARTIAL;
  const priorityColor = PRIORITY_COLORS[item.priority] || 'var(--t2)';

  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Rank — numbered cube token; color encodes priority level */}
      <td style={{ padding: '8px 12px', width: 36 }}>
        {(() => {
          const levelMap = { CRITICAL: 'critical', HIGH: 'high', NORMAL: 'normal', LOW: 'low' };
          const level = levelMap[item.priority] || (rank <= 1 ? 'critical' : rank <= 3 ? 'high' : 'normal');
          return <NexusToken src={priorityToken(Math.min(rank, 13), level)} size={24} alt={`Rank ${rank}`} title={`Rank ${rank} · ${item.priority || ''}`} />;
        })()}
      </td>

      {/* Priority flag — triangle marker for flagged items */}
      <td style={{ padding: '8px 4px', width: 8 }}>
        {original?.priority_flag && (
          <NexusToken src={T('triangle-orange')} size={14} alt="priority" title="Priority flagged" />
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
export function DefaultRow({ item, onClaim }) {
  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '8px 12px', width: 36 }} />
      <td style={{ padding: '8px 4px', width: 8 }}>
        {item.priority_flag && (
          <NexusToken src={T('triangle-orange')} size={14} alt="priority" title="Priority flagged" />
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
