/**
 * ScoutIntel — main container.
 * Route: /app/scout (via src/pages/ScoutIntel.jsx re-export)
 *
 * Layout: flex row — SystemMap (flex:1) | DepositPanel (260px fixed).
 * "Log Deposit" button top-right of toolbar (inside SystemMap toolbar area).
 *
 * Data loaded on mount:
 *   ScoutDeposit.list('-reported_at', 100)
 *   Material.list('-logged_at', 50)          — for crafting gap analysis
 *   Blueprint.filter({ is_priority: true })   — for gap analysis + op overlay
 *   Op.filter({ status: 'LIVE' }, limit 1)    — for op overlay
 *
 * rank/callsign/sessionUserId from useOutletContext (NexusShell).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { Plus, Route } from 'lucide-react';
import OperationalReferenceStrip from '@/core/design/OperationalReferenceStrip';
import MiningCircuitPlanner from './MiningCircuitPlanner';

import SystemMap    from './SystemMap';
import DepositPanel from './DepositPanel';
import DepositRouteOptimizer from './DepositRouteOptimizer';
import DepositRouteResults from './DepositRouteResults';
import DepositRiskOverlay from './DepositRiskOverlay';
import LiveSystemMap from './live-map/LiveSystemMap';

// ─── Initial filter state ─────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  system:     'ALL',
  material:   'ALL',
  qualityMin: 0,
  staleness:  'ALL',  // ALL | FRESH | WEEK
  heatmap:    false,
  opOverlay:  false,
};

// ─── ScoutIntel ───────────────────────────────────────────────────────────────

export default function ScoutIntel() {
  const ctx = /** @type {any} */ (useOutletContext() || {});
  const rank     = ctx.rank     || 'VAGRANT';
  const callsign = ctx.callsign || 'UNKNOWN';
  const navigate = useNavigate();

  const [deposits,   setDeposits]   = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [liveOp,     setLiveOp]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(false);

  const [filterState,      setFilterState]      = useState(DEFAULT_FILTERS);
  const [panelMode,        setPanelMode]         = useState('default'); // 'default' | 'detail' | 'log' | 'route' | 'route-results' | 'risk'
  const [selectedDeposit,  setSelectedDeposit]  = useState(null);
  const [optimizedRoute,   setOptimizedRoute]   = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['deposits', 'routes', 'livemap'];
  const scoutTab = validTabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'deposits';
  const setScoutTab = useCallback((id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'deposits') next.delete('tab'); else next.set('tab', id);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [deps, mats, bps, ops] = await Promise.all([
        base44.entities.ScoutDeposit.list('-reported_at', 100),
        base44.entities.Material.list('-logged_at', 50),
        base44.entities.Blueprint.filter({ is_priority: true }),
        base44.entities.Op.filter({ status: 'LIVE' }),
      ]);
      setDeposits(deps || []);
      setMaterials(mats || []);
      setBlueprints(bps || []);
      setLiveOp(Array.isArray(ops) && ops.length > 0 ? ops[0] : null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live subscriptions — refresh when deposits change
  useEffect(() => {
    const unsubs = [
      base44.entities.ScoutDeposit.subscribe(load),
      base44.entities.Op.subscribe(load),
    ];
    return () => unsubs.forEach(u => u());
  }, [load]);

  // ── Filter state partial update ────────────────────────────────────────────

  const handleFilterChange = useCallback((partial) => {
    setFilterState(prev => ({ ...prev, ...partial }));
  }, []);

  // ── Panel callbacks ────────────────────────────────────────────────────────

  const handleSelectDeposit = useCallback((deposit) => {
    setSelectedDeposit(deposit);
    setPanelMode('detail');
  }, []);

  const handleDepositUpdated = useCallback(() => {
    load();
    setSelectedDeposit(null);
    setPanelMode('default');
  }, [load]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--b3)', borderTopColor: 'var(--acc2)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#C0392B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          FAILED TO LOAD SCOUT DATA
        </div>
        <div style={{ fontSize: 11, color: '#5A5850' }}>Check your connection and try again.</div>
        <button onClick={load} style={{
          padding: '7px 18px', borderRadius: 2, border: '0.5px solid rgba(192,57,43,0.4)',
          background: 'rgba(192,57,43,0.08)', color: '#C0392B', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.1em',
        }}>RETRY</button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (scoutTab === 'livemap') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 0, padding: '0 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
          {[{ id: 'deposits', label: 'DEPOSITS' }, { id: 'livemap', label: 'LIVE MAP' }, { id: 'routes', label: 'ROUTES' }].map(t => (
            <button key={t.id} onClick={() => setScoutTab(t.id)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: scoutTab === t.id ? '2px solid #C0392B' : '2px solid transparent', color: scoutTab === t.id ? '#E8E4DC' : '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', transition: 'color 150ms' }} onMouseEnter={e => { if (scoutTab !== t.id) e.currentTarget.style.color = '#9A9488'; }} onMouseLeave={e => { if (scoutTab !== t.id) e.currentTarget.style.color = '#5A5850'; }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <LiveSystemMap />
        </div>
      </div>
    );
  }

  if (scoutTab === 'routes') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 0, padding: '0 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
          {[{ id: 'deposits', label: 'DEPOSITS' }, { id: 'livemap', label: 'LIVE MAP' }, { id: 'routes', label: 'ROUTES' }].map(t => (
            <button key={t.id} onClick={() => setScoutTab(t.id)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: scoutTab === t.id ? '2px solid #C0392B' : '2px solid transparent', color: scoutTab === t.id ? '#E8E4DC' : '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', transition: 'color 150ms' }} onMouseEnter={e => { if (scoutTab !== t.id) e.currentTarget.style.color = '#9A9488'; }} onMouseLeave={e => { if (scoutTab !== t.id) e.currentTarget.style.color = '#5A5850'; }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <OperationalReferenceStrip
            sectionLabel="SCOUT REFERENCE"
            title="Route Planning And Deposit Validation"
            description="Use Scout routes to plan efficient material runs from known deposits, then hand the result into Industry or a live operation once the route is worth committing crew and ships to."
            notes={[
              { label: 'When To Use', value: 'Route A Run', detail: 'Switch here after enough deposits are logged to compare quality, distance, and risk across a real route instead of a single ping.' },
              { label: 'Data Depends On', value: 'Scout Deposit Intel', detail: 'Route quality depends on fresh deposit reports, risk levels, and consistent location detail across systems.' },
              { label: 'Next Step', value: 'Feed Industry Or Ops', detail: 'Once a route looks viable, move into Industry to check crafting demand or into Ops Board to stage escorts, haulers, and timing.' },
            ]}
            actions={[
              { label: 'Open Deposit Map', onClick: () => setScoutTab('deposits'), tone: 'info' },
              { label: 'Open Industry Guide', onClick: () => navigate('/app/industry?tab=guide'), tone: 'warn' },
              { label: liveOp ? 'Open Live Op' : 'Open Ops Board', onClick: () => navigate(liveOp ? `/app/ops/${liveOp.id}` : '/app/ops'), tone: 'live' },
            ]}
          />
          <MiningCircuitPlanner />
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter nexus-scout-layout" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tab bar + header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 0, padding: '0 16px' }}>
            {[{ id: 'deposits', label: 'DEPOSITS' }, { id: 'livemap', label: 'LIVE MAP' }, { id: 'routes', label: 'ROUTES' }].map(t => (
              <button key={t.id} onClick={() => setScoutTab(t.id)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: scoutTab === t.id ? '2px solid #C0392B' : '2px solid transparent', color: scoutTab === t.id ? '#E8E4DC' : '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', transition: 'color 150ms' }} onMouseEnter={e => { if (scoutTab !== t.id) e.currentTarget.style.color = '#9A9488'; }} onMouseLeave={e => { if (scoutTab !== t.id) e.currentTarget.style.color = '#5A5850'; }}>{t.label}</button>
            ))}
          </div>
        </div>
        {/* Map area with action button */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 12 }}>
          <OperationalReferenceStrip
            sectionLabel="SCOUT REFERENCE"
            title="Log Deposits, Validate Them, Then Hand Them Off"
            description="Scout Intel is the live deposit map, validation surface, and run-planning handoff for the rest of the org. Treat fresh deposit quality, risk, and location detail as shared operational data."
            notes={[
              { label: 'When To Use', value: 'Scout + Validate', detail: 'Use this view while prospecting, reviewing the best fresh deposits, or checking whether a material shortfall has a known field source.' },
              { label: 'Data Depends On', value: 'Fresh Deposit Reports', detail: 'The map and gap panels are only as good as the reported location detail, quality readings, and stale/confirm votes attached to each deposit.' },
              { label: 'Next Step', value: 'Route -> Industry -> Ops', detail: 'From a promising deposit you can plan a run, compare the material against Industry demand, then log the ping into a live op when the crew is ready.' },
            ]}
            actions={[
              { label: 'Open Route Planner', onClick: () => setScoutTab('routes'), tone: 'info' },
              { label: 'Open Industry Guide', onClick: () => navigate('/app/industry?tab=guide'), tone: 'warn' },
              { label: liveOp ? 'Open Live Op' : 'Open Ops Board', onClick: () => navigate(liveOp ? `/app/ops/${liveOp.id}` : '/app/ops'), tone: 'live' },
            ]}
          />
          {/* Top action row — Log Deposit button sits top-right of map area */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (panelMode === 'risk') {
                  setPanelMode('default');
                } else {
                  setPanelMode('risk');
                }
              }}
              className="nexus-btn"
              style={{
                padding: '5px 12px', fontSize: 10, letterSpacing: '0.07em',
                display: 'flex', alignItems: 'center', gap: 4,
                background: panelMode === 'risk' ? 'rgba(192,57,43,0.08)' : undefined,
                borderColor: panelMode === 'risk' ? 'rgba(192,57,43,0.3)' : undefined,
                color: panelMode === 'risk' ? '#C0392B' : undefined,
              }}
            >
              {panelMode === 'risk' ? 'CLOSE RISK' : 'RISK OVERLAY'}
            </button>
            <button
              onClick={() => {
                if (panelMode === 'route' || panelMode === 'route-results') {
                  setPanelMode('default');
                  setOptimizedRoute(null);
                } else {
                  setPanelMode('route');
                }
              }}
              className="nexus-btn"
              style={{
                padding: '5px 12px', fontSize: 10, letterSpacing: '0.07em',
                display: 'flex', alignItems: 'center', gap: 4,
                background: (panelMode === 'route' || panelMode === 'route-results') ? 'rgba(200,168,75,0.08)' : undefined,
                borderColor: (panelMode === 'route' || panelMode === 'route-results') ? 'rgba(200,168,75,0.3)' : undefined,
                color: (panelMode === 'route' || panelMode === 'route-results') ? '#C8A84B' : undefined,
              }}
            >
              <Route size={11} />
              {(panelMode === 'route' || panelMode === 'route-results') ? 'CLOSE ROUTE' : 'OPTIMIZE ROUTE'}
            </button>
            <button
              onClick={() => setPanelMode(panelMode === 'log' ? 'default' : 'log')}
              className="nexus-btn primary"
              style={{
                padding: '5px 12px', fontSize: 10, letterSpacing: '0.07em',
                background: panelMode === 'log' ? 'rgba(var(--live-rgb), 0.08)' : undefined,
                borderColor: panelMode === 'log' ? 'rgba(var(--live-rgb), 0.3)' : undefined,
                color: panelMode === 'log' ? 'var(--live)' : undefined,
              }}
            >
              <Plus size={11} />
              {panelMode === 'log' ? 'CANCEL LOG' : '+ LOG DEPOSIT'}
            </button>
          </div>

          {/* Map (includes toolbar) */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <SystemMap
              deposits={deposits}
              blueprints={blueprints}
              liveOp={liveOp}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              onSelectDeposit={handleSelectDeposit}
              selectedDepositId={selectedDeposit?.id}
            />
          </div>
        </div>
      </div>

      {/* Right: panel — risk overlay, route optimizer, or deposit panel */}
      {panelMode === 'risk' ? (
        <div style={{
          width: 320, flexShrink: 0,
          background: 'var(--bg0)',
          borderLeft: '0.5px solid var(--b0)',
          display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            <DepositRiskOverlay deposits={deposits} />
          </div>
        </div>
      ) : panelMode === 'route' ? (
        <div style={{
          width: 280, flexShrink: 0,
          background: 'var(--bg0)',
          borderLeft: '0.5px solid var(--b0)',
          display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            <DepositRouteOptimizer
              deposits={deposits}
              onRouteCalculated={(route) => {
                setOptimizedRoute(route);
                setPanelMode('route-results');
              }}
              onClose={() => { setPanelMode('default'); setOptimizedRoute(null); }}
            />
          </div>
        </div>
      ) : panelMode === 'route-results' && optimizedRoute ? (
        <div style={{
          width: 280, flexShrink: 0,
          background: 'var(--bg0)',
          borderLeft: '0.5px solid var(--b0)',
          display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            <DepositRouteResults
              route={optimizedRoute}
              onBack={() => setPanelMode('route')}
              onClose={() => { setPanelMode('default'); setOptimizedRoute(null); }}
            />
          </div>
        </div>
      ) : (
        <DepositPanel
          mode={panelMode}
          selectedDeposit={selectedDeposit}
          deposits={deposits}
          materials={materials}
          blueprints={blueprints}
            liveOp={liveOp}
            callsign={callsign}
            rank={rank}
            onModeChange={setPanelMode}
            onSelectDeposit={setSelectedDeposit}
            onDepositUpdated={handleDepositUpdated}
        />
      )}
    </div>
  );
}