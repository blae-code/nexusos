import React, { useMemo } from 'react';
import { BookOpen } from 'lucide-react';

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

export default function BlueprintCoverageCard({ blueprints, onNavigate }) {
  const bps = blueprints || [];
  const owned = bps.filter(b => b.owned_by_callsign || b.owned_by).length;
  const priority = bps.filter(b => b.is_priority).length;
  const pctOwned = bps.length ? Math.round((owned / bps.length) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = {};
    for (const bp of bps) {
      const cat = bp.category || 'OTHER';
      if (!map[cat]) map[cat] = { total: 0, owned: 0 };
      map[cat].total++;
      if (bp.owned_by_callsign || bp.owned_by) map[cat].owned++;
    }
    return Object.entries(map)
      .map(([cat, data]) => ({ cat, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [bps]);

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
        <BookOpen size={14} style={{ color: '#C0392B' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
          color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>BLUEPRINT COVERAGE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 36, color: '#E8E4DC', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{pctOwned}%</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
          fontSize: 13, color: '#9A9488', textTransform: 'uppercase',
        }}>OWNED</span>
      </div>

      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5A5850', marginBottom: 14 }}>
        {owned}/{bps.length} blueprints · {priority} priority targets
      </div>

      {/* Coverage ring indicator */}
      <div style={{ height: 6, background: 'rgba(200,170,100,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%', borderRadius: 3, background: '#C8A84B',
          width: `${pctOwned}%`,
          transition: 'width 0.6s ease-out',
        }} />
      </div>

      {/* Category breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {byCategory.slice(0, 4).map(({ cat, total, owned: ownedCount }) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: CATEGORY_COLORS[cat] || '#5A5850',
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488',
              flex: 1, letterSpacing: '0.06em',
            }}>{cat}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#5A5850', fontVariantNumeric: 'tabular-nums',
            }}>{ownedCount}/{total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}