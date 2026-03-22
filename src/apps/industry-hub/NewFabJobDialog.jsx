/**
 * NewFabJobDialog — Select a blueprint, set quantity, preview material costs, and start a fabrication job.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { X, Search, AlertTriangle, Check } from 'lucide-react';

function norm(s) { return (s || '').toLowerCase().trim(); }

function MaterialCheck({ req, materials, quantity }) {
  const needed = (req.quantity_scu || 0) * quantity;
  const minQ = req.min_quality || 80;
  const stock = materials.filter(m => norm(m.material_name) === norm(req.material) && (m.quality_pct || 0) >= minQ && !m.is_archived);
  const have = stock.reduce((s, m) => s + (m.quantity_scu || 0), 0);
  const ok = have >= needed - 0.01;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
      background: ok ? 'rgba(74,232,48,0.06)' : 'rgba(192,57,43,0.08)',
      border: `0.5px solid ${ok ? 'rgba(74,232,48,0.15)' : 'rgba(192,57,43,0.2)'}`,
      borderRadius: 3, fontSize: 11,
    }}>
      <span style={{ color: 'var(--t0)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {req.material}
      </span>
      <span style={{ color: ok ? '#4AE830' : '#C0392B', fontFamily: 'monospace', fontSize: 10 }}>
        {have.toFixed(1)} / {needed.toFixed(1)} SCU
      </span>
      <span style={{ color: 'var(--t3)', fontSize: 9 }}>≥{minQ}%</span>
      {ok ? <Check size={11} style={{ color: '#4AE830' }} /> : <AlertTriangle size={11} style={{ color: '#C0392B' }} />}
    </div>
  );
}

export default function NewFabJobDialog({ blueprints, materials, onClose, onCreated }) {
  const [search, setSearch] = useState('');
  const [selectedBp, setSelectedBp] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return blueprints;
    const q = search.trim().toLowerCase();
    return blueprints.filter(bp => (bp.item_name || '').toLowerCase().includes(q));
  }, [blueprints, search]);

  const recipe = selectedBp?.recipe_materials || [];
  const craftTime = (selectedBp?.crafting_time_min || 30) * quantity;
  const totalOutput = (selectedBp?.output_quantity || 1) * quantity;

  const allMet = recipe.every(req => {
    const needed = (req.quantity_scu || 0) * quantity;
    const minQ = req.min_quality || selectedBp?.min_material_quality || 80;
    const have = materials
      .filter(m => norm(m.material_name) === norm(req.material) && (m.quality_pct || 0) >= minQ && !m.is_archived)
      .reduce((s, m) => s + (m.quantity_scu || 0), 0);
    return have >= needed - 0.01;
  });

  const handleStart = async () => {
    if (!selectedBp || !allMet) return;
    setSubmitting(true);
    setError('');
    try {
      await base44.functions.invoke('startFabricationJob', {
        blueprint_id: selectedBp.id,
        quantity,
        notes,
        fabricator_location: location || selectedBp.fabricator_location || '',
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to start job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg1)', border: '0.5px solid var(--b2)', borderRadius: 6,
        width: 520, maxHeight: '80vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid var(--b1)' }}>
          <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>START FABRICATION JOB</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Blueprint selector */}
          {!selectedBp ? (
            <>
              <div style={{ position: 'relative' }}>
                <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search blueprints..."
                  style={{
                    width: '100%', padding: '7px 10px 7px 26px',
                    background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 3,
                    color: 'var(--t0)', fontSize: 11, fontFamily: 'inherit',
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {filtered.map(bp => (
                  <button
                    key={bp.id}
                    onClick={() => { setSelectedBp(bp); setLocation(bp.fabricator_location || ''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3,
                      cursor: 'pointer', color: 'var(--t0)', fontSize: 11, fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1 }}>{bp.item_name}</span>
                    <span style={{ color: bp.tier === 'T2' ? 'var(--warn)' : 'var(--t2)', fontSize: 9 }}>{bp.tier}</span>
                    <span style={{ color: 'var(--t3)', fontSize: 9 }}>{bp.category}</span>
                    {(bp.recipe_materials || []).length === 0 && (
                      <span style={{ color: 'var(--danger)', fontSize: 8 }}>NO RECIPE</span>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ color: 'var(--t2)', fontSize: 11, textAlign: 'center', padding: 16 }}>
                    No blueprints found
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected blueprint header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{selectedBp.item_name}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10 }}>{selectedBp.tier} · {selectedBp.category}</div>
                </div>
                <button onClick={() => setSelectedBp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--info)', fontSize: 10, fontFamily: 'inherit' }}>
                  CHANGE
                </button>
              </div>

              {/* Quantity + Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>QUANTITY</label>
                  <input
                    type="number" min={1} max={50} value={quantity}
                    onChange={e => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 3,
                      color: 'var(--t0)', fontSize: 11, fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>FABRICATOR LOCATION</label>
                  <input
                    value={location} onChange={e => setLocation(e.target.value)}
                    placeholder={selectedBp.fabricator_location || 'Station name'}
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 3,
                      color: 'var(--t0)', fontSize: 11, fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Estimated time + output */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, flex: 1 }}>
                  <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 3 }}>EST. TIME</div>
                  <div style={{ color: 'var(--warn)', fontSize: 13, fontWeight: 600 }}>
                    {craftTime >= 60 ? `${Math.floor(craftTime / 60)}h ${craftTime % 60}m` : `${craftTime}m`}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, flex: 1 }}>
                  <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 3 }}>TOTAL OUTPUT</div>
                  <div style={{ color: 'var(--live)', fontSize: 13, fontWeight: 600 }}>×{totalOutput}</div>
                </div>
                {selectedBp.aUEC_value_est > 0 && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, flex: 1 }}>
                    <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.08em', marginBottom: 3 }}>EST. VALUE</div>
                    <div style={{ color: '#C8A84B', fontSize: 13, fontWeight: 600 }}>{(selectedBp.aUEC_value_est * totalOutput).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Material requirements */}
              {recipe.length > 0 && (
                <div>
                  <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 6 }}>MATERIAL REQUIREMENTS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {recipe.map((req, i) => (
                      <MaterialCheck key={i} req={req} materials={materials} quantity={quantity} />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>NOTES (OPTIONAL)</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes about this job..."
                  rows={2}
                  style={{
                    width: '100%', padding: '7px 10px',
                    background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 3,
                    color: 'var(--t0)', fontSize: 11, fontFamily: 'inherit', resize: 'vertical',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{ padding: '8px 12px', background: 'rgba(192,57,43,0.1)', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 3, color: '#C0392B', fontSize: 10 }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {selectedBp && (
          <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--b1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} className="nexus-btn" style={{ padding: '6px 14px', fontSize: 10 }}>CANCEL</button>
            <button
              onClick={handleStart}
              disabled={!allMet || submitting || recipe.length === 0}
              className="nexus-btn"
              style={{
                padding: '6px 14px', fontSize: 10,
                background: allMet && !submitting ? 'rgba(74,232,48,0.12)' : 'var(--bg3)',
                borderColor: allMet && !submitting ? 'rgba(74,232,48,0.3)' : 'var(--b2)',
                color: allMet && !submitting ? '#4AE830' : 'var(--t3)',
                cursor: allMet && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'STARTING...' : 'START FABRICATION'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}