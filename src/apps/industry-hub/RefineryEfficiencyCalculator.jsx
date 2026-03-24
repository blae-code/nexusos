import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { AlertCircle, Zap } from 'lucide-react';

const REFINERY_METHODS = [
  { id: 'CORMACK',    label: 'Cormack — Balanced (75%)',        description: 'Standard balanced speed & yield' },
  { id: 'DINYX',     label: 'Dinyx Solventation — Fast (60%)', description: 'Fastest processing, lower output' },
  { id: 'ELECTRODES',label: 'Electrodes — High Yield (88%)',   description: 'High yield, slow process' },
  { id: 'FERRON',    label: 'Ferron Exchange — Max (92%)',      description: 'Maximum yield, slowest & costliest' },
  { id: 'GCCS',      label: 'GCCS — Gas (80%)',                description: 'Optimised for gas & volatile compounds' },
  { id: 'GRASE',     label: 'GRASE — Moderate (82%)',          description: 'Greycat automated, steady efficiency' },
  { id: 'PYROMETRIC',label: 'Pyrometric — Refractory (85%)',   description: 'High-temp for refractory ores' },
  { id: 'THERMONITE',label: 'Thermonite — Extreme (90%)',      description: 'Extreme heat, premium output' },
  { id: 'XCR',       label: 'XCR — Dense Ore (72%)',           description: 'High compression for dense minerals' },
];

export default function RefineryEfficiencyCalculator() {
  const [form, setForm] = useState({
    material_name: '',
    raw_scu: '',
    refinery_method: 'CORMACK',
    material_quality: 75,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCalculate = async () => {
    if (!form.material_name || !form.raw_scu) {
      setError('Enter material name and quantity');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await base44.functions.invoke('refineryEfficiencyCalculator', {
        material_name: form.material_name,
        raw_scu: Number(form.raw_scu),
        refinery_method: form.refinery_method,
        material_quality: Number(form.material_quality),
      });

      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const getProfitColor = () => {
    if (!result) return 'var(--t2)';
    return result.gross_profit > 0 ? 'var(--live)' : result.gross_profit === 0 ? 'var(--warn)' : 'var(--danger)';
  };

  return (
    <div className="nexus-card" style={{ padding: 16, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={11} style={{ color: 'var(--info)' }} />
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', fontWeight: 500 }}>
          REFINERY EFFICIENCY CALC
        </div>
      </div>

      {/* Input Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Material Name */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
            MATERIAL
          </label>
          <input
            type="text"
            value={form.material_name}
            onChange={e => set('material_name', e.target.value)}
            className="nexus-input"
            placeholder="e.g., Aluminum, Titanium"
            style={{ width: '100%' }}
          />
        </div>

        {/* Quantity */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
            RAW SCU
          </label>
          <input
            type="number"
            value={form.raw_scu}
            onChange={e => set('raw_scu', e.target.value)}
            className="nexus-input"
            min="0"
            step="10"
            placeholder="100"
            style={{ width: '100%' }}
          />
        </div>

        {/* Refinery Method */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
            METHOD
          </label>
          <select
            value={form.refinery_method}
            onChange={e => set('refinery_method', e.target.value)}
            className="nexus-input"
            style={{ width: '100%' }}
          >
            {REFINERY_METHODS.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quality */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
            QUALITY {form.material_quality}%
          </label>
          <input
            type="range"
            value={form.material_quality}
            onChange={e => set('material_quality', e.target.value)}
            min="0"
            max="100"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Method Descriptions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
        {REFINERY_METHODS.map(m => (
          <div
            key={m.id}
            style={{
              padding: '8px 10px',
              background: form.refinery_method === m.id ? 'var(--bg3)' : 'var(--bg2)',
              border: `0.5px solid ${form.refinery_method === m.id ? 'var(--b2)' : 'var(--b1)'}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 8,
              color: form.refinery_method === m.id ? 'var(--t0)' : 'var(--t2)',
              transition: 'all 0.12s',
            }}
            onClick={() => set('refinery_method', m.id)}
          >
            <div style={{ fontWeight: 500, marginBottom: 2 }}>{m.label.split(' —')[0]}</div>
            <div style={{ fontSize: 7, color: 'var(--t3)' }}>{m.description}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(var(--danger-rgb), 0.1)',
            border: '0.5px solid var(--danger)',
            borderRadius: 4,
            color: 'var(--danger)',
            fontSize: 9,
            display: 'flex',
            gap: 6,
            alignItems: 'flex-start',
            marginBottom: 12,
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={loading || !form.material_name || !form.raw_scu}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: !loading && form.material_name && form.raw_scu ? 'rgba(74,143,208,0.12)' : 'var(--bg3)',
          border: `0.5px solid ${!loading && form.material_name && form.raw_scu ? 'var(--info)' : 'var(--b2)'}`,
          borderRadius: 4,
          color: !loading && form.material_name && form.raw_scu ? 'var(--info)' : 'var(--t2)',
          fontSize: 10,
          letterSpacing: '0.08em',
          cursor: !loading && form.material_name && form.raw_scu ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          fontWeight: 500,
          opacity: form.material_name && form.raw_scu ? 1 : 0.5,
          transition: 'all 0.12s',
        }}
      >
        {loading ? 'CALCULATING...' : '→ ANALYSE EFFICIENCY'}
      </button>

      {/* Results */}
      {result && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderTop: '0.5px solid var(--b0)', paddingTop: 12 }} />

          {/* Yield and Output */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>YIELD %</div>
              <div style={{ color: 'var(--info)', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {result.yield_pct}%
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>OUTPUT</div>
              <div style={{ color: 'var(--live)', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {result.refined_scu} SCU
              </div>
            </div>
          </div>

          {/* Timing and Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>TIME</div>
              <div style={{ color: 'var(--warn)', fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {result.processing_minutes}m
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>COST</div>
              <div style={{ color: 'var(--t1)', fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {result.cost_aUEC.toLocaleString()} aUEC
              </div>
            </div>
          </div>

          {/* Profit Analysis */}
          <div style={{ background: getProfitColor() + '12', border: `0.5px solid ${getProfitColor()}40`, borderRadius: 6, padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>GROSS PROFIT</div>
                <div style={{ color: getProfitColor(), fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {result.gross_profit > 0 ? '+' : ''}{result.gross_profit.toLocaleString()} aUEC
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>ROI</div>
                <div style={{ color: getProfitColor(), fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {result.roi_percent > 0 ? '+' : ''}{result.roi_percent.toFixed(1)}%
                </div>
              </div>
            </div>

            {result.market_note && (
              <div style={{ fontSize: 8, color: 'var(--t2)', lineHeight: 1.4 }}>
                📊 {result.market_note}
              </div>
            )}
          </div>

          {/* Cost Breakdown */}
          <div style={{ fontSize: 8, color: 'var(--t2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={{ color: 'var(--t3)' }}>Input Cost</span>
              <div style={{ marginTop: 2 }}>{result.raw_input_cost.toLocaleString()} aUEC</div>
            </div>
            <div>
              <span style={{ color: 'var(--t3)' }}>Refining Cost</span>
              <div style={{ marginTop: 2 }}>{result.refining_cost.toLocaleString()} aUEC</div>
            </div>
            <div>
              <span style={{ color: 'var(--t3)' }}>Total Cost</span>
              <div style={{ marginTop: 2 }}>{result.total_cost.toLocaleString()} aUEC</div>
            </div>
            <div>
              <span style={{ color: 'var(--t3)' }}>Sell Value</span>
              <div style={{ marginTop: 2, color: 'var(--live)' }}>{result.refined_sell_value.toLocaleString()} aUEC</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
