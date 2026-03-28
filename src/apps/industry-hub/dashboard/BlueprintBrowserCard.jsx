/**
 * BlueprintBrowserCard — single blueprint tile with ownership claim toggle.
 */
import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';

const CATEGORY_COLORS = {
  WEAPON: '#C0392B',
  ARMOR: '#C8A84B',
  GEAR: '#9A9488',
  COMPONENT: '#7AAECC',
  CONSUMABLE: '#4A8C5C',
  AMMO: '#5A5850',
  SHIP_COMPONENT: '#D8BC70',
  FOCUSING_LENS: '#8E44AD',
  OTHER: '#5A5850',
};

const TIER_STYLES = {
  T1: { bg: 'rgba(200,170,100,0.08)', border: 'rgba(200,170,100,0.2)', color: '#9A9488' },
  T2: { bg: 'rgba(200,168,75,0.12)', border: 'rgba(200,168,75,0.3)', color: '#C8A84B' },
};

export default function BlueprintBrowserCard({ blueprint, callsign, onUpdated }) {
  const [saving, setSaving] = useState(false);

  const bp = blueprint;
  const isOwned = Boolean(bp.owned_by_callsign || bp.owned_by);
  const isMine = (bp.owned_by_callsign || '').toUpperCase() === (callsign || '').toUpperCase();
  const catColor = CATEGORY_COLORS[bp.category] || '#5A5850';
  const tierStyle = TIER_STYLES[bp.tier] || TIER_STYLES.T1;

  const handleToggleOwnership = async (e) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);

    if (isMine) {
      // Unclaim
      await base44.entities.Blueprint.update(bp.id, {
        owned_by_callsign: null,
        owned_by: null,
      });
    } else {
      // Claim
      await base44.entities.Blueprint.update(bp.id, {
        owned_by_callsign: callsign,
      });
    }

    setSaving(false);
    onUpdated?.();
  };

  return (
    <div style={{
      background: isMine ? 'rgba(200,168,75,0.04)' : '#0A0908',
      border: `0.5px solid ${isMine ? 'rgba(200,168,75,0.2)' : 'rgba(200,170,100,0.08)'}`,
      borderLeft: `2px solid ${catColor}`,
      borderRadius: 2, padding: '14px 16px',
      transition: 'border-color 150ms, background 150ms',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Top row: name + tier */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
            color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{bp.item_name}</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
            marginTop: 2, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: catColor, fontWeight: 600 }}>{bp.category || 'OTHER'}</span>
            <span>·</span>
            <span style={{
              ...tierStyle, fontSize: 9, fontWeight: 600,
              padding: '1px 5px', borderRadius: 2,
              background: tierStyle.bg, border: `0.5px solid ${tierStyle.border}`,
              color: tierStyle.color,
            }}>{bp.tier || 'T1'}</span>
          </div>
        </div>
        {bp.is_priority && (
          <Star size={12} style={{ color: '#C8A84B', flexShrink: 0, fill: '#C8A84B' }} />
        )}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {bp.source_mission_giver && (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          }}>Source: {bp.source_mission_giver}</span>
        )}
        {bp.aUEC_value_est > 0 && (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B',
            fontVariantNumeric: 'tabular-nums',
          }}>{bp.aUEC_value_est.toLocaleString()} aUEC</span>
        )}
        {bp.recipe_materials?.length > 0 && (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          }}>{bp.recipe_materials.length} material{bp.recipe_materials.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Recipe preview (compact) */}
      {bp.recipe_materials?.length > 0 && (
        <div style={{
          display: 'flex', gap: 4, flexWrap: 'wrap',
        }}>
          {bp.recipe_materials.slice(0, 4).map((mat, i) => (
            <span key={i} style={{
              fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif",
              color: '#5A5850', background: 'rgba(200,170,100,0.04)',
              border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, padding: '2px 5px',
            }}>
              {mat.material_name || mat.material} {mat.quantity_scu ? `${mat.quantity_scu} SCU` : ''}
            </span>
          ))}
          {bp.recipe_materials.length > 4 && (
            <span style={{ fontSize: 9, color: '#5A5850' }}>+{bp.recipe_materials.length - 4}</span>
          )}
        </div>
      )}

      {/* Ownership row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, borderTop: '0.5px solid rgba(200,170,100,0.06)',
        marginTop: 'auto',
      }}>
        {isOwned && !isMine ? (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#C8A84B', fontWeight: 600,
          }}>
            OWNED BY {bp.owned_by_callsign || 'ORG MEMBER'}
          </span>
        ) : isMine ? (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#4A8C5C', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Check size={10} /> YOU OWN THIS
          </span>
        ) : (
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#5A5850',
          }}>UNOWNED</span>
        )}

        <button
          onClick={handleToggleOwnership}
          disabled={saving || (isOwned && !isMine)}
          style={{
            padding: '5px 10px', borderRadius: 2, cursor: saving || (isOwned && !isMine) ? 'not-allowed' : 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 4,
            background: isMine ? 'rgba(192,57,43,0.12)' : 'rgba(74,140,92,0.12)',
            border: `0.5px solid ${isMine ? 'rgba(192,57,43,0.3)' : 'rgba(74,140,92,0.3)'}`,
            color: isMine ? '#C0392B' : '#4A8C5C',
            opacity: (isOwned && !isMine) ? 0.3 : 1,
            transition: 'all 150ms',
          }}
        >
          {saving ? 'SAVING...' : isMine ? 'REMOVE CLAIM' : 'I HAVE THIS'}
        </button>
      </div>
    </div>
  );
}