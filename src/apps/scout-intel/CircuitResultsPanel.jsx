/**
 * CircuitResultsPanel — Displays the planned mining circuit with
 * per-leg travel/fuel breakdown, fuel gauge, and operational summary.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Fuel, Clock, Package, Shield, AlertTriangle, ChevronLeft, RefreshCw, Navigation, ChevronDown } from 'lucide-react';
import { SHIP_LOADOUTS, recalcCircuit, useShipLoadouts } from './shipData';

function fmtAuec(n) { return Math.round(n || 0).toLocaleString(); }

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background: '#0F0F0D', border: `0.5px solid ${color}22`,
      borderLeft: `2px solid ${color}`,
      borderRadius: 2, padding: '10px 12px', flex: 1, minWidth: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {Icon && <Icon size={10} style={{ color }} />}
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.12em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FuelGauge({ usagePct, needsRefuel }) {
  const clampedPct = Math.min(100, usagePct);
  const fillColor = clampedPct > 85 ? '#C0392B' : clampedPct > 60 ? '#C8A84B' : '#4A8C5C';
  return (
    <div style={{ padding: '12px 14px', borderRadius: 2, background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Fuel size={11} style={{ color: fillColor }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em' }}>FUEL USAGE</span>
        </div>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: fillColor }}>
          {clampedPct}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#1A1A18', overflow: 'hidden' }}>
        <div style={{
          width: `${clampedPct}%`, height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${fillColor}88, ${fillColor})`,
          transition: 'width 600ms ease-out',
        }} />
      </div>
      {needsRefuel && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
          padding: '4px 8px', borderRadius: 2,
          background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.15)',
        }}>
          <AlertTriangle size={9} style={{ color: '#C0392B' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#C0392B' }}>
            Refueling stop recommended — fuel usage exceeds 85%
          </span>
        </div>
      )}
    </div>
  );
}

function LegRow({ leg, index }) {
  const isTransit = leg.type === 'TRANSIT';
  const isMining = leg.type === 'MINING';

  if (isTransit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(122,174,204,0.10)', border: '0.5px solid rgba(122,174,204,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Navigation size={9} style={{ color: '#7AAECC' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#7AAECC' }}>
            {leg.from} → {leg.to} {leg.is_return ? '(return)' : ''}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 2, fontSize: 9, color: '#5A5850' }}>
            <span>{leg.distance_mkm} Mkm</span>
            <span>{leg.travel_minutes}m</span>
            <span style={{ color: '#C8A84B' }}>{leg.fuel_units} fuel</span>
          </div>
        </div>
      </div>
    );
  }

  if (isMining) {
    const RISK_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B', EXTREME: '#C0392B' };
    const riskColor = RISK_COLORS[leg.risk] || '#5A5850';
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 2, marginTop: 2, marginBottom: 2,
        background: '#0C0C0A', borderLeft: '2px solid #C0392B',
        border: '0.5px solid rgba(200,170,100,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(192,57,43,0.12)', border: '0.5px solid #C0392B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, color: '#E8E4DC',
          }}>{index}</div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, color: '#E8E4DC' }}>
            {leg.location}
          </span>
          <span style={{ fontSize: 8, color: '#5A5850', marginLeft: 'auto' }}>{leg.system}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 9 }}>
          <span style={{ color: '#C8A84B', fontWeight: 600 }}>{leg.material}</span>
          <span style={{ color: leg.quality_pct >= 80 ? '#4A8C5C' : '#9A9488' }}>{leg.quality_pct}% Q</span>
          <span style={{ color: '#5A5850' }}>{leg.volume || '—'} vol</span>
          <span style={{ color: riskColor }}>{leg.risk}</span>
          <span style={{ color: '#5A5850' }}>{leg.mining_minutes}m mining</span>
        </div>
        {leg.reported_by && (
          <div style={{ fontSize: 8, color: '#3A3830', marginTop: 4 }}>Scouted by {leg.reported_by}</div>
        )}
      </div>
    );
  }

  return null;
}

function ShipSelectorBar({ currentKey, onChange, loadouts, options }) {
  const [open, setOpen] = useState(false);
  const current = loadouts[currentKey] || SHIP_LOADOUTS[currentKey];
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '8px 12px', borderRadius: 2, cursor: 'pointer',
        background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.10)',
        borderLeft: '2px solid #C8A84B',
        fontFamily: "'Barlow Condensed', sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.12em' }}>REFERENCE SHIP</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#E8E4DC' }}>{current?.label || currentKey}</span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>{current?.scu} SCU · {current?.crew} crew</span>
        </div>
        <ChevronDown size={11} style={{ color: '#5A5850', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          marginTop: 4, borderRadius: 2, overflow: 'hidden',
          background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          animation: 'nexus-fade-in 100ms ease-out both',
        }}>
          {options.map(s => {
            const active = s.key === currentKey;
            return (
              <button key={s.key} onClick={() => { onChange(s.key); setOpen(false); }} style={{
                width: '100%', padding: '8px 12px', cursor: 'pointer',
                background: active ? 'rgba(192,57,43,0.08)' : 'transparent',
                border: 'none', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
                borderLeft: active ? '2px solid #C0392B' : '2px solid transparent',
                fontFamily: "'Barlow Condensed', sans-serif",
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(200,170,100,0.04)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#E8E4DC' : '#9A9488', flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 8, color: '#5A5850' }}>{s.class}</span>
                <span style={{ fontSize: 9, color: '#5A5850', minWidth: 50, textAlign: 'right' }}>{s.scu} SCU</span>
                <span style={{ fontSize: 9, color: '#5A5850', minWidth: 40, textAlign: 'right' }}>{s.crew} crew</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CircuitResultsPanel({ result, onBack, onReplan }) {
  const { loadouts: liveLoadouts, options: liveOptions } = useShipLoadouts();
  const originalShipKey = result?.ship?.loadout_key || 'PROSPECTOR';
  const [refShipKey, setRefShipKey] = useState(originalShipKey);
  useEffect(() => {
    setRefShipKey(originalShipKey);
  }, [originalShipKey]);

  const isOriginal = refShipKey === originalShipKey;
  const { legs, summary: s } = useMemo(() => {
    if (!result) {
      return { legs: [], summary: null };
    }

    const originalLegs = Array.isArray(result.legs) ? result.legs : [];
    if (isOriginal) return { legs: originalLegs, summary: result.summary };
    const refShip = liveLoadouts[refShipKey] || SHIP_LOADOUTS[refShipKey];
    if (!refShip) return { legs: originalLegs, summary: result.summary };
    return recalcCircuit(originalLegs, refShip, result.deposit_count || 0);
  }, [refShipKey, isOriginal, result, liveLoadouts]);

  if (!result) return null;

  const { circuit_name, ship, materials_targeted, risk_assessment, origin, deposit_count } = result;

  const refShipData = liveLoadouts[refShipKey] || SHIP_LOADOUTS[refShipKey] || ship;
  const highestRiskColor = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B', EXTREME: '#C0392B' };
  let miningIdx = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'nexus-fade-in 200ms ease-out both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{
          padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
          background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <ChevronLeft size={11} /> BACK
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onReplan} style={{
          padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
          background: 'rgba(200,170,100,0.04)', border: '0.5px solid rgba(200,170,100,0.10)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <RefreshCw size={9} /> REPLAN
        </button>
      </div>

      {/* Title */}
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', letterSpacing: '0.06em' }}>
          {circuit_name || 'Mining Circuit'}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 2 }}>
          {origin} · {result.deposit_count} deposits
          {!isOriginal && <span style={{ color: '#C8A84B', marginLeft: 6 }}>· Viewing as {refShipData.label}</span>}
        </div>
      </div>

      {/* Ship reference selector */}
      <ShipSelectorBar currentKey={refShipKey} onChange={setRefShipKey} loadouts={liveLoadouts} options={liveOptions} />

      {/* Primary stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard icon={Clock} label="TOTAL TIME" value={`${s.total_session_minutes}m`} sub={`${s.total_travel_minutes}m travel + ${s.total_mining_minutes}m mining`} color="#C8A84B" />
        <StatCard icon={Package} label="EST. YIELD" value={`${s.estimated_yield_scu} SCU`} sub={`of ${s.cargo_capacity_scu} SCU capacity`} color="#2edb7a" />
        <StatCard icon={Fuel} label="FUEL" value={`${s.total_fuel_units}`} sub={`of ${s.fuel_capacity} capacity`} color={s.fuel_usage_pct > 85 ? '#C0392B' : '#7AAECC'} />
      </div>

      {/* Fuel gauge */}
      <FuelGauge usagePct={s.fuel_usage_pct} needsRefuel={s.needs_refuel} />

      {/* Secondary stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 2, background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)' }}>
          <span style={{ fontSize: 8, color: '#3A3830', letterSpacing: '0.08em' }}>DISTANCE</span>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {s.total_distance_mkm} Mkm
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 2, background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)' }}>
          <span style={{ fontSize: 8, color: '#3A3830', letterSpacing: '0.08em' }}>AVG QUALITY</span>
          <div style={{ fontSize: 12, fontWeight: 600, color: s.avg_quality_pct >= 80 ? '#4A8C5C' : '#C8A84B', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {s.avg_quality_pct}%
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 2, background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)' }}>
          <span style={{ fontSize: 8, color: '#3A3830', letterSpacing: '0.08em' }}>CREW NEEDED</span>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {s.crew_required}
          </div>
        </div>
      </div>

      {/* Risk assessment */}
      <div style={{
        padding: '10px 12px', borderRadius: 2,
        background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)',
        borderLeft: `2px solid ${highestRiskColor[risk_assessment?.highest_risk] || '#5A5850'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Shield size={11} style={{ color: highestRiskColor[risk_assessment?.highest_risk] || '#5A5850' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.10em' }}>RISK ASSESSMENT</span>
        </div>
        <div style={{ fontSize: 10, color: '#E8E4DC' }}>
          Highest risk: <span style={{ color: highestRiskColor[risk_assessment?.highest_risk], fontWeight: 600 }}>{risk_assessment?.highest_risk}</span>
          {risk_assessment?.high_risk_stops > 0 && (
            <span style={{ color: '#C0392B', marginLeft: 8 }}>
              — {risk_assessment.high_risk_stops} high-risk stop{risk_assessment.high_risk_stops > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Materials targeted */}
      {materials_targeted?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {materials_targeted.map(mat => (
            <span key={mat} style={{
              padding: '3px 8px', borderRadius: 2, fontSize: 9,
              background: 'rgba(200,168,75,0.06)', border: '0.5px solid rgba(200,168,75,0.15)',
              color: '#C8A84B', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
            }}>{mat}</span>
          ))}
        </div>
      )}

      {/* Leg-by-leg breakdown */}
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.15em', marginBottom: 8, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
          CIRCUIT BREAKDOWN
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {legs.map((leg, i) => {
            if (leg.type === 'MINING') miningIdx++;
            return <LegRow key={i} leg={leg} index={leg.type === 'MINING' ? miningIdx : null} />;
          })}
        </div>
      </div>
    </div>
  );
}
