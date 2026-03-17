import React, { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';

function timeLeft(isoStr) {
  if (!isoStr) return '—';
  const diff = new Date(isoStr) - Date.now();
  if (diff <= 0) return 'READY';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function ActiveRefineryWidget({ orders }) {
  const ready = orders.filter(o => o.status === 'READY');
  const active = orders.filter(o => o.status === 'ACTIVE');

  return (
    <div className="quick-access-widget">
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>
        Refinery Orders
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ready.map(order => (
          <div key={order.id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--b0)' }}>
            <div style={{ color: 'var(--t0)', fontSize: 10, marginBottom: 2 }}>
              {order.material_name}
            </div>
            <div style={{ color: 'var(--live)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em' }}>
              READY
            </div>
          </div>
        ))}
        {active.map(order => (
          <div key={order.id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--b0)' }}>
            <div style={{ color: 'var(--t0)', fontSize: 10, marginBottom: 2 }}>
              {order.material_name}
            </div>
            <div className="quick-access-timer" style={{ marginBottom: 3 }}>
              {timeLeft(order.completes_at)}
            </div>
            <div className="quick-access-progress">
              <div 
                className="quick-access-progress-bar" 
                style={{
                  width: order.completes_at 
                    ? Math.min(100, 100 - ((new Date(order.completes_at) - Date.now()) / ((new Date(order.completes_at) - new Date(order.started_at)) || 1)) * 100)
                    : 0
                }}
              />
            </div>
          </div>
        ))}
        {ready.length === 0 && active.length === 0 && (
          <div style={{ color: 'var(--t2)', fontSize: 9 }}>No active orders</div>
        )}
      </div>
    </div>
  );
}

function OpenCraftWidget({ craftQueue }) {
  const open = craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status));

  return (
    <div className="quick-access-widget">
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>
        Craft Queue
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {open.slice(0, 4).map(item => (
          <div key={item.id} style={{ fontSize: 10, padding: '4px 0', borderBottom: '0.5px solid var(--b0)' }}>
            <div style={{ color: 'var(--t0)', marginBottom: 2 }}>
              {item.blueprint_name}
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 9 }}>
              {item.requested_by_callsign}{item.priority_flag ? ' · PRIORITY' : ''}
            </div>
          </div>
        ))}
        {open.length === 0 && (
          <div style={{ color: 'var(--t2)', fontSize: 9 }}>Queue empty</div>
        )}
      </div>
    </div>
  );
}

function CofferBalanceWidget({ latestBalance, latestTransaction }) {
  return (
    <div className="quick-access-widget">
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>
        Coffer Balance
      </div>
      <div>
        <div className="quick-access-timer" style={{ fontSize: 18, fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums', color: 'var(--t0)', marginBottom: 4 }}>
          {(latestBalance || 0).toLocaleString()}
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 9 }}>
          {latestTransaction ? `Last: ${latestTransaction.entry_type}` : 'No transactions'}
        </div>
      </div>
    </div>
  );
}

export default function QuickAccessColumn() {
  const [orders, setOrders] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [coffer, setCoffer] = useState({ balance: 0, transaction: null });

  const load = async () => {
    const [ro, cq, cl] = await Promise.all([
      base44.entities.RefineryOrder.list('-completes_at', 20),
      base44.entities.CraftQueue.list('-created_date', 20),
      base44.entities.CofferLog.list('-logged_at', 1),
    ]);
    setOrders(ro || []);
    setCraftQueue(cq || []);
    
    const allEntries = cl || [];
    const total = allEntries.reduce((sum, e) => sum + (e.entry_type === 'SALE' || e.entry_type === 'CRAFT_SALE' ? e.amount_aUEC : -e.amount_aUEC), 0);
    setCoffer({ balance: total, transaction: allEntries[0] || null });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ActiveRefineryWidget orders={orders} />
      <OpenCraftWidget craftQueue={craftQueue} />
      <CofferBalanceWidget latestBalance={coffer.balance} latestTransaction={coffer.transaction} />
    </div>
  );
}