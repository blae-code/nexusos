import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { usePriceLookup, fmtAuec } from '@/core/data/usePriceLookup';

const REFINERY_METHODS = ['Dinyx Solventation', 'Ferron Exchange', 'Pyrometric Chromalysis'];
const REFINERY_CONFIG = {
  'Dinyx Solventation': { yieldMult: 1.08, costMult: 1.12, note: 'Best yield, highest refinery fee.' },
  'Ferron Exchange': { yieldMult: 1.03, costMult: 1.04, note: 'Balanced method — moderate cost and yield.' },
  'Pyrometric Chromalysis': { yieldMult: 1.1, costMult: 1.18, note: 'Highest margin when quality supports it.' },
};

const PRESETS = [
  { label: 'Solo Prospector', crew: 1, hours: 2, scu: 32 },
  { label: 'MOLE ×3', crew: 3, hours: 3, scu: 96 },
  { label: 'Org Orion', crew: 6, hours: 4, scu: 256 },
  { label: 'Vulture Salvage', crew: 1, hours: 2, scu: 24 },
];

const CUSTOM_TOOLTIP_STYLE = {
  background: 'var(--bg4)',
  border: '0.5px solid var(--b3)',
  borderRadius: 3,
  fontFamily: 'var(--font)',
  fontSize: 11,
  color: 'var(--t0)',
  padding: '8px 12px',
};

function CustomTooltip({ active = false, payload = [], label = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={CUSTOM_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()} aUEC
        </div>
      ))}
    </div>
  );
}

export default function ProfitCalc() {
  const { prices, loading: pricesLoading } = usePriceLookup();

  // Build materials list from live PriceSnapshot data
  const MATERIALS = useMemo(() => {
    const names = [];
    prices.forEach((v, key) => {
      if (v.buyAvg > 0 || v.sellAvg > 0 || v.bestBuy > 0 || v.bestSell > 0) {
        names.push(key);
      }
    });
    return names.sort();
  }, [prices]);

  const [material, setMaterial] = useState('');
  const [quality, setQuality] = useState(75);
  const [scu, setScu] = useState(32);
  const [crew, setCrew] = useState(1);
  const [hours, setHours] = useState(2);
  const [fuelCost, setFuelCost] = useState(5000);
  const [refMethod, setRefMethod] = useState(REFINERY_METHODS[0]);
  const [risk, setRisk] = useState(0);

  // Auto-select first material once prices load
  const resolvedMaterial = material || (MATERIALS.length > 0 ? MATERIALS[0] : '');

  // Pull live price data for the selected material
  const priceData = prices.get(resolvedMaterial.toLowerCase()) || null;
  const rawPrice = priceData ? (priceData.bestSell || priceData.sellAvg || 0) : 0;
  const refinedPrice = Math.round(rawPrice * 1.35); // refined typically 30-40% premium
  const craftedPrice = 0; // crafted items are separate blueprints, not raw mats
  const hasPriceData = rawPrice > 0;

  const methodConfig = REFINERY_CONFIG[refMethod] || REFINERY_CONFIG[REFINERY_METHODS[0]];
  const qualityMult = 0.7 + (quality / 100) * 0.6;
  const refineYield = 0.78 * methodConfig.yieldMult;
  const refineMethodCost = Math.round(scu * 180 * methodConfig.costMult);
  const riskPenalty = 1 - risk / 200;

  const grossRaw = Math.round(scu * rawPrice * qualityMult * riskPenalty);
  const grossRefined = refinedPrice ? Math.round(scu * refineYield * refinedPrice * qualityMult * riskPenalty - refineMethodCost) : 0;
  const grossCrafted = craftedPrice ? Math.round(scu * 0.6 * craftedPrice * qualityMult * riskPenalty - refineMethodCost * 1.3) : 0;

  const netRaw = Math.max(0, grossRaw - fuelCost);
  const netRefined = Math.max(0, grossRefined - fuelCost);
  const netCrafted = Math.max(0, grossCrafted - fuelCost);

  const perCrewRaw = crew > 0 ? Math.round(netRaw / crew) : 0;
  const perCrewRefined = crew > 0 ? Math.round(netRefined / crew) : 0;
  const perCrewCrafted = crew > 0 ? Math.round(netCrafted / crew) : 0;

  const perHourRaw = hours > 0 ? Math.round(netRaw / hours) : 0;
  const perHourRefined = hours > 0 ? Math.round(netRefined / hours) : 0;
  const perHourCrafted = hours > 0 ? Math.round(netCrafted / hours) : 0;

  const best = Math.max(netRaw, netRefined, netCrafted);
  const recommendation = !hasPriceData ? 'NO PRICE DATA'
    : best === netCrafted && netCrafted > 0 ? 'CRAFT & SELL'
    : best === netRefined && netRefined > 0 ? 'REFINE & SELL'
    : 'SELL RAW';

  const chartData = [
    { name: 'SELL RAW', gross: grossRaw, net: netRaw, perCrew: perCrewRaw },
    { name: 'REFINE & SELL', gross: grossRefined, net: netRefined, perCrew: perCrewRefined },
    ...(craftedPrice ? [{ name: 'CRAFT & SELL', gross: grossCrafted, net: netCrafted, perCrew: perCrewCrafted }] : []),
  ];

  const loadPreset = (p) => {
    setCrew(p.crew);
    setHours(p.hours);
    setScu(p.scu);
  };

  return (
    <div className="nexus-page-enter flex h-full" style={{ overflow: 'hidden' }}>
      {/* Left — inputs */}
      <div
        className="flex flex-col gap-4 flex-shrink-0 overflow-auto"
        style={{ width: 300, borderRight: '0.5px solid var(--b1)', padding: 16 }}
      >
        <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>CALC INPUTS</div>

        {/* Presets */}
        <div>
          <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>QUICK PRESETS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => loadPreset(p)} className="nexus-btn" style={{ padding: '5px 8px', fontSize: 10, justifyContent: 'center', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <span>{p.label}</span>
                <span style={{ color: 'var(--t2)', fontSize: 9 }}>{p.crew} crew · {p.hours}h</span>
              </button>
            ))}
          </div>
        </div>

        {/* Material */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>MATERIAL</label>
          {pricesLoading ? (
            <div className="nexus-loading-dots" style={{ color: 'var(--t2)', padding: '6px 0' }}><span /><span /><span /></div>
          ) : MATERIALS.length === 0 ? (
            <div style={{ color: 'var(--warn)', fontSize: 10, padding: '6px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={11} /> No price data — run UEX sync first
            </div>
          ) : (
            <select className="nexus-input" value={resolvedMaterial} onChange={e => setMaterial(e.target.value)} style={{ cursor: 'pointer' }}>
              {MATERIALS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          )}
          {hasPriceData && priceData && (
            <div style={{ fontSize: 9, color: 'var(--t2)', marginTop: 4, display: 'flex', gap: 8 }}>
              <span>Buy: <span style={{ color: 'var(--t1)' }}>{fmtAuec(priceData.bestBuy || priceData.buyAvg)}</span></span>
              <span>Sell: <span style={{ color: 'var(--t1)' }}>{fmtAuec(priceData.bestSell || priceData.sellAvg)}</span></span>
              {priceData.bestSellStation && <span style={{ color: 'var(--t3)' }}>@ {priceData.bestSellStation}</span>}
            </div>
          )}
        </div>

        {/* Quality */}
        <div>
          <div className="flex justify-between mb-2">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>QUALITY</label>
            <span style={{ color: quality >= 80 ? 'var(--live)' : 'var(--t1)', fontSize: 12, fontWeight: 600 }}>{quality}%</span>
          </div>
          <input type="range" min={0} max={100} value={quality} onChange={e => setQuality(+e.target.value)} style={{ width: '100%', accentColor: quality >= 80 ? 'var(--live)' : 'var(--acc)' }} />
        </div>

        {/* SCU */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>QUANTITY (SCU)</label>
          <input className="nexus-input" type="number" min={1} value={scu} onChange={e => setScu(+e.target.value)} />
        </div>

        {/* Crew */}
        <div>
          <div className="flex justify-between mb-2">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>CREW SIZE</label>
            <span style={{ color: 'var(--t1)', fontSize: 12 }}>{crew} members</span>
          </div>
          <input type="range" min={1} max={12} value={crew} onChange={e => setCrew(+e.target.value)} style={{ width: '100%', accentColor: 'var(--acc)' }} />
        </div>

        {/* Hours */}
        <div>
          <div className="flex justify-between mb-2">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>SESSION (HOURS)</label>
            <span style={{ color: 'var(--t1)', fontSize: 12 }}>{hours}h</span>
          </div>
          <input type="range" min={0.5} max={8} step={0.5} value={hours} onChange={e => setHours(+e.target.value)} style={{ width: '100%', accentColor: 'var(--acc)' }} />
        </div>

        {/* Refinery method */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>REFINERY METHOD</label>
          <select className="nexus-input" value={refMethod} onChange={e => setRefMethod(e.target.value)} style={{ cursor: 'pointer' }}>
            {REFINERY_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 6 }}>
            {methodConfig.note}
          </div>
        </div>

        {/* Fuel cost */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>FUEL COST (aUEC)</label>
          <input className="nexus-input" type="number" min={0} value={fuelCost} onChange={e => setFuelCost(+e.target.value)} />
        </div>

        {/* Risk */}
        <div>
          <div className="flex justify-between mb-2">
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>RISK FACTOR</label>
            <span style={{ color: risk > 50 ? 'var(--danger)' : risk > 25 ? 'var(--warn)' : 'var(--live)', fontSize: 12 }}>{risk}%</span>
          </div>
          <input type="range" min={0} max={100} value={risk} onChange={e => setRisk(+e.target.value)} style={{ width: '100%', accentColor: risk > 50 ? 'var(--danger)' : 'var(--warn)' }} />
        </div>
      </div>

      {/* Right — outputs */}
      <div className="flex flex-col gap-4 flex-1 min-w-0 overflow-auto p-5">
        {/* Strategy cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'SELL RAW', net: netRaw, perCrew: perCrewRaw, perHour: perHourRaw },
            { label: 'REFINE & SELL', net: netRefined, perCrew: perCrewRefined, perHour: perHourRefined },
            { label: 'CRAFT & SELL', net: netCrafted, perCrew: perCrewCrafted, perHour: perHourCrafted, disabled: !craftedPrice },
          ].map(s => (
            <div
              key={s.label}
              className="nexus-card"
              style={{
                padding: '14px',
                opacity: s.disabled ? 0.35 : 1,
                borderColor: recommendation === s.label ? 'var(--live-b)' : 'var(--b1)',
                position: 'relative',
              }}
            >
              {recommendation === s.label && (
                <div style={{ position: 'absolute', top: 8, right: 10 }}>
                  <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'var(--live-b)', background: 'var(--live-bg)', fontSize: 8 }}>BEST</span>
                </div>
              )}
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ color: recommendation === s.label ? 'var(--live)' : 'var(--t0)', fontSize: 18, fontWeight: 700 }}>
                {s.net.toLocaleString()}
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 6 }}>aUEC NET</div>
              <div style={{ borderTop: '0.5px solid var(--b1)', paddingTop: 8, display: 'flex', gap: 12 }}>
                <div>
                  <div style={{ color: 'var(--t2)', fontSize: 9 }}>/ CREW</div>
                  <div style={{ color: 'var(--t1)', fontSize: 12 }}>{s.perCrew.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--t2)', fontSize: 9 }}>/ HOUR</div>
                  <div style={{ color: 'var(--t1)', fontSize: 12 }}>{s.perHour.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="nexus-card" style={{ flex: 1, minHeight: 200 }}>
          <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 14 }}>STRATEGY COMPARISON</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--t2)', fontSize: 10, fontFamily: 'var(--font)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--t2)', fontSize: 10, fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="net" name="Net aUEC" radius={[3,3,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === recommendation ? 'var(--live)' : i === 1 ? 'var(--info)' : 'var(--acc)'} opacity={0.8}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendation strip */}
        <div style={{ background: !hasPriceData ? 'var(--warn-bg)' : 'var(--live-bg)', border: `0.5px solid ${!hasPriceData ? 'var(--warn-b)' : 'var(--live-b)'}`, borderRadius: 3, padding: '12px 16px' }}>
          <div className="flex items-center gap-2">
            {!hasPriceData ? <AlertTriangle size={13} style={{ color: 'var(--warn)' }} /> : <TrendingUp size={13} style={{ color: 'var(--live)' }} />}
            <span style={{ color: !hasPriceData ? 'var(--warn)' : 'var(--live)', fontSize: 10, letterSpacing: '0.1em' }}>RECOMMENDED STRATEGY</span>
          </div>
          <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{recommendation}</div>
          <div style={{ color: 'var(--t1)', fontSize: 11, marginTop: 2 }}>
            {!hasPriceData
              ? 'No live price data available for this material. Run a UEX price sync to populate PriceSnapshot records.'
              : quality >= 80
                ? `${resolvedMaterial} at ${quality}% quality is T2-eligible — ${recommendation === 'CRAFT & SELL' ? 'crafting maximises margin' : recommendation === 'REFINE & SELL' ? 'refining is optimal without blueprint access' : 'selling raw is fastest for this batch'}.`
                : `Quality below T2 threshold — ${recommendation === 'SELL RAW' ? 'sell raw to avoid refinery cost overhead' : 'refining still profitable at this quality'}.`}
          </div>
        </div>
      </div>
    </div>
  );
}