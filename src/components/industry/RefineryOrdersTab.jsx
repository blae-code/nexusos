import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';

function timeRemaining(completes_at) {
  if (!completes_at) return '—';
  const diff = new Date(completes_at) - Date.now();
  if (diff <= 0) return 'READY';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function RefineryOrdersTab({ orders, onRefresh }) {
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerKey(k => k + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCollect = async (id) => {
    await base44.entities.RefineryOrder.update(id, { status: 'COLLECTED' });
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)' }}>
        <button className="nexus-btn" style={{ padding: '6px 12px', fontSize: 10 }}>
          <Plus size={10} style={{ marginRight: 4 }} /> Add Order
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', position: 'sticky', top: 0 }}>
              {['Material', 'Qty SCU', 'Method', 'Yield %', 'Cost aUEC', 'Station', 'Submitted By', 'Started At', 'Time Remaining', 'Status', 'Action'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'var(--t2)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    borderBottom: '0.5px solid var(--b1)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(orders || []).map(order => {
              const isReady = order.status === 'READY';
              const isActive = order.status === 'ACTIVE';
              const statusColor = isReady ? 'var(--live)' : isActive ? 'var(--cyan)' : 'var(--t2)';
              
              return (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: '0.5px solid var(--b0)',
                    background: isReady ? 'rgba(39,201,106,0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px', color: 'var(--t0)', fontSize: 11 }}>
                    {order.material_name}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                    {order.quantity_scu?.toFixed(1)}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>
                    {order.method || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--live)', fontSize: 10, fontFamily: 'monospace' }}>
                    {order.yield_pct ? `${order.yield_pct}%` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
                    {order.cost_aUEC ? order.cost_aUEC.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>
                    {order.station || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t1)', fontSize: 10 }}>
                    {order.submitted_by_callsign || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--t2)', fontSize: 9 }}>
                    {order.started_at ? new Date(order.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: isActive ? 'var(--info)' : isReady ? 'var(--live)' : 'var(--t2)', fontSize: 10, fontFamily: 'monospace' }}>
                    {key={timerKey}, timeRemaining(order.completes_at)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      color: statusColor,
                      background: `${statusColor}22`,
                      border: `0.5px solid ${statusColor}55`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {isReady && (
                      <button
                        onClick={() => handleCollect(order.id)}
                        className="nexus-btn"
                        style={{ padding: '3px 8px', fontSize: 9 }}
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
                <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)' }}>
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