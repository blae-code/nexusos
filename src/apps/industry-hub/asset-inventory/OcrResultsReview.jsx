/**
 * OcrResultsReview — review and confirm OCR-extracted items before saving.
 * Items are fully editable inline before commit.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Check, X, Save, Trash2, Edit3 } from 'lucide-react';

const CAT_COLORS = {
  MATERIAL: '#4A8C5C', FPS_WEAPON: '#C0392B', FPS_ARMOR: '#3498DB',
  SHIP_COMPONENT: '#8E44AD', CONSUMABLE: '#E8A020', CURRENCY: '#C8A84B', OTHER: '#5A5850',
};

const CATEGORIES = ['MATERIAL', 'FPS_WEAPON', 'FPS_ARMOR', 'SHIP_COMPONENT', 'CONSUMABLE', 'CURRENCY', 'OTHER'];

function ItemRow({ item, index, onToggle, onRemove, onUpdate }) {
  const cc = CAT_COLORS[item.category] || '#5A5850';

  const fieldInput = {
    background: 'none', border: 'none', outline: 'none', padding: 0,
    color: item._excluded ? '#5A5850' : '#E8E4DC',
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
    width: '100%', cursor: item._excluded ? 'default' : 'text',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
      background: item._excluded ? '#0F0F0D' : '#141410',
      opacity: item._excluded ? 0.4 : 1,
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      {/* Include toggle */}
      <button onClick={() => onToggle(index)} style={{
        width: 16, height: 16, borderRadius: 2, flexShrink: 0,
        background: item._excluded ? '#1A1A16' : `${cc}20`,
        border: `0.5px solid ${item._excluded ? '#5A5850' : cc}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!item._excluded && <Check size={10} style={{ color: cc }} />}
      </button>

      {/* Category select */}
      <select
        value={item.category || 'OTHER'}
        onChange={e => onUpdate(index, 'category', e.target.value)}
        disabled={item._excluded}
        style={{
          fontSize: 8, fontWeight: 600, padding: '2px 4px', borderRadius: 2,
          color: cc, background: `${cc}15`, border: `0.5px solid ${cc}40`,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
          cursor: item._excluded ? 'default' : 'pointer', outline: 'none',
          flexShrink: 0, maxWidth: 90,
        }}>
        {CATEGORIES.map(c => (
          <option key={c} value={c} style={{ background: '#141410', color: CAT_COLORS[c] || '#5A5850' }}>{c}</option>
        ))}
      </select>

      {/* Name + location */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          style={fieldInput}
          value={item.item_name || ''}
          onChange={e => onUpdate(index, 'item_name', e.target.value)}
          disabled={item._excluded}
          placeholder="Item name..."
        />
        <input
          style={{ ...fieldInput, fontSize: 8, color: '#5A5850', fontWeight: 400 }}
          value={item.location || ''}
          onChange={e => onUpdate(index, 'location', e.target.value)}
          disabled={item._excluded}
          placeholder="location..."
        />
      </div>

      {/* Quantity */}
      <input
        type="number"
        min="1"
        style={{
          ...fieldInput, width: 44, textAlign: 'right',
          color: item._excluded ? '#5A5850' : '#C8A84B', fontSize: 10,
        }}
        value={item.quantity || 1}
        onChange={e => onUpdate(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
        disabled={item._excluded}
      />

      {/* Quality */}
      <input
        type="number"
        min="1"
        max="1000"
        style={{
          ...fieldInput, width: 38, textAlign: 'right',
          color: (item.quality_score >= 800) ? '#C8A84B' : '#5A5850', fontSize: 9,
        }}
        value={item.quality_score || ''}
        onChange={e => {
          const v = parseInt(e.target.value);
          onUpdate(index, 'quality_score', v > 0 ? v : null);
        }}
        disabled={item._excluded}
        placeholder="Q…"
      />

      {/* Remove */}
      <button onClick={() => onRemove(index)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2, flexShrink: 0,
      }}><Trash2 size={10} /></button>
    </div>
  );
}

export default function OcrResultsReview({ items, mode, callsign, onSaved, onCancel }) {
  const [reviewItems, setReviewItems] = useState(
    items.map(item => ({ ...item, _excluded: false }))
  );
  const [saving, setSaving] = useState(false);

  const toggleItem = (i) => {
    setReviewItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, _excluded: !item._excluded } : item
    ));
  };

  const removeItem = (i) => {
    setReviewItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i, field, value) => {
    setReviewItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ));
  };

  const included = reviewItems.filter(i => !i._excluded);

  const handleSave = async () => {
    if (included.length === 0) return;
    setSaving(true);
    let saved = 0;
    let failed = 0;
    try {
      await Promise.all(included.map(async (item) => {
        try {
          await base44.entities.PersonalAsset.create({
            owner_callsign: callsign,
            item_name: (item.item_name || '').trim() || 'Unknown Item',
            category: item.category || 'OTHER',
            quantity: item.quantity || 1,
            quality_score: item.quality_score || undefined,
            condition: item.condition || 'GOOD',
            estimated_value_aUEC: undefined,
            location: item.location || undefined,
            notes: [
              item.buy_price ? `Buy: ${item.buy_price}` : '',
              item.sell_price ? `Sell: ${item.sell_price}` : '',
              item.notes || '',
            ].filter(Boolean).join(' · ') || 'OCR imported',
            logged_at: new Date().toISOString(),
            is_contributed: false,
          });
          saved++;
        } catch {
          failed++;
        }
      }));

      if (failed === 0) {
        showToast(`${saved} asset${saved !== 1 ? 's' : ''} saved to inventory`, 'success');
        onSaved();
      } else if (saved > 0) {
        showToast(`${saved} saved, ${failed} failed — check connection`, 'warning');
        onSaved();
      } else {
        showToast('Save failed — check your connection', 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to save assets', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid #8E44AD',
      border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
      overflow: 'hidden', animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', background: '#141410',
        borderBottom: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Edit3 size={11} style={{ color: '#8E44AD' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 12, color: '#E8E4DC', letterSpacing: '0.06em',
          }}>REVIEW EXTRACTED ITEMS</span>
          <span style={{ fontSize: 9, color: '#5A5850' }}>
            {included.length} of {reviewItems.length} selected · click fields to edit
          </span>
        </div>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
        }}><X size={12} /></button>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        background: '#0F0F0D',
      }}>
        <div style={{ width: 16, flexShrink: 0 }} />
        <div style={{ width: 90, flexShrink: 0, fontSize: 8, color: '#5A5850', letterSpacing: '0.1em' }}>CAT</div>
        <div style={{ flex: 1, fontSize: 8, color: '#5A5850', letterSpacing: '0.1em' }}>ITEM NAME / LOCATION</div>
        <div style={{ width: 44, fontSize: 8, color: '#5A5850', textAlign: 'right', letterSpacing: '0.1em' }}>QTY</div>
        <div style={{ width: 38, fontSize: 8, color: '#5A5850', textAlign: 'right', letterSpacing: '0.1em' }}>QUAL</div>
        <div style={{ width: 18, flexShrink: 0 }} />
      </div>

      {/* Items list */}
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        {reviewItems.map((item, i) => (
          <ItemRow
            key={i}
            item={item}
            index={i}
            onToggle={toggleItem}
            onRemove={removeItem}
            onUpdate={updateItem}
          />
        ))}
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 14px', borderTop: '0.5px solid rgba(200,170,100,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onCancel} style={{
          padding: '6px 14px', background: 'none',
          border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488', cursor: 'pointer',
        }}>CANCEL</button>
        <button onClick={handleSave} disabled={included.length === 0 || saving} style={{
          padding: '8px 18px', borderRadius: 2,
          background: included.length === 0 || saving ? '#5A5850' : '#8E44AD',
          border: 'none', color: '#E8E4DC',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', cursor: included.length === 0 || saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Save size={11} /> {saving ? 'SAVING...' : `SAVE ${included.length} ITEM${included.length !== 1 ? 'S' : ''}`}
        </button>
      </div>
    </div>
  );
}
