/**
 * OpsDashboard — Analytics dashboard for completed operations.
 * Visualises KPIs, revenue trends, crew efficiency, duration, type breakdown, and op history.
 */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import useOpsAnalytics from '@/apps/ops-board/analytics/useOpsAnalytics';
import KpiCards from '@/apps/ops-board/analytics/KpiCards';
import RevenueTrendChart from '@/apps/ops-board/analytics/RevenueTrendChart';
import DurationCrewChart from '@/apps/ops-board/analytics/DurationCrewChart';
import LootEfficiencyChart from '@/apps/ops-board/analytics/LootEfficiencyChart';
import TypeBreakdown from '@/apps/ops-board/analytics/TypeBreakdown';
import CompletedOpsTable from '@/apps/ops-board/analytics/CompletedOpsTable';

function Panel({ title, children, style }) {
  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: 16, ...style,
    }}>
      {title && (
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase',
          marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>{title}</div>
      )}
      {children}
    </div>
  );
}

export default function OpsDashboard() {
  const { loading, data, refresh } = useOpsAnalytics();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  if (!data || data.ops.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 14 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.15 }}>
          <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
          <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
          <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.6" />
          <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
        </svg>
        <span style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em', textAlign: 'center',
        }}>NO COMPLETED OPERATIONS TO ANALYZE</span>
        <span style={{ fontSize: 11, color: '#3A3830' }}>Complete some ops to see analytics here</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ padding: '20px 24px 40px', overflow: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20,
              color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>OPERATIONS ANALYTICS</div>
            <div style={{
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 4,
            }}>PERFORMANCE ACROSS {data.kpis.totalOps} COMPLETED OPS</div>
          </div>
          <button onClick={refresh} style={{
            background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2, padding: '6px 12px', cursor: 'pointer',
            color: '#5A5850', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
            transition: 'border-color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)'; }}>
            <RefreshCw size={11} /> REFRESH
          </button>
        </div>

        {/* KPI Cards */}
        <KpiCards kpis={data.kpis} />

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="REVENUE & EXPENSES TREND">
            <RevenueTrendChart ops={data.ops} />
          </Panel>
          <Panel title="DURATION & CREW SIZE">
            <DurationCrewChart ops={data.ops} />
          </Panel>
        </div>

        {/* Second row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Panel title="LOOT EFFICIENCY (SCU PER CREW)">
            <LootEfficiencyChart ops={data.ops} />
          </Panel>
          <Panel title="OP TYPE DISTRIBUTION">
            <TypeBreakdown breakdown={data.typeBreakdown} totalOps={data.kpis.totalOps} />
          </Panel>
        </div>

        {/* Completed ops table */}
        <Panel title="COMPLETED OPERATIONS">
          <CompletedOpsTable ops={data.ops} />
        </Panel>
      </div>
    </div>
  );
}