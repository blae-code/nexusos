import React from 'react';
import {
  StatCard,
  InsightStrip,
  SectionHeader,
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
}) {
  const activeMats = materials.filter(m => !m.is_archived);
  const totalSCU = activeMats.reduce((s, m) => s + (m.quantity_scu || 0), 0);
  const avgQualityScore = activeMats.length
    ? Math.round(activeMats.reduce((s, m) => s + (m.quality_score || 0), 0) / activeMats.length)
    : 0;
  const ownedBlueprints = blueprints.filter(b => b.owned_by || b.owned_by_callsign).length;
  const queueDepth = craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status)).length;
  const completedCrafts = craftQueue.filter(c => c.status === 'COMPLETE').length;
  const readyOrders = refineryOrders.filter(r => r.status === 'READY').length;
  const topMaterials = [...activeMats].sort((a, b) => (b.quantity_scu || 0) - (a.quantity_scu || 0)).slice(0, 6);
  const weaponBlueprints = blueprints.filter(b => b.category === 'WEAPON').slice(0, 6);
  const supportBlueprints = blueprints.filter(b => ['ARMOR', 'GEAR', 'COMPONENT'].includes(b.category)).slice(0, 6);
  const recentDeposits = [...(scoutDeposits || [])].filter(d => !d.is_stale).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'pageEntrance 200ms ease-out' }}>
      <style>{`@keyframes pageEntrance { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <StatCard index={0} label="ORG STOCKPILE" value={totalSCU.toFixed(0)} unit="SCU"
          detail={`${topMaterials.length} tracked materials`}
          indicator="up" barPercent={Math.min(100, (totalSCU / 500) * 100)} />
        <StatCard index={1} label="AVG QUALITY" value={avgQualityScore} unit="/ 1000"
          detail={avgQualityScore >= 800 ? 'T2 extraction baseline met' : 'Below org target threshold'}
          indicator={avgQualityScore >= 800 ? 'up' : 'down'} barPercent={(avgQualityScore / 1000) * 100} />
        <StatCard index={2} label="BLUEPRINT COVERAGE" value={ownedBlueprints} unit={`/ ${blueprints.length || 0}`}
          detail={`${blueprints.filter(b => b.is_priority).length} marked priority`}
          indicator="info" barPercent={blueprints.length ? (ownedBlueprints / blueprints.length) * 100 : 0} />
        <StatCard index={3} label="CRAFT OUTPUT" value={completedCrafts} unit="7D"
          detail={`${queueDepth} active · ${readyOrders} ready`}
          indicator={queueDepth > 0 ? 'up' : 'info'} barPercent={Math.min(100, completedCrafts * 10)} />
      </div>

      <InsightStrip />

      {/* Material Stockpile */}
      <section>
        <SectionHeader>MATERIAL STOCKPILE</SectionHeader>
        <div style={{
          background: '#0F0F0D',
          borderLeft: '2px solid #C0392B',
          borderTop: '0.5px solid rgba(200,170,100,0.10)',
          borderRight: '0.5px solid rgba(200,170,100,0.10)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 68px 68px 62px 72px 88px',
            gap: 8, padding: '8px 12px',
            background: '#141410',
            borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          }}>
            {['MATERIAL', 'SUBTYPE', 'QUALITY', 'QTY', 'DENSITY', 'STATUS'].map(h => (
              <span key={h} style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10,
                color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.2em',
              }}>{h}</span>
            ))}
          </div>
          {topMaterials.map(m => <MaterialPreviewRow key={m.id} material={m} />)}
          {topMaterials.length === 0 && (
            <div style={{
              padding: '24px 0', textAlign: 'center',
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 11, color: '#5A5850', textTransform: 'uppercase',
            }}>NO DATA LOGGED</div>
          )}
        </div>
      </section>

      {/* Blueprint Registry */}
      <section>
        <SectionHeader>BLUEPRINT REGISTRY</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <BlueprintGroup label="WEAPONS" items={weaponBlueprints} />
          <BlueprintGroup label="ARMOR & COMPONENTS" items={supportBlueprints} />
        </div>
      </section>

      {/* Scout Intel Feed */}
      <section>
        <SectionHeader>SCOUT INTEL FEED</SectionHeader>
        <div style={{
          background: '#0F0F0D',
          borderLeft: '2px solid #C0392B',
          borderTop: '0.5px solid rgba(200,170,100,0.10)',
          borderRight: '0.5px solid rgba(200,170,100,0.10)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          {recentDeposits.map(d => <ScoutIntelRow key={d.id} deposit={d} />)}
          {recentDeposits.length === 0 && (
            <div style={{
              padding: '24px 0', textAlign: 'center',
              fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
              fontSize: 11, color: '#5A5850', textTransform: 'uppercase',
            }}>NO FRESH INTEL</div>
          )}
        </div>
      </section>
    </div>
  );
}