/**
 * MissionControlPanel — real-time metrics dashboard during live ops.
 * Shows crew status, threat summary, loot overview, elapsed time, and phase progress.
 * Props: { op, rsvps, callsign, rank }
 */
import React, { useEffect, useState } from 'react';
import { Users, Package, AlertTriangle, Clock, Activity } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, valueColor, subtext, accent }) {
  return (
    <div style={{
      background: '#0F0F0D',
      border: `0.5px solid ${accent ? `${accent}33` : 'rgba(200,170,100,0.10)'}`,
      borderLeft: `2px solid ${accent || '#C0392B'}`,
      borderRadius: 2,
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={11} style={{ color: accent || '#9A9488', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22,
        fontWeight: 700, color: valueColor || '#E8E4DC',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{value}</div>
      {subtext && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850',
        }}>{subtext}</span>
      )}
    </div>
  );
}

function CrewStatusRow({ rsvp }) {
  const roleColor = getRoleColor(rsvp.role);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 0',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#2edb7a', flexShrink: 0,
        animation: 'pulse-dot 2.5s ease-in-out infinite',
      }} />
      <span style={{
        flex: 1, fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, color: '#E8E4DC', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{rsvp.callsign || '—'}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: roleColor, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{rsvp.role || 'UNASSIGNED'}</span>
      {rsvp.ship && (
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', fontStyle: 'italic',
        }}>{rsvp.ship}</span>
      )}
    </div>
  );
}

function getRoleColor(roleName) {
  const lower = (roleName || '').toLowerCase();
  if (lower.includes('mining') || lower.includes('miner')) return '#7AAECC';
  if (lower.includes('escort') || lower.includes('combat') || lower.includes('fighter')) return '#C0392B';
  if (lower.includes('fabricator') || lower.includes('craft')) return '#D8BC70';
  if (lower.includes('scout') || lower.includes('recon')) return '#2edb7a';
  if (lower.includes('hauler') || lower.includes('cargo') || lower.includes('logistics')) return '#C8A84B';
  if (lower.includes('salvage')) return '#C8A84B';
  if (lower.includes('medic') || lower.includes('medical')) return '#2edb7a';
  return '#9A9488';
}

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

export default function MissionControlPanel({ op, rsvps = [], callsign, rank }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!op?.started_at) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(op.started_at)) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [op?.started_at]);

  const log = Array.isArray(op?.session_log) ? op.session_log : [];
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const slots = normalizeRoleSlots(op?.role_slots);
  const totalSlots = slots.reduce((s, r) => s + r.capacity, 0);

  // Threats
  const resolved = new Set(log.filter(e => e.type === 'THREAT_RESOLVED').map(e => e.threat_id));
  const activeThreats = log.filter(e => e.type === 'THREAT' && !resolved.has(e.id));

  // Loot
  const loot = log.filter(e => e.type === 'MATERIAL');
  const totalSCU = loot.reduce((s, e) => s + (e.quantity_scu || 0), 0);

  // Phases
  const phases = Array.isArray(op?.phases) ? op.phases : [];
  const currentPhase = op?.phase_current || 0;

  // Elapsed format
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const elapsedStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // Role distribution
  const roleMap = {};
  confirmed.forEach(r => {
    const role = r.role || 'UNASSIGNED';
    roleMap[role] = (roleMap[role] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <MetricCard
          icon={Clock}
          label="ELAPSED"
          value={elapsedStr}
          valueColor="#C8A84B"
          accent="#C8A84B"
        />
        <MetricCard
          icon={Users}
          label="CREW"
          value={`${confirmed.length}/${totalSlots}`}
          valueColor={confirmed.length >= totalSlots ? '#2edb7a' : '#E8E4DC'}
          subtext={`${Object.keys(roleMap).length} roles active`}
          accent="#2edb7a"
        />
        <MetricCard
          icon={AlertTriangle}
          label="THREATS"
          value={activeThreats.length}
          valueColor={activeThreats.length > 0 ? '#C0392B' : '#5A5850'}
          subtext={activeThreats.length > 0 ? `${activeThreats[0]?.severity || 'ACTIVE'}` : 'All clear'}
          accent={activeThreats.length > 0 ? '#C0392B' : '#5A5850'}
        />
        <MetricCard
          icon={Package}
          label="LOOT"
          value={`${totalSCU.toFixed(1)}`}
          valueColor="#C8A84B"
          subtext={`${loot.length} entries · SCU`}
          accent="#C8A84B"
        />
        <MetricCard
          icon={Activity}
          label="PHASE"
          value={`${Math.min(phases.length, currentPhase + 1)}/${phases.length || 1}`}
          subtext={phases[currentPhase] ? (typeof phases[currentPhase] === 'object' ? phases[currentPhase].name : phases[currentPhase]) : '—'}
          accent="#C0392B"
        />
      </div>

      {/* Role distribution bar */}
      {Object.keys(roleMap).length > 0 && (
        <div style={{
          background: '#0F0F0D',
          border: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, padding: '10px 14px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>ROLE DISTRIBUTION</div>
          <div style={{ display: 'flex', gap: 4, height: 6, borderRadius: 3, overflow: 'hidden' }}>
            {Object.entries(roleMap).map(([role, count]) => (
              <div key={role} style={{
                flex: count,
                background: getRoleColor(role),
                borderRadius: 2,
                minWidth: 4,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {Object.entries(roleMap).map(([role, count]) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: getRoleColor(role) }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                  color: '#9A9488', textTransform: 'uppercase',
                }}>{role} ({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active crew roster */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '10px 14px',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
          color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>ACTIVE CREW</div>
        {confirmed.length === 0 ? (
          <div style={{ color: '#5A5850', fontSize: 11, padding: '8px 0' }}>No crew confirmed</div>
        ) : (
          confirmed.map(r => <CrewStatusRow key={r.id} rsvp={r} />)
        )}
      </div>

      {/* Active threats mini-feed */}
      {activeThreats.length > 0 && (
        <div style={{
          background: 'rgba(192,57,43,0.04)',
          border: '0.5px solid rgba(192,57,43,0.20)',
          borderLeft: '2px solid #C0392B',
          borderRadius: 2, padding: '10px 14px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
            color: '#C0392B', letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%', background: '#C0392B',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            ACTIVE THREATS
          </div>
          {activeThreats.slice(0, 3).map((t, i) => (
            <div key={t.id || i} style={{
              fontSize: 11, color: '#E8E4DC', padding: '4px 0',
              borderBottom: i < Math.min(activeThreats.length, 3) - 1 ? '0.5px solid rgba(192,57,43,0.10)' : 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}