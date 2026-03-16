import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { TypeTag } from './opBoardHelpers';

export default function ArchiveTable({ ops }) {
  const [limit, setLimit] = useState(10);
  const visible = ops.slice(0, limit);

  function duration(op) {
    if (!op.started_at || !op.ended_at) return '—';
    const diff = new Date(op.ended_at) - new Date(op.started_at);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function opDate(op) {
    if (!op.scheduled_at) return '—';
    return new Date(op.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  }

  const TH_STYLE = {
    padding: '6px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 9,
    letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)',
    background: 'var(--bg2)', whiteSpace: 'nowrap',
  };
  const TD_STYLE = { padding: '6px 12px' };

  return (
    <div style={{ border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['OP NAME', 'DATE', 'DURATION', 'CREW', 'OUTCOME'].map(h => (
              <th key={h} style={TH_STYLE}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map(op => (
            <tr
              key={op.id}
              style={{ borderBottom: '0.5px solid var(--b0)', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ ...TD_STYLE }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: 'var(--t0)', fontSize: 12 }}>{op.name}</span>
                  <TypeTag type={op.type} />
                </div>
              </td>
              <td style={{ ...TD_STYLE, color: 'var(--t1)', fontSize: 11 }}>{opDate(op)}</td>
              <td style={{ ...TD_STYLE, color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{duration(op)}</td>
              <td style={{ ...TD_STYLE, color: 'var(--t1)', fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={10} style={{ color: 'var(--t2)' }} />
                  {op._rsvp_count || '—'}
                </span>
              </td>
              <td style={TD_STYLE}>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 4,
                  border: '0.5px solid var(--b2)', background: 'var(--bg3)',
                  color: op.status === 'COMPLETE' ? 'var(--live)' : 'var(--t2)',
                  letterSpacing: '0.06em',
                }}>
                  {op.status}
                </span>
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                No archived ops
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {ops.length > limit && (
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--b1)', textAlign: 'center' }}>
          <button
            onClick={() => setLimit(l => l + 10)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--acc)', fontSize: 11, fontFamily: 'inherit',
              letterSpacing: '0.06em',
            }}
          >
            LOAD MORE ({ops.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
