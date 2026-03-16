import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { ShipFitting, FleetView } from './FleetForgeViews';

const TABS = ['SHIP FITTING', 'FLEET VIEW'];

export default function FleetForge() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const discordId = outletContext.discordId;
  const [tab, setTab] = useState('SHIP FITTING');
  const [builds, setBuilds] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [componentCatalog, setComponentCatalog] = useState([]);

  const load = useCallback(async () => {
    const [b, v, items] = await Promise.all([
      base44.entities.FleetBuild.list('-created_date', 50),
      base44.entities.GameCacheVehicle.list('name', 50),
      base44.entities.game_cache_items.list('-item_name', 300).catch(() => []),
    ]);
    setBuilds(b || []);
    setVehicles(v || []);
    setComponentCatalog(items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}
      >
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === t ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden nexus-fade-in">
        {tab === 'SHIP FITTING' && (
          <ShipFitting
            vehicles={vehicles}
            componentCatalog={componentCatalog}
            callsign={callsign}
            discordId={discordId}
            onBuildSaved={(record) => {
              setBuilds((current) => [record, ...current.filter((item) => item.id !== record.id)]);
              setTab('FLEET VIEW');
            }}
            onViewBuilds={() => setTab('FLEET VIEW')}
          />
        )}
        {tab === 'FLEET VIEW' && <FleetView builds={builds} />}
      </div>
    </div>
  );
}
