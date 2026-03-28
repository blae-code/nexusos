import React, { useMemo } from 'react';
import { Package } from 'lucide-react';

const TYPE_COLORS = {
  CMR: '#C0392B',
  CMP: '#C8A84B',
  CMS: '#D8BC70',
  CM_REFINED: '#4A8C5C',
  ORE: '#9A9488',
  DISMANTLED_SCRAP: '#5A5850',
  OTHER: '#4A4640',
};

export default function StockpileSummaryCard({ materials, onNavigate }) {
  const active = useMemo(() => (materials || []).filter(m => !m.is_archived), [materials]);
  const totalSCU = active.reduce((s, m) => s + (m.quantity_scu || 0), 0);

  const byType = useMemo(() => {
    const map = {};
    for (const m of active) {
      const t = m.material_type || 'OTHER';
      map[t] = (map[t] || 0) + (m.quantity_scu || 0);
    }
    return Object.entries(map)
      .map(([type, scu]) => ({ type, scu }))
      .sort((a, b) => b.scu - a.scu);
  }, [active]);

  const avgQuality = active.length
    ? Math.round(active.reduce((s, m) => s + (m.quality_score || 0), 0) / active.length)
    : 0;

  const maxScu = Math.max(1, ...byType.map(b => b.scu));

  return (
    <div
      className="nexus-card-clickable"
      onClick={onNavigate}
      style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '20px 22px', cursor: 'pointer',
        transition: 'border-color 150ms, transform 150ms, background 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Package size={14} style={{ color: '#C0392B' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
          color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>ORG STOCKPILE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 36, color: '#E8E4DC', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{totalSCU.toFixed(0)}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
          fontSize: 13, color: '#9A9488', textTransform: 'uppercase',
        }}>SCU TOTAL</span>
      </div>

      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5A5850', marginBottom: 14 }}>
        {active.length} materials tracked · avg quality {avgQuality}/1000
      </div>

      {/* Horizontal bars by type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {byType.slice(0, 5).map(({ type, scu }) => (
          <div key={type}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: TYPE_COLORS[type] || '#9A9488', fontWeight: 600,
              }}>{type.replace(/_/g, ' ')}</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: '#5A5850', fontVariantNumeric: 'tabular-nums',
              }}>{scu.toFixed(1)} SCU</span>
            </div>
            <div style={{ height: 3, background: 'rgba(200,170,100,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: TYPE_COLORS[type] || '#9A9488',
                width: `${(scu / maxScu) * 100}%`,
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}