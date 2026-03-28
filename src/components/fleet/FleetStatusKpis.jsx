/**
 * FleetStatusKpis — Aggregated KPI strip for the fleet status panel.
 */
import React, { useMemo } from 'react';
import { Ship, Package, Users, Wrench, AlertTriangle, TrendingUp } from 'lucide-react';

function Kpi({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2,
      flex: '1 1 140px', minWidth: 120,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 2,
        background: '#141410', border: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={12} style={{ color }} />
      </div>
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>{label}</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
          fontWeight: 700, color: '#E8E4DC', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
        }}>{value}</div>
        {sub && <div style={{ fontSize: 8, color: '#3A3830', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function fmtAuec(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function FleetStatusKpis({ ships, members, activeOnOps }) {
  const stats = useMemo(() => {
    const total = ships.length;
    const available = ships.filter(s => s.status === 'AVAILABLE').length;
    const assigned = ships.filter(s => s.status === 'ASSIGNED').length;
    const maintenance = ships.filter(s => s.status === 'MAINTENANCE').length;
    const destroyed = ships.filter(s => s.status === 'DESTROYED').length;
    const totalCargo = ships.reduce((s, sh) => s + (sh.cargo_scu || 0), 0);
    const totalCrew = ships.reduce((s, sh) => s + (sh.crew_size || 0), 0);
    const pilots = new Set(ships.map(s => s.assigned_to_callsign).filter(Boolean)).size;
    const totalValue = ships.reduce((s, sh) => s + (sh.estimated_value_aUEC || 0), 0);
    const operational = available + assigned;
    const readinessPct = total > 0 ? Math.round((operational / total) * 100) : 0;
    const onOps = ships.filter(s => s.assigned_to_callsign && activeOnOps.has(s.assigned_to_callsign)).length;
    return { total, available, assigned, maintenance, destroyed, totalCargo, totalCrew, pilots, totalValue, readinessPct, onOps };
  }, [ships, activeOnOps]);

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 16px',
      borderBottom: '0.5px solid rgba(200,170,100,0.08)', background: '#0A0908', flexShrink: 0,
    }}>
      <Kpi icon={Ship} label="FLEET SIZE" value={stats.total} sub={`${stats.readinessPct}% operational`} color="#E8E4DC" />
      <Kpi icon={Ship} label="AVAILABLE" value={stats.available} color="#4A8C5C" />
      <Kpi icon={Users} label="ASSIGNED" value={stats.assigned} sub={`${stats.onOps} on active ops`} color="#C8A84B" />
      <Kpi icon={Wrench} label="MAINTENANCE" value={stats.maintenance} color="#FF6B35" />
      <Kpi icon={AlertTriangle} label="DESTROYED" value={stats.destroyed} color="#E04848" />
      <Kpi icon={Package} label="CARGO CAP" value={`${stats.totalCargo.toLocaleString()}`} sub="SCU total" color="#7AAECC" />
      <Kpi icon={TrendingUp} label="FLEET VALUE" value={fmtAuec(stats.totalValue)} sub="aUEC estimated" color="#9DA1CD" />
    </div>
  );
}