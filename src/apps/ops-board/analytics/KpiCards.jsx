/**
 * KpiCards — Top-level KPI row for ops analytics.
 */
import React from 'react';
import { Clock, Users, TrendingUp, Package, ShieldAlert, Crosshair } from 'lucide-react';

function fmtAuec(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function KpiCard({ icon: Icon, label, value, sub = '', color }) {
  return (
    <div style={{
      padding: '16px 18px', background: '#0F0F0D',
      borderLeft: `2px solid ${color}`, borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={12} style={{ color, flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700,
        color: '#E8E4DC', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color: '#5A5850',
        }}>{sub}</span>
      )}
    </div>
  );
}

export default function KpiCards({ kpis }) {
  if (!kpis) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
      <KpiCard icon={Crosshair} label="Total Ops" value={kpis.totalOps} color="#C0392B" />
      <KpiCard icon={TrendingUp} label="Total Revenue" value={`${fmtAuec(kpis.totalRevenue)}`} sub="aUEC from completed ops" color="#4A8C5C" />
      <KpiCard icon={Package} label="Total Loot" value={`${kpis.totalLoot.toFixed(0)} SCU`} color="#C8A84B" />
      <KpiCard icon={Clock} label="Avg Duration" value={`${kpis.avgDuration}m`} sub="per operation" color="#7AAECC" />
      <KpiCard icon={Users} label="Avg Crew" value={kpis.avgCrew} sub="per operation" color="#9A9488" />
      <KpiCard icon={ShieldAlert} label="Threats" value={kpis.totalThreats} sub="total encounters" color="#E04848" />
    </div>
  );
}
