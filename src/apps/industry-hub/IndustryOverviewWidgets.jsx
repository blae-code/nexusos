/**
 * IndustryOverviewWidgets — Phase 3 design-system aligned.
 * StatCard, InsightStrip, MaterialPreviewRow, BlueprintGroup, ScoutIntelRow.
 */
import React, { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';

/* ═══ Helpers ═══════════════════════════════════════════════════════════════ */

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function qualityScoreColor(score) {
  if (score >= 900) return '#4A8C5C';
  if (score >= 600) return '#C8A84B';
  if (score >= 300) return '#9A9488';
  return '#C0392B';
}

const SUBTYPE_STYLES = {
  CMR:             { bg: 'rgba(192,57,43,0.12)',  border: 'rgba(192,57,43,0.3)',  color: '#C0392B', label: 'CMR' },
  CMP:             { bg: 'rgba(200,168,75,0.10)',  border: 'rgba(200,168,75,0.25)', color: '#C8A84B', label: 'CMP' },
  CMS:             { bg: 'rgba(200,168,75,0.15)',  border: 'rgba(200,168,75,0.35)', color: '#C8A84B', label: 'CMS' },
  CM_REFINED:      { bg: 'rgba(74,140,92,0.12)',   border: 'rgba(74,140,92,0.3)',  color: '#4A8C5C', label: 'REFINED' },
  ORE:             { bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.15)', color: '#9A9488', label: 'ORE' },
  DISMANTLED_SCRAP:{ bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.15)', color: '#9A9488', label: 'SCRAP' },
  OTHER:           { bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.15)', color: '#9A9488', label: 'OTHER' },
};

function SubtypeChip({ type }) {
  const s = SUBTYPE_STYLES[type] || SUBTYPE_STYLES.OTHER;
  return (
    <span style={{
      fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', borderRadius: 2, padding: '2px 6px',
      background: s.bg, border: `0.5px solid ${s.border}`, color: s.color,
    }}>{s.label}</span>
  );
}

function StatusChip({ material }) {
  const q = material.quality_score || 0;
  const mt = material.material_type || '';
  let label, bg, border, color;

  if (['CMR','CMP','CMS','ORE','DISMANTLED_SCRAP'].includes(mt) && !['CM_REFINED'].includes(mt)) {
    label = 'REFINE FIRST'; bg = 'rgba(192,57,43,0.15)'; border = 'rgba(192,57,43,0.3)'; color = '#C0392B';
  } else if (material.t2_eligible || q >= 800) {
    label = 'CRAFT-READY'; bg = 'rgba(200,168,75,0.12)'; border = 'rgba(200,168,75,0.25)'; color = '#C8A84B';
  } else {
    label = 'BELOW T2'; bg = 'rgba(90,88,80,0.15)'; border = 'rgba(90,88,80,0.25)'; color = '#5A5850';
  }

  return (
    <span style={{
      fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', borderRadius: 2, padding: '2px 6px',
      background: bg, border: `0.5px solid ${border}`, color,
    }}>{label}</span>
  );
}

/* ═══ STAT CARD ═════════════════════════════════════════════════════════════ */

const SHIMMER_CSS = `
@keyframes ds-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

export function StatCard({ label, value, unit, detail, indicator, barPercent, loading, index = 0 }) {
  const indicatorSymbol = indicator === 'up' ? '↑' : indicator === 'down' ? '↓' : '•';
  const indicatorColor = indicator === 'up' ? '#4A8C5C' : indicator === 'down' ? '#C0392B' : '#9A9488';

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2,
      padding: '24px 28px 20px',
      position: 'relative',
      overflow: 'hidden',
      animation: `statEnter 200ms ease-out ${index * 50}ms both`,
    }}>
      <style>{SHIMMER_CSS}{`
        @keyframes statEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {loading ? (
        <>
          <div style={{ width: 60, height: 10, borderRadius: 2, marginBottom: 14, background: '#141410', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(200,170,100,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'ds-shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: '50%', height: 30, borderRadius: 2, marginBottom: 10, background: '#141410', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(200,170,100,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'ds-shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ width: '70%', height: 10, borderRadius: 2, background: '#141410', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(200,170,100,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'ds-shimmer 1.5s ease-in-out infinite' }} />
        </>
      ) : (
        <>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10,
            color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 10,
          }}>{label}</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
              fontSize: 38, color: '#E8E4DC', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>{value}</span>
            {unit ? (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
                fontSize: 13, color: '#9A9488', textTransform: 'uppercase',
              }}>{unit}</span>
            ) : null}
          </div>

          <div style={{
            fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 12,
            color: indicatorColor, marginTop: 8,
          }}>
            <span style={{ marginRight: 4 }}>{indicatorSymbol}</span>
            <span>{detail}</span>
          </div>

          {barPercent != null && (
            <div style={{ height: 2, background: 'rgba(200,170,100,0.10)', borderRadius: 1, marginTop: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 1,
                width: `${Math.max(0, Math.min(100, barPercent))}%`,
                background: '#C0392B', transition: 'width .4s ease-out',
              }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══ INSIGHT STRIP ════════════════════════════════════════════════════════ */

export function InsightStrip() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async (prompt) => {
    setLoading(true);
    try {
      const payload = prompt ? { prompt } : {};
      const response = await base44.functions.invoke('generateInsight', payload);
      setInsight(response?.data?.insight || response?.insight || null);
    } catch {
      setInsight(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsight(); }, []);

  if (loading) {
    return (
      <div style={{
        background: 'rgba(192,57,43,0.06)',
        borderLeft: '2px solid rgba(192,57,43,0.35)',
        borderTop: '0.5px solid rgba(192,57,43,0.15)',
        borderRight: '0.5px solid rgba(192,57,43,0.15)',
        borderBottom: '0.5px solid rgba(192,57,43,0.15)',
        borderRadius: 2, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', animation: 'pulse-dot 2s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 12, color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Analysing org state...
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(192,57,43,0.06)',
      borderLeft: '2px solid rgba(192,57,43,0.35)',
      borderTop: '0.5px solid rgba(192,57,43,0.15)',
      borderRight: '0.5px solid rgba(192,57,43,0.15)',
      borderBottom: '0.5px solid rgba(192,57,43,0.15)',
      borderRadius: 2, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', animation: 'pulse-dot 2s ease-in-out infinite', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 12, color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {insight?.title || 'No readiness signal available'}
        </div>
        {insight?.detail ? (
          <div style={{ color: '#5A5850', fontSize: 11, fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>
            {insight.detail}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {insight?.action_1_label ? (
          <button type="button" onClick={() => fetchInsight(insight.action_1_prompt)} style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
            color: '#C8A84B', textTransform: 'uppercase', background: 'transparent',
            border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2, padding: '4px 10px',
            cursor: 'pointer', transition: 'border-color 150ms',
          }} onMouseEnter={e => e.currentTarget.style.borderColor = '#C8A84B'}
             onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(200,170,100,0.2)'}>
            {insight.action_1_label}
          </button>
        ) : null}
        <button type="button" onClick={() => fetchInsight()} style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11,
          color: '#C8A84B', textTransform: 'uppercase', background: 'transparent',
          border: '0.5px solid rgba(200,170,100,0.2)', borderRadius: 2, padding: '4px 10px',
          cursor: 'pointer', transition: 'border-color 150ms',
        }} onMouseEnter={e => e.currentTarget.style.borderColor = '#C8A84B'}
           onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(200,170,100,0.2)'}>
          REFRESH
        </button>
      </div>
    </div>
  );
}

/* ═══ SECTION HEADER ═══════════════════════════════════════════════════════ */

export function SectionHeader({ children }) {
  return (
    <div style={{
      fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
      fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase',
      marginBottom: 10, paddingBottom: 6,
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
    }}>{children}</div>
  );
}

/* ═══ MATERIAL PREVIEW ROW ════════════════════════════════════════════════ */

export function MaterialPreviewRow({ material }) {
  const qs = material.quality_score || 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 68px 68px 62px 72px 88px',
        gap: 8, padding: '10px 12px', alignItems: 'center',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        cursor: 'pointer', transition: 'background 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* MATERIAL */}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#E8E4DC', fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {material.material_name}
        </div>
        <div style={{ color: '#5A5850', fontSize: 11, fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>
          {material.location || material.container || 'Unspecified'}
        </div>
      </div>

      {/* SUBTYPE */}
      <div><SubtypeChip type={material.material_type} /></div>

      {/* QUALITY — raw integer */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: qs >= 900 ? 700 : 600,
        fontSize: 12, color: qualityScoreColor(qs), fontVariantNumeric: 'tabular-nums',
      }}>{qs}</div>

      {/* QTY */}
      <div style={{ color: '#E8E4DC', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
        {(material.quantity_scu || 0).toFixed(1)}
        <span style={{ color: '#9A9488', fontSize: 9, marginLeft: 3 }}>SCU</span>
      </div>

      {/* DENSITY */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 11, color: '#5A5850' }}>
        {material.density_gcm3 ? `${material.density_gcm3} g/cm³` : '—'}
      </div>

      {/* STATUS */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <StatusChip material={material} />
      </div>
    </div>
  );
}

/* ═══ BLUEPRINT GROUP ═════════════════════════════════════════════════════ */

export function BlueprintGroup({ label, items }) {
  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase',
        }}>{label}</span>
        <span style={{ color: '#5A5850', fontSize: 9 }}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 11, color: '#5A5850', textTransform: 'uppercase', padding: '12px 0', textAlign: 'center',
        }}>NO DATA LOGGED</div>
      ) : items.map(bp => {
        const owned = Boolean(bp.owned_by_user_id || bp.owned_by || bp.owned_by_callsign);
        return (
          <div key={bp.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 2, cursor: 'pointer', transition: 'background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', flexShrink: 0 }} />
            <span style={{
              flex: 1, minWidth: 0, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{bp.item_name}</span>
            {bp.source_mission_giver ? (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 11,
                color: '#5A5850', fontStyle: 'italic', marginLeft: 'auto', flexShrink: 0,
              }}>{bp.source_mission_giver}</span>
            ) : null}
            {bp.is_priority ? (
              <span style={{
                fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                textTransform: 'uppercase', color: '#E8E4DC', background: '#C0392B',
                borderRadius: 2, padding: '2px 6px',
              }}>PRIORITY</span>
            ) : owned ? (
              <span style={{
                fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                textTransform: 'uppercase', color: '#C8A84B',
                background: 'rgba(200,168,75,0.12)', border: '0.5px solid #C8A84B',
                borderRadius: 2, padding: '2px 6px',
              }}>{bp.owned_by_callsign || 'OWNED'}</span>
            ) : (
              <span style={{ color: '#5A5850', fontSize: 9 }}>unowned</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══ SCOUT INTEL ROW ═════════════════════════════════════════════════════ */

const TIER_BADGE = {
  LEGENDARY: { bg: 'rgba(200,168,75,0.2)', border: '#C8A84B', color: '#C8A84B', glow: 'drop-shadow(0 0 4px rgba(200,168,75,0.4))' },
  EPIC:      { bg: 'rgba(200,168,75,0.12)', border: '#C8A84B', color: '#C8A84B', glow: 'none' },
  RARE:      { bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.2)', color: '#9A9488', glow: 'none' },
  UNCOMMON:  { bg: 'rgba(90,88,80,0.15)', border: 'rgba(90,88,80,0.25)', color: '#5A5850', glow: 'none' },
  COMMON:    { bg: 'rgba(90,88,80,0.15)', border: 'rgba(90,88,80,0.25)', color: '#5A5850', glow: 'none' },
};

export function ScoutIntelRow({ deposit }) {
  const qs = deposit.quality_score || 0;
  const qColor = qs >= 800 ? '#4A8C5C' : qs >= 500 ? '#C8A84B' : '#C0392B';
  const tierStyle = TIER_BADGE[deposit.mineral_tier] || null;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      cursor: 'pointer', transition: 'background 150ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

      {/* Timestamp */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 11,
        color: '#5A5850', textTransform: 'uppercase', width: 52, flexShrink: 0, paddingTop: 1,
      }}>{relativeTime(deposit.reported_at)}</div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13,
          color: '#E8E4DC', marginBottom: 2,
        }}>{deposit.material_name}</div>
        <div style={{
          fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 11, color: '#9A9488',
        }}>
          {[deposit.system_name, deposit.location_detail].filter(Boolean).join(' · ')}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
          {deposit.deposit_type === 'BREAKER_STATION' && (
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', color: '#C0392B',
              background: 'rgba(192,57,43,0.10)', border: '0.5px solid rgba(192,57,43,0.25)',
              borderRadius: 2, padding: '2px 6px',
            }}>OP: BREAKER</span>
          )}
          {tierStyle && (
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', color: tierStyle.color,
              background: tierStyle.bg, border: `0.5px solid ${tierStyle.border}`,
              borderRadius: 2, padding: '2px 6px', filter: tierStyle.glow,
            }}>{deposit.mineral_tier}</span>
          )}
          {qs >= 800 ? (
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', color: '#C8A84B',
              background: 'rgba(200,168,75,0.10)', border: '0.5px solid rgba(200,168,75,0.25)',
              borderRadius: 2, padding: '2px 6px',
            }}>HIGH QUALITY</span>
          ) : null}
          {['HIGH', 'EXTREME'].includes(deposit.risk_level) ? (
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', color: '#C0392B',
              background: 'rgba(192,57,43,0.10)', border: '0.5px solid rgba(192,57,43,0.25)',
              borderRadius: 2, padding: '2px 6px',
            }}>{deposit.risk_level} RISK</span>
          ) : null}
          {deposit.risk_level && !['HIGH', 'EXTREME'].includes(deposit.risk_level) ? (
            <span style={{
              fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', color: '#5A5850',
              background: 'rgba(90,88,80,0.15)', border: '0.5px solid rgba(90,88,80,0.25)',
              borderRadius: 2, padding: '2px 6px',
            }}>{deposit.risk_level}</span>
          ) : null}
        </div>
      </div>

      {/* Quality score */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: qs >= 800 ? 700 : 600,
        fontSize: 14, color: qColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>{qs}</div>
    </div>
  );
}
