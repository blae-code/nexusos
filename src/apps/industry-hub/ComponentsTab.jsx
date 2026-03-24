/**
 * ComponentsTab — Industry Hub COMPONENTS sub-tab.
 * Displays ComponentHarvest entity records.
 */
import React, { useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { qualityPercentFromRecord } from '@/core/data/quality';

const CONDITION_STYLE = {
  PRISTINE:     { bg: 'rgba(74,140,92,0.12)',   border: 'rgba(74,140,92,0.3)',  color: '#4A8C5C' },
  GOOD:         { bg: 'rgba(200,168,75,0.10)',  border: 'rgba(200,168,75,0.25)', color: '#C8A84B' },
  DAMAGED:      { bg: 'rgba(90,88,80,0.15)',    border: 'rgba(90,88,80,0.25)',  color: '#5A5850' },
  SALVAGE_ONLY: { bg: 'rgba(192,57,43,0.12)',   border: 'rgba(192,57,43,0.3)',  color: '#C0392B' },
};

const USE_STYLE = {
  ORG_FLEET:   { bg: '#C0392B',                  border: '#C0392B',               color: '#E8E4DC' },
  SELL:        { bg: 'rgba(200,168,75,0.10)',    border: 'rgba(200,168,75,0.25)', color: '#C8A84B' },
  CRAFT_INPUT: { bg: 'rgba(200,168,75,0.10)',    border: 'rgba(200,168,75,0.25)', color: '#C8A84B' },
  PENDING:     { bg: 'rgba(90,88,80,0.15)',      border: 'rgba(90,88,80,0.25)',  color: '#5A5850' },
};

function Chip({ label, styles }) {
  const s = styles || { bg: 'rgba(90,88,80,0.15)', border: 'rgba(90,88,80,0.25)', color: '#5A5850' };
  return (
    <span style={{
      fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
      textTransform: 'uppercase', borderRadius: 2, padding: '2px 6px',
      background: s.bg, border: `0.5px solid ${s.border}`, color: s.color,
    }}>{label}</span>
  );
}

function qualityColor(percent) {
  if (percent >= 90) return '#4A8C5C';
  if (percent >= 60) return '#C8A84B';
  if (percent >= 30) return '#9A9488';
  return '#C0392B';
}

const COLS = ['COMPONENT', 'SIZE', 'TYPE', 'QUALITY', 'CONDITION', 'SOURCE', 'ASSIGNED', 'USE'];

export default function ComponentsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ComponentHarvest.list('-extracted_at', 100)
      .then(data => setItems(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 44px 90px 64px 88px 120px 88px 80px',
          gap: 8, padding: '8px 12px', background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          {COLS.map(h => (
            <span key={h} style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10,
              color: '#9A9488', textTransform: 'uppercase', letterSpacing: '0.2em',
            }}>{h}</span>
          ))}
        </div>

        {items.map((c) => {
          const qualityPercent = qualityPercentFromRecord(c);
          return (
          <div key={c.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 44px 90px 64px 88px 120px 88px 80px',
            gap: 8, padding: '10px 12px', alignItems: 'center',
            borderBottom: '0.5px solid rgba(200,170,100,0.06)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            {/* Component name */}
            <div>
              <div style={{ color: '#E8E4DC', fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
                {c.component_name || c.component_type}
              </div>
              {c.component_name && c.component_name !== c.component_type && (
                <div style={{ color: '#5A5850', fontSize: 11, fontFamily: "'Barlow', sans-serif", marginTop: 1 }}>
                  {c.component_type}
                </div>
              )}
            </div>

            {/* Size */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#9A9488' }}>
              S{c.size || '—'}
            </div>

            {/* Type */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 11, color: '#9A9488', textTransform: 'uppercase' }}>
              {(c.component_type || '').replace(/_/g, ' ')}
            </div>

            {/* Quality */}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: qualityPercent >= 90 ? 700 : 600,
              fontSize: 12, color: qualityColor(qualityPercent), fontVariantNumeric: 'tabular-nums',
            }}>{qualityPercent > 0 ? `${qualityPercent.toFixed(0)}%` : '—'}</div>

            {/* Condition */}
            <Chip label={c.condition || 'UNKNOWN'} styles={CONDITION_STYLE[c.condition]} />

            {/* Source */}
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#E8E4DC', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.source_wreck || '—'}
              </div>
              {c.source_location && (
                <div style={{ color: '#5A5850', fontSize: 10, fontFamily: "'Barlow', sans-serif" }}>{c.source_location}</div>
              )}
            </div>

            {/* Assigned */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: c.claimed_by ? '#C8A84B' : '#5A5850' }}>
              {c.claimed_by || 'ORG POOL'}
            </div>

            {/* Use */}
            <Chip label={(c.use_type || 'PENDING').replace(/_/g, ' ')} styles={USE_STYLE[c.use_type]} />
          </div>
          );
        })}

        {items.length === 0 && (
          <div style={{
            padding: '32px 0', textAlign: 'center',
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 11, color: '#5A5850', textTransform: 'uppercase',
          }}>NO COMPONENTS LOGGED</div>
        )}
      </div>
    </div>
  );
}
