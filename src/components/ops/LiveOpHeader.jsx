/**
 * LiveOpHeader — Op identity bar + status controls
 * Shows op name, type, system/location, elapsed timer, phase progress,
 * and the Go/End/Threat action buttons for Op Leaders.
 */
import React, { useEffect, useState } from 'react';

function elapsed(startedAt) {
  if (!startedAt) return null;
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export default function LiveOpHeader({ op, canLead, onGoLive, onEndOp, onThreatAlert, onPhaseAdvance }) {
  const [timer, setTimer] = useState(() => elapsed(op.started_at));

  useEffect(() => {
    if (op.status !== 'LIVE' || !op.started_at) return;
    const id = setInterval(() => setTimer(elapsed(op.started_at)), 1000);
    return () => clearInterval(id);
  }, [op.status, op.started_at]);

  const phases = op.phases || [];
  const currentPhase = op.phase_current || 0;

  const statusConfig = {
    DRAFT:      { label: 'DRAFT',      color: 'var(--warn)',   bg: 'var(--warn-bg)',   border: 'var(--warn-b)'   },
    PUBLISHED:  { label: 'PUBLISHED',  color: 'var(--info)',   bg: 'var(--info-bg)',   border: 'var(--info-b)'   },
    LIVE:       { label: 'LIVE',       color: 'var(--live)',   bg: 'var(--live-bg)',   border: 'var(--live-b)'   },
    COMPLETE:   { label: 'COMPLETE',   color: 'var(--acc)',    bg: 'var(--bg2)',       border: 'var(--b2)'       },
    ARCHIVED:   { label: 'ARCHIVED',   color: 'var(--t2)',     bg: 'var(--bg2)',       border: 'var(--b1)'       },
  };
  const sc = statusConfig[op.status] || statusConfig.DRAFT;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      padding: '10px 16px',
      background: 'var(--bg1)',
      borderBottom: '0.5px solid var(--b1)',
    }}>
      {/* Status dot */}
      {op.status === 'LIVE' && (
        <div className="pulse-live" style={{ flexShrink: 0 }} />
      )}

      {/* Op identity */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {op.name}
          </span>
          <span className="nexus-tag" style={{ color: sc.color, background: sc.bg, borderColor: sc.border, flexShrink: 0 }}>
            {sc.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>{op.type?.replace(/_/g, ' ')}</span>
          <span style={{ color: 'var(--t3)', fontSize: 10 }}>·</span>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>{op.system}{op.location ? ` · ${op.location}` : ''}</span>
          {op.access_type && (
            <>
              <span style={{ color: 'var(--t3)', fontSize: 10 }}>·</span>
              <span style={{ color: 'var(--t2)', fontSize: 10 }}>{op.access_type}</span>
            </>
          )}
        </div>
      </div>

      {/* Phase tracker */}
      {phases.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {phases.map((phase, i) => {
            const done = i < currentPhase;
            const active = i === currentPhase;
            return (
              <React.Fragment key={i}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: active ? 'rgba(232,160,32,0.1)' : done ? 'rgba(39,201,106,0.07)' : 'var(--bg2)',
                  border: `0.5px solid ${active ? 'var(--warn)' : done ? 'rgba(39,201,106,0.25)' : 'var(--b1)'}`,
                }}>
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: active ? 'var(--warn)' : done ? 'var(--live)' : 'var(--b2)',
                  }} />
                  <span style={{ color: active ? 'var(--warn)' : done ? 'var(--live)' : 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {(phase.name || phase).toString().toUpperCase()}
                  </span>
                </div>
                {i < phases.length - 1 && (
                  <div style={{ width: 8, height: '0.5px', background: done ? 'var(--live)' : 'var(--b1)' }} />
                )}
              </React.Fragment>
            );
          })}
          {canLead && op.status === 'LIVE' && currentPhase < phases.length - 1 && (
            <button
              onClick={() => onPhaseAdvance(currentPhase + 1)}
              className="nexus-btn"
              style={{ marginLeft: 6, padding: '3px 8px', fontSize: 9, letterSpacing: '0.06em' }}
            >
              NEXT PHASE →
            </button>
          )}
        </div>
      )}

      {/* Timer */}
      {op.status === 'LIVE' && timer && (
        <div style={{
          padding: '4px 10px',
          background: 'var(--live-bg)',
          border: '0.5px solid var(--live-b)',
          borderRadius: 5,
          color: 'var(--live)',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          letterSpacing: '0.06em',
        }}>
          {timer}
        </div>
      )}

      {/* Action buttons */}
      {canLead && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {op.status === 'PUBLISHED' && (
            <button onClick={onGoLive} className="nexus-btn live-btn" style={{ padding: '5px 14px', fontSize: 10 }}>
              GO LIVE
            </button>
          )}
          {op.status === 'LIVE' && (
            <>
              <button
                onClick={onThreatAlert}
                className="nexus-btn danger-btn"
                style={{ padding: '5px 10px', fontSize: 10 }}
              >
                ⚠ THREAT
              </button>
              <button
                onClick={onEndOp}
                className="nexus-btn"
                style={{ padding: '5px 14px', fontSize: 10, color: 'var(--warn)', borderColor: 'var(--warn-b)', background: 'var(--warn-bg)' }}
              >
                END OP
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}