/**
 * AARTimelineCard — After-Action Report timeline card for completed ops.
 * Shows phase progression, crew involved, revenue, and key session highlights.
 * Props: { op }
 */
import React from 'react';
import { Clock, Users, DollarSign, Zap, MapPin } from 'lucide-react';

function fmtAuec(n) {
  if (!n || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

function PhaseDot({ label, index, total, completed }) {
  const isComplete = index < completed;
  const isCurrent = index === completed;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: isComplete ? '#2edb7a' : isCurrent ? '#C8A84B' : '#2A2A24',
        border: `1px solid ${isComplete ? '#2edb7a' : isCurrent ? '#C8A84B' : '#5A5850'}`,
        transition: 'all 200ms',
      }} />
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
        color: isComplete ? '#2edb7a' : '#5A5850',
        marginTop: 4, textAlign: 'center', lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}>{typeof label === 'string' ? label : `P${index + 1}`}</span>
    </div>
  );
}

export default function AARTimelineCard({ op }) {
  const duration = op.started_at && op.ended_at
    ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000)
    : null;
  const phases = Array.isArray(op.phases) ? op.phases : [];
  const completedPhases = op.phase_current || phases.length;
  const wrapUp = op.wrap_up_data || {};
  const totalRevenue = (wrapUp.sales || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = (wrapUp.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const sessionLog = Array.isArray(op.session_log) ? op.session_log : [];
  const highlights = sessionLog
    .filter(e => e.type === 'MATERIAL' || e.type === 'THREAT' || e.type === 'PHASE')
    .slice(-4);

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: '0.5px solid rgba(200,170,100,0.10)',
      borderRight: '0.5px solid rgba(200,170,100,0.10)',
      borderBottom: '0.5px solid rgba(200,170,100,0.10)',
      borderRadius: 2, padding: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 15, color: '#E8E4DC', letterSpacing: '0.04em',
          }}>{op.name}</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            color: '#5A5850', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <MapPin size={9} />
            {[op.type?.replace(/_/g, ' '), op.system || op.system_name, op.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.1em',
        }}>
          {op.ended_at ? new Date(op.ended_at).toLocaleDateString() : '—'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      }}>
        {[
          { icon: Clock, label: 'DURATION', value: duration ? `${duration}m` : '—', color: '#9A9488' },
          { icon: Users, label: 'CREW', value: String(op._crew_count || '?'), color: '#9A9488' },
          { icon: DollarSign, label: 'REVENUE', value: fmtAuec(totalRevenue), color: '#2edb7a' },
          { icon: Zap, label: 'NET', value: fmtAuec(netProfit), color: netProfit >= 0 ? '#2edb7a' : '#C0392B' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '10px 14px',
            borderRight: '0.5px solid rgba(200,170,100,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
              <s.icon size={9} style={{ color: '#5A5850' }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
                color: '#5A5850', letterSpacing: '0.15em',
              }}>{s.label}</span>
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15,
              fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums',
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Phase timeline */}
      {phases.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
            color: '#5A5850', letterSpacing: '0.15em', marginBottom: 8,
          }}>PHASE PROGRESSION</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: 4, left: 12, right: 12, height: 1,
              background: 'rgba(200,170,100,0.10)',
            }}>
              <div style={{
                height: '100%',
                width: `${phases.length > 1 ? Math.min(100, (completedPhases / (phases.length - 1)) * 100) : 100}%`,
                background: '#2edb7a', transition: 'width 400ms',
              }} />
            </div>
            {phases.map((p, i) => (
              <PhaseDot
                key={i}
                label={typeof p === 'string' ? p : p?.name}
                index={i}
                total={phases.length}
                completed={completedPhases}
              />
            ))}
          </div>
        </div>
      )}

      {/* Key highlights */}
      {highlights.length > 0 && (
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
            color: '#5A5850', letterSpacing: '0.15em', marginBottom: 6,
          }}>KEY MOMENTS</div>
          {highlights.map((e, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, padding: '3px 0',
              borderBottom: i < highlights.length - 1 ? '0.5px solid rgba(200,170,100,0.03)' : 'none',
            }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                {e.t ? new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: '#9A9488', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{e.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Debrief snippet */}
      {op.wrap_up_report && (
        <div style={{
          padding: '10px 16px 14px',
          borderTop: '0.5px solid rgba(200,170,100,0.06)',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
            color: '#5A5850', letterSpacing: '0.15em', marginBottom: 6,
          }}>TACTICAL DEBRIEF</div>
          <div style={{
            fontFamily: "'Barlow', sans-serif", fontSize: 11,
            color: '#9A9488', lineHeight: 1.6,
            maxHeight: 60, overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(180deg, black 60%, transparent 100%)',
            maskImage: 'linear-gradient(180deg, black 60%, transparent 100%)',
          }}>{op.wrap_up_report}</div>
        </div>
      )}
    </div>
  );
}