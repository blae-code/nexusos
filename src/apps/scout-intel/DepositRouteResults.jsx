/**
 * DepositRouteResults — displays the optimized route between deposits
 * with waypoints, refueling stops, safety assessment, and stats.
 */
import React from 'react';
import { X, Route, Fuel, Shield, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

const SAFETY_COLORS = {
  LOW_RISK: 'var(--live)',
  MODERATE: '#C8A84B',
  HIGH_RISK: 'var(--danger)',
  DANGEROUS: 'var(--danger)',
};

const RISK_COLORS = {
  LOW: 'var(--live)',
  MEDIUM: '#C8A84B',
  HIGH: 'var(--danger)',
  EXTREME: 'var(--danger)',
};

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '0.5px solid var(--b1)',
      borderRadius: 2, padding: '8px 10px', flex: 1, minWidth: 80,
    }}>
      <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ color: color || 'var(--t0)', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  );
}

function WaypointCard({ wp, isLast }) {
  const isRefuel = (wp.type || '').toUpperCase() === 'REFUEL';

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600,
          background: isRefuel ? 'rgba(200,168,75,0.15)' : 'rgba(192,57,43,0.15)',
          border: `0.5px solid ${isRefuel ? '#C8A84B' : '#C0392B'}`,
          color: isRefuel ? '#C8A84B' : '#E8E4DC',
        }}>
          {isRefuel ? <Fuel size={9} /> : wp.order}
        </div>
        {!isLast && (
          <div style={{
            width: 1, flex: 1, minHeight: 16,
            background: 'var(--b1)',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, paddingBottom: isLast ? 0 : 10,
        borderLeft: isRefuel ? '1.5px solid rgba(200,168,75,0.2)' : 'none',
        paddingLeft: isRefuel ? 8 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            color: isRefuel ? '#C8A84B' : 'var(--t0)',
            fontSize: 10, fontWeight: 500,
          }}>
            {wp.name || wp.location || 'Waypoint'}
          </span>
          {isRefuel && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 2,
              background: 'rgba(200,168,75,0.1)', border: '0.5px solid rgba(200,168,75,0.25)',
              color: '#C8A84B', letterSpacing: '0.06em',
            }}>
              REFUEL
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 9, color: 'var(--t2)', flexWrap: 'wrap' }}>
          {wp.system && <span>{wp.system}</span>}
          {wp.material && <span>{wp.material}</span>}
          {wp.quality_pct != null && (
            <span style={{ color: wp.quality_pct >= 80 ? 'var(--live)' : wp.quality_pct >= 60 ? '#C8A84B' : 'var(--t2)' }}>
              {wp.quality_pct}%
            </span>
          )}
          {wp.risk_level && (
            <span style={{ color: RISK_COLORS[wp.risk_level] || 'var(--t2)' }}>
              {wp.risk_level}
            </span>
          )}
        </div>

        {wp.travel_minutes > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, fontSize: 8, color: 'var(--t3)' }}>
            <Clock size={8} /> {wp.travel_minutes}m travel
          </div>
        )}

        {wp.notes && (
          <div style={{ marginTop: 3, fontSize: 8, color: 'var(--t3)', lineHeight: 1.4, fontStyle: 'italic' }}>
            {wp.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepositRouteResults({ route, onClose, onBack }) {
  if (!route) return null;

  const {
    route_name,
    waypoints = [],
    total_session_minutes,
    total_estimated_yield_scu,
    safety_rating,
    safety_notes,
    route_summary,
  } = route;

  const depositCount = waypoints.filter(w => (w.type || '').toUpperCase() !== 'REFUEL').length;
  const refuelCount = waypoints.filter(w => (w.type || '').toUpperCase() === 'REFUEL').length;
  const safetyColor = SAFETY_COLORS[safety_rating] || '#C8A84B';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onBack}
            style={{
              padding: '3px 6px', fontSize: 9, cursor: 'pointer',
              background: 'var(--bg2)', border: '0.5px solid var(--b1)',
              borderRadius: 2, color: 'var(--t2)', fontFamily: 'inherit',
            }}
          >
            ←
          </button>
          <Route size={12} style={{ color: '#C8A84B' }} />
          <span style={{ color: '#C8A84B', fontSize: 10, letterSpacing: '0.15em', fontWeight: 600 }}>
            ROUTE PLAN
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '3px 8px', fontSize: 9, cursor: 'pointer',
            background: 'var(--bg2)', border: '0.5px solid var(--b1)',
            borderRadius: 2, color: 'var(--t2)', fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>

      {/* Route Name */}
      {route_name && (
        <div style={{
          color: 'var(--t0)', fontSize: 12, fontWeight: 500,
          paddingBottom: 6, borderBottom: '0.5px solid var(--b1)',
        }}>
          {route_name}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <StatCard label="DEPOSITS" value={depositCount} />
        <StatCard label="EST. TIME" value={`${total_session_minutes || 0}m`} color="#C8A84B" />
        <StatCard label="YIELD" value={`${(total_estimated_yield_scu || 0).toFixed(0)} SCU`} color="var(--live)" />
      </div>

      {/* Safety Banner */}
      <div style={{
        padding: '8px 10px', borderRadius: 2,
        borderLeft: `2px solid ${safetyColor}`,
        background: 'var(--bg2)',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <Shield size={12} style={{ color: safetyColor, flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: safetyColor, letterSpacing: '0.08em' }}>
            {(safety_rating || 'UNKNOWN').replace('_', ' ')}
          </div>
          {safety_notes && (
            <div style={{ fontSize: 9, color: 'var(--t2)', marginTop: 2, lineHeight: 1.4 }}>
              {safety_notes}
            </div>
          )}
        </div>
      </div>

      {/* Refuel info */}
      {refuelCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 9, color: '#C8A84B',
        }}>
          <Fuel size={10} />
          <span>{refuelCount} refueling stop{refuelCount > 1 ? 's' : ''} included</span>
        </div>
      )}

      {/* Summary */}
      {route_summary && (
        <div style={{
          fontSize: 9, color: 'var(--t2)', lineHeight: 1.5,
          padding: '8px 10px',
          borderLeft: '2px solid #C0392B',
          background: 'var(--bg2)',
          borderRadius: 2,
        }}>
          {route_summary}
        </div>
      )}

      {/* Waypoints */}
      <div>
        <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 8 }}>
          WAYPOINTS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {waypoints.map((wp, i) => (
            <WaypointCard key={i} wp={wp} isLast={i === waypoints.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}