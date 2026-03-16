import React, { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MaterialsModule from '@/app/modules/IndustryHub/Materials';
import BlueprintsModule from '@/components/industry/BlueprintsModule';
import PatchDigestCard from '@/components/industry/PatchDigestCard';
import CraftQueueTab from '@/components/industry/CraftQueueTab';

const TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'materials', label: 'MATERIALS' },
  { id: 'blueprints', label: 'BLUEPRINTS' },
  { id: 'craft', label: 'CRAFT QUEUE' },
  { id: 'refinery', label: 'REFINERY' },
];

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

function MaterialGlyph({ material }) {
  const type = (material.material_type || '').toUpperCase();
  const name = (material.material_name || '').toLowerCase();
  const commonProps = {
    width: 11,
    height: 11,
    viewBox: '0 0 12 12',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  if (type === 'RAW' || name.includes('agricium') || name.includes('ore')) {
    return (
      <svg {...commonProps}>
        <path d="M6 1.5L10.5 10.5H1.5L6 1.5Z" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'REFINED' || name.includes('laranite')) {
    return (
      <svg {...commonProps}>
        <path d="M6 1.5L10 3.8V8.2L6 10.5L2 8.2V3.8L6 1.5Z" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }

  if (name.includes('taranite')) {
    return (
      <svg {...commonProps}>
        <path d="M6 1.5L10.5 6L6 10.5L1.5 6L6 1.5Z" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'SALVAGE' || name.includes('powder')) {
    return (
      <svg {...commonProps}>
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" />
        <circle cx="6" cy="6" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M2.5 4L5 1.5H8.5L10.5 4.5L8.5 10.5H3.5L1.5 6.5L2.5 4Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
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
        <div style={{ width: `${Math.max(0, Math.min(100, barPercent))}%`, height: '100%', borderRadius: 1, background: barColor, transition: 'width .4s ease' }} />
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
      console.warn('[IndustryHub] generateInsight failed:', error?.message || error);
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
      }}
    >
      <div className="pulse-live" style={{ background: 'var(--info)' }} />
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
        <AlertCircle size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <div style={{ color: 'var(--t2)', fontSize: 10, fontStyle: 'italic' }}>Analysing org state...</div>
        ) : insight ? (
          <>
            <div style={{ color: 'var(--t0)', fontSize: 11, marginBottom: 3 }}>{insight.title}</div>
            <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>{insight.detail}</div>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--t0)', fontSize: 11, marginBottom: 3 }}>No readiness insight available</div>
            <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>Refresh when new org data has been logged.</div>
          </>
        )}
      </div>
      {!loading && insight ? (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {insight.action_1_label ? (
            <button onClick={() => fetchInsight(insight.action_1_prompt)} className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10 }}>
              {insight.action_1_label}
            </button>
          ) : null}
          {insight.action_2_label ? (
            <button onClick={() => fetchInsight(insight.action_2_prompt)} className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10 }}>
              {insight.action_2_label}
            </button>
          ) : null}
        </div>
      ) : null}
      <button onClick={() => fetchInsight()} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
        <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
      </button>
    </div>
  );
}

function MaterialRow({ material }) {
  const quality = material.quality_pct || 0;
  const qualityColor = getQualityBarColor(quality);
  const status = material.t2_eligible
    ? { label: 'CRAFT-READY', color: 'var(--live)', border: 'var(--live-b)', background: 'var(--live-bg)' }
    : material.material_type === 'RAW'
      ? { label: 'REFINE FIRST', color: 'var(--warn)', border: 'var(--warn-b)', background: 'var(--warn-bg)' }
      : quality < 60
        ? { label: 'T1 ONLY', color: 'var(--t2)', border: 'var(--b1)', background: 'var(--bg2)' }
        : { label: 'BELOW T2', color: 'var(--warn)', border: 'var(--warn-b)', background: 'var(--warn-bg)' };

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
          <MaterialGlyph material={material} />
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

      <div style={{ fontSize: 9, padding: '3px 7px', borderRadius: 3, border: `0.5px solid ${status.border}`, textAlign: 'center', color: status.color, background: status.background }}>
        {status.label}
      </div>
    </div>
  );
}

function BlueprintGroup({ label, items }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 8, padding: '11px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em' }}>{label}</span>
        <span style={{ color: 'var(--t2)', fontSize: 9 }}>{items.length}</span>
      </div>
      <div className="flex flex-col gap-0">
        {items.length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 11, padding: '6px 7px' }}>No entries</div> : null}
        {items.map((blueprint) => {
          const owned = Boolean(blueprint.owned_by || blueprint.owned_by_callsign);
          const dotColor = blueprint.is_priority ? 'var(--warn)' : owned ? 'var(--acc2)' : 'var(--t3)';

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
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, color: owned ? 'var(--t0)' : 'var(--t2)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {blueprint.item_name}
              </div>
              {blueprint.is_priority ? (
                <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'var(--warn-b)', background: 'var(--warn-bg)' }}>
                  PRIORITY
                </span>
              ) : owned ? (
                <span style={{ color: 'var(--acc)', fontSize: 9, padding: '1px 5px', border: '0.5px solid var(--b2)', borderRadius: 2, background: 'var(--bg3)' }}>
                  {blueprint.owned_by_callsign || 'owned'}
                </span>
              ) : (
                <span style={{ color: 'var(--t3)', fontSize: 9 }}>unowned</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoutIntelRow({ deposit }) {
  const qualityColor = deposit.quality_pct >= 80 ? 'var(--live)' : deposit.quality_pct >= 60 ? 'var(--warn)' : 'var(--t2)';

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
        transition: 'all .1s',
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
          {deposit.material_name}{deposit.location_detail ? ` — ${deposit.location_detail}` : ''}
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 9 }}>
          {[deposit.reported_by_callsign, deposit.ship_type, deposit.system_name].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
          {deposit.quality_pct >= 80 ? (
            <span className="nexus-tag" style={{ color: 'var(--acc2)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>
              T2 READY
            </span>
          ) : null}
          {deposit.risk_level === 'HIGH' || deposit.risk_level === 'EXTREME' ? (
            <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'var(--warn-b)', background: 'var(--warn-bg)' }}>
              {deposit.risk_level} RISK
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ color: qualityColor, fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {(deposit.quality_pct || 0).toFixed(0)}%
      </div>
    </div>
  );
}

function OverviewTab({ materials, blueprints, craftQueue, refineryOrders, scoutDeposits }) {
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
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
              {topMaterials.map((material) => <MaterialRow key={material.id} material={material} />)}
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
          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
              <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>REFINERY TIMERS</span>
            </div>
            <div style={{ padding: 8 }}>
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
            </div>
          </div>

          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
              <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>CRAFT QUEUE</span>
            </div>
            <div style={{ padding: 8 }}>
              {craftQueue.filter((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)).slice(0, 6).map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.priority_flag ? 'var(--warn)' : 'var(--b3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.blueprint_name}</span>
                  <span style={{ color: 'var(--t2)', fontSize: 10 }}>{item.status}</span>
                </div>
              ))}
              {craftQueue.filter((item) => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(item.status)).length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 11, padding: 8, textAlign: 'center' }}>Queue empty</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefineryTab({ refineryOrders }) {
  function timeLeft(isoStr) {
    if (!isoStr) return '—';
    const diff = new Date(isoStr) - Date.now();
    if (diff <= 0) return 'READY';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  return (
    <div className="p-4">
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['MATERIAL', 'SCU', 'METHOD', 'YIELD', 'COST', 'STATION', 'SUBMITTED BY', 'TIME LEFT', 'STATUS'].map((heading) => (
                <th key={heading} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {refineryOrders.map((order) => {
              const isReady = order.status === 'READY' || timeLeft(order.completes_at) === 'READY';

              return (
                <tr key={order.id} style={{ borderBottom: '0.5px solid var(--b0)', background: isReady ? 'var(--live-bg)' : 'transparent' }}>
                  <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{order.material_name}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{order.quantity_scu}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.method || '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--live)', fontSize: 11 }}>{order.yield_pct ? `${order.yield_pct}%` : '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.cost_aUEC ? `${order.cost_aUEC.toLocaleString()}` : '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.station || '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{order.submitted_by_callsign}</td>
                  <td style={{ padding: '8px 14px', color: isReady ? 'var(--live)' : 'var(--info)', fontSize: 11 }}>{timeLeft(order.completes_at)}</td>
                  <td style={{ padding: '8px 14px' }}>
                    {isReady ? <span className="nexus-pill nexus-pill-live">READY</span> : <span className="nexus-tag">{order.status}</span>}
                  </td>
                </tr>
              );
            })}
            {refineryOrders.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                  No refinery orders. Submit an order or upload a screenshot.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IndustryHub() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const callsign = outletContext.callsign;
  const rank = outletContext.rank;
  const discordId = outletContext.discordId;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [materials, setMaterials] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [scoutDeposits, setScoutDeposits] = useState([]);
  const [latestPatch, setLatestPatch] = useState(null);
  const [patchDismissed, setPatchDismissed] = useState(null);

  const load = async () => {
    const [mats, bps, queue, refinery, deposits, patches] = await Promise.all([
      base44.entities.Material.list('-logged_at', 100),
      base44.entities.Blueprint.list('-created_date', 100),
      base44.entities.CraftQueue.list('-created_date', 50),
      base44.entities.RefineryOrder.list('-started_at', 50),
      base44.entities.ScoutDeposit.list('-reported_at', 10),
      base44.entities.PatchDigest.list('-processed_at', 1),
    ]);

    setMaterials(mats || []);
    setBlueprints(bps || []);
    setCraftQueue(queue || []);
    setRefineryOrders(refinery || []);
    setScoutDeposits(deposits || []);
    setLatestPatch(patches?.[0] || null);
    setPatchDismissed(localStorage.getItem('nexus_patch_dismissed'));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePatchDismiss = () => {
    if (!latestPatch?.patch_version) return;
    localStorage.setItem('nexus_patch_dismissed', latestPatch.patch_version);
    setPatchDismissed(latestPatch.patch_version);
  };

  const setTab = (nextTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const showPatchCard = latestPatch && patchDismissed !== latestPatch.patch_version;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', padding: '0 16px' }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === item.id ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === item.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showPatchCard ? (
        <div style={{ paddingTop: 10, paddingBottom: 4 }}>
          <PatchDigestCard digest={latestPatch} onDismiss={handlePatchDismiss} />
        </div>
      ) : null}

      <div className="flex-1 overflow-auto nexus-fade-in">
        {tab === 'overview' ? <OverviewTab materials={materials} blueprints={blueprints} craftQueue={craftQueue} refineryOrders={refineryOrders} scoutDeposits={scoutDeposits} /> : null}
        {tab === 'materials' ? <MaterialsModule materials={materials} onRefresh={load} /> : null}
        {tab === 'blueprints' ? <BlueprintsModule blueprints={blueprints} materials={materials} rank={rank} callsign={callsign} onRefresh={load} /> : null}
        {tab === 'craft' ? <CraftQueueTab craftQueue={craftQueue} callsign={callsign} /> : null}
        {tab === 'refinery' ? <RefineryTab refineryOrders={refineryOrders} /> : null}
      </div>
    </div>
  );
}