import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Compass, AlertCircle } from 'lucide-react';

export default function RoutePlannerPanel({ materials, onRouteGenerated, onClose }) {
  const [targetMaterial, setTargetMaterial] = useState('');
  const [qualityThreshold, setQualityThreshold] = useState(60);
  const [riskTolerance, setRiskTolerance] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deposits, setDeposits] = useState([]);

  React.useEffect(() => {
    const loadDeposits = async () => {
      try {
        const allDeposits = await base44.entities.ScoutDeposit.list('-reported_at', 100);
        setDeposits(allDeposits || []);
      } catch (err) {
        console.error('Load deposits failed:', err);
      }
    };
    loadDeposits();
  }, []);

  const handleGenerate = async () => {
    if (!targetMaterial) {
      setError('Select a material');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('routePlanner', {
        target_material: targetMaterial,
        quality_threshold: qualityThreshold,
        risk_tolerance: riskTolerance,
        deposits,
      });

      if (response.data.error) {
        setError(response.data.error);
      } else {
        onRouteGenerated(response.data);
      }
    } catch (err) {
      setError(err.message || 'Route planning failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header */}
      <div>
        <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 8 }}>
          ROUTE PLANNER
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '5px 8px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            color: 'var(--t1)',
            fontSize: 9,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Material Selection */}
      <div>
        <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 4, letterSpacing: '0.08em' }}>
          TARGET MATERIAL
        </label>
        <select
          value={targetMaterial}
          onChange={(e) => setTargetMaterial(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 4,
            color: 'var(--t1)',
            fontSize: 10,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="">Select material...</option>
          {[...new Set(deposits.map(d => d.material_name).filter(Boolean))].map(mat => (
            <option key={mat} value={mat}>
              {mat}
            </option>
          ))}
        </select>
      </div>

      {/* Quality Threshold */}
      <div>
        <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 4, letterSpacing: '0.08em' }}>
          MIN QUALITY {qualityThreshold}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={qualityThreshold}
          onChange={(e) => setQualityThreshold(Number(e.target.value))}
          disabled={loading}
          style={{
            width: '100%',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Risk Tolerance */}
      <div>
        <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 4, letterSpacing: '0.08em' }}>
          RISK TOLERANCE
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {['LOW', 'MEDIUM', 'HIGH'].map(risk => (
            <button
              key={risk}
              onClick={() => setRiskTolerance(risk)}
              disabled={loading}
              style={{
                padding: '6px 8px',
                background: riskTolerance === risk ? 'var(--bg3)' : 'var(--bg2)',
                border: `0.5px solid ${riskTolerance === risk ? 'var(--b2)' : 'var(--b1)'}`,
                borderRadius: 4,
                color: 'var(--t1)',
                fontSize: 9,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(224, 72, 72, 0.1)',
            border: '0.5px solid var(--danger)',
            borderRadius: 4,
            color: 'var(--danger)',
            fontSize: 9,
            display: 'flex',
            gap: 6,
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !targetMaterial}
        style={{
          padding: '8px 12px',
          background: loading ? 'var(--bg3)' : 'rgba(39,201,106,0.15)',
          border: `0.5px solid ${loading ? 'var(--b2)' : 'var(--live)'}`,
          borderRadius: 4,
          color: 'var(--live)',
          fontSize: 10,
          letterSpacing: '0.08em',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          fontWeight: 500,
          opacity: loading || !targetMaterial ? 0.5 : 1,
          transition: 'all 0.12s',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="nexus-loading-dots"><span /></div>
            PLANNING
          </div>
        ) : (
          <>
            <Compass size={10} style={{ marginRight: 4, display: 'inline' }} />
            GENERATE ROUTE
          </>
        )}
      </button>
    </div>
  );
}
