import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Package, Layers, Wrench, FlaskConical, Coins,
  Upload, TrendingUp, AlertCircle, ChevronRight,
  CheckCircle, Clock, Zap, RefreshCw
} from 'lucide-react';

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

function StatCard({ icon: Icon, label, value, sub, trend }) {
  return (
    <div className="nexus-card" style={{ flex: 1, minWidth: 0 }}>
      <div className="flex items-start justify-between">
        <div>
          <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
          <div style={{ color: 'var(--t0)', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: 'var(--t1)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 7, padding: 8 }}>
          <Icon size={16} style={{ color: 'var(--acc2)' }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3" style={{ color: trend >= 0 ? 'var(--live)' : 'var(--danger)', fontSize: 11 }}>
          <TrendingUp size={10}/>
          <span>{trend >= 0 ? '+' : ''}{trend}% vs last week</span>
        </div>
      )}
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

// ─── Overview Tab ────────────────────────────────────────
function OverviewTab({ materials, blueprints, craftQueue, refineryOrders }) {
  const totalSCU = materials.reduce((s, m) => s + (m.quantity_scu || 0), 0);
  const avgQuality = materials.length ? materials.reduce((s, m) => s + (m.quality_pct || 0), 0) / materials.length : 0;
  const priorityBPs = blueprints.filter(b => b.is_priority).length;
  const craftedThisWeek = craftQueue.filter(c => c.status === 'COMPLETE').length;

  const readyOrders = refineryOrders.filter(r => r.status === 'READY');
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
    <div className="flex gap-4 p-4" style={{ height: '100%' }}>
      {/* Main content */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {/* Stat cards */}
        <div className="flex gap-3">
          <StatCard icon={Package}    label="STOCKPILE" value={`${totalSCU.toFixed(0)} SCU`} sub={`${materials.length} materials`} trend={3} />
          <StatCard icon={Zap}        label="AVG QUALITY" value={`${avgQuality.toFixed(0)}%`} sub="across all stock" />
          <StatCard icon={Layers}     label="BLUEPRINTS" value={blueprints.length} sub={`${priorityBPs} priority`} />
          <StatCard icon={Wrench}     label="CRAFT OUTPUT" value={craftedThisWeek} sub="items this week" trend={12} />
        </div>

        {/* Insight strip */}
        <InsightStrip />

        {/* Materials table */}
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--t1)', fontSize: 11, letterSpacing: '0.1em' }}>MATERIAL STOCKPILE</span>
            <span style={{ color: 'var(--t2)', fontSize: 10 }}>{materials.length} entries</span>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 280 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['MATERIAL', 'TYPE', 'QUALITY', 'SCU', 'STATUS'].map(h => (
                    <th key={h} style={{ padding: '7px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.slice(0, 20).map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: '0.5px solid var(--b0)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{m.material_name}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span className="nexus-tag" style={{ color: 'var(--t1)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>{m.material_type}</span>
                    </td>
                    <td style={{ padding: '8px 14px' }}><QualityBar pct={m.quality_pct || 0} /></td>
                    <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{m.quantity_scu?.toFixed(1)}</td>
                    <td style={{ padding: '8px 14px' }}><StatusFlag material={m} /></td>
                  </tr>
                ))}
                {materials.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>No materials logged. Upload a screenshot or log manually.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-3" style={{ width: 240, flexShrink: 0 }}>
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
              <div key={o.id} className="flex items-center justify-between" style={{ padding: '6px 8px', borderRadius: 5, background: 'rgba(39,201,106,0.06)', border: '0.5px solid rgba(39,201,106,0.2)', marginBottom: 4 }}>
                <span style={{ color: 'var(--t0)', fontSize: 11 }}>{o.material_name}</span>
                <span style={{ color: 'var(--live)', fontSize: 10, fontWeight: 700 }}>READY</span>
              </div>
            ))}
            {activeOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between" style={{ padding: '6px 8px', marginBottom: 4 }}>
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
            {craftQueue.filter(c => ['OPEN','CLAIMED','IN_PROGRESS'].includes(c.status)).slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center gap-2" style={{ padding: '5px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.priority_flag ? 'var(--warn)' : 'var(--b3)', flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.blueprint_name}</span>
                <span style={{ color: 'var(--t2)', fontSize: 10 }}>{c.status}</span>
              </div>
            ))}
            {craftQueue.filter(c => ['OPEN','CLAIMED','IN_PROGRESS'].includes(c.status)).length === 0 && (
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

  useEffect(() => {
    const cached = localStorage.getItem('nexus_insight');
    if (cached) {
      try { setInsight(JSON.parse(cached)); } catch {}
    }
  }, []);

  const refreshInsight = async () => {
    setLoading(true);
    try {
      const r = await base44.functions.invoke('generateInsight', {});
      if (r.data?.insight) {
        setInsight(r.data.insight);
        localStorage.setItem('nexus_insight', JSON.stringify(r.data.insight));
      }
    } catch {}
    setLoading(false);
  };

  if (!insight) return (
    <div
      className="flex items-center justify-between"
      style={{ background: 'rgba(74,143,208,0.06)', border: '0.5px solid rgba(74,143,208,0.2)', borderRadius: 8, padding: '10px 14px' }}
    >
      <div className="flex items-center gap-2">
        <AlertCircle size={13} style={{ color: 'var(--info)' }} />
        <span style={{ color: 'var(--t1)', fontSize: 12 }}>No system insight loaded — refresh to analyse org state</span>
      </div>
      <button onClick={refreshInsight} disabled={loading} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10 }}>
        <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        ANALYSE
      </button>
    </div>
  );

  return (
    <div
      style={{ background: 'rgba(74,143,208,0.06)', border: '0.5px solid rgba(74,143,208,0.2)', borderRadius: 8, padding: '12px 14px' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div style={{ color: 'var(--info)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 4 }}>SYSTEM INSIGHT</div>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{insight.title}</div>
          <div style={{ color: 'var(--t1)', fontSize: 11, marginTop: 4 }}>{insight.detail}</div>
          <div className="flex gap-2 mt-3">
            {insight.action_1_label && (
              <button className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10 }}>
                {insight.action_1_label} →
              </button>
            )}
            {insight.action_2_label && (
              <button className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10 }}>
                {insight.action_2_label} →
              </button>
            )}
          </div>
        </div>
        <button onClick={refreshInsight} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 4 }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
    </div>
  );
}

// ─── Materials Tab ───────────────────────────────────────
function MaterialsTab({ materials, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [qualityFilter, setQualityFilter] = useState(0);
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = materials.filter(m =>
    (m.quality_pct || 0) >= qualityFilter &&
    (typeFilter === 'ALL' || m.material_type === typeFilter)
  );

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await handleOCR(file);
  };

  const handleOCR = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('ocrExtract', { file_url, source_type: 'OCR_UPLOAD' });
      onRefresh();
    } catch {}
    setUploading(false);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {['ALL','RAW','REFINED','SALVAGE','CRAFTED'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10, background: typeFilter === t ? 'var(--bg4)' : 'var(--bg2)', borderColor: typeFilter === t ? 'var(--b3)' : 'var(--b1)' }}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--t1)', fontSize: 11 }}>
          <span>MIN QUALITY</span>
          <input type="range" min={0} max={100} value={qualityFilter} onChange={e => setQualityFilter(+e.target.value)} style={{ accentColor: 'var(--acc)', width: 100 }} />
          <span style={{ color: 'var(--t0)', minWidth: 28 }}>{qualityFilter}%</span>
        </div>
      </div>

      {/* OCR Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=e=>handleOCR(e.target.files[0]); i.click(); }}
        style={{
          border: `0.5px dashed ${dragOver ? 'var(--acc2)' : 'var(--b2)'}`,
          borderRadius: 8,
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--bg2)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={18} style={{ color: 'var(--t2)', margin: '0 auto 8px' }} />
        <div style={{ color: 'var(--t1)', fontSize: 12 }}>
          {uploading ? 'Extracting data...' : 'Drop screenshot to extract via OCR, or click to upload'}
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 11, marginTop: 4 }}>
          Supports inventory, mining scan, refinery order, transaction
        </div>
      </div>

      {/* Table */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['MATERIAL', 'TYPE', 'QUALITY', 'SCU', 'LOCATION', 'LOGGED BY', 'SOURCE', 'STATUS'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid var(--b0)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{m.material_name}</td>
                <td style={{ padding: '8px 14px' }}><span className="nexus-tag" style={{ color: 'var(--t1)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>{m.material_type}</span></td>
                <td style={{ padding: '8px 14px' }}><QualityBar pct={m.quality_pct || 0} /></td>
                <td style={{ padding: '8px 14px', color: 'var(--t0)', fontSize: 12 }}>{m.quantity_scu?.toFixed(1)}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{m.location || '—'}</td>
                <td style={{ padding: '8px 14px', color: 'var(--t1)', fontSize: 11 }}>{m.logged_by_callsign || '—'}</td>
                <td style={{ padding: '8px 14px' }}><span className="nexus-tag" style={{ color: 'var(--t2)', borderColor: 'var(--b1)', background: 'var(--bg2)', fontSize: 9 }}>{m.source_type || 'MANUAL'}</span></td>
                <td style={{ padding: '8px 14px' }}><StatusFlag material={m} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>No materials match current filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Blueprints Tab ──────────────────────────────────────
function BlueprintsTab({ blueprints }) {
  const weapons = blueprints.filter(b => b.category === 'WEAPON');
  const armor = blueprints.filter(b => ['ARMOR','GEAR'].includes(b.category));
  const components = blueprints.filter(b => b.category === 'COMPONENT');
  const other = blueprints.filter(b => !['WEAPON','ARMOR','GEAR','COMPONENT'].includes(b.category));

  return (
    <div className="p-4 flex flex-col gap-4">
      {[['WEAPONS', weapons], ['ARMOR & GEAR', armor], ['COMPONENTS', components], ['OTHER', other]].map(([label, items]) => (
        items.length > 0 && (
          <div key={label}>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {items.map(bp => (
                <BlueprintCard key={bp.id} blueprint={bp} />
              ))}
            </div>
          </div>
        )
      ))}
      {blueprints.length === 0 && (
        <div style={{ color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>No blueprints registered yet</div>
      )}
    </div>
  );
}

function BlueprintCard({ blueprint }) {
  const { item_name, tier, is_priority, owned_by_callsign, category, priority_note } = blueprint;
  const owned = !!owned_by_callsign;

  return (
    <div
      className="nexus-card"
      style={{
        opacity: owned ? 1 : 0.45,
        borderColor: is_priority ? 'rgba(232,160,32,0.4)' : 'var(--b1)',
        position: 'relative',
        padding: '10px 12px',
      }}
    >
      {is_priority && (
        <div
          style={{
            position: 'absolute',
            top: -1, left: -1, right: -1,
            height: 2,
            background: 'var(--warn)',
            borderRadius: '10px 10px 0 0',
          }}
        />
      )}
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: owned ? 'var(--t0)' : 'var(--t2)', fontSize: 12, fontWeight: 600 }}>{item_name}</span>
        <span className="nexus-tag" style={{ color: tier === 'T2' ? 'var(--live)' : 'var(--info)', borderColor: tier === 'T2' ? 'rgba(39,201,106,0.3)' : 'rgba(74,143,208,0.3)', background: 'transparent' }}>{tier}</span>
      </div>
      <div className="flex items-center justify-between">
        <span style={{ color: 'var(--t2)', fontSize: 10 }}>{owned_by_callsign || 'UNOWNED'}</span>
        {is_priority && <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'rgba(232,160,32,0.3)', background: 'rgba(232,160,32,0.06)', fontSize: 9 }}>PRIORITY</span>}
      </div>
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

  const load = async () => {
    const [mats, bps, cq, ro] = await Promise.all([
      base44.entities.Material.list('-logged_at', 100),
      base44.entities.Blueprint.list('-created_date', 100),
      base44.entities.CraftQueue.list('-created_date', 50),
      base44.entities.RefineryOrder.list('-started_at', 50),
    ]);
    setMaterials(mats || []);
    setBlueprints(bps || []);
    setCraftQueue(cq || []);
    setRefineryOrders(ro || []);
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
        {tab === 'overview'   && <OverviewTab materials={materials} blueprints={blueprints} craftQueue={craftQueue} refineryOrders={refineryOrders} />}
        {tab === 'materials'  && <MaterialsTab materials={materials} onRefresh={load} />}
        {tab === 'blueprints' && <BlueprintsTab blueprints={blueprints} />}
        {tab === 'craft'      && <CraftQueueTab craftQueue={craftQueue} callsign={callsign} />}
        {tab === 'refinery'   && <RefineryTab refineryOrders={refineryOrders} />}
      </div>
    </div>
  );
}