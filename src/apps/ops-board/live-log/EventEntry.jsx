/**
 * EventEntry — single event row in the live feed
 */
import React from 'react';
import { AlertTriangle, Crosshair, Package, MessageSquare, Pin, Shield, Radio } from 'lucide-react';

const TYPE_CONFIG = {
  STATUS:        { icon: Radio,          color: 'var(--info)',   label: 'STATUS' },
  LOOT:          { icon: Package,        color: 'var(--acc)',    label: 'LOOT' },
  KEY_EVENT:     { icon: Crosshair,      color: 'var(--danger)', label: 'KEY EVENT' },
  THREAT:        { icon: AlertTriangle,  color: 'var(--warn)',   label: 'THREAT' },
  PHASE_ADVANCE: { icon: Shield,         color: '#C0392B',       label: 'PHASE' },
  COMMS:         { icon: MessageSquare,  color: 'var(--t2)',     label: 'COMMS' },
  NOTE:          { icon: MessageSquare,  color: 'var(--t3)',     label: 'NOTE' },
};

const SEVERITY_BORDER = {
  CRITICAL: 'var(--danger)',
  WARN: 'var(--warn)',
  INFO: 'transparent',
};

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function EventEntry({ event }) {
  const cfg = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.NOTE;
  const Icon = cfg.icon;
  const isCritical = event.severity === 'CRITICAL';
  const isWarn = event.severity === 'WARN';
  const borderColor = SEVERITY_BORDER[event.severity] || 'transparent';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 10px',
      borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      borderLeft: `2px solid ${borderColor}`,
      background: isCritical ? 'rgba(192,57,43,0.06)' : isWarn ? 'rgba(200,170,100,0.04)' : 'transparent',
      animation: 'nexus-fade-in 200ms ease-out',
    }}>
      {/* Icon */}
      <div style={{
        width: 22, height: 22, borderRadius: 'var(--r-md)',
        background: 'var(--bg2)', border: '0.5px solid var(--b1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
      }}>
        <Icon size={10} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--t0)' }}>{event.callsign || '—'}</span>
          <span style={{
            fontSize: 7, padding: '1px 5px', borderRadius: 2,
            background: 'var(--bg3)', border: '0.5px solid var(--b1)',
            color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {cfg.label}
          </span>
          {event.pinned && <Pin size={8} style={{ color: 'var(--acc)', flexShrink: 0 }} />}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {relativeTime(event.logged_at || event.created_date)}
          </span>
        </div>

        <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.5 }}>
          {event.message}
        </div>

        {/* Loot details */}
        {event.event_type === 'LOOT' && event.material_name && (
          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 9, color: 'var(--t2)' }}>
            <span style={{ color: 'var(--acc)', fontWeight: 600 }}>{event.material_name}</span>
            {event.quantity_scu > 0 && <span>{event.quantity_scu} SCU</span>}
            {event.quality_score > 0 && (
              <span style={{ color: event.quality_score >= 800 ? 'var(--live)' : event.quality_score >= 600 ? 'var(--warn)' : 'var(--t3)' }}>
                Q{event.quality_score}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}