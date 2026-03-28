/**
 * LiveSystemMap — full interactive system map with toggleable layers:
 *   DEPOSITS — scout deposit markers (quality-coloured)
 *   STATIONS — known stations / trade terminals
 *   HAZARDS  — dangerous zones (PvP, comm arrays down, pirate areas)
 *   ROUTES   — profitable trade route arcs
 *   HEATMAP  — deposit density overlay
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { qualityPercentFromRecord } from '@/core/data/quality';
import NexusToken from '@/core/design/NexusToken';
import { depositToken } from '@/core/data/tokenMap';
import LayerControls from './LayerControls';
import MapLegend from './MapLegend';
import { RefreshCw, Search } from 'lucide-react';

// ─── System layout (same as SystemMap.jsx) ──────────────────────────────
const SYSTEMS = {
  STANTON: {
    label: 'STANTON', star: { x: 150, y: 240 }, regionX: 0,
    orbits: [{ rx:46,ry:28 },{ rx:88,ry:54 },{ rx:118,ry:72 },{ rx:140,ry:84 }],
    bodies: [
      { name:'Crusader', x:136, y:187, r:5 },{ name:'Hurston', x:108, y:256, r:4 },
      { name:'ArcCorp', x:193, y:256, r:4 },{ name:'MicroTech', x:228, y:183, r:4 },
      { name:'Yela', x:128, y:152, r:0, belt:true, beltRx:18, beltRy:7 },
      { name:'Delamar', x:266, y:248, r:3 },
    ],
  },
  PYRO: {
    label: 'PYRO', star: { x: 450, y: 240 }, regionX: 300,
    orbits: [{ rx:42,ry:26 },{ rx:76,ry:46 },{ rx:108,ry:64 },{ rx:136,ry:82 }],
    bodies: [
      { name:'Pyro I', x:450, y:196, r:3 },{ name:'Pyro II', x:392, y:216, r:4 },
      { name:'Bloom', x:396, y:268, r:5, note:'Pyro III' },{ name:'Pyro IV', x:450, y:286, r:4 },
      { name:'Pyro V', x:506, y:268, r:3 },{ name:'Pyro VI', x:508, y:215, r:3 },
      { name:'Checkmate', x:370, y:192, r:2 },{ name:'Furud', x:358, y:248, r:3 },
    ],
  },
  NYX: {
    label: 'NYX', star: { x: 750, y: 240 }, regionX: 600,
    orbits: [{ rx:48,ry:30 },{ rx:86,ry:52 },{ rx:116,ry:70 }],
    bodies: [
      { name:'Delamar', x:750, y:186, r:4 },
      { name:'Glaciem Ring', x:710, y:294, r:0, belt:true, beltRx:22, beltRy:8 },
      { name:'Keeger Belt', x:792, y:268, r:0, belt:true, beltRx:22, beltRy:8 },
    ],
  },
};

// ─── Station data ───────────────────────────────────────────────────
const STATIONS = [
  { name:'Port Olisar', system:'STANTON', x:148, y:195, type:'station' },
  { name:'GrimHEX', system:'STANTON', x:118, y:145, type:'station' },
  { name:'Port Tressler', system:'STANTON', x:238, y:173, type:'station' },
  { name:'Everus Harbor', system:'STANTON', x:98, y:248, type:'station' },
  { name:'Baijini Point', system:'STANTON', x:203, y:248, type:'station' },
  { name:'CRU-L1', system:'STANTON', x:160, y:170, type:'outpost' },
  { name:'HUR-L1', system:'STANTON', x:90, y:235, type:'outpost' },
  { name:'ARC-L1', system:'STANTON', x:210, y:240, type:'outpost' },
  { name:'MIC-L1', system:'STANTON', x:245, y:195, type:'outpost' },
  { name:'Ruin Station', system:'PYRO', x:404, y:204, type:'station' },
  { name:'Checkmate Station', system:'PYRO', x:378, y:186, type:'station' },
  { name:'Pyro Gateway', system:'PYRO', x:450, y:166, type:'outpost' },
  { name:'Levski', system:'NYX', x:750, y:176, type:'station' },
];

// ─── Hazard zones ───────────────────────────────────────────────────
const HAZARDS = [
  { name:'Jumptown', system:'STANTON', x:128, y:170, r:20, threat:'HIGH', desc:'Drug lab — PvP hotspot' },
  { name:'Kareah', system:'STANTON', x:145, y:208, r:16, threat:'MED', desc:'Security station — frequent fights' },
  { name:'Nine Tails Territory', system:'STANTON', x:130, y:150, r:28, threat:'HIGH', desc:'Pirate presence around Yela' },
  { name:'Pyro Interior', system:'PYRO', x:450, y:240, r:45, threat:'EXTREME', desc:'Lawless system — no security' },
  { name:'Bloom Approach', system:'PYRO', x:396, y:268, r:18, threat:'HIGH', desc:'Ambush corridor' },
  { name:'Glaciem Drift', system:'NYX', x:710, y:294, r:22, threat:'MED', desc:'Unstable belt — nav hazard' },
];

const THREAT_COLORS = { EXTREME:'#C0392B', HIGH:'#C0392B', MED:'#C8A84B', LOW:'#5A5850' };

// ─── Body lookup for deposit positioning ──────────────────────────────
const BODY_LOOKUP = {
  STANTON: { crusader:{x:136,y:187}, hurston:{x:108,y:256}, arccorp:{x:193,y:256}, 'arc corp':{x:193,y:256}, microtech:{x:228,y:183}, yela:{x:128,y:152}, delamar:{x:266,y:248}, aaron:{x:266,y:248}, halo:{x:155,y:178}, _default:{x:150,y:240} },
  PYRO: { 'pyro i':{x:450,y:196}, 'pyro 1':{x:450,y:196}, 'pyro ii':{x:392,y:216}, 'pyro 2':{x:392,y:216}, bloom:{x:396,y:268}, 'pyro iii':{x:396,y:268}, 'pyro 3':{x:396,y:268}, 'pyro iv':{x:450,y:286}, 'pyro 4':{x:450,y:286}, 'pyro v':{x:506,y:268}, 'pyro 5':{x:506,y:268}, 'pyro vi':{x:508,y:215}, 'pyro 6':{x:508,y:215}, checkmate:{x:370,y:192}, furud:{x:358,y:248}, ruin:{x:404,y:204}, _default:{x:450,y:240} },
  NYX: { delamar:{x:750,y:186}, glaciem:{x:710,y:294}, keeger:{x:792,y:268}, 'nyx belt':{x:760,y:300}, _default:{x:750,y:240} },
};

function resolvePos(deposit) {
  const sys = (deposit.system_name || 'STANTON').toUpperCase();
  const lookup = BODY_LOOKUP[sys] || BODY_LOOKUP.STANTON;
  const loc = (deposit.location_detail || '').toLowerCase();
  for (const [key, pos] of Object.entries(lookup)) {
    if (key !== '_default' && loc.includes(key)) return pos;
  }
  return lookup._default;
}

function qColor(pct) {
  if (pct >= 80) return '#4A8C5C';
  if (pct >= 60) return '#C8A84B';
  return '#9A9488';
}

// ─── Component ──────────────────────────────────────────────────────
export default function LiveSystemMap() {
  const { user } = useSession();
  const [deposits, setDeposits] = useState([]);
  const [tradeRoutes, setTradeRoutes] = useState([]);
  const [liveOp, setLiveOp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  const [layers, setLayers] = useState({
    deposits: true, stations: true, hazards: true, routes: false, heatmap: false,
  });

  const toggleLayer = useCallback((id) => {
    setLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const load = useCallback(async () => {
    const [deps, routes, ops] = await Promise.all([
      base44.entities.ScoutDeposit.list('-reported_at', 200).catch(() => []),
      base44.entities.TradeRoute.list('-route_score', 50).catch(() => []),
      base44.entities.Op.filter({ status: 'LIVE' }).catch(() => []),
    ]);
    setDeposits(deps || []);
    setTradeRoutes(routes || []);
    setLiveOp(Array.isArray(ops) && ops.length > 0 ? ops[0] : null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Position deposits with scatter
  const depositPositions = useMemo(() => {
    const counters = {};
    return deposits.map(d => {
      const base = resolvePos(d);
      const bKey = `${base.x},${base.y}`;
      if (!counters[bKey]) counters[bKey] = 0;
      const idx = counters[bKey]++;
      const angle = idx * 2.399;
      const r = 18 + (idx % 4) * 10;
      return { id: d.id, x: base.x + r * Math.cos(angle), y: base.y + r * Math.sin(angle) };
    });
  }, [deposits]);

  // Filter deposits
  const visibleDeposits = useMemo(() => {
    const q = search.toLowerCase();
    return deposits.filter((d, i) => {
      if (systemFilter !== 'ALL' && (d.system_name || '').toUpperCase() !== systemFilter) return false;
      if (q && !(d.material_name || '').toLowerCase().includes(q) && !(d.location_detail || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deposits, systemFilter, search]);

  const visibleIds = useMemo(() => new Set(visibleDeposits.map(d => d.id)), [visibleDeposits]);

  // Heatmap nodes
  const heatNodes = useMemo(() => {
    if (!layers.heatmap) return [];
    const groups = {};
    visibleDeposits.forEach(d => {
      const pos = depositPositions.find(p => p.id === d.id);
      if (!pos) return;
      const gx = Math.round(pos.x / 40) * 40;
      const gy = Math.round(pos.y / 40) * 40;
      const key = `${gx},${gy}`;
      if (!groups[key]) groups[key] = { x: gx, y: gy, count: 0, totalQ: 0 };
      groups[key].count++;
      groups[key].totalQ += qualityPercentFromRecord(d);
    });
    return Object.values(groups).map(g => ({ ...g, avgQ: g.totalQ / g.count }));
  }, [layers.heatmap, visibleDeposits, depositPositions]);

  // Filtered stations / hazards
  const visibleStations = useMemo(() => {
    if (!layers.stations) return [];
    return STATIONS.filter(s => systemFilter === 'ALL' || s.system === systemFilter);
  }, [layers.stations, systemFilter]);

  const visibleHazards = useMemo(() => {
    if (!layers.hazards) return [];
    return HAZARDS.filter(h => systemFilter === 'ALL' || h.system === systemFilter);
  }, [layers.hazards, systemFilter]);

  // Trade route arcs
  const visibleRoutes = useMemo(() => {
    if (!layers.routes || tradeRoutes.length === 0) return [];
    return tradeRoutes.slice(0, 15).map(r => {
      const originStation = STATIONS.find(s => (r.origin_terminal || '').toLowerCase().includes(s.name.toLowerCase()));
      const destStation = STATIONS.find(s => (r.destination_terminal || '').toLowerCase().includes(s.name.toLowerCase()));
      if (!originStation || !destStation) return null;
      return { ...r, ox: originStation.x, oy: originStation.y, dx: destStation.x, dy: destStation.y };
    }).filter(Boolean);
  }, [layers.routes, tradeRoutes]);

  const svgW = 900, svgH = 520;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexWrap: 'wrap',
        borderBottom: '0.5px solid rgba(200,170,100,0.08)', background: '#0A0908', flexShrink: 0,
      }}>
        {/* System filter */}
        {['ALL', 'STANTON', 'PYRO', 'NYX'].map(s => (
          <button key={s} onClick={() => setSystemFilter(s)} style={{
            padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
            background: systemFilter === s ? 'rgba(192,57,43,0.12)' : '#141410',
            border: `0.5px solid ${systemFilter === s ? '#C0392B' : 'rgba(200,170,100,0.08)'}`,
            color: systemFilter === s ? '#E8E4DC' : '#5A5850',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
            letterSpacing: '0.1em',
          }}>{s}</button>
        ))}
        <div style={{ width: 1, height: 16, background: 'rgba(200,170,100,0.08)' }} />
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 200 }}>
          <Search size={10} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material or location..."
            style={{ width: '100%', paddingLeft: 24, height: 26, fontSize: 9, background: '#141410', border: '0.5px solid rgba(200,170,100,0.08)', borderRadius: 2, color: '#E8E4DC' }} />
        </div>
        <div style={{ flex: 1 }} />
        {/* Stats */}
        <span style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {visibleDeposits.length} deposits · {visibleStations.length} stations · {visibleHazards.length} hazards
        </span>
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2 }}>
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Map + controls */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', background: '#08080A' }}>
          {/* Background stars */}
          {Array.from({ length: 80 }, (_, i) => (
            <circle key={i} cx={(i * 137.508) % svgW} cy={(i * 91.237) % svgH} r={0.5 + (i % 3) * 0.3}
              fill="#E8E4DC" opacity={0.04 + (i % 7) * 0.015} />
          ))}

          {/* Region dividers */}
          <line x1={300} y1={0} x2={300} y2={svgH} stroke="rgba(200,170,100,0.06)" strokeWidth={0.5} strokeDasharray="4 6" />
          <line x1={600} y1={0} x2={600} y2={svgH} stroke="rgba(200,170,100,0.06)" strokeWidth={0.5} strokeDasharray="4 6" />

          {/* Systems */}
          {Object.values(SYSTEMS).map(sys => {
            if (systemFilter !== 'ALL' && sys.label !== systemFilter) return null;
            return (
              <g key={sys.label}>
                <text x={sys.star.x} y={22} textAnchor="middle" fill="#5A5850" fontSize={10} letterSpacing="0.12em" fontFamily="'Barlow Condensed', sans-serif">{sys.label}</text>
                {sys.orbits.map((o, i) => <ellipse key={i} cx={sys.star.x} cy={sys.star.y} rx={o.rx} ry={o.ry} fill="none" stroke="rgba(200,170,100,0.06)" strokeWidth={0.5} />)}
                <circle cx={sys.star.x} cy={sys.star.y} r={8} fill="#5A5850" opacity={0.6} />
                <circle cx={sys.star.x} cy={sys.star.y} r={4} fill="#C8A84B" opacity={0.4} />
                {sys.bodies.map(b => b.belt ? (
                  <g key={b.name}><ellipse cx={b.x} cy={b.y} rx={b.beltRx} ry={b.beltRy} fill="none" stroke="rgba(200,170,100,0.12)" strokeWidth={1} strokeDasharray="2 3" opacity={0.5} /><text x={b.x} y={b.y + (b.beltRy||8) + 10} textAnchor="middle" fill="#5A5850" fontSize={7} fontFamily="monospace">{b.name}</text></g>
                ) : (
                  <g key={b.name}><circle cx={b.x} cy={b.y} r={b.r||4} fill="#1A1A16" stroke="rgba(200,170,100,0.15)" strokeWidth={0.5} /><text x={b.x} y={b.y + (b.r||4) + 9} textAnchor="middle" fill="#5A5850" fontSize={7} fontFamily="monospace">{b.note || b.name}</text></g>
                ))}
              </g>
            );
          })}

          {/* LAYER: Hazard zones */}
          {visibleHazards.map((h, i) => {
            const tc = THREAT_COLORS[h.threat] || '#5A5850';
            return (
              <g key={`hz-${i}`}>
                <circle cx={h.x} cy={h.y} r={h.r} fill={`${tc}08`} stroke={tc} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.6} />
                <circle cx={h.x} cy={h.y} r={h.r * 0.4} fill={`${tc}15`} opacity={0.4} />
                {/* Hazard diamond icon */}
                <polygon points={`${h.x},${h.y-5} ${h.x+4},${h.y} ${h.x},${h.y+5} ${h.x-4},${h.y}`} fill={tc} opacity={0.5} />
                <text x={h.x} y={h.y + h.r + 8} textAnchor="middle" fill={tc} fontSize={6} fontFamily="monospace" opacity={0.7}>{h.name}</text>
              </g>
            );
          })}

          {/* LAYER: Trade route arcs */}
          {visibleRoutes.map((r, i) => {
            const mx = (r.ox + r.dx) / 2;
            const my = (r.oy + r.dy) / 2 - 30; // arc above
            return (
              <g key={`tr-${i}`} opacity={0.5}>
                <path d={`M ${r.ox} ${r.oy} Q ${mx} ${my} ${r.dx} ${r.dy}`} fill="none" stroke="#E8A020" strokeWidth={1} strokeDasharray="4 3" />
                <circle cx={r.ox} cy={r.oy} r={3} fill="#E8A020" opacity={0.4} />
                <circle cx={r.dx} cy={r.dy} r={3} fill="#E8A020" opacity={0.4} />
                <text x={mx} y={my - 4} textAnchor="middle" fill="#E8A020" fontSize={6} fontFamily="monospace">
                  {r.commodity_name} · {r.profit_per_scu ? `+${r.profit_per_scu}/SCU` : ''}
                </text>
              </g>
            );
          })}

          {/* LAYER: Heatmap */}
          {heatNodes.map((n, i) => {
            const col = n.avgQ >= 80 ? '74,140,92' : n.avgQ >= 60 ? '200,168,75' : '90,88,80';
            return <circle key={`hm-${i}`} cx={n.x} cy={n.y} r={28 + n.count * 5} fill={`rgba(${col},${Math.min(0.3, 0.06 * n.count)})`} />;
          })}

          {/* LAYER: Stations */}
          {visibleStations.map((s, i) => (
            <g key={`st-${i}`}>
              <rect x={s.x - 4} y={s.y - 4} width={8} height={8} rx={1} fill="rgba(52,152,219,0.15)" stroke="#3498DB" strokeWidth={0.5} />
              <circle cx={s.x} cy={s.y} r={1.5} fill="#3498DB" />
              <text x={s.x} y={s.y + 12} textAnchor="middle" fill="#3498DB" fontSize={6} fontFamily="monospace" opacity={0.7}>{s.name}</text>
            </g>
          ))}

          {/* LAYER: Deposits */}
          {layers.deposits && deposits.map((d, i) => {
            if (!visibleIds.has(d.id)) return null;
            const pos = depositPositions[i];
            if (!pos) return null;
            const qPct = qualityPercentFromRecord(d);
            const col = qColor(qPct);
            const stale = d.is_stale;
            const selected = selectedDeposit?.id === d.id;
            const hovered = hoveredId === d.id;

            return (
              <g key={d.id} opacity={stale ? 0.35 : 1} style={{ cursor: 'pointer' }}
                onClick={() => setSelectedDeposit(selected ? null : d)}
                onMouseEnter={() => setHoveredId(d.id)} onMouseLeave={() => setHoveredId(null)}>
                {(selected || hovered) && <circle cx={pos.x} cy={pos.y} r={16} fill="none" stroke={col} strokeWidth={selected ? 1 : 0.5} opacity={0.5} />}
                <circle cx={pos.x} cy={pos.y} r={11} fill="none" stroke={col} strokeWidth={0.5} strokeDasharray={stale ? '2 2' : 'none'} opacity={0.5} />
                <text x={pos.x} y={pos.y - 15} textAnchor="middle" fill={col} fontSize={7} fontFamily="monospace" fontWeight={600}>{Math.round(qPct)}%</text>
                <foreignObject x={pos.x - 12} y={pos.y - 12} width={24} height={24} style={{ overflow: 'visible' }}>
                  <NexusToken src={depositToken(qPct, stale)} size={24} alt={d.material_name} title={`${d.material_name} · ${d.location_detail || ''}`} />
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* Layer controls overlay */}
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <LayerControls activeLayers={layers} onToggle={toggleLayer} />
        </div>

        {/* Legend overlay */}
        <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 10 }}>
          <MapLegend />
        </div>

        {/* Live op banner */}
        {liveOp && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 10,
            padding: '6px 10px', background: 'rgba(192,57,43,0.15)', border: '0.5px solid rgba(192,57,43,0.4)',
            borderRadius: 2, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, color: '#C0392B', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.1em' }}>
              LIVE: {liveOp.name}
            </span>
          </div>
        )}

        {/* Selected deposit info card */}
        {selectedDeposit && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10, zIndex: 10, width: 240,
            background: 'rgba(10,9,8,0.92)', border: '0.5px solid rgba(200,170,100,0.15)',
            borderLeft: `2px solid ${qColor(qualityPercentFromRecord(selectedDeposit))}`,
            borderRadius: 2, padding: '10px 12px',
            animation: 'nexus-fade-in 120ms ease-out both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#E8E4DC' }}>
                {selectedDeposit.material_name}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: qColor(qualityPercentFromRecord(selectedDeposit)),
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>{Math.round(qualityPercentFromRecord(selectedDeposit))}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, color: '#9A9488' }}>
              <div>{selectedDeposit.system_name} · {selectedDeposit.location_detail || 'Unknown'}</div>
              {selectedDeposit.volume_estimate && <div>Volume: {selectedDeposit.volume_estimate}</div>}
              {selectedDeposit.risk_level && <div>Risk: <span style={{ color: THREAT_COLORS[selectedDeposit.risk_level] || '#9A9488' }}>{selectedDeposit.risk_level}</span></div>}
              {selectedDeposit.reported_by_callsign && <div>Reported by: {selectedDeposit.reported_by_callsign}</div>}
              {selectedDeposit.reported_at && <div>Age: {Math.floor((Date.now() - new Date(selectedDeposit.reported_at).getTime()) / 3600000)}h ago</div>}
              {selectedDeposit.is_stale && <div style={{ color: '#C0392B' }}>⚠ STALE — needs re-verification</div>}
            </div>
            <button onClick={() => setSelectedDeposit(null)} style={{
              marginTop: 6, width: '100%', padding: '4px', background: 'none',
              border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
              color: '#5A5850', fontSize: 8, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>CLOSE</button>
          </div>
        )}
      </div>
    </div>
  );
}