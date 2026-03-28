import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function timeLeft(isoStr) {
  if (!isoStr) return { label: '—', pct: 0 };
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return { label: 'READY', pct: 100 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, pct: 0 };
}

function calcProgress(startedAt, completesAt) {
  if (!startedAt || !completesAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(completesAt).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = Date.now() - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function OrderRow({ label, sublabel, status, pct, timeLabel, statusColor }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 70px 60px',
      gap: 8, padding: '10px 16px', alignItems: 'center',
      borderBottom: '0.5px solid rgba(200,170,100,0.06)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12,
          color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</div>
        {sublabel && (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 1 }}>
            {sublabel}
          </div>
        )}
      </div>
      {/* Progress bar */}
      <div>
        <div style={{ height: 4, background: 'rgba(200,170,100,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: pct >= 100 ? '#4A8C5C' : '#C8A84B',
            width: `${pct}%`,
            transition: 'width 1s ease-out',
          }} />
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
          marginTop: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        }}>{Math.round(pct)}%</div>
      </div>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: timeLabel === 'READY' ? '#4A8C5C' : '#C8A84B',
        fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
      }}>{timeLabel}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        fontWeight: 600, color: statusColor, textTransform: 'uppercase',
        textAlign: 'right',
      }}>{status}</span>
    </div>
  );
}

export default function ActiveOrdersCard({ refineryOrders, craftQueue, onTabChange }) {
  const [tick, setTick] = useState(0);

  // Re-render every 30s to update progress bars
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const activeRefinery = (refineryOrders || []).filter(r => r.status === 'ACTIVE' || r.status === 'READY');
  const activeCraft = (craftQueue || []).filter(c => ['IN_PROGRESS', 'CLAIMED'].includes(c.status));
  const totalActive = activeRefinery.length + activeCraft.length;

  if (totalActive === 0) return null;

  return (
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
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#141410',
      }}>
        <Clock size={13} style={{ color: '#C8A84B' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10,
          color: '#C8A84B', letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>ACTIVE ORDERS</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
          marginLeft: 'auto',
        }}>{totalActive} active</span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 70px 60px',
        gap: 8, padding: '6px 16px', background: '#0F0F0D',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      }}>
        {['ORDER', 'PROGRESS', 'TIME', 'STATUS'].map(h => (
          <span key={h} style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 9,
            color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: h !== 'ORDER' ? 'right' : 'left',
          }}>{h}</span>
        ))}
      </div>

      {/* Refinery orders */}
      {activeRefinery.slice(0, 5).map(order => {
        const tl = timeLeft(order.completes_at);
        const pct = order.status === 'READY' ? 100 : calcProgress(order.started_at, order.completes_at);
        return (
          <OrderRow
            key={order.id}
            label={order.material_name || 'Unknown'}
            sublabel={`${order.quantity_scu || 0} SCU · ${order.method || 'REFINERY'}`}
            status={order.status}
            pct={pct}
            timeLabel={order.status === 'READY' ? 'READY' : tl.label}
            statusColor={order.status === 'READY' ? '#4A8C5C' : '#C8A84B'}
          />
        );
      })}

      {/* Craft orders */}
      {activeCraft.slice(0, 5).map(craft => (
        <OrderRow
          key={craft.id}
          label={craft.blueprint_name || 'Craft Job'}
          sublabel={`Qty ${craft.quantity || 1} · ${craft.claimed_by_callsign || 'unclaimed'}`}
          status={craft.status}
          pct={craft.status === 'IN_PROGRESS' ? 65 : 30}
          timeLabel={craft.status === 'IN_PROGRESS' ? 'ACTIVE' : 'QUEUED'}
          statusColor={craft.status === 'IN_PROGRESS' ? '#C0392B' : '#C8A84B'}
        />
      ))}

      {/* Footer */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 16px',
        borderTop: '0.5px solid rgba(200,170,100,0.06)',
      }}>
        {activeRefinery.length > 0 && (
          <button
            onClick={() => onTabChange('refinery')}
            className="nexus-btn"
            style={{ padding: '4px 10px', fontSize: 9 }}
          >VIEW REFINERY →</button>
        )}
        {activeCraft.length > 0 && (
          <button
            onClick={() => onTabChange('craft')}
            className="nexus-btn"
            style={{ padding: '4px 10px', fontSize: 9 }}
          >VIEW CRAFT QUEUE →</button>
        )}
      </div>
    </div>
  );
}