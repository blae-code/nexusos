/**
 * MiningCircuitPlanner — Full mining circuit planner that aggregates scouted
 * deposits and suggests efficient circuits with fuel/time estimates per ship.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Route, AlertTriangle, ChevronDown } from 'lucide-react';
import CircuitResultsPanel from './CircuitResultsPanel';
import { SHIP_OPTIONS, useShipLoadouts } from './shipData';

// Ship data imported from shipData.js

const ORIGIN_STATIONS = [
  'CRU-L1', 'ARC-L1', 'HUR-L1', 'HUR-L2', 'MIC-L1',
  'Port Olisar', 'Everus Harbor', 'Baijini Point', 'Port Tressler',
  'New Babbage', 'Lorville', 'Area 18', 'Orison',
];

const RISK_OPTIONS = [
  { value: 'LOW', label: 'LOW', color: '#4A8C5C' },
  { value: 'MEDIUM', label: 'MEDIUM', color: '#C8A84B' },
  { value: 'HIGH', label: 'HIGH', color: '#C0392B' },
];

const SYSTEM_OPTIONS = ['ALL', 'STANTON', 'PYRO', 'NYX'];

const LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
  color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
};

function ShipCard({ ship, selected, onClick }) {
  const isActive = selected === ship.key;
  return (
    <button onClick={() => onClick(ship.key)} style={{
      padding: '10px 12px', borderRadius: 2, cursor: 'pointer',
      background: isActive ? 'rgba(192,57,43,0.08)' : '#0C0C0A',
      border: `0.5px solid ${isActive ? '#C0392B' : 'rgba(200,170,100,0.06)'}`,
      borderLeft: isActive ? '2px solid #C0392B' : '1px solid rgba(200,170,100,0.06)',
      fontFamily: "'Barlow Condensed', sans-serif",
      textAlign: 'left', width: '100%',
      transition: 'all 150ms',
    }}
    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#141410'; e.currentTarget.style.borderColor = 'rgba(200,170,100,0.15)'; } }}
    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = '#0C0C0A'; e.currentTarget.style.borderColor = 'rgba(200,170,100,0.06)'; } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#E8E4DC' : '#9A9488' }}>
            {ship.label}
          </span>
          {ship.fleetyards && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: 'rgba(122,174,204,0.10)', border: '0.5px solid rgba(122,174,204,0.25)', color: '#7AAECC', fontWeight: 600, letterSpacing: '0.04em' }}>FY</span>}
        </div>
        <span style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.08em' }}>{ship.class}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 9, color: '#5A5850' }}>
        <span>{ship.scu} SCU</span>
        <span>{ship.crew} crew</span>
      </div>
    </button>
  );
}

export default function MiningCircuitPlanner() {
  const { options: shipOptions, loadouts: shipLoadouts, loading: shipsLoading } = useShipLoadouts();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Config state
  const [shipLoadout, setShipLoadout] = useState('PROSPECTOR');
  const [originStation, setOriginStation] = useState('CRU-L1');
  const [minQuality, setMinQuality] = useState(40);
  const [maxRisk, setMaxRisk] = useState('HIGH');
  const [maxStops, setMaxStops] = useState(5);
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [includeReturn, setIncludeReturn] = useState(true);
  const [targetMaterials, setTargetMaterials] = useState([]);
  const [showShipPicker, setShowShipPicker] = useState(false);

  // Results state
  const [circuitResult, setCircuitResult] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.entities.ScoutDeposit.list('-reported_at', 200).then(d => {
      setDeposits(d || []);
      setLoading(false);
    });
  }, []);

  const availableMaterials = useMemo(() =>
    [...new Set((deposits || []).filter(d => !d.is_stale).map(d => d.material_name).filter(Boolean))].sort(),
  [deposits]);

  const eligibleCount = useMemo(() => {
    const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, EXTREME: 4 };
    return deposits.filter(d => {
      if (d.is_stale) return false;
      const q = d.quality_score != null ? d.quality_score / 10 : 50;
      if (q < minQuality) return false;
      if ((riskOrder[d.risk_level] || 2) > (riskOrder[maxRisk] || 3)) return false;
      if (systemFilter !== 'ALL' && (d.system_name || '').toUpperCase() !== systemFilter) return false;
      if (targetMaterials.length > 0 && !targetMaterials.includes(d.material_name)) return false;
      return true;
    }).length;
  }, [deposits, minQuality, maxRisk, systemFilter, targetMaterials]);

  const selectedShip = shipOptions.find(s => s.key === shipLoadout) || SHIP_OPTIONS.find(s => s.key === shipLoadout);

  const toggleMaterial = (mat) => {
    setTargetMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  const handlePlanCircuit = useCallback(async () => {
    setPlanning(true);
    setError(null);
    setCircuitResult(null);

    const res = await base44.functions.invoke('miningCircuitPlanner', {
      ship_loadout: shipLoadout,
      target_materials: targetMaterials,
      min_quality: minQuality,
      max_risk: maxRisk,
      max_stops: maxStops,
      origin_station: originStation,
      include_return: includeReturn,
      system_filter: systemFilter,
    });

    const data = res.data;
    if (data.error) {
      setError(data.error);
    } else {
      setCircuitResult(data);
    }
    setPlanning(false);
  }, [shipLoadout, targetMaterials, minQuality, maxRisk, maxStops, originStation, includeReturn, systemFilter]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  // If we have results, show them
  if (circuitResult) {
    return (
      <CircuitResultsPanel
        result={circuitResult}
        onBack={() => setCircuitResult(null)}
        onReplan={handlePlanCircuit}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'nexus-fade-in 200ms ease-out both' }}>
      {/* Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Route size={14} style={{ color: '#C0392B' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', letterSpacing: '0.06em' }}>
            MINING CIRCUIT PLANNER
          </span>
        </div>
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#9A9488', marginTop: 4 }}>
          Aggregate scouted deposits into an efficient mining circuit with fuel & time estimates
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* LEFT — Config */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ship Loadout */}
          <div>
            <span style={LABEL}>SHIP LOADOUT</span>
            <button onClick={() => setShowShipPicker(!showShipPicker)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 2, cursor: 'pointer',
              background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
              borderLeft: '2px solid #C0392B',
              fontFamily: "'Barlow Condensed', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textAlign: 'left',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E4DC' }}>{selectedShip?.label}</div>
                <div style={{ fontSize: 9, color: '#5A5850', marginTop: 2 }}>
                  {selectedShip?.scu} SCU · {selectedShip?.crew} crew · {selectedShip?.class}
                </div>
              </div>
              <ChevronDown size={12} style={{ color: '#5A5850', transform: showShipPicker ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </button>
            {showShipPicker && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 300, overflowY: 'auto', animation: 'nexus-fade-in 100ms ease-out both' }}>
                {shipsLoading ? (
                  <div className="nexus-loading-dots" style={{ color: '#9A9488', padding: 12, textAlign: 'center' }}><span /><span /><span /></div>
                ) : (
                  shipOptions.map(s => (
                    <ShipCard key={s.key} ship={s} selected={shipLoadout} onClick={(k) => { setShipLoadout(k); setShowShipPicker(false); }} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Origin Station */}
          <div>
            <span style={LABEL}>ORIGIN / RETURN STATION</span>
            <select value={originStation} onChange={e => setOriginStation(e.target.value)} style={{
              width: '100%', padding: '8px 12px', cursor: 'pointer',
              background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, color: '#E8E4DC', fontSize: 11,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              {ORIGIN_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* System Filter */}
          <div>
            <span style={LABEL}>SYSTEM</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {SYSTEM_OPTIONS.map(sys => (
                <button key={sys} onClick={() => setSystemFilter(sys)} style={{
                  flex: 1, padding: '6px 0', fontSize: 10, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  letterSpacing: '0.1em',
                  background: systemFilter === sys ? 'rgba(192,57,43,0.08)' : '#0C0C0A',
                  border: `0.5px solid ${systemFilter === sys ? '#C0392B' : 'rgba(200,170,100,0.06)'}`,
                  color: systemFilter === sys ? '#E8E4DC' : '#5A5850',
                  borderRadius: 2, transition: 'all 150ms',
                }}>{sys}</button>
              ))}
            </div>
          </div>

          {/* Quality + Risk */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>MIN QUALITY — {minQuality}%</span>
              <input type="range" min={0} max={100} step={5} value={minQuality}
                onChange={e => setMinQuality(Number(e.target.value))}
                style={{ width: '100%', accentColor: minQuality >= 80 ? '#4A8C5C' : '#C8A84B' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#3A3830', marginTop: 2 }}>
                <span>0%</span>
                <span style={{ color: minQuality >= 80 ? '#4A8C5C' : '#3A3830' }}>T2 ≥ 80%</span>
                <span>100%</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>MAX RISK</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {RISK_OPTIONS.map(r => (
                  <button key={r.value} onClick={() => setMaxRisk(r.value)} style={{
                    flex: 1, padding: '6px 0', fontSize: 9, cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    background: maxRisk === r.value ? `${r.color}15` : '#0C0C0A',
                    border: `0.5px solid ${maxRisk === r.value ? r.color : 'rgba(200,170,100,0.06)'}`,
                    color: maxRisk === r.value ? r.color : '#5A5850',
                    borderRadius: 2, transition: 'all 150ms',
                  }}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Max stops + Return toggle */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>MAX STOPS — {maxStops}</span>
              <input type="range" min={2} max={12} value={maxStops}
                onChange={e => setMaxStops(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C8A84B' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <div
                onClick={() => setIncludeReturn(!includeReturn)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              >
                <div style={{
                  width: 28, height: 15, borderRadius: 8, position: 'relative',
                  background: includeReturn ? 'rgba(74,140,92,0.2)' : '#1A1A18',
                  border: `0.5px solid ${includeReturn ? '#4A8C5C' : '#2A2A28'}`,
                  transition: 'all 150ms',
                }}>
                  <div style={{
                    position: 'absolute', top: 1.5, width: 12, height: 12,
                    borderRadius: '50%',
                    left: includeReturn ? 14 : 1.5,
                    background: includeReturn ? '#4A8C5C' : '#5A5850',
                    transition: 'all 150ms',
                  }} />
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488' }}>Return trip</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Materials + Preview */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Target Materials */}
          <div>
            <span style={LABEL}>TARGET MATERIALS <span style={{ color: '#3A3830', fontWeight: 400 }}>(empty = all)</span></span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {availableMaterials.map(mat => {
                const active = targetMaterials.includes(mat);
                return (
                  <button key={mat} onClick={() => toggleMaterial(mat)} style={{
                    padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                    letterSpacing: '0.06em',
                    background: active ? 'rgba(200,168,75,0.10)' : '#0C0C0A',
                    border: `0.5px solid ${active ? '#C8A84B' : 'rgba(200,170,100,0.06)'}`,
                    color: active ? '#C8A84B' : '#5A5850',
                    transition: 'all 150ms',
                  }}>{mat}</button>
                );
              })}
              {availableMaterials.length === 0 && (
                <span style={{ fontSize: 10, color: '#3A3830' }}>No active deposits found</span>
              )}
            </div>
          </div>

          {/* Eligible Preview */}
          <div style={{
            padding: '12px 14px', borderRadius: 2,
            background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: eligibleCount >= 2 ? '#4A8C5C' : '#C0392B',
              }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', letterSpacing: '0.1em' }}>
                ELIGIBLE DEPOSITS
              </span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700,
                color: eligibleCount >= 2 ? '#E8E4DC' : '#C0392B',
                marginLeft: 'auto',
              }}>{eligibleCount}</span>
            </div>
            <div style={{ fontSize: 9, color: '#5A5850', lineHeight: 1.5 }}>
              {eligibleCount < 2
                ? 'Need at least 2 eligible deposits. Try lowering filters.'
                : `${Math.min(eligibleCount, maxStops)} of ${eligibleCount} will be included (top by quality).`}
            </div>
          </div>

          {/* Ship summary */}
          {selectedShip && (
            <div style={{
              padding: '12px 14px', borderRadius: 2,
              background: '#0F0F0D', borderLeft: '2px solid #C0392B',
              border: '0.5px solid rgba(200,170,100,0.10)',
            }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', marginBottom: 6 }}>
                LOADOUT SUMMARY
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                {[
                  { label: 'SHIP', value: selectedShip.label },
                  { label: 'CLASS', value: selectedShip.class },
                  { label: 'CARGO', value: `${selectedShip.scu} SCU` },
                  { label: 'CREW', value: selectedShip.crew },
                ].map(s => (
                  <div key={s.label}>
                    <span style={{ fontSize: 8, color: '#3A3830', letterSpacing: '0.08em' }}>{s.label}</span>
                    <div style={{ fontSize: 10, color: '#E8E4DC', fontWeight: 500 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 2,
          background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.20)',
          borderLeft: '2px solid #C0392B',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={12} style={{ color: '#C0392B', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C0392B' }}>{error}</span>
        </div>
      )}

      {/* Plan button */}
      <button
        onClick={handlePlanCircuit}
        disabled={planning || eligibleCount < 2}
        style={{
          padding: '14px 20px', borderRadius: 2, cursor: planning || eligibleCount < 2 ? 'not-allowed' : 'pointer',
          background: planning ? '#1A1A18' : 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
          border: `1px solid ${planning ? '#2A2A28' : 'rgba(192,57,43,0.6)'}`,
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
          color: '#F0EDE5', letterSpacing: '0.16em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: planning || eligibleCount < 2 ? 0.5 : 1,
          boxShadow: planning || eligibleCount < 2 ? 'none' : '0 6px 20px rgba(192,57,43,0.3)',
          transition: 'all 250ms',
        }}
      >
        {planning ? (
          <><span className="nexus-loading-dots" style={{ color: '#F0EDE5' }}><span /><span /><span /></span> PLANNING CIRCUIT</>
        ) : (
          <><Route size={14} /> PLAN MINING CIRCUIT</>
        )}
      </button>
    </div>
  );
}