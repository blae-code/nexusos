/**
 * OpReviewStep — Tactical briefing dossier summarizing the full op before publish.
 */
import React from 'react';

function BriefingRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 500,
        color: accent || '#E8E4DC', letterSpacing: '0.04em',
      }}>{value || '—'}</span>
    </div>
  );
}

const SYSTEM_COLORS = { STANTON: '#7AAECC', PYRO: '#C0392B', NYX: '#9B59B6' };

export default function OpReviewStep({ form, roleSlots, phases, settings }) {
  const totalCrew = roleSlots.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const systemColor = SYSTEM_COLORS[form.system_name] || '#9A9488';

  const scheduledDisplay = form.scheduled_at
    ? new Date(form.scheduled_at + 'Z').toLocaleString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
      }) + ' UTC'
    : 'Not set';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Watermark compass */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        opacity: 0.03, pointerEvents: 'none',
      }}>
        <svg width="120" height="120" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
          <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
          <circle cx="22" cy="22" r="7" fill="#C0392B" />
          <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
          <line x1="22" y1="2" x2="22" y2="7.5" stroke="#E8E4DC" strokeWidth="1.2" strokeLinecap="round" />
          <polygon points="22,2 20.2,12 22,10.5 23.8,12" fill="#E8E4DC" />
        </svg>
      </div>

      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(200,170,100,0.08)',
        background: 'linear-gradient(135deg, rgba(192,57,43,0.04) 0%, transparent 60%)',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
          color: '#C0392B', letterSpacing: '0.25em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>MISSION BRIEFING</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700,
          color: '#E8E4DC', letterSpacing: '0.04em', textTransform: 'uppercase',
          lineHeight: 1.1,
        }}>{form.name || 'Unnamed Operation'}</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: '#5A5850', letterSpacing: '0.06em', marginTop: 6,
        }}>
          {form.type} · {form.system_name} · {form.access_type}
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '16px 24px' }}>
        <BriefingRow label="Operation Type" value={form.type} />
        <BriefingRow label="Star System" value={form.system_name} accent={systemColor} />
        <BriefingRow label="Location" value={form.location} />
        <BriefingRow label="Scheduled" value={scheduledDisplay} accent="#C8A84B" />
        <BriefingRow label="Access" value={form.access_type === 'EXCLUSIVE' ? `EXCLUSIVE — ${(form.buy_in_cost || 0).toLocaleString()} aUEC buy-in` : 'OPEN'} />
        <BriefingRow label="Rank Gate" value={form.rank_gate === 'AFFILIATE' ? 'Any rank' : `${form.rank_gate}+`} />
      </div>

      {/* Crew manifest */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(200,170,100,0.06)',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>CREW MANIFEST — {totalCrew} SLOTS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roleSlots.map((slot, i) => (
            <div key={i} style={{
              padding: '6px 12px',
              background: 'rgba(200,170,100,0.04)',
              border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              color: '#E8E4DC',
            }}>
              {slot.name || 'Unnamed'} <span style={{ color: '#5A5850' }}>×{slot.capacity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase timeline */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(200,170,100,0.06)',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>OPERATION PHASES</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {phases.map((phase, i) => (
            <React.Fragment key={i}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                background: '#0C0C0A',
                border: '0.5px solid rgba(200,170,100,0.08)',
                borderRadius: 2,
              }}>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                  color: '#5A5850',
                }}>{i + 1}</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                  color: '#9A9488',
                }}>{phase || 'Unnamed'}</span>
              </div>
              {i < phases.length - 1 && (
                <span style={{ color: '#3A3830', fontSize: 10, margin: '0 4px' }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Settings summary */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(200,170,100,0.06)',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>SETTINGS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Late Joins', active: settings.allowLateJoins },
            { label: 'Private', active: settings.hideFromNonMembers },
            { label: 'Loot Tally', active: settings.logLootTally },
            { label: 'Auto Split', active: settings.calcSplitOnClose },
          ].map(s => (
            <div key={s.label} style={{
              padding: '4px 10px',
              background: s.active ? 'rgba(74,140,92,0.08)' : 'rgba(90,88,80,0.08)',
              border: `0.5px solid ${s.active ? 'rgba(74,140,92,0.20)' : 'rgba(90,88,80,0.15)'}`,
              borderRadius: 2,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: s.active ? '#4A8C5C' : '#5A5850',
            }}>
              {s.active ? '●' : '○'} {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}