/**
 * ListingCard — Single marketplace listing row.
 */
import React, { useState } from 'react';
import { Check, X, ArrowRightLeft, Zap } from 'lucide-react';

const TYPE_CONFIG = {
  SELL: { label: 'SELL', color: '#2edb7a', bg: 'rgba(46,219,122,0.06)', border: 'rgba(46,219,122,0.20)' },
  BUY:  { label: 'BUY',  color: '#C8A84B', bg: 'rgba(200,168,75,0.06)', border: 'rgba(200,168,75,0.20)' },
};

const STATUS_CONFIG = {
  OPEN:      { color: '#2edb7a', bg: 'rgba(46,219,122,0.08)' },
  RESERVED:  { color: '#C8A84B', bg: 'rgba(200,168,75,0.08)' },
  COMPLETED: { color: '#5A5850', bg: 'rgba(90,88,80,0.08)' },
  CANCELLED: { color: '#C0392B', bg: 'rgba(192,57,43,0.08)' },
  EXPIRED:   { color: '#5A5850', bg: 'rgba(90,88,80,0.08)' },
};

const MAT_COLORS = {
  CMR: '#C0392B', CMP: '#C8A84B', CMS: '#9A9488', CM_REFINED: '#2edb7a',
  ORE: '#7AAECC', CRAFTED_ITEM: '#D8BC70', COMPONENT: '#7AAECC',
  DISMANTLED_SCRAP: '#5A5850', OTHER: '#5A5850',
};

function fmtAuec(n) {
  if (!n) return '0';
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function ListingCard({ listing, isOwn, demandMaterials, onAccept, onComplete, onCancel }) {
  const [busy, setBusy] = useState(false);
  const l = listing;
  const tc = TYPE_CONFIG[l.listing_type] || TYPE_CONFIG.SELL;
  const sc = STATUS_CONFIG[l.status] || STATUS_CONFIG.OPEN;
  const mc = MAT_COLORS[l.material_type] || '#5A5850';
  const qualityPct = l.quality_score ? Math.round(l.quality_score / 10) : null;
  const isT2 = (l.quality_score || 0) >= 800;
  const isOpen = l.status === 'OPEN';
  const isReserved = l.status === 'RESERVED';

  // Check if this listing matches craft demand
  const matchesDemand = demandMaterials?.some(d =>
    d.name && l.material_name && d.name.toLowerCase() === l.material_name.toLowerCase()
  );

  const wrap = async (fn) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'background 150ms',
      opacity: ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(l.status) ? 0.5 : 1,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Type pill */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
        padding: '3px 8px', borderRadius: 2,
        background: tc.bg, border: `0.5px solid ${tc.border}`, color: tc.color,
        letterSpacing: '0.1em', flexShrink: 0,
      }}>{tc.label}</span>

      {/* Material info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
            color: '#E8E4DC', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{l.material_name}</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
            color: mc, background: `${mc}15`, border: `0.5px solid ${mc}33`,
            padding: '1px 6px', borderRadius: 2, letterSpacing: '0.06em',
          }}>{(l.material_type || '').replace(/_/g, ' ')}</span>
          {isT2 && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7,
              color: '#4A8C5C', background: 'rgba(74,140,92,0.10)',
              border: '0.5px solid rgba(74,140,92,0.25)',
              padding: '1px 5px', borderRadius: 2, letterSpacing: '0.08em',
            }}>T2</span>
          )}
          {matchesDemand && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7,
              color: '#C0392B', background: 'rgba(192,57,43,0.08)',
              border: '0.5px solid rgba(192,57,43,0.20)',
              padding: '1px 5px', borderRadius: 2, letterSpacing: '0.06em',
            }}><Zap size={7} /> NEEDED</span>
          )}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          <span>{l.poster_callsign}</span>
          {l.quantity_scu != null && <span>{l.quantity_scu} SCU</span>}
          {qualityPct != null && <span style={{ color: isT2 ? '#4A8C5C' : '#9A9488' }}>{qualityPct}% Q</span>}
          {l.location && <span>{l.location}</span>}
          {l.system && <span>{l.system}</span>}
        </div>
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {l.total_price_aUEC > 0 && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
            fontWeight: 700, color: l.listing_type === 'SELL' ? '#2edb7a' : '#C8A84B',
            fontVariantNumeric: 'tabular-nums',
          }}>{fmtAuec(l.total_price_aUEC)} aUEC</div>
        )}
        {l.price_per_scu > 0 && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
          }}>{fmtAuec(l.price_per_scu)}/SCU</div>
        )}
      </div>

      {/* Status */}
      {l.status !== 'OPEN' && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
          padding: '2px 6px', borderRadius: 2,
          background: sc.bg, color: sc.color, letterSpacing: '0.08em',
          flexShrink: 0,
        }}>{l.status}</span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!isOwn && isOpen && (
          <button onClick={() => wrap(onAccept)} disabled={busy} style={{
            padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
            background: 'rgba(46,219,122,0.08)', border: '0.5px solid rgba(46,219,122,0.25)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#2edb7a',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <ArrowRightLeft size={9} /> {l.listing_type === 'SELL' ? 'BUY' : 'SELL'}
          </button>
        )}
        {isOwn && isReserved && (
          <button onClick={() => wrap(onComplete)} disabled={busy} style={{
            padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
            background: 'rgba(46,219,122,0.08)', border: '0.5px solid rgba(46,219,122,0.25)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#2edb7a',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Check size={9} /> COMPLETE
          </button>
        )}
        {isOwn && (isOpen || isReserved) && (
          <button onClick={() => wrap(onCancel)} disabled={busy} style={{
            padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
            background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.20)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#C0392B',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <X size={9} /> CANCEL
          </button>
        )}
      </div>
    </div>
  );
}