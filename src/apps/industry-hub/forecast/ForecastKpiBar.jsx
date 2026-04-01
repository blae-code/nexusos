import React from 'react';
import { AlertTriangle, TrendingDown, Clock, Package } from 'lucide-react';

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      background: 'var(--bg1)',
      border: '0.5px solid var(--b0)',
      borderRadius: 'var(--r-lg)',
      flex: '1 1 140px',
      minWidth: 140,
    }}>
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      </div>
    </div>
  );
}

export default function ForecastKpiBar({ summary }) {
  if (!summary) return null;
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Kpi icon={AlertTriangle} label="CRITICAL" value={summary.critical_count} color="var(--danger)" />
      <Kpi icon={TrendingDown} label="HIGH RISK" value={summary.high_count} color="var(--warn)" />
      <Kpi icon={Clock} label="MEDIUM" value={summary.medium_count} color="var(--info)" />
      <Kpi icon={Package} label="TRACKED" value={summary.total_materials_tracked} color="var(--t2)" />
    </div>
  );
}