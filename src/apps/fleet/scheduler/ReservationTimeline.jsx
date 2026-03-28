/**
 * ReservationTimeline — visual 24h timeline showing asset bookings.
 * Displays the next 24 hours with colored blocks per reservation.
 */
import React, { useMemo } from 'react';

const STATUS_COLORS = {
  PENDING: '#C8A84B', CONFIRMED: '#3498DB', ACTIVE: '#4A8C5C',
  COMPLETED: '#5A5850', CANCELLED: '#3A3530',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ReservationTimeline({ reservations, ships, assets }) {
  // Build timeline data: group reservations by asset
  const timelineData = useMemo(() => {
    const now = Date.now();
    const windowStart = now;
    const windowEnd = now + 24 * 3600000;

    // Collect unique assets from active reservations
    const assetMap = {};
    reservations.forEach(r => {
      if (r.status === 'CANCELLED') return;
      const rStart = new Date(r.start_time).getTime();
      const rEnd = new Date(r.end_time).getTime();
      if (rEnd < windowStart || rStart > windowEnd) return;

      const key = r.ship_id || r.asset_id || 'unknown';
      const label = r.ship_name || r.asset_name || 'Unknown';
      const model = r.ship_model || r.asset_type || '';
      if (!assetMap[key]) assetMap[key] = { key, label, model, blocks: [] };

      const clampStart = Math.max(rStart, windowStart);
      const clampEnd = Math.min(rEnd, windowEnd);
      const leftPct = ((clampStart - windowStart) / (windowEnd - windowStart)) * 100;
      const widthPct = ((clampEnd - clampStart) / (windowEnd - windowStart)) * 100;

      assetMap[key].blocks.push({
        id: r.id,
        leftPct,
        widthPct,
        color: STATUS_COLORS[r.status] || '#5A5850',
        label: r.reserved_by_callsign,
        purpose: r.purpose || '',
        status: r.status,
      });
    });

    return Object.values(assetMap);
  }, [reservations]);

  if (timelineData.length === 0) {
    return (
      <div style={{
        padding: '30px 16px', textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
        letterSpacing: '0.1em',
      }}>NO RESERVATIONS IN THE NEXT 24 HOURS</div>
    );
  }

  const nowHour = new Date().getHours();

  return (
    <div style={{ overflow: 'auto' }}>
      {/* Hour header */}
      <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: '#0F0F0D' }}>
        <div style={{ width: 120, flexShrink: 0, padding: '6px 8px', fontSize: 8, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em' }}>ASSET</div>
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          {HOURS.map(h => {
            const hour = (nowHour + h) % 24;
            return (
              <div key={h} style={{
                flex: 1, textAlign: 'center', fontSize: 7, color: h === 0 ? '#C8A84B' : '#3A3530',
                fontFamily: 'monospace', padding: '4px 0',
                borderLeft: '0.5px solid rgba(200,170,100,0.04)',
              }}>
                {String(hour).padStart(2, '0')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      {timelineData.map(row => (
        <div key={row.key} style={{
          display: 'flex', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
          minHeight: 32,
        }}>
          <div style={{
            width: 120, flexShrink: 0, padding: '6px 8px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.label}
            </div>
            <div style={{ fontSize: 8, color: '#5A5850' }}>{row.model}</div>
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 28 }}>
            {/* Hour gridlines */}
            {HOURS.map(h => (
              <div key={h} style={{
                position: 'absolute', left: `${(h / 24) * 100}%`, top: 0, bottom: 0,
                borderLeft: '0.5px solid rgba(200,170,100,0.03)',
              }} />
            ))}
            {/* Blocks */}
            {row.blocks.map(block => (
              <div key={block.id} title={`${block.label} — ${block.purpose} (${block.status})`} style={{
                position: 'absolute', left: `${block.leftPct}%`, width: `${Math.max(block.widthPct, 0.5)}%`,
                top: 4, bottom: 4, borderRadius: 2,
                background: `${block.color}30`, border: `0.5px solid ${block.color}`,
                display: 'flex', alignItems: 'center', padding: '0 4px', overflow: 'hidden',
              }}>
                <span style={{ fontSize: 7, color: block.color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}