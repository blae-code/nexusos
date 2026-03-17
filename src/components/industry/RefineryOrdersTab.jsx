import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useEffect, useState } from 'react';
import { Plus, Beaker } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

function timeRemaining(completes_at) {
  if (!completes_at) return '—';
  const diff = new Date(completes_at) - Date.now();
  if (diff <= 0) return 'READY';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const STATUS_DOT_STYLE = `
  @keyframes refinery-pulse-slow {
    0%,100% { opacity: 1; } 50% { opacity: 0.25; }
  }
  @keyframes refinery-pulse-fast {
    0%,100% { opacity: 1; } 50% { opacity: 0.2; }
  }
`;

function StatusDot({ status }) {
  if (status === 'ACTIVE') {
    return (
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--warn)', flexShrink: 0,
        animation: 'refinery-pulse-slow 2.5s ease-in-out infinite',
      }} />
    );
  }
  if (status === 'READY') {
    return (
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--live)', flexShrink: 0,
        animation: 'refinery-pulse-fast 1.2s ease-in-out infinite',
      }} />
    );
  }
  return (
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--b2)', flexShrink: 0 }} />
  );
}

export default function RefineryOrdersTab({ orders, onRefresh }) {
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimerKey(k => k + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCollect = async (id) => {
    await base44.entities.RefineryOrder.update(id, { status: 'COLLECTED' });
    onRefresh();
  };

  const COLS = ['Material', 'Qty SCU', 'Method', 'Yield %', 'Cost aUEC', 'Station', 'Submitted By', 'Started', 'Remaining', 'Status', ''];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{STATUS_DOT_STYLE}</style>

      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)' }}>
        <button className="nexus-btn" style={{ padding: '6px 12px', fontSize: 10 }}>
          <Plus size={10} style={{ marginRight: 4 }} /> Add Order
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--bg3)', position: 'sticky', top: 0, zIndex: 1 }}>
              {COLS.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '12px 12px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid var(--b1)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(orders || []).map((order, idx) => {
              const isReady = order.status === 'READY';
              const isActive = order.status === 'ACTIVE';
              const isEven = idx % 2 === 1;
              const timer = timerKey >= 0 ? timeRemaining(order.completes_at) : '—';

              return (
                <tr
                  key={order.id}
                  style={{
                    height: 44,
                    borderBottom: '0.5px solid var(--b0)',
                    background: isEven ? 'rgba(255,255,255,0.02)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isEven ? 'rgba(255,255,255,0.02)' : 'transparent'; }}
                >
                  <td style={{ padding: '0 12px', color: 'var(--t0)', fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.material_name}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.quantity_scu?.toFixed(1)}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--t1)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.method || '—'}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--live)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.yield_pct ? `${order.yield_pct}%` : '—'}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.cost_aUEC ? order.cost_aUEC.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--t1)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.station || '—'}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--t1)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.submitted_by_callsign || '—'}
                  </td>
                  <td style={{ padding: '0 12px', color: 'var(--t2)', fontSize: 9, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>
                    {order.started_at ? new Date(order.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td style={{
                    padding: '0 12px', fontSize: 10, fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums',
                    color: (isActive || isReady) ? 'var(--warn)' : 'var(--t2)',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0,
                  }}>
                    {timer}
                  </td>
                  <td style={{ padding: '0 12px', maxWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <StatusDot status={order.status} />
                      <span style={{ fontSize: 9, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    {isReady && (
                      <button
                        onClick={() => handleCollect(order.id)}
                        className="nexus-btn"
                        style={{ padding: '3px 8px', fontSize: 9, whiteSpace: 'nowrap' }}
                      >
                        Collect
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {(orders || []).length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No refinery orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}