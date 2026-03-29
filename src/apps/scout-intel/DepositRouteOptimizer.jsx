/**
 * DepositRouteOptimizer — calculates efficient routes between high-quality
 * mineral deposits, factoring in refueling stops and safety levels.
 */
import React, { useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Route, Fuel, AlertTriangle } from 'lucide-react';
import { qualityPercentFromRecord } from '@/core/data/quality';

const RISK_OPTIONS = [
  { value: 'LOW', label: 'LOW', color: 'var(--live)' },
  { value: 'MEDIUM', label: 'MED', color: 'var(--warn)' },
  { value: 'HIGH', label: 'HIGH', color: 'var(--danger)' },
];

const SHIP_CLASSES = ['MINER', 'HAULER', 'EXPLORER', 'OTHER'];

export default function DepositRouteOptimizer({ deposits, onRouteCalculated, onClose }) {
  const [minQuality, setMinQuality] = useState(60);
  const [maxRisk, setMaxRisk] = useState('MEDIUM');
  const [shipClass, setShipClass] = useState('MINER');
  const [includeRefueling, setIncludeRefueling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const eligibleDeposits = useMemo(() => {
    return (deposits || []).filter(d => {
      if (d.is_stale) return false;
      if (qualityPercentFromRecord(d) < minQuality) return false;
      const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, EXTREME: 4 };
      const maxRiskLevel = riskOrder[maxRisk] || 2;
      const depositRisk = riskOrder[d.risk_level] || 2;
      return depositRisk <= maxRiskLevel;
    });
  }, [deposits, minQuality, maxRisk]);

  const systemGroups = useMemo(() => {
    const groups = {};
    eligibleDeposits.forEach(d => {
      const sys = (d.system_name || 'UNKNOWN').toUpperCase();
      if (!groups[sys]) groups[sys] = [];
      groups[sys].push(d);
    });
    return groups;
  }, [eligibleDeposits]);

  const handleOptimize = async () => {
    if (eligibleDeposits.length < 2) {
      setError('Need at least 2 eligible deposits to plan a route.');
      return;
    }

    setLoading(true);
    setError(null);

    const depositSummaries = eligibleDeposits.map((d, i) => ({
      index: i + 1,
      material: d.material_name,
      system: d.system_name,
      location: d.location_detail,
      quality: qualityPercentFromRecord(d),
      volume: d.volume_estimate,
      risk: d.risk_level,
      reporter: d.reported_by_callsign,
    }));

    try {
      const result = await base44.functions.invoke('scoutRouteOptimizer', {
        deposits: depositSummaries,
        ship_class: shipClass,
        max_risk: maxRisk,
        include_refueling: includeRefueling,
        minimum_quality: minQuality,
      });

      onRouteCalculated(result);
    } catch (err) {
      setError(err?.message || 'Route optimization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Route size={12} style={{ color: '#C8A84B' }} />
          <span style={{ color: '#C8A84B', fontSize: 10, letterSpacing: '0.2em', fontWeight: 600 }}>
            ROUTE OPTIMIZER
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '3px 8px', fontSize: 9, cursor: 'pointer',
            background: 'var(--bg2)', border: '0.5px solid var(--b1)',
            borderRadius: 2, color: 'var(--t2)', fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>

      {/* Min Quality */}
      <div>
        <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
          MIN QUALITY — {minQuality}%
        </label>
        <input
          type="range" min={0} max={100} step={5}
          value={minQuality}
          onChange={e => setMinQuality(Number(e.target.value))}
          disabled={loading}
          style={{ width: '100%', accentColor: '#C8A84B' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--t3)', marginTop: 2 }}>
          <span>0%</span>
          <span style={{ color: minQuality >= 80 ? 'var(--live)' : 'var(--t3)' }}>T2 ≥ 80%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Max Risk */}
      <div>
        <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
          MAX RISK TOLERANCE
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          {RISK_OPTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => setMaxRisk(r.value)}
              disabled={loading}
              style={{
                flex: 1, padding: '6px 0', fontSize: 9, cursor: 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.08em',
                background: maxRisk === r.value ? 'rgba(200,170,100,0.08)' : 'var(--bg2)',
                border: `0.5px solid ${maxRisk === r.value ? r.color : 'var(--b1)'}`,
                borderRadius: 2,
                color: maxRisk === r.value ? r.color : 'var(--t2)',
                transition: 'all 150ms ease',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ship Class */}
      <div>
        <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
          SHIP CLASS
        </label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SHIP_CLASSES.map(sc => (
            <button
              key={sc}
              onClick={() => setShipClass(sc)}
              disabled={loading}
              style={{
                padding: '5px 8px', fontSize: 9, cursor: 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.06em',
                background: shipClass === sc ? 'var(--bg3)' : 'var(--bg2)',
                border: `0.5px solid ${shipClass === sc ? 'var(--b2)' : 'var(--b1)'}`,
                borderRadius: 2,
                color: shipClass === sc ? 'var(--t0)' : 'var(--t2)',
                transition: 'all 150ms ease',
              }}
            >
              {sc}
            </button>
          ))}
        </div>
      </div>

      {/* Refueling Toggle */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => !loading && setIncludeRefueling(!includeRefueling)}
      >
        <div style={{
          width: 28, height: 15, borderRadius: 8, position: 'relative',
          background: includeRefueling ? 'rgba(200,168,75,0.2)' : 'var(--bg3)',
          border: `0.5px solid ${includeRefueling ? '#C8A84B' : 'var(--b2)'}`,
          transition: 'all 150ms ease',
        }}>
          <div style={{
            position: 'absolute', top: 1.5, width: 12, height: 12,
            borderRadius: '50%',
            left: includeRefueling ? 14 : 1.5,
            background: includeRefueling ? '#C8A84B' : 'var(--t2)',
            transition: 'all 150ms ease',
          }} />
        </div>
        <Fuel size={11} style={{ color: includeRefueling ? '#C8A84B' : 'var(--t3)' }} />
        <span style={{ color: 'var(--t1)', fontSize: 10 }}>Include refueling stops</span>
      </div>

      {/* Eligible Preview */}
      <div style={{
        padding: '8px 10px', borderRadius: 2,
        background: 'var(--bg2)', border: '0.5px solid var(--b1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>ELIGIBLE DEPOSITS</span>
          <span style={{
            color: eligibleDeposits.length >= 2 ? '#C8A84B' : 'var(--danger)',
            fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
          }}>
            {eligibleDeposits.length}
          </span>
        </div>
        {Object.keys(systemGroups).length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {Object.entries(systemGroups).map(([sys, deps]) => (
              <span key={sys} style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.06em' }}>
                {sys}: {deps.length}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '8px 10px', borderRadius: 2,
          background: 'rgba(200,168,75,0.06)',
          border: '0.5px solid rgba(200,168,75,0.3)',
          color: '#C8A84B', fontSize: 9,
          display: 'flex', gap: 6, alignItems: 'flex-start',
        }}>
          <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Optimize Button */}
      <button
        onClick={handleOptimize}
        disabled={loading || eligibleDeposits.length < 2}
        style={{
          padding: '10px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: loading ? 'var(--bg3)' : '#C0392B',
          border: `0.5px solid ${loading ? 'var(--b2)' : '#C0392B'}`,
          borderRadius: 2,
          color: '#E8E4DC',
          opacity: loading || eligibleDeposits.length < 2 ? 0.5 : 1,
          transition: 'all 150ms ease',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="nexus-loading-dots"><span /><span /><span /></span>
            OPTIMIZING ROUTE
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Route size={12} />
            OPTIMIZE ROUTE
          </span>
        )}
      </button>
    </div>
  );
}
