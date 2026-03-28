/**
 * NewListingForm — Create a new material listing (buy or sell).
 */
import React, { useState, useMemo } from 'react';

const MAT_TYPES = ['CMR', 'CMP', 'CMS', 'CM_REFINED', 'ORE', 'CRAFTED_ITEM', 'COMPONENT', 'DISMANTLED_SCRAP', 'OTHER'];
const SYSTEMS = ['STANTON', 'PYRO', 'NYX'];

const LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
  color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase',
  display: 'block', marginBottom: 5,
};

export default function NewListingForm({ materials, blueprints, demandMaterials, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    listing_type: 'SELL',
    material_name: '',
    material_type: 'CM_REFINED',
    quantity_scu: '',
    quality_score: '',
    price_per_scu: '',
    total_price_aUEC: '',
    location: '',
    system: 'STANTON',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate total when per-SCU changes
  const handlePricePerScu = (v) => {
    const pps = Number(v) || 0;
    const qty = Number(form.quantity_scu) || 0;
    set('price_per_scu', v);
    if (pps > 0 && qty > 0) {
      setForm(f => ({ ...f, price_per_scu: v, total_price_aUEC: String(Math.round(pps * qty)) }));
    }
  };

  const handleQtyChange = (v) => {
    const qty = Number(v) || 0;
    const pps = Number(form.price_per_scu) || 0;
    set('quantity_scu', v);
    if (pps > 0 && qty > 0) {
      setForm(f => ({ ...f, quantity_scu: v, total_price_aUEC: String(Math.round(pps * qty)) }));
    }
  };

  // Known material names from inventory
  const knownMaterials = useMemo(() => {
    const names = new Set();
    (materials || []).forEach(m => m.material_name && names.add(m.material_name));
    (blueprints || []).forEach(b => b.item_name && names.add(b.item_name));
    return [...names].sort();
  }, [materials, blueprints]);

  const handleSubmit = async () => {
    if (!form.material_name.trim()) return;
    setSaving(true);
    await onSubmit({
      listing_type: form.listing_type,
      material_name: form.material_name.trim(),
      material_type: form.material_type,
      quantity_scu: Number(form.quantity_scu) || 0,
      quality_score: Number(form.quality_score) || 0,
      price_per_scu: Number(form.price_per_scu) || 0,
      total_price_aUEC: Number(form.total_price_aUEC) || 0,
      location: form.location.trim(),
      system: form.system,
      notes: form.notes.trim(),
    });
    setSaving(false);
  };

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.15)',
      borderLeft: '2px solid #C0392B',
      borderRadius: 2, padding: 18,
      animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
        color: '#E8E4DC', fontWeight: 600, marginBottom: 14,
        letterSpacing: '0.06em',
      }}>NEW LISTING</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Buy/Sell toggle */}
        <div>
          <span style={LABEL}>TYPE</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['SELL', 'BUY'].map(t => (
              <button key={t} onClick={() => set('listing_type', t)} style={{
                flex: 1, padding: '8px 0', borderRadius: 2, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em',
                background: form.listing_type === t
                  ? (t === 'SELL' ? 'rgba(46,219,122,0.08)' : 'rgba(200,168,75,0.08)')
                  : '#0C0C0A',
                border: `0.5px solid ${form.listing_type === t
                  ? (t === 'SELL' ? '#2edb7a' : '#C8A84B')
                  : 'rgba(200,170,100,0.06)'}`,
                color: form.listing_type === t
                  ? (t === 'SELL' ? '#2edb7a' : '#C8A84B')
                  : '#5A5850',
                transition: 'all 150ms',
              }}>{t === 'SELL' ? 'I\'M SELLING' : 'I WANT TO BUY'}</button>
            ))}
          </div>
        </div>

        {/* Material + Type */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <span style={LABEL}>MATERIAL / ITEM NAME *</span>
            <input
              list="mat-names"
              value={form.material_name}
              onChange={e => set('material_name', e.target.value)}
              placeholder="e.g. Quantanium, CMR, Hadron QD"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2, color: '#E8E4DC', fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            />
            <datalist id="mat-names">
              {knownMaterials.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>CATEGORY</span>
            <select value={form.material_type} onChange={e => set('material_type', e.target.value)} style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 12px',
              background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, color: '#E8E4DC', fontSize: 11,
              fontFamily: "'Barlow Condensed', sans-serif", cursor: 'pointer',
            }}>
              {MAT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Quantity + Quality */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>QUANTITY (SCU)</span>
            <input type="number" min={0} step="0.1" value={form.quantity_scu}
              onChange={e => handleQtyChange(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2, color: '#E8E4DC', fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>QUALITY (1-1000)</span>
            <input type="number" min={0} max={1000} value={form.quality_score}
              onChange={e => set('quality_score', e.target.value)}
              placeholder="0 = N/A"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2, color: '#E8E4DC', fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            />
            {Number(form.quality_score) >= 800 && (
              <div style={{ fontSize: 8, color: '#4A8C5C', marginTop: 2 }}>✓ T2 eligible</div>
            )}
          </div>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>PRICE PER SCU (aUEC)</span>
            <input type="number" min={0} value={form.price_per_scu}
              onChange={e => handlePricePerScu(e.target.value)}
              placeholder="Auto-calculates total"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2, color: '#E8E4DC', fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>TOTAL PRICE (aUEC)</span>
            <input type="number" min={0} value={form.total_price_aUEC}
              onChange={e => set('total_price_aUEC', e.target.value)}
              placeholder="Or set manually"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2, color: '#E8E4DC', fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            />
          </div>
        </div>

        {/* Location + System */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <span style={LABEL}>LOCATION</span>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. CRU-L1, New Babbage"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2, color: '#E8E4DC', fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>SYSTEM</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {SYSTEMS.map(s => (
                <button key={s} onClick={() => set('system', s)} style={{
                  flex: 1, padding: '6px 0', fontSize: 9, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  letterSpacing: '0.08em',
                  background: form.system === s ? 'rgba(192,57,43,0.08)' : '#0C0C0A',
                  border: `0.5px solid ${form.system === s ? '#C0392B' : 'rgba(200,170,100,0.06)'}`,
                  color: form.system === s ? '#E8E4DC' : '#5A5850',
                  borderRadius: 2, transition: 'all 150ms',
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <span style={LABEL}>NOTES</span>
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Optional details"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 12px',
              background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, color: '#E8E4DC', fontSize: 11,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          />
        </div>

        {/* Demand hint */}
        {demandMaterials?.length > 0 && form.listing_type === 'SELL' && (
          <div style={{
            padding: '6px 10px', borderRadius: 2,
            background: 'rgba(192,57,43,0.04)', border: '0.5px solid rgba(192,57,43,0.12)',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#C0392B', letterSpacing: '0.10em', marginBottom: 3 }}>
              CRAFT QUEUE NEEDS:
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {demandMaterials.slice(0, 5).map(d => (
                <button key={d.name} onClick={() => set('material_name', d.name)} style={{
                  padding: '2px 6px', borderRadius: 2, cursor: 'pointer',
                  background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.15)',
                  color: '#E8E4DC', fontSize: 8, fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {d.name} ({d.qty.toFixed(1)} SCU)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: '8px 14px',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#9A9488', cursor: 'pointer',
          }}>CANCEL</button>
          <button onClick={handleSubmit} disabled={saving || !form.material_name.trim()} style={{
            background: 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
            border: '1px solid rgba(192,57,43,0.6)',
            borderRadius: 2, padding: '8px 18px',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
            color: '#F0EDE5', fontWeight: 600, letterSpacing: '0.12em',
            cursor: saving || !form.material_name.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !form.material_name.trim() ? 0.5 : 1,
          }}>{saving ? 'POSTING...' : 'POST LISTING →'}</button>
        </div>
      </div>
    </div>
  );
}