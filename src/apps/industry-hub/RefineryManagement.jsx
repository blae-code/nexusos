import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { AlertCircle, Zap } from 'lucide-react';

const REFINERY_METHODS = [
  { id: 'CORMACK', label: 'Cormack - Balanced', base_yield: 75 },
  { id: 'DINYX', label: 'Dinyx - High Speed', base_yield: 60 },
  { id: 'PLATINIZED', label: 'Platinized - Maximum Purity', base_yield: 85 },
];

const STATIONS = {
  'ARC-L1': { name: 'Arc L1', bonus: 5 },
  'LORVILLE': { name: 'Lorville', bonus: 3 },
  'NEW-BABBAGE': { name: 'New Babbage', bonus: 2 },
  'GRIM-HEX': { name: 'Grim Hex', bonus: 0 },
};

export default function RefineryManagement({ materials = [], callsign = '' }) {
  const [form, setForm] = useState({
    material_name: '',
    quantity_scu: '',
    quality_pct: 75,
    refinery_method: 'CORMACK',
    station: 'ARC-L1',
  });

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCalculateYield = async () => {
    if (!form.material_name || !form.quantity_scu) {
      setError('Select material and quantity');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const method = REFINERY_METHODS.find(m => m.id === form.refinery_method);
      const station = STATIONS[form.station];

      const res = await base44.functions.invoke('refineryCalculator', {
        material_name: form.material_name,
        quantity_scu: Number(form.quantity_scu),
        quality_pct: Number(form.quality_pct),
        refinery_method: form.refinery_method,
        station: form.station,
        base_yield_pct: method.base_yield,
        station_bonus_pct: station.bonus,
      });

      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setForecast(res.data);
      }
    } catch (err) {
      setError(err.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!forecast) return;

    setSubmitting(true);
    try {
      // Create refinery order
      const order = {
        material_name: form.material_name,
        quantity_scu: Number(form.quantity_scu),
        method: form.refinery_method,
        yield_pct: forecast.yield_pct,
        cost_aUEC: forecast.cost_aUEC,
        station: form.station,
        submitted_by_callsign: callsign || 'UNKNOWN',
        started_at: new Date().toISOString(),
        completes_at: forecast.completes_at,
        status: 'ACTIVE',
        source_type: 'MANUAL',
      };

      const orderRes = await base44.entities.RefineryOrder.create(order);

      // Create pending material asset for crafting queue
      const pendingMaterial = {
        material_name: form.material_name,
        quantity_scu: forecast.estimated_output_scu,
        quality_pct: forecast.quality_retained_pct,
        material_type: 'REFINED',
        location: form.station,
        logged_by_callsign: callsign || 'UNKNOWN',
        logged_by: callsign || 'UNKNOWN',
        source_type: 'REFINERY_ORDER',
        session_id: orderRes?.id,
        notes: `Refining via ${form.refinery_method} at ${form.station} - ETA ${Math.round(forecast.processing_minutes)}m`,
        logged_at: new Date().toISOString(),
      };

      await base44.entities.Material.create(pendingMaterial);

      // Reset form
      setForm({
        material_name: '',
        quantity_scu: '',
        quality_pct: 75,
        refinery_method: 'CORMACK',
        station: 'ARC-L1',
      });
      setForecast(null);
    } catch (err) {
      setError('Failed to submit order: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique material names from inventory
  const uniqueMaterials = [...new Set(materials.map(m => m.material_name))].sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px' }}>
      {/* Input Section */}
      <div className="nexus-card" style={{ padding: 16 }}>
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 12 }}>
          REFINERY BATCH INPUT
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Material Selection */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              RAW MATERIAL
            </label>
            <select
              value={form.material_name}
              onChange={e => set('material_name', e.target.value)}
              className="nexus-input"
              style={{ width: '100%' }}
            >
              <option value="">Select material...</option>
              {uniqueMaterials.map(mat => (
                <option key={mat} value={mat}>
                  {mat}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              QUANTITY (SCU)
            </label>
            <input
              type="number"
              value={form.quantity_scu}
              onChange={e => set('quantity_scu', e.target.value)}
              className="nexus-input"
              min="0"
              step="10"
              placeholder="100"
            />
          </div>

          {/* Quality */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              QUALITY {form.quality_pct}%
            </label>
            <input
              type="range"
              value={form.quality_pct}
              onChange={e => set('quality_pct', e.target.value)}
              min="0"
              max="100"
              style={{ width: '100%' }}
            />
          </div>

          {/* Method */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              REFINERY METHOD
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

          {/* Station */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>
              STATION
            </label>
            <select
              value={form.station}
              onChange={e => set('station', e.target.value)}
              className="nexus-input"
              style={{ width: '100%' }}
            >
              {Object.entries(STATIONS).map(([id, station]) => (
                <option key={id} value={id}>
                  {station.name} (+{station.bonus}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(var(--danger-rgb), 0.1)',
              border: '0.5px solid var(--danger)',
              borderRadius: 3,
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

        <button
          onClick={handleCalculateYield}
          disabled={loading || !form.material_name || !form.quantity_scu}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: loading ? 'var(--bg3)' : 'rgba(74,143,208,0.12)',
            border: `0.5px solid ${loading ? 'var(--b2)' : 'var(--info)'}`,
            borderRadius: 3,
            color: 'var(--info)',
            fontSize: 10,
            letterSpacing: '0.08em',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500,
            opacity: !form.material_name || !form.quantity_scu ? 0.4 : 1,
            transition: 'all 0.12s',
          }}
        >
          {loading ? 'CALCULATING...' : '→ FORECAST YIELD'}
        </button>
      </div>

      {/* Forecast Display */}
      {forecast && (
        <div className="nexus-card" style={{ padding: 16, background: 'var(--bg2)' }}>
          <div style={{ color: 'var(--live)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={11} /> YIELD FORECAST
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 3, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>INPUT</div>
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}>{forecast.input_scu} SCU</div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>@ {forecast.input_quality}%</div>
            </div>

            <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 3, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>EXPECTED OUTPUT</div>
              <div style={{ color: 'var(--live)', fontSize: 12, fontWeight: 500 }}>{forecast.estimated_output_scu.toFixed(1)} SCU</div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>{forecast.yield_pct}% yield</div>
            </div>

            <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 3, padding: '10px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 4 }}>PROCESSING</div>
              <div style={{ color: 'var(--info)', fontSize: 12, fontWeight: 500 }}>{Math.round(forecast.processing_minutes)}m</div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>Cost: {forecast.cost_aUEC.toLocaleString()} aUEC</div>
            </div>
          </div>

          {forecast.notes && (
            <div style={{ fontSize: 9, color: 'var(--t2)', lineHeight: 1.5, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 3, marginBottom: 12, borderLeft: '2px solid var(--info)' }}>
              {forecast.notes}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setForecast(null)}
              className="nexus-btn"
              style={{ padding: '6px 14px', fontSize: 10 }}
            >
              BACK
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="nexus-btn"
              style={{
                flex: 1,
                padding: '6px 14px',
                fontSize: 10,
                background: submitting ? 'var(--bg3)' : 'rgba(var(--live-rgb), 0.12)',
                borderColor: submitting ? 'var(--b2)' : 'var(--live)',
                color: submitting ? 'var(--t2)' : 'var(--live)',
              }}
            >
              {submitting ? 'SUBMITTING...' : '✓ SUBMIT BATCH'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}