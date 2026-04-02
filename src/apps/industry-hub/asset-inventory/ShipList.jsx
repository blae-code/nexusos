/**
 * ShipList — displays ships assigned to the current user.
 */
import React, { useMemo } from 'react';
import { Ship } from 'lucide-react';

const STATUS_COLORS = {
  AVAILABLE: '#4A8C5C', ASSIGNED: '#3498DB', MAINTENANCE: '#C8A84B',
  DESTROYED: '#C0392B', ARCHIVED: '#5A5850',
};

export default function ShipList({ ships, search, scope = 'me' }) {
  const q = (search || '').toLowerCase();
  const filtered = useMemo(() =>
    ships.filter((ship) => {
      if (!q) return true;
      const haystack = [
        ship.name,
        ship.model,
        ship.manufacturer,
        ship.assigned_to_callsign,
        ship.status,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }),
    [ships, q]
  );

  if (filtered.length === 0) {
    return (
      <div style={{
        padding: '60px 20px', textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850',
      }}>
        <Ship size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
        <div>{search ? 'No ships match your search' : scope === 'org' ? 'No org ships logged yet' : 'No ships assigned to you'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
      {filtered.map(s => {
        const sc = STATUS_COLORS[s.status] || '#5A5850';
        return (
          <div key={s.id} style={{
            background: '#0F0F0D', borderLeft: `2px solid ${sc}`,
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
                fontWeight: 700, color: '#E8E4DC', letterSpacing: '0.04em',
              }}>{s.name}</div>
              <span style={{
                fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
                color: sc, background: `${sc}18`, border: `0.5px solid ${sc}40`,
              }}>{s.status}</span>
            </div>
            <div style={{ fontSize: 11, color: '#9A9488', marginBottom: 4 }}>{s.model}</div>
            {s.manufacturer && <div style={{ fontSize: 9, color: '#5A5850' }}>{s.manufacturer}</div>}
            {scope === 'org' && s.assigned_to_callsign && (
              <div style={{ fontSize: 9, color: '#C8A84B', marginTop: 4 }}>
                Custody: {s.assigned_to_callsign}
              </div>
            )}
            <div style={{
              display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: '#5A5850',
            }}>
              {s.cargo_scu > 0 && <span>Cargo: <span style={{ color: '#C8A84B' }}>{s.cargo_scu} SCU</span></span>}
              {s.crew_size > 0 && <span>Crew: <span style={{ color: '#9A9488' }}>{s.crew_size}</span></span>}
              {s.class && <span style={{ color: '#3498DB' }}>{s.class}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
