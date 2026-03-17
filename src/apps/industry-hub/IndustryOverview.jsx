import React from 'react';
import {
  StatCard,
  InsightStrip,
  MaterialPreviewRow,
  BlueprintGroup,
  ScoutIntelRow,
} from './IndustryOverviewWidgets';

export default function IndustryOverview({
  materials,
  blueprints,
  craftQueue,
  refineryOrders,
  scoutDeposits,
  loading,
}) {
  const totalSCU = materials.reduce((sum, material) => sum + (material.quantity_scu || 0), 0);
  const avgQuality = materials.length
    ? materials.reduce((sum, material) => sum + (material.quality_pct || 0), 0) / materials.length
    : 0;
  const ownedBlueprints = blueprints.filter((item) => item.owned_by || item.owned_by_callsign).length;
  const queueDepth = craftQueue.filter((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)).length;
  const completedCrafts = craftQueue.filter((item) => item.status === 'COMPLETE').length;
  const topMaterials = [...materials].sort((a, b) => (b.quantity_scu || 0) - (a.quantity_scu || 0)).slice(0, 5);
  const weaponBlueprints = blueprints.filter((item) => item.category === 'WEAPON').slice(0, 6);
  const supportBlueprints = blueprints.filter((item) => ['ARMOR', 'GEAR', 'COMPONENT'].includes(item.category)).slice(0, 6);
  const recentDeposits = [...(scoutDeposits || [])].filter((item) => !item.is_stale).slice(0, 4);
  const readyOrders = refineryOrders.filter((item) => item.status === 'READY').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 14px', background: 'var(--bg0)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        <StatCard
          label="ORG STOCKPILE"
          value={totalSCU.toFixed(0)}
          unit="SCU"
          detail={`${topMaterials.length} tracked materials`}
          indicator="up"
          barPercent={Math.min(100, (totalSCU / 500) * 100)}
          barColor="var(--acc)"
        />
        <StatCard
          label="AVG QUALITY"
          value={avgQuality.toFixed(0)}
          unit="%"
          detail={avgQuality >= 80 ? 'T2 extraction baseline met' : 'Below org target threshold'}
          indicator={avgQuality >= 80 ? 'up' : 'down'}
          barPercent={avgQuality}
          barColor={avgQuality < 80 ? 'var(--warn)' : 'var(--acc)'}
        />
        <StatCard
          label="BLUEPRINT COVERAGE"
          value={ownedBlueprints}
          unit={`/ ${blueprints.length || 0}`}
          detail={`${blueprints.filter((item) => item.is_priority).length} marked priority`}
          indicator="info"
          barPercent={blueprints.length ? (ownedBlueprints / blueprints.length) * 100 : 0}
          barColor="var(--acc)"
        />
        <StatCard
          label="CRAFT OUTPUT"
          value={completedCrafts}
          unit="7D"
          detail={`${queueDepth} active queue items · ${readyOrders} ready`}
          indicator={queueDepth > 0 ? 'up' : 'info'}
          barPercent={Math.min(100, completedCrafts * 10)}
          barColor="var(--acc)"
        />
      </div>

      <InsightStrip />

      <section>
        <div className="nexus-section-header">MATERIAL STOCKPILE</div>
        <div
          style={{
            padding: '0 10px 6px',
            color: 'var(--t3)',
            fontSize: 9,
            letterSpacing: '0.12em',
            borderBottom: '0.5px solid var(--b0)',
            display: 'grid',
            gridTemplateColumns: '1fr 76px 110px 68px 88px',
            gap: 8,
          }}
        >
          <span>MATERIAL</span>
          <span>TYPE</span>
          <span>QUALITY</span>
          <span style={{ textAlign: 'right' }}>QTY</span>
          <span style={{ textAlign: 'center' }}>STATUS</span>
        </div>
        <div style={{ marginTop: 6 }}>
          {topMaterials.map((material) => <MaterialPreviewRow key={material.id} material={material} />)}
          {topMaterials.length === 0 ? (
            <div style={{ color: 'var(--t2)', fontSize: 12, padding: '12px 10px' }}>No material stock logged.</div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="nexus-section-header">BLUEPRINT REGISTRY</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <BlueprintGroup label="WEAPONS" items={weaponBlueprints} />
          <BlueprintGroup label="ARMOR & COMPONENTS" items={supportBlueprints} />
        </div>
      </section>

      <section>
        <div className="nexus-section-header">SCOUT INTEL FEED</div>
        <div>
          {recentDeposits.map((deposit) => <ScoutIntelRow key={deposit.id} deposit={deposit} />)}
          {recentDeposits.length === 0 ? (
            <div style={{ color: 'var(--t2)', fontSize: 12, padding: '12px 10px' }}>No fresh scout intel.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}