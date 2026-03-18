/**
 * IndustryOverviewWidgets — StatCard, InsightStrip, MaterialPreviewRow,
 * BlueprintGroup, ScoutIntelRow sub-components for IndustryOverview.
 */
import React, { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
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

function qualityColour(value) {
  if (value >= 80) return 'var(--live)';
  if (value >= 60) return 'var(--warn)';
  return 'var(--t2)';
}

function qualityBarColour(value) {
  if (value >= 80) return 'var(--t1)';
  if (value >= 60) return 'var(--t2)';
  return 'var(--t3)';
}

const STAT_CARD_SHIMMER = `
  @keyframes stat-shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;

function StatSkeleton() {
  return (
    <>
      <style>{STAT_CARD_SHIMMER}</style>
      <div style={{ width: 20, height: 20, borderRadius: 4, marginBottom: 12, background: 'var(--bg3)', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'stat-shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ width: '55%', height: 22, borderRadius: 4, marginBottom: 8, background: 'var(--bg3)', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'stat-shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ width: '75%', height: 10, borderRadius: 3, background: 'var(--bg3)', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'stat-shimmer 1.5s ease-in-out infinite' }} />
    </>
  );
}

export function StatCard({ icon: Icon, label, value, unit, detail, indicator, barPercent, barColor, loading }) {
  const indicatorSymbol = indicator === 'up' ? '↑' : indicator === 'down' ? '↓' : '•';
  const indicatorColor = indicator === 'up' ? 'var(--live)' : indicator === 'down' ? 'var(--warn)' : 'var(--info)';

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 3,
        padding: '14px 14px 12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, var(--red) 0%, rgba(192,57,43,0.3) 60%, transparent 100%)', opacity: 0.6 }} />

      {loading ? (
        <StatSkeleton />
      ) : (
        <div style={{ animation: 'nexus-fade-in 150ms ease-out both' }}>
          {Icon ? (
            <div style={{ marginBottom: 10 }}>
              <Icon size={20} style={{ color: 'var(--acc)' }} />
            </div>
          ) : null}
          <div style={{ color: 'var(--t0)', fontSize: 28, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>
            {value}
            {unit ? <span style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 400, marginLeft: 5 }}>{unit}</span> : null}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 9, color: 'var(--t3)' }}>
            <span style={{ color: indicatorColor, marginRight: 4 }}>{indicatorSymbol}</span>
            <span>{detail}</span>
          </div>
          <div style={{ height: 2, background: 'var(--b1)', borderRadius: 1, marginTop: 8, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 1,
                width: `${Math.max(0, Math.min(100, barPercent))}%`,
                background: barColor,
                transition: 'width .4s ease-out',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function InsightStrip() {
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

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--bg1)',
          border: '0.5px solid var(--b1)',
          borderRadius: 3,
          padding: '11px 13px',
          color: 'var(--t2)',
          fontSize: 10,
          fontStyle: 'italic',
        }}
      >
        Analysing org state...
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderLeft: '2px solid rgba(192,57,43,0.4)',
        borderRadius: 3,
        padding: '11px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--acc)',
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--t0)', fontSize: 11, marginBottom: 3 }}>
          {insight?.title || 'No readiness signal available'}
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>
          {insight?.detail || 'Refresh when new industry data has been logged.'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {insight?.action_1_label ? (
          <button type="button" className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10 }} onClick={() => fetchInsight(insight.action_1_prompt)}>
            {insight.action_1_label}
          </button>
        ) : null}
        {insight?.action_2_label ? (
          <button type="button" className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10 }} onClick={() => fetchInsight(insight.action_2_prompt)}>
            {insight.action_2_label}
          </button>
        ) : null}
        <button type="button" className="nexus-btn" style={{ padding: '6px 10px', fontSize: 10 }} onClick={() => fetchInsight()}>
          REFRESH
        </button>
      </div>
    </div>
  );
}

export function MaterialPreviewRow({ material }) {
  const quality = material.quality_pct || 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 76px 110px 68px 88px',
        gap: 8,
        padding: '8px 10px',
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 2,
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
          <MaterialGlyph material={material} materialName={material.material_name} type={material.material_type} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {material.material_name}
          </div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 1 }}>
            {material.location || material.source_type || 'Unspecified source'}
          </div>
        </div>
      </div>

      <div>
        <span className="nexus-tag">{material.material_type}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${quality}%`, height: '100%', background: qualityBarColour(quality) }} />
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

export function BlueprintGroup({ label, items }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 3, padding: '11px 12px' }}>
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

export function ScoutIntelRow({ deposit }) {
  const quality = deposit.quality_pct || 0;

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
          {deposit.material_name}{deposit.location_detail ? ` · ${deposit.location_detail}` : ''}
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 9 }}>
          {[deposit.reported_by_callsign, deposit.ship_type, deposit.system_name].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
          {deposit.volume_estimate ? <span className="nexus-tag">{deposit.volume_estimate}</span> : null}
          {quality >= 80 ? (
            <span className="nexus-tag" style={{ color: 'var(--acc2)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>
              HIGH QUALITY
            </span>
          ) : null}
          {['HIGH', 'EXTREME'].includes(deposit.risk_level) ? (
            <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'var(--warn-b)', background: 'var(--warn-bg)' }}>
              {deposit.risk_level} RISK
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ color: qualityColour(quality), fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {quality.toFixed(0)}%
      </div>
    </div>
  );
}