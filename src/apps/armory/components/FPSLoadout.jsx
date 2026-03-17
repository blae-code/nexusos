/**
 * FPSLoadout — equipment screen for FPS gear management.
 *
 * Props:
 *   memberId       — string
 *   availableGear  — array of gear objects from fps-gear.json
 *   onLoadoutSave  — function(loadout)
 *
 * Features:
 *   · SVG tactical humanoid silhouette with 9 interactive slot zones
 *   · Gear selector panel slides in from right on slot click
 *   · Stat comparison bars (weight, armor, mobility) with animated deltas
 *   · Saved loadout slots (max 5)
 *   · Quick-equip challenge mini-game (30s timer, target spec)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Save, Timer, X } from 'lucide-react';

// ─── Slot configuration ───────────────────────────────────────────────────────

const SLOTS = [
  { id: 'head',      label: 'HELMET',    type: 'helmet',    zone: { cx: 100, cy: 28, w: 44, h: 38 } },
  { id: 'torso',     label: 'CHEST',     type: 'armour',    zone: { cx: 100, cy: 88, w: 60, h: 54 } },
  { id: 'arms',      label: 'GAUNTLETS', type: 'gauntlet',  zone: { cx: 100, cy: 92, w: 90, h: 40 } },
  { id: 'legs',      label: 'LEGS',      type: 'legs',      zone: { cx: 100, cy: 165, w: 58, h: 70 } },
  { id: 'primary',   label: 'PRIMARY',   type: 'rifle',     zone: { cx: 100, cy: 100, w: 28, h: 60 } },
  { id: 'secondary', label: 'SECONDARY', type: 'smg',       zone: { cx: 100, cy: 130, w: 28, h: 40 } },
  { id: 'sidearm',   label: 'SIDEARM',   type: 'pistol',    zone: { cx: 100, cy: 130, w: 28, h: 30 } },
  { id: 'backpack',  label: 'BACKPACK',  type: 'backpack',  zone: { cx: 100, cy: 100, w: 36, h: 54 } },
  { id: 'utility1',  label: 'UTILITY 1', type: 'utility',   zone: { cx: 100, cy: 148, w: 18, h: 18 } },
  { id: 'utility2',  label: 'UTILITY 2', type: 'utility',   zone: { cx: 100, cy: 148, w: 18, h: 18 } },
];

const SLOT_COLORS = {
  helmet:   'var(--info)',
  armour:   'var(--acc)',
  gauntlet: 'var(--acc)',
  legs:     'var(--acc)',
  rifle:    'var(--danger)',
  smg:      'var(--danger)',
  pistol:   'var(--warn)',
  backpack: 'var(--live)',
  utility:  'var(--t1)',
};

// Challenge specs
const CHALLENGE_SPECS = [
  { label: 'MAX ARMOR',      target: { armor: 1,  weight: 0,  mobility: 0  } },
  { label: 'MAX MOBILITY',   target: { armor: 0,  weight: 0,  mobility: 1  } },
  { label: 'COMBAT READY',   target: { armor: 0.6,weight: 0,  mobility: 0.4} },
  { label: 'LIGHT RECON',    target: { armor: 0,  weight: -1, mobility: 1  } },
];

const STYLE_ID = 'fps-loadout-styles';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes fps-slide-in  { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes fps-stat-fill { from{width:0} to{width:var(--fill-w)} }
    @keyframes fps-pulse-zone{ 0%,100%{opacity:0.25} 50%{opacity:0.55} }
    @keyframes fps-challenge-tick { 0%{opacity:1} 100%{opacity:0} }
  `;
  document.head.appendChild(s);
}

// ─── Stat derivation ──────────────────────────────────────────────────────────

function deriveStats(equipped) {
  const items  = Object.values(equipped).filter(Boolean);
  const weight = items.reduce((s, i) => s + (i.weight || 0), 0);
  const armor  = items.reduce((s, i) => s + (i.armor  || 0), 0);
  return {
    weight:   Math.min(weight, 100),
    armor:    Math.min(armor,  100),
    mobility: Math.max(0, 100 - weight * 0.8),
  };
}

// ─── SVG Humanoid silhouette ──────────────────────────────────────────────────

function SilhouetteSVG({ equipped, activeSlot, hoveredSlot, onSlotClick, onSlotHover }) {
  const slotColor = (slotId) => {
    const item = equipped[slotId];
    if (item) return SLOT_COLORS[item.type] || 'var(--live)';
    return null;
  };

  const zoneStyle = (slotId) => {
    const active   = activeSlot === slotId;
    const hovered  = hoveredSlot === slotId;
    const equipped_ = !!equipped[slotId];
    const col = slotColor(slotId) || 'var(--acc)';
    return {
      cursor: 'pointer',
      opacity: active ? 0.9 : hovered ? 0.65 : equipped_ ? 0.45 : 0.18,
      filter: active ? `drop-shadow(0 0 6px ${col})` : undefined,
    };
  };

  return (
    <svg viewBox="0 0 200 260" style={{ width: '100%', height: '100%', maxWidth: 200 }}>
      {/* ── Armour plate silhouette ── */}
      {/* Frame lines */}
      <g stroke="var(--b2)" strokeWidth="0.5" fill="none" opacity="0.4">
        {/* Spine */}
        <line x1="100" y1="48" x2="100" y2="230"/>
        {/* Shoulder width */}
        <line x1="58" y1="72" x2="142" y2="72"/>
        {/* Hip width */}
        <line x1="72" y1="148" x2="128" y2="148"/>
      </g>

      {/* ── HEAD SLOT ── */}
      <g
        style={zoneStyle('head')}
        onClick={() => onSlotClick('head')}
        onMouseEnter={() => onSlotHover('head')}
        onMouseLeave={() => onSlotHover(null)}
      >
        {/* Helmet plate */}
        <path d="M 82 46 Q 82 18 100 18 Q 118 18 118 46 L 114 52 Q 100 58 86 52 Z"
              fill={slotColor('head') || 'var(--acc)'}
              stroke={slotColor('head') || 'var(--acc)'}
              strokeWidth="0.5"/>
        {/* Visor slit */}
        <path d="M 88 40 L 112 40" stroke="var(--bg0)" strokeWidth="1.5" opacity="0.6"/>
      </g>

      {/* ── TORSO SLOT ── */}
      <g
        style={zoneStyle('torso')}
        onClick={() => onSlotClick('torso')}
        onMouseEnter={() => onSlotHover('torso')}
        onMouseLeave={() => onSlotHover(null)}
      >
        <path d="M 72 68 L 60 72 L 58 120 L 72 128 L 72 148 L 128 148 L 128 128 L 142 120 L 140 72 L 128 68 Z"
              fill={slotColor('torso') || 'var(--acc)'}
              stroke={slotColor('torso') || 'var(--acc)'}
              strokeWidth="0.5"/>
        {/* Chest plate lines */}
        <path d="M 80 78 L 80 118 M 120 78 L 120 118 M 86 90 L 114 90"
              stroke="var(--bg0)" strokeWidth="0.5" opacity="0.4" fill="none"/>
      </g>

      {/* ── ARMS SLOT ── */}
      <g
        style={zoneStyle('arms')}
        onClick={() => onSlotClick('arms')}
        onMouseEnter={() => onSlotHover('arms')}
        onMouseLeave={() => onSlotHover(null)}
      >
        {/* Left gauntlet */}
        <path d="M 58 72 L 42 80 L 38 118 L 48 124 L 60 120 L 60 72 Z"
              fill={slotColor('arms') || 'var(--acc)'}
              stroke={slotColor('arms') || 'var(--acc)'}
              strokeWidth="0.5"/>
        {/* Right gauntlet */}
        <path d="M 142 72 L 158 80 L 162 118 L 152 124 L 140 120 L 140 72 Z"
              fill={slotColor('arms') || 'var(--acc)'}
              stroke={slotColor('arms') || 'var(--acc)'}
              strokeWidth="0.5"/>
      </g>

      {/* ── LEGS SLOT ── */}
      <g
        style={zoneStyle('legs')}
        onClick={() => onSlotClick('legs')}
        onMouseEnter={() => onSlotHover('legs')}
        onMouseLeave={() => onSlotHover(null)}
      >
        {/* Left leg */}
        <path d="M 72 148 L 66 152 L 64 210 L 78 216 L 90 210 L 90 148 Z"
              fill={slotColor('legs') || 'var(--acc)'}
              stroke={slotColor('legs') || 'var(--acc)'}
              strokeWidth="0.5"/>
        {/* Right leg */}
        <path d="M 128 148 L 134 152 L 136 210 L 122 216 L 110 210 L 110 148 Z"
              fill={slotColor('legs') || 'var(--acc)'}
              stroke={slotColor('legs') || 'var(--acc)'}
              strokeWidth="0.5"/>
      </g>

      {/* ── PRIMARY WEAPON (right hand) ── */}
      <g
        style={zoneStyle('primary')}
        onClick={() => onSlotClick('primary')}
        onMouseEnter={() => onSlotHover('primary')}
        onMouseLeave={() => onSlotHover(null)}
      >
        <path d="M 162 120 L 188 112 L 190 120 L 164 128 Z"
              fill={slotColor('primary') || 'var(--danger)'}
              stroke={slotColor('primary') || 'var(--danger)'}
              strokeWidth="0.5"/>
        <text x="188" y="118" fontSize="6" fill={slotColor('primary') || 'var(--danger)'}
              textAnchor="end" fontFamily="var(--font)" letterSpacing="0.06em" opacity="0.7">
          PRIMARY
        </text>
      </g>

      {/* ── SECONDARY WEAPON (left hip) ── */}
      <g
        style={zoneStyle('secondary')}
        onClick={() => onSlotClick('secondary')}
        onMouseEnter={() => onSlotHover('secondary')}
        onMouseLeave={() => onSlotHover(null)}
      >
        <path d="M 52 136 L 28 140 L 28 150 L 52 146 Z"
              fill={slotColor('secondary') || 'var(--danger)'}
              stroke={slotColor('secondary') || 'var(--danger)'}
              strokeWidth="0.5"/>
      </g>

      {/* ── SIDEARM (right hip) ── */}
      <g
        style={zoneStyle('sidearm')}
        onClick={() => onSlotClick('sidearm')}
        onMouseEnter={() => onSlotHover('sidearm')}
        onMouseLeave={() => onSlotHover(null)}
      >
        <path d="M 148 136 L 172 140 L 172 148 L 148 144 Z"
              fill={slotColor('sidearm') || 'var(--warn)'}
              stroke={slotColor('sidearm') || 'var(--warn)'}
              strokeWidth="0.5"/>
      </g>

      {/* ── BACKPACK ── */}
      <g
        style={zoneStyle('backpack')}
        onClick={() => onSlotClick('backpack')}
        onMouseEnter={() => onSlotHover('backpack')}
        onMouseLeave={() => onSlotHover(null)}
      >
        <rect x="84" y="72" width="32" height="44" rx="2"
              fill={slotColor('backpack') || 'var(--live)'}
              stroke={slotColor('backpack') || 'var(--live)'}
              strokeWidth="0.4" opacity="0.5"/>
        <text x="100" y="100" fontSize="6" fill={slotColor('backpack') || 'var(--live)'}
              textAnchor="middle" fontFamily="var(--font)" letterSpacing="0.06em" opacity="0.6">
          PACK
        </text>
      </g>

      {/* ── UTILITY 1 + 2 (belt) ── */}
      {['utility1', 'utility2'].map((sid, i) => (
        <g key={sid}
           style={zoneStyle(sid)}
           onClick={() => onSlotClick(sid)}
           onMouseEnter={() => onSlotHover(sid)}
           onMouseLeave={() => onSlotHover(null)}>
          <rect x={80 + i * 24} y="148" width="18" height="14" rx="1.5"
                fill={slotColor(sid) || 'var(--t1)'}
                stroke={slotColor(sid) || 'var(--t1)'}
                strokeWidth="0.4"/>
          <text x={89 + i * 24} y="157" fontSize="5.5"
                fill="var(--bg0)" textAnchor="middle" fontFamily="var(--font)" opacity="0.6">
            U{i + 1}
          </text>
        </g>
      ))}

      {/* Slot labels (active slot) */}
      {activeSlot && (
        <text x="100" y="250" textAnchor="middle" fill="var(--acc)" fontSize="8"
              fontFamily="var(--font)" letterSpacing="0.12em">
          {SLOTS.find(s => s.id === activeSlot)?.label}
        </text>
      )}
    </svg>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, value, previewValue, maxValue = 100, color, lowGood = false }) {
  const pct     = (value / maxValue) * 100;
  const prevPct = previewValue != null ? (previewValue / maxValue) * 100 : null;
  const delta   = prevPct != null ? prevPct - pct : null;

  let barColor = color;
  if (!color) {
    barColor = lowGood
      ? (pct > 66 ? 'var(--danger)' : pct > 33 ? 'var(--warn)' : 'var(--live)')
      : (pct > 66 ? 'var(--live)' : pct > 33 ? 'var(--warn)' : 'var(--danger)');
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {delta != null && Math.abs(delta) > 0.5 && (
            <span style={{
              fontSize: 8,
              color: (delta > 0) === !lowGood ? 'var(--live)' : 'var(--danger)',
            }}>
              {delta > 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(0)}
            </span>
          )}
          <span style={{ color: 'var(--t1)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
            {value.toFixed(0)}
          </span>
        </div>
      </div>
      <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3,
          transition: 'width 0.3s ease',
        }}/>
        {prevPct != null && (
          <div style={{
            position: 'absolute', top: 0, height: '100%',
            left: `${Math.min(pct, prevPct)}%`,
            width: `${Math.abs(prevPct - pct)}%`,
            background: delta > 0 === !lowGood ? 'rgba(46,219,122,0.35)' : 'rgba(232,82,82,0.35)',
            transition: 'all 0.3s ease',
          }}/>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FPSLoadout({ memberId, availableGear = [], onLoadoutSave }) {
  const [equipped,    setEquipped]    = useState({});           // slotId → item
  const [activeSlot,  setActiveSlot]  = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [hoveredGear, setHoveredGear] = useState(null);         // for preview
  const [savedLoadouts, setSavedLoadouts] = useState([]);       // [{name, equipped}, ...]
  const [gearQuery,   setGearQuery]   = useState('');
  // Challenge state
  const [challenge,   setChallenge]   = useState(null);         // { spec, timeLeft, score }
  const timerRef = useRef(null);

  useEffect(() => { ensureStyles(); }, []);

  const stats        = deriveStats(equipped);
  const previewStats = hoveredGear
    ? deriveStats({ ...equipped, [activeSlot]: hoveredGear })
    : null;

  // Filtered gear for active slot
  const slotDef = SLOTS.find(s => s.id === activeSlot);
  const filteredGear = availableGear.filter(g => {
    if (!g) return false;
    const matchType = !slotDef || !g.type || g.type === slotDef.type || true; // permissive
    const matchQ    = !gearQuery.trim() ||
      (g.name || g.item_name || '').toLowerCase().includes(gearQuery.toLowerCase());
    return matchType && matchQ;
  }).slice(0, 12);

  // Equip item
  const equipItem = useCallback((item) => {
    setEquipped(prev => ({ ...prev, [activeSlot]: item }));
    setActiveSlot(null);
    setHoveredGear(null);
    setGearQuery('');
  }, [activeSlot]);

  // Unequip slot
  const unequipSlot = useCallback((slotId) => {
    setEquipped(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  }, []);

  // Save loadout
  const saveLoadout = useCallback(() => {
    if (Object.keys(equipped).length === 0) return;
    const name = `LOADOUT ${savedLoadouts.length + 1}`;
    const loadout = { name, equipped: { ...equipped }, stats };
    const next = [...savedLoadouts, loadout].slice(-5);
    setSavedLoadouts(next);
    onLoadoutSave?.(loadout);
  }, [equipped, savedLoadouts, stats, onLoadoutSave]);

  // Challenge mode
  const startChallenge = useCallback(() => {
    const spec = CHALLENGE_SPECS[Math.floor(Math.random() * CHALLENGE_SPECS.length)];
    setEquipped({});
    setChallenge({ spec, timeLeft: 30, score: null });
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setChallenge(prev => {
        if (!prev || prev.score != null) { clearInterval(timerRef.current); return prev; }
        const tl = prev.timeLeft - 1;
        if (tl <= 0) {
          clearInterval(timerRef.current);
          return { ...prev, timeLeft: 0, score: 0 };
        }
        return { ...prev, timeLeft: tl };
      });
    }, 1000);
  }, []);

  const submitChallenge = useCallback(() => {
    if (!challenge) return;
    clearInterval(timerRef.current);
    const s    = deriveStats(equipped);
    const spec = challenge.spec.target;
    let score  = 0;
    if (spec.armor > 0)    score += s.armor    * spec.armor;
    if (spec.mobility > 0) score += s.mobility * spec.mobility;
    if (spec.weight < 0)   score += (100 - s.weight) * Math.abs(spec.weight);
    score = Math.round(Math.min(100, score));
    setChallenge(prev => ({ ...prev, score, timeLeft: 0 }));
  }, [challenge, equipped]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg0)' }}>

      {/* ── Left: saved loadouts + silhouette ── */}
      <div style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '0.5px solid var(--b1)', overflow: 'hidden',
      }}>
        {/* Saved loadout slots */}
        <div style={{
          padding: '8px 10px', borderBottom: '0.5px solid var(--b1)',
          display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0,
        }}>
          {savedLoadouts.map((lo, i) => (
            <button
              key={i}
              onClick={() => setEquipped({ ...lo.equipped })}
              title={lo.name}
              style={{
                flex: 1, padding: '4px 2px', cursor: 'pointer',
                background: 'var(--bg2)', border: '0.5px solid var(--b1)',
                borderRadius: 3, fontSize: 8, color: 'var(--t1)',
                letterSpacing: '0.06em', fontFamily: 'inherit',
              }}
            >
              {i + 1}
            </button>
          ))}
          {savedLoadouts.length < 5 && (
            <button
              onClick={saveLoadout}
              disabled={Object.keys(equipped).length === 0}
              style={{
                padding: '4px 6px', cursor: 'pointer',
                background: 'transparent', border: '0.5px solid var(--b1)',
                borderRadius: 3, color: 'var(--t2)', display: 'flex', alignItems: 'center',
              }}
              title="Save current loadout"
            >
              <Plus size={10}/>
            </button>
          )}
        </div>

        {/* Challenge banner */}
        {challenge && (
          <div style={{
            padding: '6px 10px', borderBottom: '0.5px solid var(--b1)',
            background: 'rgba(240,170,36,0.06)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Timer size={10} style={{ color: 'var(--warn)' }}/>
              <span style={{ color: 'var(--warn)', fontSize: 9, letterSpacing: '0.1em' }}>
                {challenge.spec.label}
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: 11, color: challenge.timeLeft < 10 ? 'var(--danger)' : 'var(--t0)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {challenge.timeLeft}s
              </span>
            </div>
            {challenge.score == null ? (
              <button
                onClick={submitChallenge}
                style={{
                  width: '100%', padding: '4px', cursor: 'pointer',
                  background: 'rgba(240,170,36,0.12)', border: '0.5px solid rgba(240,170,36,0.3)',
                  borderRadius: 3, color: 'var(--warn)', fontSize: 9,
                  letterSpacing: '0.1em', fontFamily: 'inherit',
                }}
              >
                SUBMIT LOADOUT
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--live)', fontSize: 12, fontWeight: 500 }}>
                SCORE: {challenge.score}/100
              </div>
            )}
          </div>
        )}

        {/* Silhouette */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <SilhouetteSVG
            equipped={equipped}
            activeSlot={activeSlot}
            hoveredSlot={hoveredSlot}
            onSlotClick={(sid) => {
              setActiveSlot(prev => prev === sid ? null : sid);
              setGearQuery('');
              setHoveredGear(null);
            }}
            onSlotHover={setHoveredSlot}
          />
        </div>

        {/* Slot list quick-access */}
        <div style={{ borderTop: '0.5px solid var(--b1)', padding: '6px 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {SLOTS.map(s => {
              const item = equipped[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSlot(prev => prev === s.id ? null : s.id);
                    setGearQuery('');
                  }}
                  style={{
                    fontSize: 7.5, padding: '2px 5px', cursor: 'pointer',
                    background: activeSlot === s.id ? 'var(--bg3)' : 'var(--bg2)',
                    border: `0.5px solid ${item ? 'var(--b2)' : 'var(--b1)'}`,
                    borderRadius: 3, color: item ? 'var(--t0)' : 'var(--t3)',
                    letterSpacing: '0.06em', fontFamily: 'inherit',
                    position: 'relative',
                  }}
                >
                  {s.label}
                  {item && (
                    <span
                      onClick={(e) => { e.stopPropagation(); unequipSlot(s.id); }}
                      style={{ marginLeft: 3, color: 'var(--danger)', fontSize: 8, cursor: 'pointer' }}
                    >×</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: stats + gear selector ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Stats panel */}
        <div style={{
          padding: '14px 16px', borderBottom: '0.5px solid var(--b1)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>LOADOUT STATS</span>
            <div style={{ flex: 1 }}/>
            <button
              onClick={startChallenge}
              style={{
                fontSize: 8, padding: '3px 8px', cursor: 'pointer',
                background: 'rgba(240,170,36,0.08)', border: '0.5px solid rgba(240,170,36,0.3)',
                borderRadius: 3, color: 'var(--warn)', letterSpacing: '0.1em',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Timer size={8}/> CHALLENGE
            </button>
          </div>
          <StatBar
            label="WEIGHT"
            value={stats.weight}
            previewValue={previewStats?.weight}
            color={null}
            lowGood
          />
          <StatBar
            label="ARMOR"
            value={stats.armor}
            previewValue={previewStats?.armor}
            color="var(--info)"
          />
          <StatBar
            label="MOBILITY"
            value={stats.mobility}
            previewValue={previewStats?.mobility}
            color="var(--live)"
          />
        </div>

        {/* Gear selector */}
        {activeSlot ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'fps-slide-in 0.18s ease-out',
          }}>
            {/* Selector header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0,
            }}>
              <span style={{ color: 'var(--t1)', fontSize: 9, letterSpacing: '0.1em' }}>
                {slotDef?.label} SELECTOR
              </span>
              <div style={{ flex: 1 }}/>
              <button
                onClick={() => { setActiveSlot(null); setHoveredGear(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex' }}
              >
                <X size={12}/>
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '8px 12px', flexShrink: 0, borderBottom: '0.5px solid var(--b0)' }}>
              <input
                className="nexus-input"
                placeholder="Search gear..."
                value={gearQuery}
                onChange={e => setGearQuery(e.target.value)}
                style={{ fontSize: 11 }}
              />
            </div>

            {/* Gear list */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
              {filteredGear.length === 0 ? (
                <div style={{ color: 'var(--t3)', fontSize: 11, textAlign: 'center', padding: 24 }}>
                  No gear available
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredGear.map((item, i) => {
                    const name    = item.name || item.item_name || `Item ${i}`;
                    const weight  = item.weight  || 0;
                    const armor   = item.armor   || 0;
                    const grade   = item.grade   || item.tier || 'C';
                    const gradeColor = grade === 'S' || grade === 'A' ? 'var(--live)' : grade === 'B' ? 'var(--info)' : 'var(--t2)';
                    return (
                      <div
                        key={item.id || i}
                        onClick={() => equipItem(item)}
                        onMouseEnter={() => setHoveredGear(item)}
                        onMouseLeave={() => setHoveredGear(null)}
                        style={{
                          padding: '8px 10px', cursor: 'pointer',
                          background: 'var(--bg2)',
                          border: '0.5px solid var(--b1)',
                          borderRadius: 4,
                          transition: 'border-color 0.12s',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--acc)'}
                        tabIndex={0}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--t0)', flex: 1 }}>{name}</span>
                          <span style={{
                            fontSize: 8, padding: '0 4px', borderRadius: 2,
                            border: `0.5px solid ${gradeColor}`, color: gradeColor,
                          }}>
                            {grade}
                          </span>
                        </div>
                        {/* Dominant stat bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.max(armor, weight)}%`,
                              background: armor > weight ? 'var(--info)' : 'var(--warn)',
                              borderRadius: 2,
                            }}/>
                          </div>
                          <span style={{ fontSize: 8, color: 'var(--t3)', minWidth: 24 }}>
                            {armor > 0 ? `A${armor}` : weight > 0 ? `W${weight}` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--t3)', fontSize: 11 }}>
              Click a slot on the silhouette to equip gear
            </span>
            <span style={{ color: 'var(--t3)', fontSize: 9, opacity: 0.6 }}>
              {Object.keys(equipped).length} / {SLOTS.length} slots equipped
            </span>
          </div>
        )}

        {/* Bottom action bar */}
        <div style={{
          padding: '8px 12px', borderTop: '0.5px solid var(--b1)',
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={saveLoadout}
            disabled={Object.keys(equipped).length === 0 || savedLoadouts.length >= 5}
            className="nexus-btn primary"
            style={{ justifyContent: 'center', flex: 1, gap: 5 }}
          >
            <Save size={11}/> SAVE LOADOUT
          </button>
          <button
            onClick={() => setEquipped({})}
            disabled={Object.keys(equipped).length === 0}
            className="nexus-btn"
            style={{ padding: '0 12px' }}
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}
