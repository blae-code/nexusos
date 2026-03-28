/**
 * AddAssetForm — quick form to log a new personal asset.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Save, Camera } from 'lucide-react';
import OcrScanner from './OcrScanner';

const CATEGORIES = ['MATERIAL', 'FPS_WEAPON', 'FPS_ARMOR', 'SHIP_COMPONENT', 'CONSUMABLE', 'CURRENCY', 'OTHER'];
const CONDITIONS = ['PRISTINE', 'GOOD', 'DAMAGED'];

const LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};

export default function AddAssetForm({ callsign, onCreated, onCancel }) {
  const [form, setForm] = useState({
    item_name: '', category: 'MATERIAL', quantity: '1',
    quality_score: '', condition: 'GOOD',
    estimated_value_aUEC: '', location: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleOcrResults = (items) => {
    if (items.length > 0) {
      const first = items[0];
      set('item_name', first.item_name || '');
      set('category', first.category || 'MATERIAL');
      set('quantity', String(first.quantity || 1));
      if (first.quality_score) set('quality_score', String(first.quality_score));
      if (first.condition) set('condition', first.condition);
      if (first.location) set('location', first.location);
      setShowOcr(false);
      showToast('Form populated from screenshot', 'success');
    }
  };

  const handleSubmit = async () => {
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.PersonalAsset.create({
        owner_callsign: callsign,
        item_name: form.item_name.trim(),
        category: form.category,
        quantity: parseInt(form.quantity) || 1,
        quality_score: parseInt(form.quality_score) || undefined,
        condition: form.condition,
        estimated_value_aUEC: parseInt(form.estimated_value_aUEC) || undefined,
        location: form.location.trim() || undefined,
        notes: form.notes.trim() || undefined,
        logged_at: new Date().toISOString(),
      });
      showToast('Asset logged', 'success');
      onCreated();
    } catch (err) {
      showToast(err?.message || 'Failed to add asset', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid #C0392B',
      border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2, padding: 14,
      animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
        color: '#E8E4DC', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em',
      }}>LOG NEW ASSET</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 2 }}>
            <span style={LABEL}>ITEM NAME *</span>
            <input className="nexus-input" value={form.item_name} onChange={e => set('item_name', e.target.value)}
              placeholder="e.g. Quantanium, FS-9 LMG" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>CATEGORY</span>
            <select className="nexus-input" value={form.category} onChange={e => set('category', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 0.5 }}>
            <span style={LABEL}>QTY</span>
            <input className="nexus-input" type="number" min="1" value={form.quantity}
              onChange={e => set('quantity', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>QUALITY (1-1000)</span>
            <input className="nexus-input" type="number" min="1" max="1000" value={form.quality_score}
              onChange={e => set('quality_score', e.target.value)} placeholder="—"
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>CONDITION</span>
            <select className="nexus-input" value={form.condition} onChange={e => set('condition', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>EST. VALUE (aUEC)</span>
            <input className="nexus-input" type="number" min="0" value={form.estimated_value_aUEC}
              onChange={e => set('estimated_value_aUEC', e.target.value)} placeholder="0"
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>LOCATION</span>
            <input className="nexus-input" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. Lorville" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
        {/* OCR mini-scanner */}
      {showOcr && (
        <OcrScanner
          compact
          onResults={(items) => handleOcrResults(items)}
          onCancel={() => setShowOcr(false)}
        />
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setShowOcr(s => !s)} style={{
            padding: '7px 14px', background: showOcr ? 'rgba(142,68,173,0.12)' : '#141410',
            border: `0.5px solid ${showOcr ? 'rgba(142,68,173,0.4)' : 'rgba(200,170,100,0.10)'}`,
            borderRadius: 2,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: showOcr ? '#8E44AD' : '#9A9488', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><Camera size={10} /> {showOcr ? 'HIDE OCR' : 'SCAN'}</button>
          <button onClick={onCancel} style={{
            padding: '7px 14px', background: 'none',
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', cursor: 'pointer',
          }}>CANCEL</button>
          <button onClick={handleSubmit} disabled={!form.item_name.trim() || saving} style={{
            padding: '7px 16px', borderRadius: 2,
            background: !form.item_name.trim() || saving ? '#5A5850' : '#C0392B',
            border: 'none', color: '#E8E4DC',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.1em', cursor: !form.item_name.trim() || saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Save size={10} /> {saving ? 'SAVING...' : 'LOG ASSET'}
          </button>
        </div>
      </div>
    </div>
  );
}