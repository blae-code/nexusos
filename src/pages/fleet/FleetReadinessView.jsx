import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Anchor, RefreshCw, Ship, Package, Users, Wrench, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ShipCard from './ShipCard';

const STATUS_COLORS = {
  AVAILABLE: 'var(--live)', ASSIGNED: 'var(--warn)', MAINTENANCE: '#FF6B35',
  DESTROYED: 'var(--danger)', ARCHIVED: 'var(--t3)',
};
const STATUS_HEX = {
  AVAILABLE: '#2edb7a', ASSIGNED: '#C8A84B', MAINTENANCE: '#FF6B35',
  DESTROYED: '#C0392B', ARCHIVED: '#4A4640',
};
const CLASS_COLORS = {
  FIGHTER: '#C0392B', HEAVY_FIGHTER: '#FF6B35', MINER: '#C8A84B',
  HAULER: '#7AAECC', SALVAGER: '#2edb7a', MEDICAL: '#9DA1CD',
  EXPLORER: '#D8BC70', GROUND_VEHICLE: '#8A8478', OTHER: '#5A5850',
};

function DonutChart({ data, centerLabel, centerValue }) {
  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={42} outerRadius={62} paddingAngle={2} dataKey="value" stroke="none">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b2)', padding: '6px 10px', borderRadius: 'var(--r-md)', fontSize: 10 }}>
                  <div style={{ color: payload[0].payload.color, fontWeight: 600 }}>{payload[0].name}: {payload[0].value}</div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ color: 'var(--t0)', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{centerValue}</div>
        <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>{centerLabel}</div>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color, tip }) {
  return (
    <div className="nexus-tooltip" data-tooltip={tip} style={{
      padding: '8px 12px', background: 'var(--bg1)', border: '0.5px solid var(--b0)',
      borderRadius: 'var(--r-lg)', cursor: 'default', minWidth: 80,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <Icon size={10} style={{ color: 'var(--t3)' }} />
        <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ color, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
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
      const data = await base44.entities.OrgShip.list('name', 200).catch(() => []);
      setShips(data || []);
    } finally { setLoading(false); }
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const unsub = base44.entities.OrgShip.subscribe(scheduleRefresh);
    return () => unsub();
  }, [scheduleRefresh]);

  const statusCounts = useMemo(() => {
    const counts = {};
    ships.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return counts;
  }, [ships]);

  const classCounts = useMemo(() => {
    const counts = {};
    ships.forEach(s => { counts[s.class] = (counts[s.class] || 0) + 1; });
    return counts;
  }, [ships]);

  const totalCargo = ships.reduce((sum, s) => sum + (s.cargo_scu || 0), 0);
  const uniquePilots = new Set(ships.map(s => s.assigned_to_callsign).filter(Boolean));
  const utilization = ships.length > 0 ? Math.round(((statusCounts.ASSIGNED || 0) / ships.length) * 100) : 0;
  const maintenanceCount = statusCounts.MAINTENANCE || 0;

  const statusChartData = useMemo(() =>
    Object.entries(statusCounts).filter(([, v]) => v > 0).map(([status, value]) => ({
      name: status, value, color: STATUS_HEX[status] || '#5A5850',
    })), [statusCounts]);

  const classChartData = useMemo(() =>
    Object.entries(classCounts).filter(([, v]) => v > 0).map(([cls, value]) => ({
      name: cls.replace(/_/g, ' '), value, color: CLASS_COLORS[cls] || '#5A5850',
    })), [classCounts]);

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
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}>COMPUTING FLEET READINESS…</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Dashboard header */}
      <div style={{ padding: '16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0 }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Anchor size={18} style={{ color: 'var(--acc)' }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em' }}>FLEET READINESS</div>
            <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em', marginTop: 1 }}>REDSCAR NOMADS · LIVE SHIP STATUS</div>
          </div>
          <div style={{ flex: 1 }} />
          {maintenanceCount > 0 && (
            <div className="nexus-pill nexus-pill-warn" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={10} /> {maintenanceCount} IN MAINTENANCE
            </div>
          )}
          <button onClick={refreshNow} className="nexus-btn nexus-tooltip" data-tooltip="Refresh fleet data" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={11} /> REFRESH
          </button>
        </div>

        {/* Widgets + Charts */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Donut charts */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {statusChartData.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <DonutChart data={statusChartData} centerValue={ships.length} centerLabel="SHIPS" />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {statusChartData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                      <span style={{ color: 'var(--t3)', fontSize: 8 }}>{d.name} {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {classChartData.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <DonutChart data={classChartData} centerValue={`${utilization}%`} centerLabel="UTIL." />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {classChartData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 1, background: d.color }} />
                      <span style={{ color: 'var(--t3)', fontSize: 8 }}>{d.name} {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            <StatPill icon={Ship} label="TOTAL" value={ships.length} color="var(--t0)" tip="Total ships in fleet" />
            <StatPill icon={Anchor} label="AVAILABLE" value={statusCounts.AVAILABLE || 0} color="var(--live)" tip="Ready for deployment" />
            <StatPill icon={Users} label="ASSIGNED" value={statusCounts.ASSIGNED || 0} color="var(--warn)" tip="Currently deployed" />
            <StatPill icon={Wrench} label="MAINT." value={maintenanceCount} color="#FF6B35" tip="Ships under repair" />
            <StatPill icon={Package} label="CARGO" value={`${totalCargo.toLocaleString()}`} color="var(--info)" tip={`${totalCargo.toLocaleString()} SCU total fleet cargo`} />
            <StatPill icon={Users} label="PILOTS" value={uniquePilots.size} color="#9DA1CD" tip="Unique assigned pilots" />
          </div>
        </div>

        {/* Utilization bar */}
        {ships.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>FLEET UTILIZATION</span>
              <span style={{ color: 'var(--t1)', fontSize: 9, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{utilization}%</span>
            </div>
            <div className="nexus-bar-bg">
              <div className="nexus-bar-fill" style={{ width: `${utilization}%`, background: `linear-gradient(90deg, var(--live), var(--warn))` }} />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DESTROYED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="nexus-btn" style={{
              padding: '3px 8px', fontSize: 9,
              background: filter === f ? 'var(--bg3)' : 'var(--bg2)',
              borderColor: filter === f ? 'var(--b2)' : 'var(--b0)',
              color: filter === f ? 'var(--t0)' : 'var(--t3)',
            }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ width: '0.5px', height: 14, background: 'var(--b1)' }} />
        <span style={{ color: 'var(--t3)', fontSize: 9 }}>SORT</span>
        {[['status', 'STATUS'], ['class', 'CLASS'], ['cargo', 'CARGO'], ['name', 'NAME']].map(([k, label]) => (
          <button key={k} onClick={() => setSortBy(k)} className="nexus-btn" style={{
            padding: '3px 8px', fontSize: 9,
            background: sortBy === k ? 'rgba(200,168,75,0.12)' : 'var(--bg2)',
            borderColor: sortBy === k ? 'rgba(200,168,75,0.3)' : 'var(--b0)',
            color: sortBy === k ? 'var(--acc)' : 'var(--t3)',
          }}>
            {label}
          </button>
        ))}
        <span style={{ color: 'var(--t3)', fontSize: 9, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{filtered.length} ships</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Anchor size={36} style={{ color: 'var(--t3)', opacity: 0.15, marginBottom: 16 }} />
            <div style={{ color: 'var(--t2)', fontSize: 12 }}>
              {ships.length === 0 ? 'No ships registered. Add ships in the Roster tab.' : `No ships match "${filter}" filter.`}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 }}>
            {filtered.map(ship => <ShipCard key={ship.id} ship={ship} onRefresh={refreshNow} />)}
          </div>
        )}
      </div>
    </div>
  );
}
