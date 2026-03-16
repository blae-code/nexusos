import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import LedgerDashboard from '@/components/ledger/LedgerDashboard';
import RefineryEfficiency from '@/components/ledger/RefineryEfficiency';
import LedgerFlowTable from '@/components/ledger/LedgerFlowTable';
import LowStockAlerts from '@/components/ledger/LowStockAlerts';

const TABS = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'flow',      label: 'MATERIAL FLOW' },
  { id: 'refinery',  label: 'REFINERY EFFICIENCY' },
  { id: 'alerts',    label: 'ALERTS' },
];

export default function MaterialLedger() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const [tab, setTab] = useState('dashboard');
  const [materials, setMaterials] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [commodities, setCommodities] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [mats, ro, comms] = await Promise.all([
      base44.entities.Material.list('-logged_at', 200),
      base44.entities.RefineryOrder.list('-started_at', 100),
      base44.entities.GameCacheCommodity.list('name', 500),
    ]);
    setMaterials(mats || []);
    setRefineryOrders(ro || []);
    setCommodities(comms || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg0)' }}>
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', padding: '0 16px' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--acc2)' : '2px solid transparent',
              color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t2)', fontSize: 10, letterSpacing: '0.08em',
            padding: '4px 8px', fontFamily: 'inherit',
            opacity: loading ? 0.4 : 1,
          }}
        >
          {loading ? 'LOADING...' : '↻ REFRESH'}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto nexus-fade-in">
        {tab === 'dashboard'  && <LedgerDashboard materials={materials} refineryOrders={refineryOrders} commodities={commodities} loading={loading} />}
        {tab === 'flow'       && <LedgerFlowTable materials={materials} refineryOrders={refineryOrders} onRefresh={load} />}
        {tab === 'refinery'   && <RefineryEfficiency refineryOrders={refineryOrders} />}
        {tab === 'alerts'     && <LowStockAlerts materials={materials} callsign={callsign} />}
      </div>
    </div>
  );
}
