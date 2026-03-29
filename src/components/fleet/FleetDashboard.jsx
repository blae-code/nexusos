import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Ship, Package, Users, Wrench, Crosshair } from 'lucide-react';
import FleetStatusChart from './FleetStatusChart';
import FleetClassBreakdown from './FleetClassBreakdown';
import FleetAssignmentGrid from './FleetAssignmentGrid';

function KPI({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', background: 'var(--bg1)',
      border: '0.5px solid var(--b0)', borderRadius: 'var(--r-lg)',
      flex: '1 1 140px', minWidth: 130,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--r-lg)',
        background: 'var(--bg2)', border: '0.5px solid var(--b1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  );
}

export default function FleetDashboard() {
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.OrgShip.list('-created_date', 300).catch(() => []);
    setShips((data || []).filter(s => s.status !== 'ARCHIVED'));
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const unsub = base44.entities.OrgShip.subscribe(scheduleRefresh);
    return unsub;
  }, [scheduleRefresh]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}>LOADING FLEET DASHBOARD…</span>
      </div>
    );
  }

  const total = ships.length;
  const available = ships.filter(s => s.status === 'AVAILABLE').length;
  const assigned = ships.filter(s => s.status === 'ASSIGNED').length;
  const maintenance = ships.filter(s => s.status === 'MAINTENANCE').length;
  const totalCargo = ships.reduce((sum, s) => sum + (s.cargo_scu || 0), 0);

  return (
    <div className="nexus-page-enter" style={{ overflow: 'auto', height: '100%', padding: '16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPI row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <KPI icon={Ship} label="TOTAL FLEET" value={total} color="var(--t1)" />
          <KPI icon={Crosshair} label="AVAILABLE" value={available} color="var(--live)" />
          <KPI icon={Users} label="ASSIGNED" value={assigned} color="var(--warn)" />
          <KPI icon={Wrench} label="MAINTENANCE" value={maintenance} color="#FF6B35" />
          <KPI icon={Package} label="CARGO CAPACITY" value={`${totalCargo.toLocaleString()} SCU`} color="var(--info)" />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <FleetStatusChart ships={ships} />
          <FleetClassBreakdown ships={ships} />
        </div>

        {/* Assignment grid */}
        <FleetAssignmentGrid ships={ships} />
      </div>
    </div>
  );
}
