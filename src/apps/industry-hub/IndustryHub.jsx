import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import BlueprintsModule from '@/apps/industry-hub/Blueprints';
import MaterialsModule from '@/apps/industry-hub/Materials';
import CraftQueueTab from '@/apps/industry-hub/CraftQueueTab';
import RefineryManagement from '@/apps/industry-hub/RefineryManagement';
import PatchDigestHeader from '@/apps/industry-hub/PatchDigestHeader';
import IndustryOverview from '@/apps/industry-hub/IndustryOverview';
import PriceTracker from '@/apps/industry-hub/PriceTracker';

const TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'materials', label: 'MATERIALS' },
  { id: 'blueprints', label: 'BLUEPRINTS' },
  { id: 'craft', label: 'CRAFT QUEUE' },
  { id: 'refinery', label: 'REFINERY' },
  { id: 'prices', label: 'PRICE TRACKER' },
];

function RefineryTab({ refineryOrders, materials, callsign }) {
  const [showInput, setShowInput] = React.useState(false);

  function timeLeft(isoStr) {
    if (!isoStr) return '—';
    const diff = new Date(isoStr).getTime() - Date.now();
    if (diff <= 0) return 'READY';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px' }}>
      {/* Input Section */}
      {showInput ? (
        <div>
          <RefineryManagement materials={materials} callsign={callsign} />
          <div style={{ padding: '0 16px 12px' }}>
            <button
              onClick={() => setShowInput(false)}
              className="nexus-btn"
              style={{ padding: '6px 14px', fontSize: 10 }}
            >
              ← CLOSE INPUT
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 12px' }}>
          <button
            onClick={() => setShowInput(true)}
            className="nexus-btn primary"
            style={{ width: '100%', padding: '8px 12px', fontSize: 10 }}
          >
            + NEW REFINERY BATCH
          </button>
        </div>
      )}

      {/* Orders List */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['MATERIAL', 'SCU', 'METHOD', 'YIELD', 'COST', 'STATION', 'SUBMITTED BY', 'TIME LEFT', 'STATUS'].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: '12px 14px',
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
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {refineryOrders.map((order, idx) => {
              const isReady = order.status === 'READY' || timeLeft(order.completes_at) === 'READY';
              const isActive = order.status === 'ACTIVE';
              const isEven = idx % 2 === 1;

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
                  <td style={{ padding: '0 14px', color: 'var(--t0)', fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.material_name}</td>
                  <td style={{ padding: '0 14px', color: 'var(--t1)', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.quantity_scu}</td>
                  <td style={{ padding: '0 14px', color: 'var(--t1)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.method || '—'}</td>
                  <td style={{ padding: '0 14px', color: 'var(--live)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.yield_pct ? `${order.yield_pct}%` : '—'}</td>
                  <td style={{ padding: '0 14px', color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.cost_aUEC ? order.cost_aUEC.toLocaleString() : '—'}</td>
                  <td style={{ padding: '0 14px', color: 'var(--t1)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.station || '—'}</td>
                  <td style={{ padding: '0 14px', color: 'var(--t1)', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0 }}>{order.submitted_by_callsign || '—'}</td>
                  <td style={{
                    padding: '0 14px', fontSize: 10, fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums',
                    color: (isActive || isReady) ? 'var(--warn)' : 'var(--t2)',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 0,
                  }}>
                    {timeLeft(order.completes_at)}
                  </td>
                  <td style={{ padding: '0 14px', maxWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: isReady ? 'var(--live)' : isActive ? 'var(--warn)' : 'var(--b2)',
                        animation: isReady ? 'refinery-pulse-fast 1.2s ease-in-out infinite' : isActive ? 'refinery-pulse-slow 2.5s ease-in-out infinite' : 'none',
                      }} />
                      <span style={{ fontSize: 9, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.status}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {refineryOrders.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No refinery orders active.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IndustryHub() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const rank = outletContext.rank;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [materials, setMaterials] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [scoutDeposits, setScoutDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [mats, bps, queue, refinery, deposits] = await Promise.all([
        base44.entities.Material.list('-logged_at', 100),
        base44.entities.Blueprint.list('-created_date', 100),
        base44.entities.CraftQueue.list('-created_date', 50),
        base44.entities.RefineryOrder.list('-started_at', 50),
        base44.entities.ScoutDeposit.list('-reported_at', 10),
      ]);

      setMaterials(mats || []);
      setBlueprints(bps || []);
      setCraftQueue(queue || []);
      setRefineryOrders(refinery || []);
      setScoutDeposits(deposits || []);
    } catch {
      // load failed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setTab = (nextTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '10px 16px 0',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg1)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Industry
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              style={{
                padding: '11px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === item.id ? '2px solid var(--red)' : '2px solid transparent',
                color: tab === item.id ? 'var(--t0)' : 'var(--t2)',
                fontSize: 10,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                transition: 'color 120ms ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="nexus-fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'overview' ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PatchDigestHeader />
            <IndustryOverview
              materials={materials}
              blueprints={blueprints}
              craftQueue={craftQueue}
              refineryOrders={refineryOrders}
              scoutDeposits={scoutDeposits}
            />
          </div>
        ) : null}
        {tab === 'materials' ? <MaterialsModule materials={materials} onRefresh={load} /> : null}
        {tab === 'blueprints' ? <BlueprintsModule blueprints={blueprints} materials={materials} rank={rank} callsign={callsign} onRefresh={load} /> : null}
        {tab === 'craft' ? <CraftQueueTab craftQueue={craftQueue} callsign={callsign} materials={materials} blueprints={blueprints} /> : null}
        {tab === 'refinery' ? <RefineryTab refineryOrders={refineryOrders} materials={materials} callsign={callsign} /> : null}
        {tab === 'prices' ? <PriceTracker /> : null}
      </div>
    </div>
  );
}