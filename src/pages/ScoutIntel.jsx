import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, CheckCircle, AlertTriangle, MapPin,
  Filter, TrendingUp, Users, RefreshCw
} from 'lucide-react';

const SYSTEMS = ['ALL', 'STANTON', 'PYRO', 'NYX'];
const MATERIALS = ['ALL', 'TARANITE', 'BEXALITE', 'BORASE', 'QUANTANIUM', 'LARANITE', 'GOLD', 'AGRICIUM'];
const RISK_COLORS = { LOW: 'var(--live)', MEDIUM: 'var(--warn)', HIGH: '#e88020', EXTREME: 'var(--danger)' };
const VOLUME_SIZES = { SMALL: 4, MEDIUM: 8, LARGE: 12, MASSIVE: 16 };

function SystemMap({ deposits, systemFilter, highlightId }) {
  const SVG_W = 520, SVG_H = 320;

  const systems = {
    STANTON: { x: 120, y: 160, bodies: [
      { name: 'Crusader', x: 100, y: 100 }, { name: 'Hurston', x: 80, y: 200 },
      { name: 'ArcCorp', x: 160, y: 230 }, { name: 'MicroTech', x: 180, y: 90 },
      { name: 'Keeger Belt', x: 60, y: 145, belt: true },
    ]},
    PYRO: { x: 280, y: 120, bodies: [
      { name: 'Pyro I', x: 260, y: 80 }, { name: 'Ruin Station', x: 300, y: 100 },
      { name: 'Pyro IV', x: 320, y: 140 },
    ]},
    NYX: { x: 400, y: 220, bodies: [
      { name: 'Delamar', x: 390, y: 200 }, { name: 'Glaciem Ring', x: 420, y: 240, belt: true },
    ]},
  };

  const visibleDeposits = deposits.filter(d =>
    systemFilter === 'ALL' || d.system_name?.toUpperCase() === systemFilter
  );

  const getMaterialLetter = (name) => {
    if (!name) return '?';
    const map = { TARANITE:'T', BEXALITE:'B', BORASE:'O', QUANTANIUM:'Q', LARANITE:'L', GOLD:'G', AGRICIUM:'A' };
    return map[name.toUpperCase()] || name[0].toUpperCase();
  };

  return (
    <div style={{ position: 'relative', background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 10, overflow: 'hidden' }}>
      <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
        {/* Background */}
        <rect width={SVG_W} height={SVG_H} fill="#07080b"/>
        {/* Star scatter */}
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 137.5) % SVG_W} cy={(i * 97.3) % SVG_H} r={0.6} fill="#dde1f0" opacity={0.15 + (i % 5) * 0.05}/>
        ))}

        {/* System labels + stars */}
        {Object.entries(systems).map(([name, sys]) => {
          if (systemFilter !== 'ALL' && name !== systemFilter) return null;
          return (
            <g key={name}>
              <circle cx={sys.x} cy={sys.y} r={18} fill="none" stroke="#1e2130" strokeWidth={0.5} strokeDasharray="3 4"/>
              <circle cx={sys.x} cy={sys.y} r={5} fill="#5a6080" opacity={0.7}/>
              <text x={sys.x} y={sys.y + 28} textAnchor="middle" fill="#4a5068" fontSize={9} letterSpacing={1}>{name}</text>
              {sys.bodies.map(b => (
                <g key={b.name}>
                  <line x1={sys.x} y1={sys.y} x2={b.x} y2={b.y} stroke="#161820" strokeWidth={0.5}/>
                  {b.belt ? (
                    <ellipse cx={b.x} cy={b.y} rx={22} ry={6} fill="none" stroke="#272b3c" strokeWidth={1} opacity={0.6} strokeDasharray="2 2"/>
                  ) : (
                    <circle cx={b.x} cy={b.y} r={4} fill="#10121a" stroke="#272b3c" strokeWidth={0.5}/>
                  )}
                  <text x={b.x} y={b.y - 8} textAnchor="middle" fill="#2a2e40" fontSize={7}>{b.name}</text>
                </g>
              ))}
            </g>
          );
        })}

        {/* Deposit markers */}
        {visibleDeposits.map((d, i) => {
          const sysEntry = Object.entries(systems).find(([n]) => n === d.system_name?.toUpperCase());
          const base = sysEntry ? sysEntry[1] : { x: 260, y: 160 };
          const spread = 50;
          const angle = (i / visibleDeposits.length) * Math.PI * 2;
          const r = spread * (0.3 + (i % 5) * 0.15);
          const cx = base.x + r * Math.cos(angle);
          const cy = base.y + r * Math.sin(angle);
          const sz = VOLUME_SIZES[d.volume_estimate] || 8;
          const qColor = d.quality_pct >= 80 ? 'var(--live)' : d.quality_pct >= 60 ? 'var(--info)' : 'var(--warn)';
          const isHighlit = highlightId === d.id;
          const stale = d.is_stale;

          return (
            <g key={d.id} opacity={stale ? 0.35 : 1}>
              <circle cx={cx} cy={cy} r={sz / 2 + 3} fill="none" stroke={isHighlit ? 'var(--warn)' : 'transparent'} strokeWidth={1}/>
              <circle cx={cx} cy={cy} r={sz / 2} fill={qColor} opacity={0.15}/>
              <circle cx={cx} cy={cy} r={3} fill={qColor}/>
              <text x={cx} y={cy - sz / 2 - 4} textAnchor="middle" fill={qColor} fontSize={7} fontWeight={600}>
                {getMaterialLetter(d.material_name)}
              </text>
              {d.quality_pct && (
                <text x={cx} y={cy + sz / 2 + 9} textAnchor="middle" fill={qColor} fontSize={7} opacity={0.8}>
                  {d.quality_pct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DepositCard({ deposit, onVote, highlighted, onSelect }) {
  const qColor = deposit.quality_pct >= 80 ? 'var(--live)' : deposit.quality_pct >= 60 ? 'var(--info)' : 'var(--warn)';
  const riskColor = RISK_COLORS[deposit.risk_level] || 'var(--t2)';
  const timeAgo = (isoStr) => {
    if (!isoStr) return '—';
    const diff = Date.now() - new Date(isoStr);
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div
      onClick={() => onSelect(deposit)}
      className="nexus-card"
      style={{
        padding: '10px 12px',
        cursor: 'pointer',
        borderColor: highlighted ? 'var(--acc)' : deposit.is_stale ? 'var(--b0)' : 'var(--b1)',
        opacity: deposit.is_stale ? 0.5 : 1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{deposit.material_name}</span>
            {deposit.is_stale && <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'rgba(232,160,32,0.3)', background: 'transparent', fontSize: 9 }}>STALE</span>}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10 }}>
            {deposit.system_name} · {deposit.location_detail || '—'}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="nexus-tag" style={{ color: riskColor, borderColor: 'transparent', background: 'transparent', fontSize: 9 }}>{deposit.risk_level} RISK</span>
            <span style={{ color: 'var(--t2)', fontSize: 10 }}>{deposit.volume_estimate}</span>
            <span style={{ color: 'var(--t2)', fontSize: 10 }}>{timeAgo(deposit.reported_at)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: qColor, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
            {deposit.quality_pct?.toFixed(0) || '?'}%
          </div>
          <div className="flex items-center gap-1 mt-1 justify-end">
            <button onClick={(e) => { e.stopPropagation(); onVote(deposit.id, 'confirm'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--live)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircle size={10}/> {deposit.confirmed_votes}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onVote(deposit.id, 'stale'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warn)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}>
              <AlertTriangle size={10}/> {deposit.stale_votes}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogDepositForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    material_name: '', system_name: 'STANTON', location_detail: '',
    quality_pct: 50, volume_estimate: 'MEDIUM', risk_level: 'LOW',
    ship_type: '', notes: '', coords_approx: '',
  });

  const t2Eligible = form.quality_pct >= 80;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="nexus-card" style={{ padding: '16px' }}>
      <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>LOG DEPOSIT</div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>MATERIAL</label>
            <input className="nexus-input" value={form.material_name} onChange={e => set('material_name', e.target.value.toUpperCase())} placeholder="TARANITE" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SYSTEM</label>
            <select className="nexus-input" value={form.system_name} onChange={e => set('system_name', e.target.value)} style={{ cursor: 'pointer' }}>
              {['STANTON','PYRO','NYX'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LOCATION</label>
          <input className="nexus-input" value={form.location_detail} onChange={e => set('location_detail', e.target.value)} placeholder="Keeger Belt · Sector 9" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>QUALITY</label>
            <div className="flex items-center gap-2">
              <span style={{ color: form.quality_pct >= 80 ? 'var(--live)' : 'var(--t1)', fontSize: 12, fontWeight: 700 }}>{form.quality_pct}%</span>
              {t2Eligible && <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)', fontSize: 9 }}>T2 ELIGIBLE</span>}
            </div>
          </div>
          <input type="range" min={0} max={100} value={form.quality_pct} onChange={e => set('quality_pct', +e.target.value)} style={{ width: '100%', accentColor: form.quality_pct >= 80 ? 'var(--live)' : 'var(--acc)' }} />
        </div>
        <div className="flex gap-2">
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>VOLUME</label>
            <select className="nexus-input" value={form.volume_estimate} onChange={e => set('volume_estimate', e.target.value)} style={{ cursor: 'pointer' }}>
              {['SMALL','MEDIUM','LARGE','MASSIVE'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>RISK</label>
            <select className="nexus-input" value={form.risk_level} onChange={e => set('risk_level', e.target.value)} style={{ cursor: 'pointer' }}>
              {['LOW','MEDIUM','HIGH','EXTREME'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>NOTES</label>
          <input className="nexus-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional scout notes..." />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onCancel} className="nexus-btn" style={{ padding: '6px 14px' }}>CANCEL</button>
          <button onClick={() => onSubmit(form)} className="nexus-btn primary" style={{ padding: '6px 14px' }}>LOG DEPOSIT</button>
        </div>
      </div>
    </div>
  );
}

export default function ScoutIntel() {
  const [deposits, setDeposits] = useState([]);
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [minQuality, setMinQuality] = useState(0);
  const [showStale, setShowStale] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  const load = async () => {
    const d = await base44.entities.ScoutDeposit.list('-reported_at', 200);
    setDeposits(d || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = deposits.filter(d => {
    if (!showStale && d.is_stale) return false;
    if (systemFilter !== 'ALL' && d.system_name?.toUpperCase() !== systemFilter) return false;
    if (materialFilter !== 'ALL' && d.material_name?.toUpperCase() !== materialFilter) return false;
    if ((d.quality_pct || 0) < minQuality) return false;
    return true;
  });

  const handleVote = async (id, type) => {
    const dep = deposits.find(d => d.id === id);
    if (!dep) return;
    if (type === 'confirm') {
      await base44.entities.ScoutDeposit.update(id, { confirmed_votes: (dep.confirmed_votes || 0) + 1 });
    } else {
      const newStale = (dep.stale_votes || 0) + 1;
      await base44.entities.ScoutDeposit.update(id, { stale_votes: newStale, is_stale: newStale >= 3 });
    }
    load();
  };

  const handleLogDeposit = async (form) => {
    const callsign = localStorage.getItem('nexus_callsign') || 'UNKNOWN';
    const discord_id = localStorage.getItem('nexus_discord_id') || '';
    await base44.entities.ScoutDeposit.create({
      ...form,
      reported_by: discord_id,
      reported_by_callsign: callsign,
      reported_at: new Date().toISOString(),
    });
    setShowLogForm(false);
    load();
  };

  const topDeposits = [...filtered].sort((a, b) => (b.quality_pct || 0) - (a.quality_pct || 0)).slice(0, 5);

  return (
    <div className="flex h-full" style={{ overflow: 'hidden' }}>
      {/* Left — map + controls */}
      <div className="flex flex-col flex-1 min-w-0 p-4 gap-3" style={{ overflow: 'auto' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {SYSTEMS.map(s => (
              <button key={s} onClick={() => setSystemFilter(s)} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10, background: systemFilter === s ? 'var(--bg4)' : 'var(--bg2)', borderColor: systemFilter === s ? 'var(--b3)' : 'var(--b1)' }}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2" style={{ color: 'var(--t2)', fontSize: 11 }}>
            <span>MIN QUAL</span>
            <input type="range" min={0} max={100} value={minQuality} onChange={e => setMinQuality(+e.target.value)} style={{ accentColor: 'var(--acc)', width: 80 }} />
            <span style={{ color: 'var(--t0)', minWidth: 28 }}>{minQuality}%</span>
          </div>
          <button onClick={() => setShowStale(!showStale)} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10, background: showStale ? 'var(--bg2)' : 'var(--bg4)' }}>
            {showStale ? 'HIDE STALE' : 'SHOW STALE'}
          </button>
          <button onClick={load} className="nexus-btn" style={{ padding: '4px 8px' }}>
            <RefreshCw size={11} />
          </button>
          <button onClick={() => setShowLogForm(!showLogForm)} className="nexus-btn primary" style={{ padding: '4px 10px', fontSize: 10, marginLeft: 'auto' }}>
            <Plus size={11} /> LOG DEPOSIT
          </button>
        </div>

        {showLogForm && <LogDepositForm onSubmit={handleLogDeposit} onCancel={() => setShowLogForm(false)} />}

        {/* Map */}
        <SystemMap deposits={filtered} systemFilter={systemFilter} highlightId={highlightId} />

        {/* Status bar */}
        <div className="flex items-center gap-4" style={{ color: 'var(--t2)', fontSize: 10 }}>
          <span>{filtered.length} deposits</span>
          <span>{filtered.filter(d => !d.is_stale).length} fresh</span>
          <span>{filtered.filter(d => d.is_stale).length} stale</span>
          <span>{filtered.filter(d => (d.quality_pct || 0) >= 80).length} T2-eligible</span>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex flex-col gap-3 flex-shrink-0 overflow-auto"
        style={{ width: 280, borderLeft: '0.5px solid var(--b1)', padding: 12 }}
      >
        {selectedDeposit ? (
          /* Deposit detail */
          <DepositDetail deposit={selectedDeposit} onClose={() => setSelectedDeposit(null)} onVote={handleVote} />
        ) : (
          <>
            {/* Top deposits */}
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 4 }}>TOP DEPOSITS</div>
            {topDeposits.map(d => (
              <DepositCard key={d.id} deposit={d} onVote={handleVote} highlighted={highlightId === d.id} onSelect={dep => { setSelectedDeposit(dep); setHighlightId(dep.id); }} />
            ))}
            {topDeposits.length === 0 && (
              <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', padding: 20 }}>No deposits logged yet</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DepositDetail({ deposit, onClose, onVote }) {
  const qColor = deposit.quality_pct >= 80 ? 'var(--live)' : deposit.quality_pct >= 60 ? 'var(--info)' : 'var(--warn)';
  const riskColor = RISK_COLORS[deposit.risk_level] || 'var(--t2)';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{deposit.material_name}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 16, padding: 2 }}>×</button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>QUALITY</span>
          <span style={{ color: qColor, fontSize: 22, fontWeight: 700 }}>{deposit.quality_pct?.toFixed(0)}%</span>
        </div>
        <div className="nexus-bar"><div className="nexus-bar-fill" style={{ width: `${deposit.quality_pct}%`, background: qColor }} /></div>
        <Row label="SYSTEM" value={deposit.system_name} />
        <Row label="LOCATION" value={deposit.location_detail} />
        <Row label="VOLUME" value={deposit.volume_estimate} />
        <Row label="RISK" value={deposit.risk_level} valueColor={riskColor} />
        <Row label="SHIP" value={deposit.ship_type} />
        <Row label="SCOUT" value={deposit.reported_by_callsign} />
        <Row label="COORDS" value={deposit.coords_approx} />
        {deposit.notes && (
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 4 }}>NOTES</div>
            <div style={{ color: 'var(--t1)', fontSize: 11 }}>{deposit.notes}</div>
          </div>
        )}
        <div style={{ borderTop: '0.5px solid var(--b1)', paddingTop: 10, display: 'flex', gap: 6 }}>
          <button onClick={() => onVote(deposit.id, 'confirm')} className="nexus-btn live-btn" style={{ flex: 1, justifyContent: 'center', padding: '5px 0', fontSize: 10 }}>
            <CheckCircle size={11}/> CONFIRM ({deposit.confirmed_votes})
          </button>
          <button onClick={() => onVote(deposit.id, 'stale')} className="nexus-btn danger" style={{ flex: 1, justifyContent: 'center', padding: '5px 0', fontSize: 10 }}>
            <AlertTriangle size={11}/> STALE ({deposit.stale_votes})
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--t2)', fontSize: 10 }}>{label}</span>
      <span style={{ color: valueColor || 'var(--t1)', fontSize: 11 }}>{value}</span>
    </div>
  );
}