import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MaterialsTab from '@/components/industry/MaterialsTab';
import ScoutDepositsTab from '@/components/industry/ScoutDepositsTab';
import BlueprintsTab from '@/components/industry/BlueprintsTab';
import CraftQueueTabV2 from '@/components/industry/CraftQueueTabV2';
import RefineryOrdersTab from '@/components/industry/RefineryOrdersTab';
import CofferLogTab from '@/components/industry/CofferLogTab';

const TABS = [
  { id: 'materials', label: 'MATERIALS' },
  { id: 'deposits', label: 'SCOUT DEPOSITS' },
  { id: 'blueprints', label: 'BLUEPRINTS' },
  { id: 'craft', label: 'CRAFT QUEUE' },
  { id: 'refinery', label: 'REFINERY ORDERS' },
  { id: 'coffer', label: 'COFFER LOG' },
];

export default function IndustryHub() {
  const outletContext = useOutletContext() || {};
  const callsign = outletContext.callsign;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'materials';

  const [materials, setMaterials] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [cofferLog, setCofferLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [mats, deps, bps, cq, ro, cl] = await Promise.all([
        base44.entities.Material.list('-logged_at', 200),
        base44.entities.ScoutDeposit.list('-reported_at', 100),
        base44.entities.Blueprint.list('-created_date', 100),
        base44.entities.CraftQueue.list('-created_date', 100),
        base44.entities.RefineryOrder.list('-started_at', 100),
        base44.entities.CofferLog.list('-logged_at', 200),
      ]);

      setMaterials(mats || []);
      setDeposits(deps || []);
      setBlueprints(bps || []);
      setCraftQueue(cq || []);
      setRefineryOrders(ro || []);
      setCofferLog(cl || []);
    } catch (error) {
      console.error('Industry Hub load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setTab = (nextTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', nextTab);
    setSearchParams(params, { replace: true });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '0.5px solid var(--b0)',
        background: 'var(--bg1)',
        overflowX: 'auto',
        flexShrink: 0,
        padding: '0 32px',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--cyan)' : '2px solid transparent',
              color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (tab !== t.id) e.currentTarget.style.color = 'var(--t1)';
            }}
            onMouseLeave={e => {
              if (tab !== t.id) e.currentTarget.style.color = 'var(--t2)';
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 32px' }}>
        {tab === 'materials' && <MaterialsTab materials={materials} onRefresh={load} />}
        {tab === 'deposits' && <ScoutDepositsTab deposits={deposits} onRefresh={load} />}
        {tab === 'blueprints' && <BlueprintsTab blueprints={blueprints} materials={materials} onRefresh={load} />}
        {tab === 'craft' && <CraftQueueTabV2 craftQueue={craftQueue} callsign={callsign} onRefresh={load} />}
        {tab === 'refinery' && <RefineryOrdersTab orders={refineryOrders} onRefresh={load} />}
        {tab === 'coffer' && <CofferLogTab logs={cofferLog} />}
      </div>
    </div>
  );
}