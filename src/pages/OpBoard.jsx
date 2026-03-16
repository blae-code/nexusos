import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Plus, ChevronRight, Clock, Users, Layers,
  AlertTriangle, CheckCircle, Circle, Play,
  Shield, Crosshair, Wrench, MapPin, Zap
} from 'lucide-react';

const STATUS_COLORS = {
  DRAFT: 'var(--t2)', PUBLISHED: 'var(--info)', LIVE: 'var(--live)',
  COMPLETE: 'var(--acc)', ARCHIVED: 'var(--t3)',
};

const PHASES = [
  'STAGING', 'BREACH & CLEAR', 'POWER UP', 'CRAFT LENSES', 'FIRE LASER', 'HARVEST & EXTRACT',
];

const ROLE_ICONS = {
  mining: Zap, escort: Shield, fabricator: Wrench, scout: Crosshair,
};

function TimeAgo({ isoStr }) {
  if (!isoStr) return <span style={{ color: 'var(--t2)' }}>—</span>;
  const diff = Date.now() - new Date(isoStr);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return <span>{m}m ago</span>;
  return <span>{h}h {m}m ago</span>;
}

function RelativeTime({ isoStr }) {
  if (!isoStr) return <span style={{ color: 'var(--t2)' }}>—</span>;
  const diff = new Date(isoStr) - Date.now();
  if (diff < 0) return <span style={{ color: 'var(--warn)' }}>OVERDUE</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return <span>in {Math.floor(h / 24)}d {h % 24}h</span>;
  if (h > 0) return <span>in {h}h {m}m</span>;
  return <span style={{ color: 'var(--warn)' }}>in {m}m</span>;
}

function PhaseTracker({ phaseCurrent, onAdvance, canAdvance }) {
  return (
    <div className="flex items-center gap-0" style={{ overflow: 'auto' }}>
      {PHASES.map((phase, i) => {
        const done = i < phaseCurrent;
        const active = i === phaseCurrent;
        const future = i > phaseCurrent;

        return (
          <React.Fragment key={phase}>
            <div
              onClick={() => active && canAdvance && onAdvance(i + 1)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: active && canAdvance ? 'pointer' : 'default',
                padding: '8px 12px',
                borderRadius: 6,
                background: active ? 'rgba(74,143,208,0.1)' : 'transparent',
                border: active ? '0.5px solid rgba(74,143,208,0.3)' : '0.5px solid transparent',
                transition: 'all 0.15s',
                minWidth: 90,
                flex: 1,
              }}
              onMouseEnter={e => { if (active && canAdvance) e.currentTarget.style.background = 'rgba(74,143,208,0.18)'; }}
              onMouseLeave={e => { if (active && canAdvance) e.currentTarget.style.background = 'rgba(74,143,208,0.1)'; }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? 'var(--live)' : active ? 'var(--info)' : 'var(--bg3)',
                  border: `0.5px solid ${done ? 'var(--live)' : active ? 'var(--info)' : 'var(--b2)'}`,
                  fontSize: 10,
                  color: done || active ? '#07080b' : 'var(--t2)',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, letterSpacing: '0.06em', color: done ? 'var(--live)' : active ? 'var(--info)' : 'var(--t2)', textAlign: 'center', lineHeight: 1.3 }}>
                {phase}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{ height: 1, flex: 0.3, background: done ? 'var(--live)' : 'var(--b1)', opacity: 0.5 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function OpCard({ op, onClick }) {
  const statusColor = STATUS_COLORS[op.status] || 'var(--t2)';
  const rsvpCount = op._rsvp_count || 0;

  return (
    <div
      className="nexus-card"
      onClick={onClick}
      style={{ cursor: 'pointer', padding: '12px 14px' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{op.name}</span>
            <span className="nexus-tag" style={{ color: statusColor, borderColor: 'transparent', background: 'transparent' }}>{op.status}</span>
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginBottom: 6 }}>
            {op.type} · {op.system}{op.location ? ` · ${op.location}` : ''}
          </div>
          <div className="flex items-center gap-4" style={{ color: 'var(--t1)', fontSize: 11 }}>
            <span className="flex items-center gap-1"><Clock size={10}/> <RelativeTime isoStr={op.scheduled_at} /></span>
            <span className="flex items-center gap-1"><Users size={10}/> {rsvpCount} crew</span>
            {op.buy_in_cost > 0 && <span style={{ color: 'var(--warn)' }}>{op.buy_in_cost.toLocaleString()} aUEC buy-in</span>}
          </div>
        </div>
        {op.status === 'LIVE' && <div className="pulse-live" style={{ marginTop: 4 }}/>}
      </div>
      {op.status !== 'DRAFT' && op.status !== 'ARCHIVED' && (
        <div style={{ marginTop: 10 }}>
          <PhaseTracker phaseCurrent={op.phase_current || 0} onAdvance={() => {}} canAdvance={false} />
        </div>
      )}
    </div>
  );
}

function LiveOpView({ op, rsvps, rank, callsign, onAdvancePhase, onEndOp }) {
  const [logEntry, setLogEntry] = useState('');
  const [log, setLog] = useState(op.session_log || []);
  const [threatForm, setThreatForm] = useState(false);
  const canAdvance = ['PIONEER', 'FOUNDER', 'VOYAGER'].includes(rank);

  const submitLog = async () => {
    if (!logEntry.trim()) return;
    const entry = { t: new Date().toISOString(), author: callsign, text: logEntry };
    const newLog = [...log, entry];
    await base44.entities.Op.update(op.id, { session_log: newLog });
    setLog(newLog);
    setLogEntry('');
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const elapsed = op.started_at ? Math.floor((Date.now() - new Date(op.started_at)) / 60000) : 0;

  const crewByRole = rsvps.reduce((acc, r) => {
    if (!acc[r.role]) acc[r.role] = [];
    acc[r.role].push(r);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-auto">
      {/* Op header */}
      <div className="nexus-card" style={{ padding: '14px 16px' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="pulse-live" />
              <span style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.04em' }}>{op.name}</span>
              <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)' }}>LIVE</span>
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 11 }}>
              {op.system}{op.location ? ` · ${op.location}` : ''} · {rsvps.filter(r => r.status === 'CONFIRMED').length} confirmed crew
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>ELAPSED</div>
              <div style={{ color: 'var(--live)', fontSize: 14, fontWeight: 600 }}>{elapsed}m</div>
            </div>
            {canAdvance && (
              <button onClick={onEndOp} className="nexus-btn danger" style={{ padding: '6px 12px', fontSize: 11 }}>
                END OP
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <PhaseTracker
            phaseCurrent={op.phase_current || 0}
            onAdvance={onAdvancePhase}
            canAdvance={canAdvance}
          />
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left: crew + roles */}
        <div className="flex flex-col gap-3" style={{ flex: 1 }}>
          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>CREW MANIFEST</span>
              <span style={{ color: 'var(--t1)', fontSize: 11 }}>{rsvps.length} members</span>
            </div>
            <div style={{ padding: 8 }}>
              {Object.entries(crewByRole).map(([role, members]) => (
                <div key={role} style={{ marginBottom: 8 }}>
                  <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', padding: '4px 6px', textTransform: 'uppercase' }}>{role}</div>
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between" style={{ padding: '5px 8px', borderRadius: 4 }}>
                      <span style={{ color: 'var(--t0)', fontSize: 12 }}>{m.callsign}</span>
                      <span style={{ color: 'var(--t2)', fontSize: 10 }}>{m.ship || '—'}</span>
                    </div>
                  ))}
                </div>
              ))}
              {rsvps.length === 0 && (
                <div style={{ color: 'var(--t2)', fontSize: 11, padding: 12, textAlign: 'center' }}>No crew confirmed</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: session log */}
        <div className="flex flex-col gap-3" style={{ flex: 1 }}>
          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
              <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>SESSION LOG</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8, maxHeight: 240 }}>
              {log.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 6px', borderBottom: '0.5px solid var(--b0)' }}>
                  <span style={{ color: 'var(--t2)', fontSize: 10, flexShrink: 0 }}>{formatTime(entry.t)}</span>
                  <span style={{ color: 'var(--acc2)', fontSize: 10, flexShrink: 0 }}>{entry.author}</span>
                  <span style={{ color: 'var(--t1)', fontSize: 11, flex: 1 }}>{entry.text}</span>
                </div>
              ))}
              {log.length === 0 && (
                <div style={{ color: 'var(--t2)', fontSize: 11, padding: 12, textAlign: 'center' }}>No log entries yet</div>
              )}
            </div>
            <div style={{ padding: '8px', borderTop: '0.5px solid var(--b1)', display: 'flex', gap: 6 }}>
              <input
                className="nexus-input"
                style={{ fontSize: 11, padding: '5px 10px' }}
                placeholder="Add log entry..."
                value={logEntry}
                onChange={e => setLogEntry(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitLog(); }}
              />
              <button onClick={submitLog} className="nexus-btn" style={{ padding: '5px 10px', fontSize: 10, flexShrink: 0 }}>ADD</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OpBoard() {
  const { rank, callsign } = useOutletContext() || {};
  const navigate = useNavigate();
  const [ops, setOps] = useState([]);
  const [selectedOp, setSelectedOp] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [view, setView] = useState('list');

  const load = async () => {
    const data = await base44.entities.Op.list('-scheduled_at', 50);
    setOps(data || []);
  };

  useEffect(() => { load(); }, []);

  const selectOp = async (op) => {
    setSelectedOp(op);
    const r = await base44.entities.OpRsvp.filter({ op_id: op.id });
    setRsvps(r || []);
    setView(op.status === 'LIVE' ? 'live' : 'detail');
  };

  const advancePhase = async (newPhase) => {
    if (!selectedOp) return;
    await base44.entities.Op.update(selectedOp.id, { phase_current: newPhase });
    setSelectedOp(op => ({ ...op, phase_current: newPhase }));
    load();
  };

  const endOp = async () => {
    if (!selectedOp) return;
    const endedAt = new Date().toISOString();
    await base44.entities.Op.update(selectedOp.id, { status: 'COMPLETE', ended_at: endedAt });
    // Fire-and-forget: Claude debrief + Discord post (non-blocking)
    base44.functions.invoke('opWrapUp', { op_id: selectedOp.id }).catch(e => console.warn('[opWrapUp]', e));
    setSelectedOp(null);
    setView('list');
    load();
  };

  const liveOp = ops.find(o => o.status === 'LIVE');
  const upcoming = ops.filter(o => o.status === 'PUBLISHED').sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const past = ops.filter(o => ['COMPLETE', 'ARCHIVED'].includes(o.status)).slice(0, 10);

  const canCreate = ['PIONEER', 'FOUNDER', 'VOYAGER'].includes(rank);

  return (
    <div className="flex h-full" style={{ overflow: 'hidden' }}>
      {/* Left — op list */}
      <div
        className="flex flex-col"
        style={{ width: 340, borderRight: '0.5px solid var(--b1)', flexShrink: 0, overflow: 'auto' }}
      >
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}
        >
          <span style={{ color: 'var(--t1)', fontSize: 11, letterSpacing: '0.08em' }}>OPS</span>
          {canCreate && (
            <button onClick={() => navigate('/app/ops/new')} className="nexus-btn primary" style={{ padding: '4px 10px', fontSize: 10 }}>
              <Plus size={11} /> NEW OP
            </button>
          )}
        </div>

        <div className="flex flex-col gap-0 p-3 flex-1 overflow-auto">
          {/* Live */}
          {liveOp && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.14em', padding: '0 2px 6px' }}>LIVE NOW</div>
              <OpCard op={liveOp} onClick={() => selectOp(liveOp)} />
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.14em', padding: '0 2px 6px' }}>UPCOMING</div>
              <div className="flex flex-col gap-2">
                {upcoming.map(op => <OpCard key={op.id} op={op} onClick={() => selectOp(op)} />)}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.14em', padding: '0 2px 6px' }}>RECENT</div>
              <div className="flex flex-col gap-2">
                {past.map(op => <OpCard key={op.id} op={op} onClick={() => selectOp(op)} />)}
              </div>
            </div>
          )}

          {ops.length === 0 && (
            <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', padding: 30 }}>No ops yet</div>
          )}
        </div>
      </div>

      {/* Right — detail / live view */}
      <div className="flex-1 overflow-auto">
        {view === 'live' && selectedOp ? (
          <LiveOpView op={selectedOp} rsvps={rsvps} rank={rank} callsign={callsign} onAdvancePhase={advancePhase} onEndOp={endOp} />
        ) : selectedOp ? (
          <OpDetail op={selectedOp} rsvps={rsvps} rank={rank} callsign={callsign} onActivate={async () => {
            await base44.entities.Op.update(selectedOp.id, { status: 'LIVE', started_at: new Date().toISOString() });
            setSelectedOp(o => ({ ...o, status: 'LIVE', started_at: new Date().toISOString() }));
            setView('live');
            load();
          }} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--t2)', fontSize: 13 }}>
            <Crosshair size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <span>Select an op to view details</span>
            {canCreate && (
              <button onClick={() => navigate('/app/ops/new')} className="nexus-btn primary" style={{ marginTop: 16, padding: '8px 20px' }}>
                <Plus size={13} /> CREATE NEW OP
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OpDetail({ op, rsvps, rank, callsign, onActivate }) {
  const canActivate = ['PIONEER', 'FOUNDER'].includes(rank) && op.status === 'PUBLISHED';
  const confirmedCrew = rsvps.filter(r => r.status === 'CONFIRMED');

  const handleRsvp = async (role) => {
    const discord_id = localStorage.getItem('nexus_discord_id') || '';
    const existing = rsvps.find(r => r.discord_id === discord_id);
    if (existing) {
      await base44.entities.OpRsvp.update(existing.id, { role, status: 'CONFIRMED', ship: '' });
    } else {
      await base44.entities.OpRsvp.create({ op_id: op.id, discord_id, callsign, role, status: 'CONFIRMED' });
    }
  };

  const roleSlots = op.role_slots || { mining: { capacity: 3 }, escort: { capacity: 2 }, scout: { capacity: 2 } };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="nexus-card" style={{ padding: '14px 16px' }}>
        <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{op.name}</div>
        <div style={{ color: 'var(--t2)', fontSize: 11 }}>{op.type} · {op.system}{op.location ? ` · ${op.location}` : ''}</div>
        <div className="flex items-center gap-4 mt-3" style={{ color: 'var(--t1)', fontSize: 11 }}>
          <span className="flex items-center gap-1"><Clock size={11}/> <RelativeTime isoStr={op.scheduled_at} /></span>
          <span className="flex items-center gap-1"><Users size={11}/> {confirmedCrew.length} confirmed</span>
          {op.access_type && <span className="nexus-tag" style={{ color: 'var(--info)', borderColor: 'rgba(74,143,208,0.2)', background: 'transparent' }}>{op.access_type}</span>}
        </div>
        {canActivate && (
          <button onClick={onActivate} className="nexus-btn live-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center', padding: '8px 0' }}>
            <Play size={12} /> ACTIVATE OP — GO LIVE
          </button>
        )}
      </div>

      {/* RSVP */}
      <div className="nexus-card" style={{ padding: '12px 14px' }}>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 10 }}>ROLE RSVP</div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(roleSlots).map(([role, slot]) => {
            const filled = rsvps.filter(r => r.role === role && r.status === 'CONFIRMED').length;
            const capacity = slot.capacity || 0;
            const full = filled >= capacity;
            return (
              <button
                key={role}
                onClick={() => handleRsvp(role)}
                disabled={full}
                className="nexus-btn"
                style={{ opacity: full ? 0.5 : 1, flexDirection: 'column', gap: 2, padding: '8px 14px', alignItems: 'center' }}
              >
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</span>
                <span style={{ fontSize: 10, color: full ? 'var(--danger)' : 'var(--live)' }}>{filled}/{capacity}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Crew list */}
      {confirmedCrew.length > 0 && (
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
            <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em' }}>CONFIRMED CREW</span>
          </div>
          {confirmedCrew.map(r => (
            <div key={r.id} className="flex items-center justify-between" style={{ padding: '7px 14px', borderBottom: '0.5px solid var(--b0)' }}>
              <span style={{ color: 'var(--t0)', fontSize: 12 }}>{r.callsign}</span>
              <span className="nexus-tag" style={{ color: 'var(--info)', borderColor: 'rgba(74,143,208,0.2)', background: 'transparent', fontSize: 9 }}>{r.role?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}