import React, { useMemo } from 'react';

const CAT_COLORS = {
  WEAPON: '#C0392B', ARMOR: '#3498DB', GEAR: '#4A8C5C', COMPONENT: '#9A9488',
  CONSUMABLE: '#E8A020', AMMO: '#C8A84B', SHIP_COMPONENT: '#8E44AD',
  FOCUSING_LENS: '#E67E22', OTHER: '#5A5850',
};

export default function BlueprintContributionsSummary({ members, blueprints }) {
  const topContributors = useMemo(() => {
    const countByCallsign = {};
    for (const bp of (blueprints || [])) {
      const cs = (bp.owned_by_callsign || '').toUpperCase();
      if (!cs) continue;
      if (!countByCallsign[cs]) countByCallsign[cs] = { callsign: cs, total: 0, categories: {} };
      countByCallsign[cs].total += 1;
      const cat = bp.category || 'OTHER';
      countByCallsign[cs].categories[cat] = (countByCallsign[cs].categories[cat] || 0) + 1;
    }
    return Object.values(countByCallsign).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [blueprints]);

  const catTotals = useMemo(() => {
    const counts = {};
    for (const bp of (blueprints || [])) {
      if (!bp.owned_by_callsign) continue;
      const cat = bp.category || 'OTHER';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [blueprints]);

  const totalOwned = (blueprints || []).filter(b => b.owned_by_callsign).length;
  const totalBps = (blueprints || []).length;

  return (
    <div style={{
      background: '#0F0F0D', borderLeft: '2px solid #3498DB',
      border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
      padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
        fontSize: 9, color: '#3498DB', letterSpacing: '0.22em', textTransform: 'uppercase',
        marginBottom: 12, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      }}>BLUEPRINT EXPERTISE ({totalOwned}/{totalBps} OWNED)</div>

      {/* Category breakdown bar */}
      {catTotals.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
            {catTotals.map(([cat, count]) => (
              <div key={cat} style={{
                flex: count, background: CAT_COLORS[cat] || '#5A5850',
                minWidth: 4,
              }} title={`${cat}: ${count}`} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {catTotals.map(([cat, count]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: CAT_COLORS[cat] || '#5A5850' }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850' }}>{cat} ({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top contributors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {topContributors.map((c, i) => (
          <div key={c.callsign} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', background: i === 0 ? 'rgba(52,152,219,0.08)' : '#141410', borderRadius: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                color: i < 3 ? '#C8A84B' : '#5A5850', width: 16,
              }}>#{i + 1}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#E8E4DC' }}>{c.callsign}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {Object.entries(c.categories).slice(0, 3).map(([cat, count]) => (
                <span key={cat} style={{
                  fontSize: 8, padding: '1px 4px', borderRadius: 2,
                  color: CAT_COLORS[cat] || '#5A5850',
                  background: `${CAT_COLORS[cat] || '#5A5850'}18`,
                }}>{count} {cat}</span>
              ))}
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                color: '#3498DB', fontWeight: 700,
              }}>{c.total}</span>
            </div>
          </div>
        ))}
      </div>

      {topContributors.length === 0 && (
        <div style={{ color: '#5A5850', fontSize: 10, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
          No blueprint claims yet
        </div>
      )}
    </div>
  );
}