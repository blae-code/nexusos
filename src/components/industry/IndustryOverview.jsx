import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BlueprintHolderChip,
  BlueprintPriorityTag,
  BlueprintStatusDot,
  InsightInfoIcon,
  MaterialGlyph,
  MaterialStatusPill,
} from './IndustryVisuals';

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getQualityColor(value) {
  if (value >= 80) return 'var(--live)';
  if (value >= 60) return 'var(--warn)';
  return 'var(--t2)';
}

function getQualityBarColor(value) {
  if (value >= 80) return 'var(--t1)';
  if (value >= 60) return 'var(--t2)';
  return 'var(--t3)';
}

function StatCard({ label, value, unit, detail, indicator = 'info', barPercent = 0, barColor = 'var(--acc)' }) {
  const indicatorColor = indicator === 'up' ? 'var(--live)' : indicator === 'down' ? 'var(--warn)' : 'var(--info)';
  const indicatorSymbol = indicator === 'up' ? '↑' : indicator === 'down' ? '↓' : '•';

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
        padding: '12px 13px',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--b2)' }} />
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--t0)', fontSize: 22, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit ? <span style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 400, marginLeft: 4 }}>{unit}</span> : null}
      </div>
      <div style={{ fontSize: 9, marginTop: 5, color: 'var(--t3)' }}>
        <span style={{ color: indicatorColor, marginRight: 4 }}>{indicatorSymbol}</span>
        <span>{detail}</span>
      </div>
      <div style={{ marginTop: 8, height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, barPercent))}%`, height: '100%', borderRadius: 1, background: barColor, transition: 'width .4s ease-out' }} />
      </div>
    </div>
  );
}

function InsightStrip() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async (prompt) => {
    setLoading(true);
    try {
      const payload = prompt ? { prompt } : {};
      const response = await base44.functions.invoke('generateInsight', payload);
      setInsight(response?.data?.insight || response?.insight || null);
    } catch (error) {
      console.warn('[IndustryOverview] generateInsight failed:', error?.message || error);
      setInsight(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 7,
        padding: '11px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
        minHeight: 44,
      }}
    >
      {loading ? (
        <div style={{ color: 'var(--t2)', fontSize: 10, fontStyle: 'italic' }}>Analysing org state...</div>
      ) : (
        <>
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--info)',
              animation: 'pulse-dot 2s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: 28,
              height: 28,
              background: 'var(--bg3)',
              border: '0.5px solid var(--b2)',
              borderRadius: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--acc2)',
              flexShrink: 0,
            }}
          >
            <InsightInfoIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--t0)', fontSize: 11, marginBottom: 3 }}>
              {insight?.title || 'No readiness signal available'}
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>
              {insight?.detail || 'Refresh when new org data has been logged.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {insight?.action_1_label ? (
              <button onClick={() => fetchInsight(insight.action_1_prompt)} className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10, whiteSpace: 'nowrap' }}>
                {insight.action_1_label}
              </button>
            ) : null}
            {insight?.action_2_label ? (
              <button onClick={() => fetchInsight(insight.action_2_prompt)} className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10, whiteSpace: 'nowrap' }}>
                {insight.action_2_label}
              </button>
            ) : null}
            <button onClick={() => fetchInsight()} className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10, whiteSpace: 'nowrap' }}>
              REFRESH
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MaterialPreviewRow({ material }) {
  const quality = material.quality_pct || 0;
  const qualityColor = getQualityBarColor(quality);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 76px 110px 68px 88px',
        gap: 8,
        padding: '8px 10px',
        background: 'var(--bg1)',
        border: '0.5px solid var(--b0)',
        borderRadius: 6,
        marginBottom: 3,
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'background .1s, border-color .1s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg2)';
        event.currentTarget.style.borderColor = 'var(--b1)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'var(--bg1)';
        event.currentTarget.style.borderColor = 'var(--b0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          style={{
            width: 24,
            height: 24,
            background: 'var(--bg3)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--t2)',
            flexShrink: 0,
          }}
        >
          <MaterialGlyph type={material.material_type} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.material_name}</div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 1 }}>{material.location || material.source_type || 'Unspecified source'}</div>
        </div>
      </div>

      <div>
        <span className="nexus-tag">{material.material_type}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${quality}%`, height: '100%', background: qualityColor }} />
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{quality.toFixed(0)}%</div>
      </div>

      <div style={{ textAlign: 'right', color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        {(material.quantity_scu || 0).toFixed(1)}
        <span style={{ color: 'var(--t3)', fontSize: 9, marginLeft: 4 }}>SCU</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MaterialStatusPill material={material} />
      </div>
    </div>
  );
}

function BlueprintGroup({ label, items }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 8, padding: '11px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em' }}>{label}</span>
        <span style={{ color: 'var(--t2)', fontSize: 9 }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--t2)', fontSize: 11, padding: '6px 7px' }}>No entries</div>
      ) : (
        items.map((blueprint) => {
          const owned = Boolean(blueprint.owned_by || blueprint.owned_by_callsign);

          return (
            <div
              key={blueprint.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 7px',
                borderRadius: 5,
                cursor: 'pointer',
                transition: 'background .1s',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--bg2)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              <BlueprintStatusDot isPriority={blueprint.is_priority} owned={owned} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: owned ? 'var(--t0)' : 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {blueprint.item_name}
              </div>
              {blueprint.is_priority ? (
                <BlueprintPriorityTag />
              ) : owned ? (
                <BlueprintHolderChip holder={blueprint.owned_by_callsign || 'owned'} />
              ) : (
                <span style={{ color: 'var(--t3)', fontSize: 9 }}>unowned</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function ScoutIntelRow({ deposit }) {
  const qualityColor = getQualityColor(deposit.quality_pct || 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '9px 10px',
        background: 'var(--bg1)',
        border: '0.5px solid var(--b0)',
        borderRadius: 6,
        marginBottom: 3,
        cursor: 'pointer',
        transition: 'background .1s, border-color .1s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg2)';
        event.currentTarget.style.borderColor = 'var(--b1)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'var(--bg1)';
        event.currentTarget.style.borderColor = 'var(--b0)';
      }}
    >
      <div style={{ color: 'var(--t3)', fontSize: 9, whiteSpace: 'nowrap', minWidth: 38, paddingTop: 1 }}>
        {relativeTime(deposit.reported_at)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--t0)', fontSize: 11, marginBottom: 2 }}>
          {deposit.material_name}{deposit.location_detail ? ` - ${deposit.location_detail}` : ''}
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 9 }}>
          {[deposit.reported_by_callsign, deposit.ship_type, deposit.system_name].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{ color: qualityColor, fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {(deposit.quality_pct || 0).toFixed(0)}%
      </div>
    </div>
  );
}

function RailCard({ label, children }) {
  return (
    <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
        <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ padding: 8 }}>{children}</div>
    </div>
  );
}

export default function IndustryOverview({
  materials,
  blueprints,
  craftQueue,
  refineryOrders,
  scoutDeposits,
}) {
  const totalSCU = materials.reduce((sum, material) => sum + (material.quantity_scu || 0), 0);
  const avgQuality = materials.length ? materials.reduce((sum, material) => sum + (material.quality_pct || 0), 0) / materials.length : 0;
  const readyBlueprints = blueprints.filter((blueprint) => blueprint.owned_by || blueprint.owned_by_callsign).length;
  const completedCrafts = craftQueue.filter((item) => item.status === 'COMPLETE').length;
  const topMaterials = [...materials].sort((a, b) => (b.quantity_scu || 0) - (a.quantity_scu || 0)).slice(0, 5);
  const weaponBlueprints = blueprints.filter((item) => item.category === 'WEAPON').slice(0, 6);
  const armorBlueprints = blueprints.filter((item) => ['ARMOR', 'GEAR', 'COMPONENT'].includes(item.category)).slice(0, 6);
  const recentDeposits = (scoutDeposits || []).filter((item) => !item.is_stale).slice(0, 4);
  const activeOrders = refineryOrders.filter((item) => item.status === 'ACTIVE');
  const readyOrders = refineryOrders.filter((item) => item.status === 'READY');
  const queueDepth = craftQueue.filter((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 14px', background: 'var(--bg0)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
        <StatCard
          label="ORG STOCKPILE"
          value={totalSCU.toFixed(0)}
          unit="SCU"
          detail={`${topMaterials.length} tracked materials`}
          indicator="up"
          barPercent={Math.min(100, (totalSCU / 500) * 100)}
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
          value={readyBlueprints}
          unit={`/ ${blueprints.length || 0}`}
          detail={`${blueprints.filter((item) => item.is_priority).length} marked priority`}
          indicator="info"
          barPercent={blueprints.length ? (readyBlueprints / blueprints.length) * 100 : 0}
        />
        <StatCard
          label="CRAFT OUTPUT"
          value={completedCrafts}
          unit="7D"
          detail={`${queueDepth} active queue items`}
          indicator={queueDepth > 0 ? 'up' : 'info'}
          barPercent={Math.min(100, completedCrafts * 10)}
        />
      </div>

      <InsightStrip />

      <div className="flex gap-4" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-14" style={{ flex: 1, minWidth: 0 }}>
          <section>
            <div className="nexus-section-header">MATERIAL STOCKPILE</div>
            <div style={{ padding: '0 10px 6px', color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', borderBottom: '0.5px solid var(--b0)', display: 'grid', gridTemplateColumns: '1fr 76px 110px 68px 88px', gap: 8 }}>
              <span>MATERIAL</span>
              <span>TYPE</span>
              <span>QUALITY</span>
              <span style={{ textAlign: 'right' }}>QTY</span>
              <span style={{ textAlign: 'center' }}>STATUS</span>
            </div>
            <div style={{ marginTop: 6 }}>
              {topMaterials.map((material) => <MaterialPreviewRow key={material.id} material={material} />)}
              {topMaterials.length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 12, padding: '12px 10px' }}>No material stock logged.</div> : null}
            </div>
          </section>

          <section>
            <div className="nexus-section-header">BLUEPRINT REGISTRY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <BlueprintGroup label="WEAPONS" items={weaponBlueprints} />
              <BlueprintGroup label="ARMOR & COMPONENTS" items={armorBlueprints} />
            </div>
          </section>

          <section>
            <div className="nexus-section-header">SCOUT INTEL FEED</div>
            <div>
              {recentDeposits.map((deposit) => <ScoutIntelRow key={deposit.id} deposit={deposit} />)}
              {recentDeposits.length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 12, padding: '12px 10px' }}>No fresh scout intel.</div> : null}
            </div>
          </section>
        </div>

        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RailCard label="REFINERY TIMERS">
            {readyOrders.map((order) => (
              <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 5, background: 'var(--live-bg)', border: '0.5px solid var(--live-b)', marginBottom: 4 }}>
                <span style={{ color: 'var(--t0)', fontSize: 11 }}>{order.material_name}</span>
                <span style={{ color: 'var(--live)', fontSize: 10, fontWeight: 700 }}>READY</span>
              </div>
            ))}
            {activeOrders.map((order) => (
              <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: 4 }}>
                <span style={{ color: 'var(--t1)', fontSize: 11 }}>{order.material_name}</span>
                <span style={{ color: 'var(--info)', fontSize: 11 }}>{relativeTime(order.completes_at)}</span>
              </div>
            ))}
            {readyOrders.length === 0 && activeOrders.length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 11, padding: 8, textAlign: 'center' }}>No active orders</div> : null}
          </RailCard>

          <RailCard label="CRAFT QUEUE">
            {craftQueue.filter((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)).slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                <BlueprintStatusDot isPriority={item.priority_flag} owned={!item.priority_flag} />
                <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.blueprint_name}</span>
                <span style={{ color: 'var(--t2)', fontSize: 10 }}>{item.status}</span>
              </div>
            ))}
            {craftQueue.filter((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)).length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 11, padding: 8, textAlign: 'center' }}>Queue empty</div> : null}
          </RailCard>
        </div>
      </div>
    </div>
  );
}
