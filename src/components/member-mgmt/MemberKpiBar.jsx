import React from 'react';
import { Users, Shield, Award, AlertTriangle } from 'lucide-react';

function Kpi({ icon: Icon, value, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: '#0F0F0D', borderLeft: `2px solid ${color}`,
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, flex: 1, minWidth: 140,
    }}>
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: '#E8E4DC', lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function MemberKpiBar({ members, blueprints }) {
  const total = members.length;
  const online = members.filter(m => m.last_seen_at && (Date.now() - new Date(m.last_seen_at).getTime()) < 5 * 60 * 1000).length;
  const admins = members.filter(m => m.is_admin).length;
  const bpOwners = new Set((blueprints || []).filter(b => b.owned_by_callsign).map(b => b.owned_by_callsign.toUpperCase())).size;
  const restricted = members.filter(m => m.intel_access === 'RESTRICTED' || m.intel_access === 'NONE').length;

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Kpi icon={Users} value={total} label="TOTAL MEMBERS" color="#9A9488" />
      <Kpi icon={Users} value={online} label="ONLINE NOW" color="#4A8C5C" />
      <Kpi icon={Shield} value={admins} label="ADMINS" color="#C8A84B" />
      <Kpi icon={Award} value={bpOwners} label="BP HOLDERS" color="#3498DB" />
      <Kpi icon={AlertTriangle} value={restricted} label="RESTRICTED" color="#C0392B" />
    </div>
  );
}