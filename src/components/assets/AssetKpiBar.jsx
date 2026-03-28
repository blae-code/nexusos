import React from 'react';
import { Package, Users, MapPin, AlertTriangle } from 'lucide-react';

function Kpi({ icon: Icon, label, value, color = '#E8E4DC' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
      background: '#0F0F0D', borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, minWidth: 150,
    }}>
      <Icon size={14} style={{ color: '#C8A84B', flexShrink: 0 }} />
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 18, color, letterSpacing: '0.04em', lineHeight: 1,
        }}>{value}</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2,
        }}>{label}</div>
      </div>
    </div>
  );
}

function fmt(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
}

export default function AssetKpiBar({ assets }) {
  const total = assets.length;
  const assigned = assets.filter(a => a.assigned_to_callsign).length;
  const locations = new Set(assets.map(a => a.location_system).filter(Boolean)).size;
  const issues = assets.filter(a => ['DAMAGED', 'DESTROYED', 'MISSING'].includes(a.status)).length;
  const totalValue = assets.reduce((s, a) => s + (a.estimated_value_aUEC || 0), 0);

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Kpi icon={Package} label="TOTAL ASSETS" value={total} />
      <Kpi icon={Users} label="ASSIGNED" value={`${assigned}/${total}`} />
      <Kpi icon={MapPin} label="SYSTEMS" value={locations} />
      <Kpi icon={AlertTriangle} label="ISSUES" value={issues} color={issues > 0 ? '#C0392B' : '#E8E4DC'} />
      <Kpi icon={Package} label="TOTAL VALUE" value={`${fmt(totalValue)} aUEC`} />
    </div>
  );
}