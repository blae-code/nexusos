/**
 * IndustryDashboard — real-time overview replacing the static IndustryOverview.
 * Renders a responsive grid of nexus-card-clickable widgets covering:
 *   • Refinery health   • Production throughput   • Coffer status
 *   • Active orders with animated progress bars   • Quick-action buttons
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import RefineryHealthCard from './RefineryHealthCard';
import ProductionThroughputCard from './ProductionThroughputCard';
import CofferStatusCard from './CofferStatusCard';
import ActiveOrdersCard from './ActiveOrdersCard';
import QuickActionsCard from './QuickActionsCard';
import StockpileSummaryCard from './StockpileSummaryCard';
import BlueprintCoverageCard from './BlueprintCoverageCard';
import { InsightStrip } from '@/apps/industry-hub/IndustryOverviewWidgets';

export default function IndustryDashboard({
  materials,
  blueprints,
  craftQueue,
  refineryOrders,
  cofferLogs,
  scoutDeposits,
  orgShips,
  onTabChange,
}) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px', animation: 'pageEntrance 200ms ease-out' }}>
      <style>{`@keyframes pageEntrance { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <InsightStrip />

      {/* Primary KPI row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}>
        <RefineryHealthCard refineryOrders={refineryOrders} onNavigate={() => onTabChange('refinery')} />
        <ProductionThroughputCard craftQueue={craftQueue} blueprints={blueprints} onNavigate={() => onTabChange('craft')} />
        <CofferStatusCard cofferLogs={cofferLogs} onNavigate={() => onTabChange('coffer')} />
      </div>

      {/* Active orders with progress bars */}
      <ActiveOrdersCard refineryOrders={refineryOrders} craftQueue={craftQueue} onTabChange={onTabChange} />

      {/* Secondary insights row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}>
        <StockpileSummaryCard materials={materials} onNavigate={() => onTabChange('materials')} />
        <BlueprintCoverageCard blueprints={blueprints} onNavigate={() => onTabChange('blueprints')} />
        <QuickActionsCard onTabChange={onTabChange} navigate={navigate} />
      </div>
    </div>
  );
}