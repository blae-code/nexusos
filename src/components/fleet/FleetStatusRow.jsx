/**
 * FleetStatusRow — Single ship row in the Fleet Status table.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PresenceDot from '@/components/PresenceDot';

const STATUS_CFG = {
  AVAILABLE:   { color: '#4A8C5C', label: 'READY' },
  ASSIGNED:    { color: '#C8A84B', label: 'ASSIGNED' },
  MAINTENANCE: { color: '#FF6B35', label: 'MAINT' },
  DESTROYED:   { color: '#E04848', label: 'DESTROYED' },
};

const CLASS_ICONS = {
  FIGHTER: '⚔️', HEAVY_FIGHTER: '⚔️', MINER: '⛏️', HAULER: '📦',
  SALVAGER: '♻️', MEDICAL: '✚', EXPLORER: '🔭', GROUND_VEHICLE: '🚗', OTHER: '🛸',
};

function ReadinessIndicator({ readiness }) {
  if (!readiness || typeof readiness !== 'object') return <span style={{ color: '#3A3830', fontSize: 9 }}>—</span>;
  // Average all readiness scores
  const vals = Object.values(readiness).filter(v => typeof v === 'number');
  if (vals.length === 0) return <span style={{ color: '#3A3830', fontSize: 9 }}>—</span>;
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const color = avg >= 70 ? '#4A8C5C' : avg >= 40 ? '#C8A84B' : '#E04848';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 36, height: 4, background: '#141410', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ width: `${avg}%`, height: '100%', background: color, transition: 'width 300ms' }} />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color, fontVariantNumeric: 'tabular-nums' }}>{avg}%</span>
    </div>
  );
}

function fmtAuec(v) {
  if (!v) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function FleetStatusRow({ ship, member, isOnOp }) {
  const cfg = STATUS_CFG[ship.status] || { color: '#5A5850', label: ship.status };
  const cls = CLASS_ICONS[ship.class] || '🛸';
  const classLabel = (ship.class || 'OTHER').replace(/_/g, ' ');

  return (
    <tr
      style={{ transition: 'background 100ms' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Status */}
      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0,
            animation: ship.status === 'AVAILABLE' ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
            color: cfg.color, letterSpacing: '0.1em',
          }}>{cfg.label}</span>
        </div>
      </td>

      {/* Ship name + model */}
      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600,
            color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
          }}>{ship.name}</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
          }}>{ship.manufacturer ? `${ship.manufacturer} · ` : ''}{ship.model}</span>
        </div>
      </td>

      {/* Class */}
      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, marginRight: 4 }}>{cls}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{classLabel}</span>
      </td>

      {/* Pilot / assigned crew */}
      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)' }}>
        {ship.assigned_to_callsign ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <PresenceDot lastSeenAt={member?.last_seen_at} size={6} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 500,
              color: '#C8A84B',
            }}>{ship.assigned_to_callsign}</span>
            {isOnOp && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 600,
                color: '#C0392B', background: 'rgba(192,57,43,0.12)',
                border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 2,
                padding: '1px 4px', letterSpacing: '0.08em',
              }}>ON OP</span>
            )}
          </div>
        ) : (
          <span style={{ color: '#3A3830', fontSize: 9, fontStyle: 'italic' }}>Unassigned</span>
        )}
      </td>

      {/* Cargo */}
      <td style={{
        padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        textAlign: 'right', fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, color: ship.cargo_scu ? '#7AAECC' : '#3A3830',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {ship.cargo_scu ? `${ship.cargo_scu} SCU` : '—'}
      </td>

      {/* Crew complement */}
      <td style={{
        padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        textAlign: 'right', fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, color: ship.crew_size ? '#9A9488' : '#3A3830',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {ship.crew_size || '—'}
      </td>

      {/* Readiness */}
      <td style={{ padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)' }}>
        <ReadinessIndicator readiness={ship.mission_readiness} />
      </td>

      {/* Value */}
      <td style={{
        padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        textAlign: 'right', fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 10, color: '#9DA1CD', fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtAuec(ship.estimated_value_aUEC)}
      </td>

      {/* Notes */}
      <td style={{
        padding: '8px 8px', borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {ship.notes || '—'}
      </td>
    </tr>
  );
}