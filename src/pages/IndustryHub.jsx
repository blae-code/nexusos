import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Package, Layers, Wrench, FlaskConical, Coins,
  Upload, TrendingUp, AlertCircle, ChevronRight,
  CheckCircle, Clock, Zap, RefreshCw
} from 'lucide-react';
import MaterialsModule from '@/app/modules/IndustryHub/Materials';
import BlueprintsModule from '@/app/modules/IndustryHub/Blueprints';
import PatchDigestCard from '@/components/industry/PatchDigestCard';

const TABS = [
  { id: 'overview',   label: 'OVERVIEW' },
  { id: 'materials',  label: 'MATERIALS' },
  { id: 'blueprints', label: 'BLUEPRINTS' },
  { id: 'craft',      label: 'CRAFT QUEUE' },
  { id: 'refinery',   label: 'REFINERY' },
];

const QUALITY_COLORS = [
  [80, 'var(--live)'],
  [60, 'var(--info)'],
  [40, 'var(--warn)'],
  [0,  'var(--danger)'],
];

function qualityColor(pct) {
  for (const [thresh, color] of QUALITY_COLORS) {
    if (pct >= thresh) return color;
  }
  return 'var(--t2)';
}

function StatCard({ label, value, barPct = 0, barWarn = false }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '0.5px solid var(--b1)',
      borderRadius: 8,
      padding: 12,
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--t0)', fontSize: 22, fontWeight: 500, lineHeight: 1, flex: 1 }}>{value}</div>
      <div style={{ marginTop: 10, height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(Math.max(barPct, 0), 100)}%`,
          background: barWarn ? 'var(--warn)' : 'var(--acc)',
          borderRadius: 1,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function QualityBar({ pct }) {
  const color = qualityColor(pct);
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
      <div className="nexus-bar" style={{ flex: 1 }}>
        <div className="nexus-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 600, minWidth: 32 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function StatusFlag({ material }) {
  const { quality_pct, t2_eligible, material_type } = material;
  if (t2_eligible) return <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)' }}>CRAFT-READY</span>;
  if (material_type === 'RAW') return <span className="nexus-tag" style={{ color: 'var(--info)', borderColor: 'rgba(74,143,208,0.3)', background: 'rgba(74,143,208,0.08)' }}>REFINE FIRST</span>;
  return <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'rgba(232,160,32,0.3)', background: 'rgba(232,160,32,0.08)' }}>BELOW T2</span>;
}

// ─── Overview helpers ─────────────────────────────────────

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function MaterialIcon({ type, size = 14 }) {
  const s = String(size);
  const c = 'var(--t2)';
  if (type === 'RAW') return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <polygon points="7,1 13,13 1,13" stroke={c} strokeWidth="0.8" fill="none" />
    </svg>
  );
  if (type === 'REFINED') return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <polygon points="7,1 12,4 12,10 7,13 2,10 2,4" stroke={c} strokeWidth="0.8" fill="none" />
    </svg>
  );
  if (type === 'SALVAGE') return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <polygon points="7,1 11,4 12,10 4,12 2,5" stroke={c} strokeWidth="0.8" fill="none" />
    </svg>
  );
  if (type === 'CRAFTED') return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" stroke={c} strokeWidth="0.8" fill="none" />
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke={c} strokeWidth="0.8" fill="none" />
    </svg>
  );
}

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function BlueprintGroup({ label, items }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      {items.length === 0 && (
        <div style={{ color: 'var(--t2)', fontSize: 11, textAlign: 'center', padding: '6px 0' }}>No entries</div>
      )}
      {items.map(bp => {
        const owned = !!bp.owned_by_callsign;
        const dotColor = bp.is_priority ? 'var(--warn)' : owned ? 'var(--acc2)' : 'var(--t3)';
        return (
          <div key={bp.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderBottom: '0.5px solid var(--b0)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            <span style={{ flex: 1, color: owned ? 'var(--t0)' : 'var(--t2)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bp.item_name}
            </span>
            {bp.is_priority ? (
              <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'rgba(232,160,32,0.3)', background: 'rgba(232,160,32,0.06)', fontSize: 9 }}>PRIORITY</span>
            ) : owned ? (
              <span style={{ color: 'var(--t2)', fontSize: 10, background: 'var(--bg3)', border: '0.5px solid var(--b1)', borderRadius: 4, padding: '1px 5px' }}>
                {bp.owned_by_callsign}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ScoutDepositRow({ deposit }) {
  const { material_name, location_detail, system_name, quality_pct, reported_by_callsign, ship_type, risk_level, reported_at } = deposit;
  const qColor = quality_pct >= 80 ? 'var(--live)' : quality_pct >= 60 ? 'var(--t0)' : 'var(--warn)';
  const isHighRisk = risk_level === 'HIGH' || risk_level === 'EXTREME';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--b0)' }}>
      <span style={{ color: 'var(--t2)', fontSize: 10, flexShrink: 0, minWidth: 44 }}>{relativeTime(reported_at)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {material_name}{location_detail ? ` — ${location_detail}` : ''}
        </div>
        <div style={{ color: 'var(--t1)', fontSize: 11 }}>
          {[reported_by_callsign, ship_type, risk_level && `${risk_level} RISK`].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{ color: qColor, fontSize: 18, fontWeight: 500, flexShrink: 0 }}>
        {(quality_pct || 0).toFixed(0)}%
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flexShrink: 0 }}>
        {quality_pct >= 80 && (
          <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)' }}>T2</span>
        )}
        {system_name && (
          <span className="nexus-tag" style={{ color: 'var(--t1)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>{system_name}</span>
        )}
        {risk_level && (
          <span className="nexus-tag" style={{ color: isHighRisk ? 'var(--danger)' : 'var(--warn)', borderColor: 'transparent', background: 'transparent' }}>{risk_level}</span>
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────
function OverviewTab({ materials, blueprints, craftQueue, refineryOrders, scoutDeposits }) {
  const totalSCU        = materials.reduce((s, m) => s + (m.quantity_scu || 0), 0);
  const avgQuality      = materials.length
    ? materials.reduce((s, m) => s + (m.quality_pct || 0), 0) / materials.length
    : 0;
  const craftedThisWeek = craftQueue.filter(c => c.status === 'COMPLETE').length;
  const ownedBPs        = blueprints.filter(b => !!b.owned_by_callsign).length;

  const topMaterials  = [...materials].sort((a, b) => (b.quality_pct || 0) - (a.quality_pct || 0)).slice(0, 5);
  const weaponBPs     = blueprints.filter(b => b.category === 'WEAPON').slice(0, 5);
  const armorBPs      = blueprints.filter(b => ['ARMOR', 'GEAR'].includes(b.category)).slice(0, 5);
  const freshDeposits = (scoutDeposits || []).filter(d => !d.is_stale).slice(0, 2);

  const readyOrders  = refineryOrders.filter(r => r.status === 'READY');
  const activeOrders = refineryOrders.filter(r => r.status === 'ACTIVE');

  function timeLeft(isoStr) {
    if (!isoStr) return '—';
    const diff = new Date(isoStr) - Date.now();
    if (diff <= 0) return 'READY';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, height: '100%' }}>

      {/* ── Main column ───────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 8 }}>
          <StatCard
            label="ORG STOCKPILE"
            value={`${totalSCU.toFixed(0)} SCU`}
            barPct={Math.min((totalSCU / 500) * 100, 100)}
          />
          <StatCard
            label="AVG QUALITY"
            value={`${avgQuality.toFixed(0)}%`}
            barPct={avgQuality}
            barWarn={avgQuality < 80}
          />
          <StatCard
            label="BLUEPRINTS"
            value={blueprints.length}
            barPct={blueprints.length > 0 ? (ownedBPs / blueprints.length) * 100 : 0}
          />
          <StatCard
            label="CRAFT OUTPUT 7D"
            value={craftedThisWeek}
            barPct={Math.min(craftedThisWeek * 10, 100)}
          />
        </div>

        {/* Insight strip */}
        <InsightStrip />

        {/* Material stockpile */}
        <div>
          <SectionHeader label="MATERIAL STOCKPILE" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 4px', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>
              <div style={{ width: 18, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>MATERIAL</div>
              <div style={{ width: 72, flexShrink: 0 }}>TYPE</div>
              <div style={{ width: 130, flexShrink: 0 }}>QUALITY</div>
              <div style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>SCU</div>
              <div style={{ width: 90, flexShrink: 0, textAlign: 'right' }}>STATUS</div>
            </div>
            {topMaterials.map(m => (
              <div
                key={m.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 6, padding: '6px 10px', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
              >
                <div style={{ width: 18, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <MaterialIcon type={m.material_type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--t0)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_name}</div>
                  {m.source_type && <div style={{ color: 'var(--t2)', fontSize: 10 }}>{m.source_type.replace(/_/g, ' ')}</div>}
                </div>
                <div style={{ width: 72, flexShrink: 0 }}>
                  <span className="nexus-tag" style={{ color: 'var(--t1)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>{m.material_type}</span>
                </div>
                <div style={{ width: 130, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="nexus-bar" style={{ flex: 1 }}>
                      <div className="nexus-bar-fill" style={{ width: `${m.quality_pct || 0}%`, background: 'var(--acc2)' }} />
                    </div>
                    <span style={{ color: 'var(--t1)', fontSize: 11, minWidth: 28, textAlign: 'right' }}>{(m.quality_pct || 0).toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ width: 52, flexShrink: 0, textAlign: 'right', color: 'var(--t0)', fontSize: 12 }}>{(m.quantity_scu || 0).toFixed(1)}</div>
                <div style={{ width: 90, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  <StatusFlag material={m} />
                </div>
              </div>
            ))}
            {topMaterials.length === 0 && (
              <div style={{ color: 'var(--t2)', fontSize: 12, padding: '10px 10px' }}>No materials logged.</div>
            )}
          </div>
        </div>

        {/* Blueprint registry */}
        <div>
          <SectionHeader label="BLUEPRINT REGISTRY" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <BlueprintGroup label="WEAPONS" items={weaponBPs} />
            <BlueprintGroup label="ARMOR & GEAR" items={armorBPs} />
          </div>
        </div>

        {/* Scout intel feed */}
        <div>
          <SectionHeader label="RECENT SCOUT INTEL" />
          {freshDeposits.length === 0 ? (
            <div style={{ color: 'var(--t2)', fontSize: 12, padding: '8px 0' }}>No recent scout intel.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {freshDeposits.map(dep => <ScoutDepositRow key={dep.id} deposit={dep} />)}
            </div>
          )}
        </div>

      </div>

      {/* ── Right rail ────────────────────────────────── */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Refinery timers */}
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
            <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>REFINERY TIMERS</span>
          </div>
          <div style={{ padding: '8px' }}>
            {activeOrders.length === 0 && readyOrders.length === 0 && (
              <div style={{ color: 'var(--t2)', fontSize: 11, padding: 8, textAlign: 'center' }}>No active orders</div>
            )}
            {readyOrders.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 5, background: 'rgba(39,201,106,0.06)', border: '0.5px solid rgba(39,201,106,0.2)', marginBottom: 4 }}>
                <span style={{ color: 'var(--t0)', fontSize: 11 }}>{o.material_name}</span>
                <span style={{ color: 'var(--live)', fontSize: 10, fontWeight: 700 }}>READY</span>
              </div>
            ))}
            {activeOrders.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: 4 }}>
                <span style={{ color: 'var(--t1)', fontSize: 11 }}>{o.material_name}</span>
                <span style={{ color: 'var(--info)', fontSize: 11 }}>{timeLeft(o.completes_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Craft queue preview */}
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
            <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>CRAFT QUEUE</span>
          </div>
          <div style={{ padding: '8px' }}>
            {craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status)).slice(0, 6).map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.priority_flag ? 'var(--warn)' : 'var(--b3)', flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.blueprint_name}</span>
                <span style={{ color: 'var(--t2)', fontSize: 10 }}>{c.status}</span>
              </div>
            ))}
            {craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status)).length === 0 && (
              <div style={{ color: 'var(--t2)', fontSize: 11, padding: 8, textAlign: 'center' }}>Queue empty</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function InsightStrip() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async (prompt) => {
    setLoading(true);
    setInsight(null);
    try {
      const payload = prompt ? { prompt } : {};
      const r = await base44.functions.invoke('generateInsight', payload);
      const data = r?.data?.insight || r?.insight || null;
      setInsight(data);
    } catch (e) {
      console.warn('[InsightStrip] generateInsight failed:', e?.message);
    }
    setLoading(false);
  };

  // Auto-fetch on mount
  useEffect(() => { fetchInsight(); }, []);

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '0.5px solid var(--b2)',
      borderRadius: 7,
      padding: '10px 14px',
      display: 'flex',
      alignItems: loading ? 'center' : 'flex-start',
      gap: 10,
      minHeight: 44,
    }}>
      {/* Icon */}
      <AlertCircle size={14} style={{ color: 'var(--info)', flexShrink: 0, marginTop: loading ? 0 : 1 }} />

      {/* Title + detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!loading && <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>OP READINESS</div>}
        {loading ? (
          <span style={{ color: 'var(--t2)', fontSize: 12 }}>Analysing org state...</span>
        ) : insight ? (
          <>
            <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{insight.title}</div>
            <div style={{ color: 'var(--t1)', fontSize: 11, marginTop: 2 }}>{insight.detail}</div>
          </>
        ) : (
          <span style={{ color: 'var(--t2)', fontSize: 12 }}>No readiness data</span>
        )}
      </div>

      {/* Action buttons */}
      {!loading && insight && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {insight.action_1_label && (
            <button
              onClick={() => fetchInsight(insight.action_1_prompt)}
              className="nexus-btn"
              style={{ padding: '3px 9px', fontSize: 10 }}
            >
              {insight.action_1_label} →
            </button>
          )}
          {insight.action_2_label && (
            <button
              onClick={() => fetchInsight(insight.action_2_prompt)}
              className="nexus-btn"
              style={{ padding: '3px 9px', fontSize: 10 }}
            >
              {insight.action_2_label} →
            </button>
          )}
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={() => fetchInsight()}
        disabled={loading}
        style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--t2)', padding: 2, flexShrink: 0 }}
      >
        <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
      </button>
    </div>
  );
}

// ─── Craft Queue Tab ─────────────────────────────────────
function CraftQueueTab({ craftQueue, callsign }) {
  const statusOrder = { IN_PROGRESS: 0, CLAIMED: 1, OPEN: 2, COMPLETE: 3, CANCELLED: 4 };
  const sorted = [...craftQueue].sort((a, b) => {
    if (b.priority_flag !== a.priority_flag) return b.priority_flag ? 1 : -1;
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
  });

  const handleClaim = async (id) => {
    await base44.entities.CraftQueue.update(id, { status: 'CLAIMED', claimed_by_callsign: callsign });
  };

  const STATUS_COLORS = {
    OPEN: 'var(--info)', CLAIMED: 'var(--warn)', IN_PROGRESS: 'var(--live)',
    COMPLETE: 'var(--t2)', CANCELLED: 'var(--danger)',
  };

  return (
    <div className="p-4">
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['', 'ITEM', 'REQUESTED BY', 'CLAIMED BY', 'QTY', 'EST. VALUE', 'STATUS', 'ACTION'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.id} style={{ borderBottom: '0.5px solid var(--b0)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '8px 10px' }}>
                  {c.priority_flag && <div style={{ width: 4, height: 16, background: 'var(--warn)', borderRadius: 2 }} />}
                </td>
                <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12, fontWeight: c.priority_flag ? 600 : 400 }}>{c.blueprint_name}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{c.requested_by_callsign}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{c.claimed_by_callsign || '—'}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{c.quantity}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{c.aUEC_value_est ? `${c.aUEC_value_est.toLocaleString()} aUEC` : '—'}</td>
                <td style={{ padding: '8px 14px' }}>
                  <span className="nexus-tag" style={{ color: STATUS_COLORS[c.status], borderColor: 'transparent', background: 'transparent' }}>{c.status}</span>
                </td>
                <td style={{ padding: '8px 14px' }}>
                  {c.status === 'OPEN' && (
                    <button onClick={() => handleClaim(c.id)} className="nexus-btn" style={{ padding: '3px 8px', fontSize: 10 }}>CLAIM</button>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>Craft queue is empty</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Refinery Tab ────────────────────────────────────────
function RefineryTab({ refineryOrders }) {
  function timeLeft(isoStr) {
    if (!isoStr) return '—';
    const diff = new Date(isoStr) - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  return (
    <div className="p-4">
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['MATERIAL', 'SCU', 'METHOD', 'YIELD', 'COST', 'STATION', 'SUBMITTED BY', 'TIME LEFT', 'STATUS'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {refineryOrders.map(o => {
              const tl = timeLeft(o.completes_at);
              const isReady = o.status === 'READY' || (!tl && o.status === 'ACTIVE');
              return (
                <tr key={o.id} style={{ borderBottom: '0.5px solid var(--b0)', background: isReady ? 'rgba(39,201,106,0.04)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = isReady ? 'rgba(39,201,106,0.08)' : 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = isReady ? 'rgba(39,201,106,0.04)' : 'transparent'}
                >
                  <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{o.material_name}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{o.quantity_scu}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{o.method || '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--live)', fontSize: 11 }}>{o.yield_pct ? `${o.yield_pct}%` : '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{o.cost_aUEC ? `${o.cost_aUEC.toLocaleString()}` : '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{o.station || '—'}</td>
                  <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{o.submitted_by_callsign}</td>
                  <td style={{ padding: '8px 14px' }}>
                    {isReady ? (
                      <span style={{ color: 'var(--live)', fontWeight: 700, fontSize: 11 }}>READY</span>
                    ) : (
                      <span style={{ color: 'var(--info)', fontSize: 11 }}>{tl}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    {isReady ? (
                      <button className="nexus-btn live-btn" style={{ padding: '3px 8px', fontSize: 10 }}>COLLECT →</button>
                    ) : (
                      <span className="nexus-tag" style={{ color: 'var(--t2)', borderColor: 'var(--b1)', background: 'transparent' }}>{o.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {refineryOrders.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>No refinery orders. Submit an order or upload a screenshot.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main IndustryHub ────────────────────────────────────
export default function IndustryHub() {
  const { callsign, rank } = useOutletContext() || {};
  const [tab, setTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [scoutDeposits, setScoutDeposits] = useState([]);

  const load = async () => {
    const [mats, bps, cq, ro, sd] = await Promise.all([
      base44.entities.Material.list('-logged_at', 100),
      base44.entities.Blueprint.list('-created_date', 100),
      base44.entities.CraftQueue.list('-created_date', 50),
      base44.entities.RefineryOrder.list('-started_at', 50),
      base44.entities.ScoutDeposit.list('-reported_at', 10),
    ]);
    setMaterials(mats || []);
    setBlueprints(bps || []);
    setCraftQueue(cq || []);
    setRefineryOrders(ro || []);
    setScoutDeposits(sd || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', padding: '0 16px' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto nexus-fade-in">
        {tab === 'overview'   && <OverviewTab materials={materials} blueprints={blueprints} craftQueue={craftQueue} refineryOrders={refineryOrders} scoutDeposits={scoutDeposits} />}
        {tab === 'materials'  && <MaterialsModule materials={materials} onRefresh={load} />}
        {tab === 'blueprints' && <BlueprintsModule blueprints={blueprints} materials={materials} rank={rank} callsign={callsign} onRefresh={load} />}
        {tab === 'craft'      && <CraftQueueTab craftQueue={craftQueue} callsign={callsign} />}
        {tab === 'refinery'   && <RefineryTab refineryOrders={refineryOrders} />}
      </div>
    </div>
  );
}