import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Anchor, RefreshCw } from 'lucide-react';
import ShipCard from '../fleet/ShipCard';

const STATUS_COLORS = {
  AVAILABLE: '#4AE830',
  ASSIGNED: '#C8A84B',
  MAINTENANCE: '#FF6B35',
  DESTROYED: '#C0392B',
  ARCHIVED: '#8A8478',
};

function UtilizationBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ color: '#5A5850', fontSize: 9, width: 90, flexShrink: 0, letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: '#141410', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span style={{ color: '#9A9488', fontSize: 9, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function FleetReadinessView() {
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('status');

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.OrgShip.list('name', 200);
      setShips(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.OrgShip.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const statusCounts = {};
  let totalCargo = 0;
  let uniquePilots = new Set();
  ships.forEach(s => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    totalCargo += s.cargo_scu || 0;
    if (s.assigned_to_callsign) uniquePilots.add(s.assigned_to_callsign);
  });

  const utilization = ships.length > 0 ? Math.round(((statusCounts.ASSIGNED || 0) / ships.length) * 100) : 0;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Anchor size={16} style={{ color: '#C8A84B' }} />
          <div>
            <div style={{ color: '#E8E4DC', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em' }}>FLEET READINESS</div>
            <div style={{ color: '#5A5850', fontSize: 9, letterSpacing: '0.1em', marginTop: 1 }}>REDSCAR NOMADS · LIVE SHIP STATUS</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={load} className="nexus-btn" style={{ padding: '5px 10px', fontSize: 9 }}>
            <RefreshCw size={10} /> REFRESH
          </button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6, marginBottom: 10 }}>
          {[
            { label: 'TOTAL', value: ships.length, color: '#E8E4DC' },
            { label: 'AVAILABLE', value: statusCounts.AVAILABLE || 0, color: '#4AE830' },
            { label: 'ASSIGNED', value: statusCounts.ASSIGNED || 0, color: '#C8A84B' },
            { label: 'MAINTENANCE', value: statusCounts.MAINTENANCE || 0, color: '#FF6B35' },
            { label: 'CARGO', value: `${totalCargo.toLocaleString()} SCU`, color: '#5297FF' },
            { label: 'PILOTS', value: uniquePilots.size, color: '#9DA1CD' },
          ].map(s => (
            <div key={s.label} style={{ padding: '6px 10px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 3 }}>
              <div style={{ color: '#5A5850', fontSize: 7, letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Utilization */}
        {ships.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#5A5850', fontSize: 8, letterSpacing: '0.1em' }}>FLEET UTILIZATION</span>
              <span style={{ color: '#9A9488', fontSize: 8 }}>{utilization}%</span>
            </div>
            <div style={{ height: 3, background: '#141410', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${utilization}%`, background: 'linear-gradient(90deg, #4AE830, #C8A84B)', borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}

        {/* Class breakdown */}
        <div style={{ marginTop: 10 }}>
          {Object.entries(statusCounts).filter(([s]) => s !== 'ARCHIVED').sort((a, b) => b[1] - a[1]).map(([status, count]) => (
            <UtilizationBar key={status} label={status} value={count} max={ships.length} color={STATUS_COLORS[status] || '#9A9488'} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)', background: '#0A0908', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: '0.06em',
              background: filter === f ? '#1A1A16' : 'transparent',
              border: `0.5px solid ${filter === f ? 'rgba(200,170,100,0.15)' : 'transparent'}`,
              color: filter === f ? '#E8E4DC' : '#5A5850',
            }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ width: '0.5px', height: 14, background: 'rgba(200,170,100,0.10)' }} />
        <span style={{ color: '#5A5850', fontSize: 9 }}>SORT</span>
        {[['status', 'STATUS'], ['class', 'CLASS'], ['cargo', 'CARGO'], ['name', 'NAME']].map(([k, label]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{
            padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: '0.06em',
            background: sortBy === k ? 'rgba(200,168,75,0.12)' : 'transparent',
            border: `0.5px solid ${sortBy === k ? 'rgba(200,168,75,0.3)' : 'transparent'}`,
            color: sortBy === k ? '#C8A84B' : '#5A5850',
          }}>
            {label}
          </button>
        ))}
        <span style={{ color: '#5A5850', fontSize: 9, marginLeft: 'auto' }}>{filtered.length} ships</span>
      </div>

      {/* Ship grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#5A5850' }}>
            <Anchor size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 12 }}>
              {ships.length === 0 ? 'No ships registered. Add ships in the Roster tab.' : `No ships with status "${filter}".`}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {filtered.map(ship => (
              <ShipCard key={ship.id} ship={ship} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}