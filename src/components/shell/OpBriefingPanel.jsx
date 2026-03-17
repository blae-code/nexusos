import React from 'react';
import { X } from 'lucide-react';

const STATUS_CONFIG = {
  LIVE:      { color: 'var(--live)',  bg: 'var(--live-bg)',  border: 'var(--live-b)' },
  PUBLISHED: { color: 'var(--cyan)',  bg: 'var(--cyan-bg)',  border: 'var(--cyan-b)' },
  DRAFT:     { color: 'var(--warn)',  bg: 'var(--warn-bg)',  border: 'var(--warn-b)' },
  COMPLETE:  { color: 'var(--t1)',    bg: 'var(--bg2)',      border: 'var(--b2)' },
  ARCHIVED:  { color: 'var(--t2)',    bg: 'var(--bg2)',      border: 'var(--b1)' },
};

export default function OpBriefingPanel({ op, rsvps, onClose }) {
  if (!op) return null;

  const statusCfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.DRAFT;
  const confirmed = (rsvps || []).filter(r => r.status === 'CONFIRMED');
  const phases = op.phases || [];
  const currentPhase = phases[op.phase_current || 0];

  return (
    <div className="detail-panel">
      {/* Header */}
      <div className="detail-panel-header">
        <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500, letterSpacing: '0.08em' }}>
          OPERATION BRIEF
        </span>
        <button className="detail-panel-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Mission Header */}
      <div className="detail-panel-section">
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
            {op.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{
              color: statusCfg.color,
              fontSize: 9,
              background: statusCfg.bg,
              border: `0.5px solid ${statusCfg.border}`,
              padding: '2px 8px',
              borderRadius: 3,
              letterSpacing: '0.08em',
            }}>
              {op.status}
            </span>
            <span style={{
              color: 'var(--t2)',
              fontSize: 9,
              background: 'var(--bg2)',
              border: '0.5px solid var(--b2)',
              padding: '2px 8px',
              borderRadius: 3,
            }}>
              {(op.type || '').replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Objective & Location */}
      <div className="detail-panel-section">
        <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>
          OBJECTIVE
        </div>
        <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
          {op.system}{op.location ? ` · ${op.location}` : ''}
        </div>
      </div>

      {/* Phase Progress */}
      {phases.length > 0 && (
        <div className="detail-panel-section">
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>
            PHASE PROGRESS
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {phases.map((p, i) => {
              const name = typeof p === 'object' ? p.name : p;
              const isDone = i < op.phase_current;
              const isCurrent = i === op.phase_current;
              return (
                <div key={i} style={{
                  padding: '3px 8px',
                  borderRadius: 3,
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  background: isCurrent ? 'rgba(var(--warn-rgb), 0.12)' : isDone ? 'var(--bg2)' : 'transparent',
                  border: `0.5px solid ${isCurrent ? 'rgba(var(--warn-rgb), 0.4)' : isDone ? 'var(--b1)' : 'transparent'}`,
                  color: isCurrent ? 'var(--warn)' : isDone ? 'var(--live)' : 'var(--t3)',
                }}>
                  {isDone ? '✓' : isCurrent ? '▶' : `${i + 1}`} {name || `P${i + 1}`}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RSVP Roster */}
      <div className="detail-panel-section">
        <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>
          CREW ({confirmed.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {confirmed.length === 0 ? (
            <div style={{ color: 'var(--t2)', fontSize: 10 }}>No confirmed crew</div>
          ) : (
            confirmed.map(rsvp => (
              <div key={rsvp.id} style={{ fontSize: 10 }}>
                <div style={{ color: 'var(--t0)', marginBottom: 2 }}>
                  {rsvp.callsign || rsvp.discord_id}
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 9 }}>
                  {rsvp.role}{rsvp.ship ? ` · ${rsvp.ship}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Readiness Gate */}
      {op.readiness_gate && op.readiness_gate.length > 0 && (
        <div className="detail-panel-section">
          <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>
            READINESS GATE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {op.readiness_gate.map((gate, i) => (
              <div key={i} style={{ fontSize: 10, color: 'var(--t1)' }}>
                {gate.requirement || gate}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}