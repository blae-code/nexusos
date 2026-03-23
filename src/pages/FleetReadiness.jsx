import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { AlertTriangle, Anchor } from 'lucide-react';
import ShipReadinessCard from '@/components/fleet/ShipReadinessCard';
import FleetReadinessHeader from '@/components/fleet/FleetReadinessHeader';

const REFRESH_INTERVAL = 90000; // 90s

export default function FleetReadiness() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('status');
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await base44.functions.invoke('fleetReadiness', {});
      setData(res.data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e?.message || 'Failed to load fleet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const ships = data?.ships ?? [];
  const stats = data?.stats ?? {};
  const verseStatus = data?.verse_status ?? 'unknown';
  const hydrogenFuel = data?.hydrogen_fuel;

  const STATUS_ORDER = { AVAILABLE: 0, ASSIGNED: 1, MAINTENANCE: 2, DESTROYED: 3, ARCHIVED: 4 };
  const CLASS_ORDER = { FIGHTER: 0, HEAVY_FIGHTER: 1, MINER: 2, HAULER: 3, SALVAGER: 4, MEDICAL: 5, EXPLORER: 6, GROUND_VEHICLE: 7, OTHER: 8 };

  const filtered = ships
    .filter(s => filter === 'ALL' || s.status === filter)
    .sort((a, b) => {
      if (sortBy === 'status') return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (sortBy === 'class') return (CLASS_ORDER[a.class] ?? 9) - (CLASS_ORDER[b.class] ?? 9);
      if (sortBy === 'cargo') return (b.cargo_scu || 0) - (a.cargo_scu || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div className="nexus-loading-dots"><span /><span /><span /></div>
        <span style={{ color: 'var(--t2)', fontSize: 11, letterSpacing: '0.1em' }}>QUERYING UEX CORP & FLEET DATABASE…</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <FleetReadinessHeader
        stats={stats}
        verseStatus={verseStatus}
        hydrogenFuel={hydrogenFuel}
        lastRefresh={lastRefresh}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        uexVehiclesCount={data?.uex_vehicles_count ?? 0}
      />

      {/* ── Filters & Sort ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
        borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 9px', borderRadius: 3, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 9, letterSpacing: '0.08em',
                background: filter === f ? 'var(--bg3)' : 'transparent',
                border: `0.5px solid ${filter === f ? 'var(--b2)' : 'transparent'}`,
                color: filter === f ? 'var(--t0)' : 'var(--t2)',
              }}
            >{f}</button>
          ))}
        </div>
        <div style={{ width: '0.5px', height: 14, background: 'var(--b1)' }} />
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.08em' }}>SORT</span>
        {[['status', 'STATUS'], ['class', 'CLASS'], ['cargo', 'CARGO'], ['name', 'NAME']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSortBy(k)}
            style={{
              padding: '3px 9px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 9, letterSpacing: '0.08em',
              background: sortBy === k ? 'rgba(200,168,75,0.12)' : 'transparent',
              border: `0.5px solid ${sortBy === k ? 'rgba(200,168,75,0.3)' : 'transparent'}`,
              color: sortBy === k ? '#C8A84B' : 'var(--t2)',
            }}
          >{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--t3)', fontSize: 9 }}>{filtered.length} ships</span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ margin: '12px 20px 0', padding: '10px 14px', background: 'rgba(192,57,43,0.1)', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 4, color: '#C0392B', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Ship Grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t2)' }}>
            <Anchor size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 12 }}>
              {ships.length === 0
                ? 'No ships registered. Sync from FleetYards or add ships manually.'
                : `No ships with status "${filter}".`}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 12,
          }}>
            {filtered.map(ship => (
              <ShipReadinessCard key={ship.id} ship={ship} hydrogenFuel={hydrogenFuel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
