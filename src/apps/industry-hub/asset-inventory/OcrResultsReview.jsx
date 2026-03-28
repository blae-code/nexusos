/**
 * OcrResultsReview — review and confirm OCR-extracted items before saving.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Check, X, Save, Trash2, Edit3 } from 'lucide-react';

const CAT_COLORS = {
  MATERIAL: '#4A8C5C', FPS_WEAPON: '#C0392B', FPS_ARMOR: '#3498DB',
  SHIP_COMPONENT: '#8E44AD', CONSUMABLE: '#E8A020', CURRENCY: '#C8A84B', OTHER: '#5A5850',
};

function ItemRow({ item, index, onToggle, onRemove, onEdit }) {
  const cc = CAT_COLORS[item.category] || '#5A5850';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
      background: item._excluded ? '#0F0F0D' : '#141410',
      opacity: item._excluded ? 0.4 : 1,
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'opacity 150ms',
    }}>
      <button onClick={() => onToggle(index)} style={{
        width: 16, height: 16, borderRadius: 2, flexShrink: 0,
        background: item._excluded ? '#1A1A16' : `${cc}20`,
        border: `0.5px solid ${item._excluded ? '#5A5850' : cc}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!item._excluded && <Check size={10} style={{ color: cc }} />}
      </button>

      <span style={{
        fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 2,
        color: cc, background: `${cc}15`, minWidth: 45, textAlign: 'center',
        flexShrink: 0,
      }}>{item.category}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
          color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.item_name}</div>
        {item.location && <div style={{ fontSize: 8, color: '#5A5850' }}>{item.location}</div>}
      </div>

      <span style={{ fontSize: 10, color: '#C8A84B', fontFamily: 'monospace', minWidth: 35, textAlign: 'right' }}>
        ×{item.quantity || 1}
      </span>

      {item.quality_score > 0 && (
        <span style={{ fontSize: 9, color: item.quality_score >= 800 ? '#C8A84B' : '#5A5850', minWidth: 30 }}>
          Q{item.quality_score}
        </span>
      )}

      {(item.buy_price || item.sell_price) && (
        <span style={{ fontSize: 9, color: '#3498DB', minWidth: 60, textAlign: 'right' }}>
          {item.buy_price ? `B:${item.buy_price}` : ''}{item.buy_price && item.sell_price ? ' ' : ''}{item.sell_price ? `S:${item.sell_price}` : ''}
        </span>
      )}

      <button onClick={() => onRemove(index)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
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

  const included = reviewItems.filter(i => !i._excluded);

  const handleSave = async () => {
    if (included.length === 0) return;
    setSaving(true);
    try {
      const assets = included.map(item => ({
        owner_callsign: callsign,
        item_name: item.item_name,
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
      }));

      await base44.entities.PersonalAsset.bulkCreate(assets);
      showToast(`${assets.length} asset${assets.length > 1 ? 's' : ''} saved to inventory`, 'success');
      onSaved();
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
            {included.length} of {reviewItems.length} selected
          </span>
        </div>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2,
        }}><X size={12} /></button>
      </div>

      {/* Items list */}
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        {reviewItems.map((item, i) => (
          <ItemRow key={i} item={item} index={i}
            onToggle={toggleItem} onRemove={removeItem} onEdit={() => {}} />
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
          <Save size={11} /> {saving ? 'SAVING...' : `SAVE ${included.length} ITEMS`}
        </button>
      </div>
    </div>
  );
}