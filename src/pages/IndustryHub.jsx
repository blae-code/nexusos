import React, { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BlueprintsModule from '@/app/modules/IndustryHub/Blueprints';
import MaterialsModule from '@/app/modules/IndustryHub/Materials';
import IndustryOverview from '@/components/industry/IndustryOverview';
import CraftQueueTab from '@/components/industry/CraftQueueTab';
import PatchDigestCard from '@/components/industry/PatchDigestCard';
import OcrUploadPanel from '@/components/industry/OcrUploadPanel';

const TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'materials', label: 'MATERIALS' },
  { id: 'blueprints', label: 'BLUEPRINTS' },
  { id: 'craft', label: 'CRAFT QUEUE' },
  { id: 'refinery', label: 'REFINERY' },
];

function RefineryTab({ refineryOrders }) {
  function timeLeft(isoStr) {
    if (!isoStr) return '—';
    const diff = new Date(isoStr) - Date.now();
    if (diff <= 0) return 'READY';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  return (
    <div className="p-4">
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['MATERIAL', 'SCU', 'METHOD', 'YIELD', 'COST', 'STATION', 'SUBMITTED BY', 'TIME LEFT', 'STATUS'].map((heading) => (
                <th key={heading} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {refineryOrders.map((order) => {
              const isReady = order.status === 'READY' || timeLeft(order.completes_at) === 'READY';

              return (
                <tr key={order.id} style={{ borderBottom: '0.5px solid var(--b0)', background: isReady ? 'var(--live-bg)' : 'transparent' }}>
                  <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{order.material_name}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{order.quantity_scu}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.method || '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--live)', fontSize: 11 }}>{order.yield_pct ? `${order.yield_pct}%` : '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.cost_aUEC ? `${order.cost_aUEC.toLocaleString()}` : '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.station || '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.submitted_by_callsign}</td>
                  <td style={{ padding: '8px 14px', color: isReady ? 'var(--live)' : 'var(--info)', fontSize: 11 }}>{timeLeft(order.completes_at)}</td>
                  <td style={{ padding: '8px 14px' }}>
                    {isReady ? <span className="nexus-pill nexus-pill-live">READY</span> : <span className="nexus-tag">{order.status}</span>}
                  </td>
                </tr>
              );
            })}
            {refineryOrders.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No refinery orders. Submit an order or upload a screenshot.
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
  const discordId = outletContext.discordId;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [materials, setMaterials] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [scoutDeposits, setScoutDeposits] = useState([]);
  const [latestPatch, setLatestPatch] = useState(null);
  const [patchDismissed, setPatchDismissed] = useState(null);
  const [showOcr, setShowOcr] = useState(false);

  const load = async () => {
    const [mats, bps, queue, refinery, deposits, patches] = await Promise.all([
      base44.entities.Material.list('-logged_at', 100),
      base44.entities.Blueprint.list('-created_date', 100),
      base44.entities.CraftQueue.list('-created_date', 50),
      base44.entities.RefineryOrder.list('-started_at', 50),
      base44.entities.ScoutDeposit.list('-reported_at', 10),
      base44.entities.PatchDigest.list('-processed_at', 1),
    ]);

    setMaterials(mats || []);
    setBlueprints(bps || []);
    setCraftQueue(queue || []);
    setRefineryOrders(refinery || []);
    setScoutDeposits(deposits || []);
    setLatestPatch(patches?.[0] || null);
    setPatchDismissed(localStorage.getItem('nexus_patch_dismissed'));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePatchDismiss = () => {
    if (!latestPatch?.patch_version) return;
    localStorage.setItem('nexus_patch_dismissed', latestPatch.patch_version);
    setPatchDismissed(latestPatch.patch_version);
  };

  const setTab = (nextTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const showPatchCard = latestPatch && patchDismissed !== latestPatch.patch_version;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', padding: '0 16px' }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === item.id ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === item.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showPatchCard ? (
        <div style={{ paddingTop: 10, paddingBottom: 4 }}>
          <PatchDigestCard digest={latestPatch} onDismiss={handlePatchDismiss} />
        </div>
      ) : null}

      <div className="flex-1 overflow-auto nexus-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
        {tab === 'materials' && showOcr && (
          <div style={{ padding: '0 16px', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <OcrUploadPanel
              callsign={callsign}
              discordId={discordId}
              onSuccess={() => { setShowOcr(false); load(); }}
            />
          </div>
        )}
        {tab === 'materials' && (
          <div style={{ padding: '0 16px', paddingBottom: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowOcr(!showOcr)}
              className="nexus-btn"
              style={{ fontSize: 9, padding: '4px 10px' }}
            >
              {showOcr ? '✕ CLOSE OCR' : '↑ UPLOAD SCREENSHOT'}
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'overview' ? (
            <IndustryOverview
              materials={materials}
              blueprints={blueprints}
              craftQueue={craftQueue}
              refineryOrders={refineryOrders}
              scoutDeposits={scoutDeposits}
            />
          ) : null}
          {tab === 'materials' ? <MaterialsModule materials={materials} onRefresh={load} /> : null}
          {tab === 'blueprints' ? <BlueprintsModule blueprints={blueprints} materials={materials} rank={rank} callsign={callsign} discordId={discordId} onRefresh={load} /> : null}
          {tab === 'craft' ? <CraftQueueTab craftQueue={craftQueue} callsign={callsign} /> : null}
          {tab === 'refinery' ? <RefineryTab refineryOrders={refineryOrders} /> : null}
        </div>
      </div>
    </div>
  );
}