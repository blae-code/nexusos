import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Zap, AlertTriangle } from 'lucide-react';

const RISK_OPTIONS = [
  { value: 'LOW', label: 'LOW RISK', color: 'var(--live)' },
  { value: 'MEDIUM', label: 'MEDIUM RISK', color: 'var(--warn)' },
  { value: 'HIGH', label: 'HIGH RISK', color: 'var(--warn)' },
  { value: 'EXTREME', label: 'EXTREME RISK', color: 'var(--danger)' },
];

export default function RoutePlannerPanel({ materials, onRouteGenerated, onClose }) {
  const [targetMaterial, setTargetMaterial] = useState('');
  const [qualityThreshold, setQualityThreshold] = useState(70);
  const [riskTolerance, setRiskTolerance] = useState('MEDIUM');
  const [maxDeposits, setMaxDeposits] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!targetMaterial.trim()) {
      setError('Select a material');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await base44.functions.invoke('routePlanner', {
        target_material: targetMaterial,
        quality_threshold: qualityThreshold,
        risk_tolerance: riskTolerance,
        max_deposits: maxDeposits,
      });

      if (res.data?.success) {
        onRouteGenerated(res.data);
      } else {
        setError(res.data?.message || 'Route planning failed');
      }
    } catch (err) {
      setError(err.message || 'Error generating route');
    }

    setLoading(false);
  };

  // Extract unique materials from deposits
  const uniqueMaterials = [
    ...new Set((materials || []).map(m => m.material_name).filter(Boolean)),
  ];

  const inputStyle = {
    width: '100%',
    background: 'var(--bg3)',
    border: '0.5px solid var(--b2)',
    borderRadius: 5,
    color: 'var(--t0)',
    fontFamily: 'inherit',
    fontSize: 11,
    padding: '7px 10px',
    outline: 'none',
  };

  const labelStyle = {
    color: 'var(--t2)',
    fontSize: 9,
    letterSpacing: '0.12em',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 8,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--info)',
          fontSize: 10,
          letterSpacing: '0.1em',
        }}
      >
        <Zap size={11} />
        ROUTE PLANNER
      </div>

      {/* Material selection */}
      <div>
        <label style={labelStyle}>TARGET MATERIAL</label>
        <div style={{ position: 'relative' }}>
          <Search
            size={11}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--t3)',
              pointerEvents: 'none',
            }}
          />
          <select
            style={{
              ...inputStyle,
              paddingLeft: 30,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%238890a8' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: 28,
            }}
            value={targetMaterial}
            onChange={e => setTargetMaterial(e.target.value)}
          >
            <option value="">Select material...</option>
            {uniqueMaterials.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quality threshold */}
      <div>
        <label style={labelStyle}>MIN QUALITY %</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={qualityThreshold}
            onChange={e => setQualityThreshold(Number(e.target.value))}
            style={{
              flex: 1,
              height: 3,
              background: 'var(--bg3)',
              border: '0.5px solid var(--b2)',
              borderRadius: 2,
              cursor: 'pointer',
              accentColor: 'var(--info)',
            }}
          />
          <span
            style={{
              color: 'var(--t1)',
              fontSize: 10,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 40,
              textAlign: 'right',
            }}
          >
            {qualityThreshold}%
          </span>
        </div>
      </div>

      {/* Risk tolerance */}
      <div>
        <label style={labelStyle}>RISK TOLERANCE</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {RISK_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRiskTolerance(opt.value)}
              style={{
                flex: '1 1 90px',
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 9,
                letterSpacing: '0.08em',
                background:
                  riskTolerance === opt.value
                    ? opt.color + '15'
                    : 'var(--bg1)',
                border: `0.5px solid ${
                  riskTolerance === opt.value ? opt.color + '40' : 'var(--b1)'
                }`,
                color:
                  riskTolerance === opt.value ? opt.color : 'var(--t2)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max deposits */}
      <div>
        <label style={labelStyle}>MAX STOPS</label>
        <input
          type="number"
          min={1}
          max={10}
          value={maxDeposits}
          onChange={e => setMaxDeposits(Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(224,72,72,0.08)',
            border: '0.5px solid rgba(224,72,72,0.25)',
            borderRadius: 5,
            padding: '6px 10px',
            color: 'var(--danger)',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <AlertTriangle size={10} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onClose}
          className="nexus-btn"
          style={{ padding: '6px 12px', fontSize: 9 }}
        >
          CLOSE
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading || !targetMaterial}
          style={{
            flex: 1,
            padding: '6px 0',
            borderRadius: 5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 10,
            background: 'rgba(74,143,208,0.1)',
            border: '0.5px solid rgba(74,143,208,0.3)',
            color: 'var(--info)',
            opacity: loading || !targetMaterial ? 0.5 : 1,
          }}
        >
          {loading ? 'PLANNING ROUTE...' : '→ GENERATE ROUTE'}
        </button>
      </div>
    </div>
  );
}