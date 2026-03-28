import React from 'react';
import { Flame } from 'lucide-react';

function timeLeft(isoStr) {
  if (!isoStr) return { label: '—', pct: 0 };
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return { label: 'READY', pct: 100 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, pct: 0 };
}

export default function RefineryHealthCard({ refineryOrders, onNavigate }) {
  const active = (refineryOrders || []).filter(r => r.status === 'ACTIVE');
  const ready = (refineryOrders || []).filter(r => r.status === 'READY');
  const total = active.length + ready.length;
  const totalScu = active.reduce((s, r) => s + (r.quantity_scu || 0), 0);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={14} style={{ color: '#C0392B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
            color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>REFINERY HEALTH</span>
        </div>
        {ready.length > 0 && (
          <span style={{
            fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            color: '#4A8C5C', background: 'rgba(74,140,92,0.12)',
            border: '0.5px solid rgba(74,140,92,0.3)', borderRadius: 2, padding: '2px 8px',
            animation: 'pulse 2s ease-in-out infinite',
          }}>{ready.length} READY</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif",
          fontSize: 36, color: '#E8E4DC', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{total}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
          fontSize: 13, color: '#9A9488', textTransform: 'uppercase',
        }}>ACTIVE BATCHES</span>
      </div>

      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5A5850', marginBottom: 14 }}>
        {totalScu.toFixed(1)} SCU processing · {ready.length} collection{ready.length !== 1 ? 's' : ''} pending
      </div>

      {/* Mini refinery bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {active.slice(0, 3).map(order => {
          const tl = timeLeft(order.completes_at);
          const startedAt = order.started_at ? new Date(order.started_at).getTime() : 0;
          const completesAt = order.completes_at ? new Date(order.completes_at).getTime() : 0;
          const totalDuration = completesAt - startedAt;
          const elapsed = Date.now() - startedAt;
          const pct = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

          return (
            <div key={order.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%',
                }}>{order.material_name}</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  color: tl.label === 'READY' ? '#4A8C5C' : '#C8A84B',
                  fontVariantNumeric: 'tabular-nums',
                }}>{tl.label}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(200,170,100,0.10)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${pct}%`,
                  background: pct >= 100 ? '#4A8C5C' : '#C8A84B',
                  transition: 'width 1s ease-out',
                }} />
              </div>
            </div>
          );
        })}
        {active.length > 3 && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>
            +{active.length - 3} more batches
          </span>
        )}
        {total === 0 && (
          <span style={{
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 10, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>NO ACTIVE REFINERY ORDERS</span>
        )}
      </div>
    </div>
  );
}