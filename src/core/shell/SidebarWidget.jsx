/**
 * SidebarWidget — Quick status widget for the current industry-first release.
 * Shows refinery timers and pending requisitions only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { ChevronDown, Clock, FileText, Flame } from 'lucide-react';

function timeLeft(isoStr) {
  if (!isoStr) return '—';
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return 'READY';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SidebarWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [refinery, setRefinery] = useState([]);
  const [pendingReqs, setPendingReqs] = useState(0);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [refs, reqs] = await Promise.all([
        base44.entities.RefineryOrder.filter({ status: 'ACTIVE' }).catch(() => []),
        base44.entities.Requisition.filter({ status: 'OPEN' }).catch(() => []),
      ]);
      setRefinery((refs || []).slice(0, 3));
      setPendingReqs((reqs || []).length);
    } catch {
      // entity unavailable — widget stays hidden
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Refresh timers every 60s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const hasContent = refinery.length > 0 || pendingReqs > 0;
  if (!hasContent) return null;

  return (
    <div style={{
      margin: '8px 12px', borderRadius: 2,
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#C8A84B', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}
      >
        <Clock size={9} />
        <span style={{ flex: 1, textAlign: 'left' }}>INDUSTRY STATUS</span>
        <ChevronDown size={10} style={{
          transform: collapsed ? 'rotate(-90deg)' : 'none',
          transition: 'transform 150ms',
          color: '#5A5850',
        }} />
      </button>

      {!collapsed && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Refinery timers */}
          {refinery.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 0', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
            }}>
              <Flame size={9} style={{ color: '#C0392B', flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: '#9A9488', flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.material_name}</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                color: timeLeft(r.completes_at) === 'READY' ? '#2edb7a' : '#C8A84B',
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>{timeLeft(r.completes_at)}</span>
            </div>
          ))}

          {/* Pending requisitions */}
          {pendingReqs > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
            }}>
              <FileText size={9} style={{ color: '#C8A84B', flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: '#9A9488', flex: 1,
              }}>Pending Requisitions</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: '#C8A84B', fontWeight: 600,
              }}>{pendingReqs}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
