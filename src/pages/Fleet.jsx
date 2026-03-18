import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Anchor, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  active: 'var(--live)',
  maintenance: 'var(--warn)',
  idle: 'var(--t2)',
  destroyed: 'var(--danger)',
};

function ShipCard({ ship, vehicleData }) {
  const cargoCapacity = vehicleData?.cargo?.max || ship.cargo || 0;
  const status = ship.status || 'idle';
  const hasActiveMission = ship.status === 'active';

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 3,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>
            {ship.name || ship.label}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
            {ship.type || 'Unknown Class'}
          </div>
        </div>

        {/* Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: `rgba(${
              status === 'active' ? 'var(--live-rgb)' :
              status === 'maintenance' ? 'var(--warn-rgb)' : 'rgba(200,170,100)'
            }, 0.12)`,
            borderRadius: 3,
            color: STATUS_COLORS[status] || 'var(--t2)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: STATUS_COLORS[status] || 'var(--t2)',
              animation: status === 'active' ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
            }}
          />
          {status.toUpperCase()}
        </div>
      </div>

      {/* Specs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          fontSize: 10,
        }}
      >
        {cargoCapacity > 0 && (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, padding: '8px 10px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 2 }}>CARGO</div>
            <div style={{ color: 'var(--acc)', fontWeight: 600, fontSize: 12 }}>
              {cargoCapacity} SCU
            </div>
          </div>
        )}

        {ship.pledge_cost && (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, padding: '8px 10px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 2 }}>COST</div>
            <div style={{ color: 'var(--t0)', fontWeight: 600 }}>
              ${ship.pledge_cost.toLocaleString()}
            </div>
          </div>
        )}

        {ship.manufacturer && (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, padding: '8px 10px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 2 }}>MFR</div>
            <div style={{ color: 'var(--t1)', fontSize: 10 }}>
              {ship.manufacturer}
            </div>
          </div>
        )}

        {ship.fleet_role && (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3, padding: '8px 10px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 2 }}>ROLE</div>
            <div style={{ color: 'var(--info)', fontSize: 10 }}>
              {ship.fleet_role}
            </div>
          </div>
        )}
      </div>

      {/* Mission Status */}
      {hasActiveMission && (
        <div style={{ background: 'rgba(var(--live-rgb), 0.08)', border: '0.5px solid rgba(var(--live-rgb), 0.2)', borderRadius: 3, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={12} style={{ color: 'var(--live)', flexShrink: 0 }} />
          <span style={{ color: 'var(--live)', fontSize: 9 }}>Active Mission — Currently Deployed</span>
        </div>
      )}
    </div>
  );
}

export default function Fleet() {
  const [org, setOrg] = useState(null);
  const [ships, setShips] = useState([]);
  const [vehicleCache, setVehicleCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFleet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orgRes = await base44.functions.invoke('fleetyardsSync', { action: 'org' });
      setOrg(orgRes.data?.org);

      const shipsRes = await base44.functions.invoke('fleetyardsSync', { action: 'ships' });
      const shipList = shipsRes.data?.ships || [];
      setShips(shipList);

      // Pre-fetch vehicle data for each ship type
      const cache = {};
      for (const ship of shipList) {
        if (ship.type && !cache[ship.type]) {
          try {
            const vehicleRes = await base44.functions.invoke('fleetyardsSync', {
              action: 'vehicle',
              ship_type: ship.type,
            });
            cache[ship.type] = vehicleRes.data?.vehicle || null;
          } catch {
            cache[ship.type] = null;
          }
        }
      }
      setVehicleCache(cache);
    } catch (err) {
      setError(err.message || 'Failed to load fleet data');
      console.error('[Fleet]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

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

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)', textAlign: 'center' }}>
        <AlertCircle size={24} style={{ marginBottom: 12, opacity: 0.6 }} />
        <div style={{ fontSize: 12 }}>{error}</div>
        <button
          onClick={loadFleet}
          style={{
            marginTop: 16,
            padding: '6px 14px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 3,
            color: 'var(--t1)',
            fontSize: 10,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const totalCargo = ships.reduce((sum, ship) => {
    const vehicleData = vehicleCache[ship.type];
    return sum + (vehicleData?.cargo?.max || ship.cargo || 0);
  }, 0);

  const activeMissions = ships.filter(s => s.status === 'active').length;

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>
      {/* Header Stats */}
      <div
        style={{
          background: 'var(--bg1)',
          borderBottom: '0.5px solid var(--b1)',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {[
          { label: 'ORG FLEET', value: ships.length, icon: Anchor },
          { label: 'TOTAL CARGO', value: `${totalCargo} SCU`, color: 'var(--acc)' },
          { label: 'ACTIVE MISSIONS', value: activeMissions, color: activeMissions > 0 ? 'var(--live)' : 'var(--t2)' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '10px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b0)', borderRadius: 3 }}>
            <div style={{ color: 'var(--t2)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ color: stat.color || 'var(--t0)', fontSize: 14, fontWeight: 700 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Ship Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {ships.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {ships.map((ship) => (
              <ShipCard
                key={ship.id}
                ship={ship}
                vehicleData={vehicleCache[ship.type]}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--t2)', paddingTop: 40 }}>
            <Anchor size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>No ships in fleet</div>
          </div>
        )}
      </div>
    </div>
  );
}