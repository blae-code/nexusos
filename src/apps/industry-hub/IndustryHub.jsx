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
import CargoMarginTracker from '@/apps/industry-hub/CargoMarginTracker';
import ProductionTab from '@/apps/industry-hub/ProductionTab';
import PredictiveAnalytics from '@/apps/industry-hub/analytics/PredictiveAnalytics';
import ComponentsTab from '@/apps/industry-hub/ComponentsTab';
import Commerce from '@/pages/Commerce';
import CofferLedger from '@/pages/CofferLedger';
import Logistics from '@/pages/Logistics';
import CargoTracker from '@/pages/CargoTracker';
import ProfitCalc from '@/pages/ProfitCalc';
import MaterialLifecycleTracker from '@/apps/industry-hub/MaterialLifecycleTracker';
import BlueprintOwnershipPanel from '@/apps/industry-hub/BlueprintOwnershipPanel';
import OrgTreasuryDashboard from '@/apps/industry-hub/OrgTreasuryDashboard';
import RequisitionManager from '@/pages/RequisitionManager';
import ProductionForecast from '@/apps/industry-hub/ProductionForecast';
import SupplyChainBoard from '@/apps/industry-hub/SupplyChainBoard';
import CraftabilityCalc from '@/apps/industry-hub/CraftabilityCalc';
import MissionFarmPlanner from '@/apps/industry-hub/MissionFarmPlanner';
import DismantleTracker from '@/apps/industry-hub/DismantleTracker';
import BlueprintWishlistPanel from '@/apps/industry-hub/BlueprintWishlistPanel';
import CraftingCostCalc from '@/apps/industry-hub/CraftingCostCalc';
import CargoSCUPlanner from '@/apps/industry-hub/CargoSCUPlanner';
import IndustryTabBar from '@/components/IndustryTabBar';

const TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'materials', label: 'MATERIALS' },
  { id: 'refinery', label: 'REFINERY' },
  { id: 'blueprints', label: 'BLUEPRINTS' },
  { id: 'craft', label: 'CRAFT QUEUE' },
  { id: 'components', label: 'COMPONENTS' },
  { id: 'commerce', label: 'COMMERCE' },
  { id: 'coffer', label: 'COFFER' },
  { id: 'logistics', label: 'LOGISTICS' },
  { id: 'cargo', label: 'CARGO' },
  { id: 'production', label: 'PRODUCTION' },
  { id: 'prices', label: 'PRICES' },
  { id: 'analytics', label: 'ANALYTICS' },
  { id: 'lifecycle', label: 'LIFECYCLE' },
  { id: 'ownership', label: 'OWNERSHIP' },
  { id: 'treasury', label: 'TREASURY' },
  { id: 'requisitions', label: 'REQUISITIONS' },
  { id: 'forecast', label: 'FORECAST' },
  { id: 'pipeline', label: 'PIPELINE' },
  { id: 'craftable', label: 'CRAFTABLE' },
  { id: 'missions', label: 'MISSIONS' },
  { id: 'dismantle', label: 'DISMANTLE' },
  { id: 'wishlist', label: 'WISHLIST' },
  { id: 'costcalc', label: 'COST CALC' },
  { id: 'cargoplanner', label: 'SCU PLAN' },
];

const METHOD_STYLE = {
  DINYX_SOLVATION: { label: 'DINYX SOLVATION', bg: 'rgba(74,140,92,0.12)', border: 'rgba(74,140,92,0.3)', color: '#4A8C5C' },
  FERRON_EXCHANGE: { label: 'FERRON EXCHANGE', bg: 'rgba(200,168,75,0.10)', border: 'rgba(200,168,75,0.25)', color: '#C8A84B' },
  PYROMETRIC_CHROMALYSIS: { label: 'PYROMETRIC CHROMALYSIS', bg: 'rgba(90,88,80,0.15)', border: 'rgba(90,88,80,0.25)', color: '#9A9488' },
};
const SUBTYPE_MAP = {
  CMR: { bg: 'rgba(192,57,43,0.12)', border: 'rgba(192,57,43,0.3)', color: '#C0392B' },
  CMP: { bg: 'rgba(200,168,75,0.10)', border: 'rgba(200,168,75,0.25)', color: '#C8A84B' },
  CMS: { bg: 'rgba(200,168,75,0.15)', border: 'rgba(200,168,75,0.35)', color: '#C8A84B' },
  ORE: { bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.15)', color: '#9A9488' },
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
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
      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {/* Column header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 56px 140px 72px 60px 120px 80px 80px',
          gap: 6, padding: '8px 12px', background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          {['MATERIAL', 'SCU', 'METHOD', 'YIELD', 'INPUT', 'STATION', 'TIME', 'STATUS'].map(h => (
            <span key={h} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10, color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{h}</span>
          ))}
        </div>

        {refineryOrders.map(order => {
          const isReady = order.status === 'READY' || timeLeft(order.completes_at) === 'READY';
          const isActive = order.status === 'ACTIVE';
          const isCollected = order.status === 'COLLECTED';
          const ms = METHOD_STYLE[order.method] || { label: order.method || '—', bg: 'rgba(90,88,80,0.15)', border: 'rgba(90,88,80,0.25)', color: '#9A9488' };
          const ss = SUBTYPE_MAP[order.input_subtype] || null;

          return (
            <div key={order.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 56px 140px 72px 60px 120px 80px 80px',
              gap: 6, padding: '10px 12px', alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.06)',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ color: '#E8E4DC', fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.material_name}</div>
              <div style={{ color: '#9A9488', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontVariantNumeric: 'tabular-nums' }}>{order.quantity_scu}</div>
              <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, textTransform: 'uppercase', borderRadius: 2, padding: '2px 6px', background: ms.bg, border: `0.5px solid ${ms.border}`, color: ms.color, justifySelf: 'start' }}>{ms.label}</span>
              <div style={{ color: '#9A9488', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" }}>{order.expected_yield_ratio ? `${Math.round(order.expected_yield_ratio * 100)}% YIELD` : order.yield_pct ? `${order.yield_pct}%` : '—'}</div>
              {ss ? <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, textTransform: 'uppercase', borderRadius: 2, padding: '2px 6px', background: ss.bg, border: `0.5px solid ${ss.border}`, color: ss.color }}>{order.input_subtype}</span> : <span style={{ color: '#5A5850', fontSize: 10 }}>—</span>}
              <div style={{ color: '#9A9488', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.station || '—'}</div>
              <div style={{ color: '#C8A84B', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{timeLeft(order.completes_at)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isReady ? '#4A8C5C' : isActive ? '#C8A84B' : '#5A5850', animation: isReady ? 'pulse-dot 2s ease-in-out infinite' : isActive ? 'pulse-dot 2.5s ease-in-out infinite' : 'none' }} />
                <span style={{ fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, color: isReady ? '#4A8C5C' : isActive ? '#C8A84B' : '#5A5850', textTransform: 'uppercase' }}>{order.status}</span>
              </div>
            </div>
          );
        })}

        {refineryOrders.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase' }}>NO REFINERY ORDERS</div>
        )}
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
  const [cofferLogs, setCofferLogs] = useState([]);
  const [priceSnapshots, setPriceSnapshots] = useState([]);
  const [orgShips, setOrgShips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [mats, bps, queue, refinery, deposits, coffers, priceData, orgShips] = await Promise.all([
        base44.entities.Material.list('-logged_at', 100),
        base44.entities.Blueprint.list('-created_date', 100),
        base44.entities.CraftQueue.list('-created_date', 50),
        base44.entities.RefineryOrder.list('-started_at', 50),
        base44.entities.ScoutDeposit.list('-reported_at', 10),
        base44.entities.CofferLog.list('-logged_at', 100),
        base44.entities.PriceSnapshot.list('-snapped_at', 100).catch(() => []),
        base44.entities.OrgShip.list('name', 200).catch(() => []),
      ]);

      setMaterials(mats || []);
      setBlueprints(bps || []);
      setCraftQueue(queue || []);
      setRefineryOrders(refinery || []);
      setScoutDeposits(deposits || []);
      setCofferLogs(coffers || []);
      setPriceSnapshots(priceData || []);
      setOrgShips(orgShips || []);
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
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        padding: '0 0 0 0',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
        position: 'relative',
      }}>
        <IndustryTabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
      </div>

      <div className="nexus-fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'overview' ? (
          <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        {tab === 'components' ? <ComponentsTab /> : null}
        {tab === 'craft' ? <CraftQueueTab craftQueue={craftQueue} callsign={callsign} materials={materials} blueprints={blueprints} /> : null}
        {tab === 'refinery' ? <RefineryTab refineryOrders={refineryOrders} materials={materials} callsign={callsign} /> : null}
        {tab === 'commerce' ? <Commerce /> : null}
        {tab === 'coffer' ? <CofferLedger /> : null}
        {tab === 'logistics' ? <Logistics /> : null}
        {tab === 'cargo' ? <CargoTracker /> : null}
        {tab === 'production' ? <ProductionTab blueprints={blueprints} materials={materials} callsign={callsign} onRefresh={load} /> : null}
        {tab === 'prices' ? <PriceTracker /> : null}
        {tab === 'analytics' ? <PredictiveAnalytics /> : null}
        {tab === 'lifecycle' ? (
          <div style={{ padding: '14px 16px' }}>
            <MaterialLifecycleTracker
              materials={materials}
              refineryOrders={refineryOrders}
              craftQueue={craftQueue}
              cofferLogs={[]}
              scoutDeposits={scoutDeposits}
            />
          </div>
        ) : null}
        {tab === 'ownership' ? (
          <div style={{ padding: '14px 16px' }}>
            <BlueprintOwnershipPanel blueprints={blueprints} callsign={callsign} rank={rank} />
          </div>
        ) : null}
        {tab === 'treasury' ? <OrgTreasuryDashboard /> : null}
        {tab === 'requisitions' ? <RequisitionManager /> : null}
        {tab === 'forecast' ? <ProductionForecast craftQueue={craftQueue} blueprints={blueprints} materials={materials} /> : null}
        {tab === 'pipeline' ? <SupplyChainBoard materials={materials} refineryOrders={refineryOrders} craftQueue={craftQueue} cofferLogs={cofferLogs} /> : null}
        {tab === 'craftable' ? <CraftabilityCalc blueprints={blueprints} materials={materials} /> : null}
        {tab === 'missions' ? <MissionFarmPlanner blueprints={blueprints} /> : null}
        {tab === 'dismantle' ? <DismantleTracker callsign={callsign} /> : null}
        {tab === 'wishlist' ? <BlueprintWishlistPanel blueprints={blueprints} callsign={callsign} rank={rank} /> : null}
        {tab === 'costcalc' ? <CraftingCostCalc blueprints={blueprints} materials={materials} priceSnapshots={priceSnapshots} /> : null}
        {tab === 'cargoplanner' ? <CargoSCUPlanner blueprints={blueprints} ships={orgShips} /> : null}
      </div>
    </div>
  );
}