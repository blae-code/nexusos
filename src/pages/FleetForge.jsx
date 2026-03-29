// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';

import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { fleetPlanningApi } from '@/core/data/fleet-planning-api';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';

import FleetForgeShipFitting from './FleetForgeShipFitting';
import FleetForgePlanner from './FleetForgePlanner';
import FleetForgeLibrary from './FleetForgeLibrary';

const TABS = ['INDIVIDUAL FITTER', 'COLLABORATIVE PLANNING', 'BUILD LIBRARY'];

export default function FleetForge() {
  const { user } = useSession();
  const [tab, setTab] = useState('INDIVIDUAL FITTER');
  const [catalog, setCatalog] = useState({ ships: [], components: [], support: [], counts: {} });
  const [snapshot, setSnapshot] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (scenarioId = null) => {
    setLoading(true);
    setError('');
    try {
      const [catalogResult, scenariosResult, snapshotResult] = await Promise.all([
        fleetPlanningApi.getCatalog({}),
        fleetPlanningApi.listScenarios(),
        fleetPlanningApi.getSnapshot(scenarioId),
      ]);

      setCatalog(catalogResult || { ships: [], components: [], support: [], counts: {} });
      setScenarios(Array.isArray(scenariosResult) ? scenariosResult : []);
      setSnapshot(snapshotResult || null);

      if (!scenarioId && Array.isArray(scenariosResult) && scenariosResult[0]?.id) {
        setSelectedScenarioId(scenariosResult[0].id);
      }
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load Fleet Forge');
    } finally {
      setLoading(false);
    }
  }, []);
  const loadSelectedScenario = useCallback(() => load(selectedScenarioId), [load, selectedScenarioId]);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(loadSelectedScenario);

  useEffect(() => {
    void refreshNow();
  }, [loadSelectedScenario, refreshNow]);

  useEffect(() => {
    const unsubscribers = [];
    ['FleetBuild', 'FleetScenario', 'FleetScenarioAssignment', 'OrgUnit'].forEach((entityName) => {
      try {
        const entity = base44.entities?.[entityName];
        if (entity?.subscribe) {
          unsubscribers.push(entity.subscribe(scheduleRefresh));
        }
      } catch {
        // entity missing in this deployment
      }
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        try { unsubscribe?.(); } catch { /* noop */ }
      });
    };
  }, [scheduleRefresh]);

  const builds = Array.isArray(snapshot?.builds) ? snapshot.builds : [];

  return (
    <div className="nexus-page-enter flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}>
        {TABS.map((entry) => (
          <button
            key={entry}
            onClick={() => setTab(entry)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === entry ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === entry ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {entry}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>
          {catalog?.counts?.ships || 0} SHIPS · {catalog?.counts?.components || 0} COMPONENTS
        </div>
      </div>

      {error ? (
        <div style={{ margin: 16, padding: '10px 12px', border: '0.5px solid rgba(var(--danger-rgb), 0.3)', background: 'rgba(var(--danger-rgb), 0.08)', color: 'var(--danger)', fontSize: 11 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', fontSize: 11, letterSpacing: '0.1em' }}>
          BUILDING FLEET PLANNER...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden nexus-fade-in">
          {tab === 'INDIVIDUAL FITTER' ? (
            <FleetForgeShipFitting
              catalog={catalog}
              user={user}
              onBuildSaved={() => {
                setTab('BUILD LIBRARY');
                void refreshNow();
              }}
            />
          ) : null}

          {tab === 'COLLABORATIVE PLANNING' ? (
            <FleetForgePlanner
              snapshot={snapshot}
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={setSelectedScenarioId}
              onRefresh={refreshNow}
              user={user}
            />
          ) : null}

          {tab === 'BUILD LIBRARY' ? (
            <FleetForgeLibrary builds={builds} />
          ) : null}
        </div>
      )}
    </div>
  );
}
