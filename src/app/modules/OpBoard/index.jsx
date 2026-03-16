/**
 * Op Board list view — LIVE | UPCOMING | ARCHIVE
 * Props: { rank, callsign, discordId }
 * discordId: pass from page via useOutletContext; module fetches via auth.me() as fallback
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Users, Clock, ChevronRight, X, Check, Minus } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];
const VOYAGER_RANKS  = ['PIONEER', 'FOUNDER', 'VOYAGER'];
const SECTION_TABS   = ['LIVE', 'UPCOMING', 'ARCHIVE'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = new Date(isoStr) - Date.now();
  if (diff < 0) {
    const past = Math.abs(diff);
    const h = Math.floor(past / 3600000);
    const m = Math.floor((past % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ${m}m ago`;
    return `${m}m ago`;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return <span style={{ color: 'var(--warn)' }}>in {m}m</span>;
}

function utcString(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toUTCString().replace(':00 GMT', ' UTC');
}

/** Normalise role_slots regardless of whether stored as array or legacy object */
function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, val]) => ({
    name,
    capacity: typeof val === 'number' ? val : (val?.capacity || 1),
  }));
}

function totalCapacity(slots) {
  return normalizeRoleSlots(slots).reduce((s, r) => s + (r.capacity || 0), 0);
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function TypeTag({ type }) {
  return (
    <span style={{
      fontSize: 9, padding: '1px 6px', borderRadius: 4,
      border: '0.5px solid var(--b2)', background: 'var(--bg3)',
      color: 'var(--t2)', letterSpacing: '0.06em', flexShrink: 0,
    }}>{type}</span>
  );
}

// ─── Elapsed timer (live, tabular-nums) ───────────────────────────────────────

function ElapsedTimer({ startedAt }) {
  const [secs, setSecs] = useState(() =>
    startedAt ? Math.floor((Date.now() - new Date(startedAt)) / 1000) : 0
  );

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() =>
      setSecs(Math.floor((Date.now() - new Date(startedAt)) / 1000)), 1000
    );
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const str = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--live)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>
      {str}
    </span>
  );
}

// ─── Overlay (position:absolute, scoped to positioned container) ──────────────

function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(7,8,11,0.86)', zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      {children}
    </div>
  );
}

function DialogCard({ children, width = 420 }) {
  return (
    <div className="nexus-fade-in" style={{
      width, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
      borderRadius: 10, padding: 24, maxHeight: '80vh', overflowY: 'auto',
    }}>
      {children}
    </div>
  );
}

// ─── RSVP dialog ──────────────────────────────────────────────────────────────

function RSVPDialog({ op, rsvps, discordId, callsign, onClose, onRefresh }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const slots        = normalizeRoleSlots(op.role_slots);
  const existing     = rsvps.find(r => String(r.discord_id) === String(discordId));

  const submit = async (role, status = 'CONFIRMED') => {
    setSubmitting(true);
    try {
      if (existing) {
        await base44.entities.OpRsvp.update(existing.id, { role, status });
      } else {
        await base44.entities.OpRsvp.create({
          op_id:      op.id,
          discord_id: discordId,
          callsign,
          role,
          status,
        });
      }
      setDone(true);
      onRefresh?.();
      setTimeout(onClose, 800);
    } catch (e) {
      console.error('[OpBoard] RSVP failed:', e);
    }
    setSubmitting(false);
  };

  const decline = async () => {
    setSubmitting(true);
    try {
      if (existing) {
        await base44.entities.OpRsvp.update(existing.id, { status: 'DECLINED' });
      } else {
        await base44.entities.OpRsvp.create({
          op_id: op.id, discord_id: discordId, callsign, role: '', status: 'DECLINED',
        });
      }
      setDone(true);
      onRefresh?.();
      setTimeout(onClose, 800);
    } catch (e) {
      console.error('[OpBoard] RSVP decline failed:', e);
    }
    setSubmitting(false);
  };

  return (
    <Overlay onDismiss={onClose}>
      <DialogCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>
            RSVP — {op.name}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Check size={24} style={{ color: 'var(--live)', margin: '0 auto 8px' }} />
            <div style={{ color: 'var(--live)', fontSize: 12 }}>RSVP recorded.</div>
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 10 }}>SELECT YOUR ROLE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {slots.map((slot, i) => {
                const filled   = rsvps.filter(r => r.role === slot.name && r.status === 'CONFIRMED').length;
                const full     = filled >= slot.capacity;
                const selected = existing?.role === slot.name && existing?.status === 'CONFIRMED';
                return (
                  <button
                    key={i}
                    onClick={() => !full && submit(slot.name)}
                    disabled={full || submitting}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: 6, cursor: full ? 'not-allowed' : 'pointer',
                      background: selected ? 'rgba(39,201,106,0.08)' : 'var(--bg3)',
                      border: `0.5px solid ${selected ? 'rgba(39,201,106,0.3)' : 'var(--b2)'}`,
                      opacity: full ? 0.5 : 1, fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ color: selected ? 'var(--live)' : 'var(--t0)', fontSize: 12, fontWeight: selected ? 600 : 400, letterSpacing: '0.05em' }}>
                      {slot.name.toUpperCase()}
                      {selected && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--live)' }}>✓ SELECTED</span>}
                    </span>
                    <span style={{ color: full ? 'var(--danger)' : 'var(--t1)', fontSize: 11 }}>
                      {filled}/{slot.capacity}{full ? ' — FULL' : ''}
                    </span>
                  </button>
                );
              })}
              {slots.length === 0 && (
                <div style={{ color: 'var(--t2)', fontSize: 11, padding: '8px 0' }}>No roles defined for this op.</div>
              )}
            </div>

            <button
              onClick={decline}
              disabled={submitting}
              style={{
                width: '100%', padding: '7px 0', borderRadius: 6,
                background: 'transparent', border: '0.5px solid var(--b2)',
                color: 'var(--t2)', fontSize: 11, letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              DECLINE OP
            </button>
          </>
        )}
      </DialogCard>
    </Overlay>
  );
}

// ─── Live op card ─────────────────────────────────────────────────────────────

function LiveOpCard({ op, rsvps, onEnter }) {
  const slots      = normalizeRoleSlots(op.role_slots);
  const cap        = slots.reduce((s, r) => s + r.capacity, 0);
  const confirmed  = rsvps.filter(r => r.status === 'CONFIRMED').length;
  const phases     = Array.isArray(op.phases) ? op.phases : [];
  const phaseName  = phases[op.phase_current || 0] || null;
  const readyPct   = cap > 0 ? Math.min((confirmed / cap) * 100, 100) : 0;
  const isReady    = readyPct >= 100;

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid rgba(39,201,106,0.25)',
      borderRadius: 10, padding: '16px 18px',
    }}>
      {/* Row 1: indicator + name + type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="pulse-live" style={{ flexShrink: 0 }} />
        <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.name}
        </span>
        <TypeTag type={op.type} />
        <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.06)', flexShrink: 0 }}>LIVE</span>
      </div>

      {/* Row 2: meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--t1)', fontSize: 11 }}>
          {[op.system_name, op.location].filter(Boolean).join(' · ')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Clock size={10} style={{ color: 'var(--t2)' }} />
          <ElapsedTimer startedAt={op.started_at} />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--t1)', fontSize: 11 }}>
          <Users size={10} style={{ color: 'var(--t2)' }} />
          {confirmed}/{cap} crew
        </span>
        {phaseName && (
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
            border: '0.5px solid rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.06)',
            color: 'var(--warn)', letterSpacing: '0.07em', fontWeight: 600,
          }}>
            {phaseName.toUpperCase()}
          </span>
        )}
      </div>

      {/* Row 3: readiness bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>READINESS GATE</span>
          <span style={{ color: isReady ? 'var(--live)' : 'var(--warn)', fontSize: 9, fontWeight: 600 }}>
            {readyPct.toFixed(0)}%{isReady ? ' — FULL' : ''}
          </span>
        </div>
        <div style={{ height: 2, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 1, transition: 'width 0.4s ease',
            width: `${readyPct}%`,
            background: isReady ? 'var(--live)' : 'var(--warn)',
          }} />
        </div>
      </div>

      {/* Row 4: action */}
      <button
        onClick={onEnter}
        className="nexus-btn"
        style={{
          width: '100%', justifyContent: 'center', padding: '8px 0', fontSize: 11,
          background: 'rgba(39,201,106,0.06)', borderColor: 'rgba(39,201,106,0.25)',
          color: 'var(--live)', letterSpacing: '0.08em',
        }}
      >
        ENTER OP <ChevronRight size={12} />
      </button>
    </div>
  );
}

// ─── Upcoming op card ─────────────────────────────────────────────────────────

function UpcomingCard({ op, userRsvp, onRsvp, onView }) {
  const slots = normalizeRoleSlots(op.role_slots);
  const rsvpStatus = userRsvp?.status;

  const rsvpColor = rsvpStatus === 'CONFIRMED' ? 'var(--live)'
    : rsvpStatus === 'DECLINED'  ? 'var(--danger)'
    : null;

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--b1)',
      borderRadius: 8, padding: '12px 14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {op.name}
            </span>
            <TypeTag type={op.type} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10 }}>
            {[op.system_name, op.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        {rsvpColor && (
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
            border: `0.5px solid ${rsvpColor}50`, background: `${rsvpColor}12`,
            color: rsvpColor, letterSpacing: '0.07em', fontWeight: 600,
          }}>
            {rsvpStatus}
          </span>
        )}
      </div>

      {/* Scheduled time */}
      <div
        title={utcString(op.scheduled_at)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--t1)', fontSize: 11, marginBottom: 10, cursor: 'default' }}
      >
        <Clock size={10} style={{ color: 'var(--t2)', flexShrink: 0 }} />
        {relativeTime(op.scheduled_at)}
        {op.buy_in_cost > 0 && (
          <span style={{ marginLeft: 6, color: 'var(--warn)', fontSize: 10 }}>
            {op.buy_in_cost.toLocaleString()} aUEC
          </span>
        )}
      </div>

      {/* Role slots */}
      {slots.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {slots.map((slot, i) => (
            <span key={i} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 4,
              border: '0.5px solid var(--b2)', background: 'var(--bg3)',
              color: 'var(--t1)', letterSpacing: '0.05em',
            }}>
              {slot.name.toUpperCase()} ×{slot.capacity}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onRsvp}
          className="nexus-btn"
          style={{
            flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: 10,
            background: rsvpStatus === 'CONFIRMED' ? 'rgba(39,201,106,0.06)' : 'var(--bg3)',
            borderColor: rsvpStatus === 'CONFIRMED' ? 'rgba(39,201,106,0.3)' : 'var(--b2)',
            color: rsvpStatus === 'CONFIRMED' ? 'var(--live)' : 'var(--t0)',
          }}
        >
          {rsvpStatus === 'CONFIRMED' ? 'CHANGE RSVP' : rsvpStatus === 'DECLINED' ? 'CHANGE RSVP' : 'RSVP'}
        </button>
        <button
          onClick={onView}
          className="nexus-btn"
          style={{ flex: 1, justifyContent: 'center', padding: '6px 0', fontSize: 10 }}
        >
          VIEW DETAILS <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Archive table ─────────────────────────────────────────────────────────────

function ArchiveTable({ ops }) {
  const [limit, setLimit] = useState(10);
  const visible = ops.slice(0, limit);

  function duration(op) {
    if (!op.started_at || !op.ended_at) return '—';
    const diff = new Date(op.ended_at) - new Date(op.started_at);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function opDate(op) {
    if (!op.scheduled_at) return '—';
    return new Date(op.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  }

  const TH_STYLE = {
    padding: '6px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 9,
    letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)',
    background: 'var(--bg2)', whiteSpace: 'nowrap',
  };
  const TD_STYLE = { padding: '6px 12px' };

  return (
    <div style={{ border: '0.5px solid var(--b1)', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['OP NAME', 'DATE', 'DURATION', 'CREW', 'OUTCOME'].map(h => (
              <th key={h} style={TH_STYLE}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map(op => (
            <tr
              key={op.id}
              style={{ borderBottom: '0.5px solid var(--b0)', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ ...TD_STYLE }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: 'var(--t0)', fontSize: 12 }}>{op.name}</span>
                  <TypeTag type={op.type} />
                </div>
              </td>
              <td style={{ ...TD_STYLE, color: 'var(--t1)', fontSize: 11 }}>{opDate(op)}</td>
              <td style={{ ...TD_STYLE, color: 'var(--t1)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{duration(op)}</td>
              <td style={{ ...TD_STYLE, color: 'var(--t1)', fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={10} style={{ color: 'var(--t2)' }} />
                  {op._rsvp_count || '—'}
                </span>
              </td>
              <td style={TD_STYLE}>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 4,
                  border: '0.5px solid var(--b2)', background: 'var(--bg3)',
                  color: op.status === 'COMPLETE' ? 'var(--live)' : 'var(--t2)',
                  letterSpacing: '0.06em',
                }}>
                  {op.status}
                </span>
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                No archived ops
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {ops.length > limit && (
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--b1)', textAlign: 'center' }}>
          <button
            onClick={() => setLimit(l => l + 10)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--acc)', fontSize: 11, fontFamily: 'inherit',
              letterSpacing: '0.06em',
            }}
          >
            LOAD MORE ({ops.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main OpBoard module ──────────────────────────────────────────────────────

export default function OpBoardModule({ rank, callsign, discordId: discordIdProp }) {
  const navigate = useNavigate();

  const [tab, setTab]                   = useState('LIVE');
  const [ops, setOps]                   = useState([]);
  const [liveRsvps, setLiveRsvps]       = useState([]);
  const [userRsvps, setUserRsvps]       = useState([]);
  const [rsvpDialogOp, setRsvpDialogOp] = useState(null);
  const [rsvpDialogRsvps, setRsvpDialogRsvps] = useState([]);
  const [selfDiscordId, setSelfDiscordId] = useState(discordIdProp || null);

  // Resolve discord_id if not passed as prop
  useEffect(() => {
    if (!discordIdProp) {
      base44.auth.me()
        .then(u => { if (u?.discord_id) setSelfDiscordId(String(u.discord_id)); })
        .catch(() => {});
    }
  }, [discordIdProp]);

  const loadOps = async () => {
    const data = await base44.entities.Op.list('-scheduled_at', 100);
    setOps(data || []);
    return data || [];
  };

  const loadUserRsvps = async (id) => {
    if (!id) return;
    const data = await base44.entities.OpRsvp.filter({ discord_id: id });
    setUserRsvps(data || []);
  };

  const loadLiveRsvps = async (opsData) => {
    const live = opsData.find(o => o.status === 'LIVE');
    if (!live) { setLiveRsvps([]); return; }
    const data = await base44.entities.OpRsvp.filter({ op_id: live.id });
    setLiveRsvps(data || []);
  };

  useEffect(() => {
    Promise.all([loadOps()]).then(([opsData]) => {
      loadLiveRsvps(opsData);
    });
  }, []);

  useEffect(() => {
    loadUserRsvps(selfDiscordId);
  }, [selfDiscordId]);

  const refresh = async () => {
    const opsData = await loadOps();
    loadLiveRsvps(opsData);
    loadUserRsvps(selfDiscordId);
  };

  // Partition ops
  const liveOp     = ops.find(o => o.status === 'LIVE');
  const upcoming   = ops.filter(o => o.status === 'PUBLISHED')
                        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const archive    = ops.filter(o => ['COMPLETE', 'ARCHIVED'].includes(o.status));

  const canCreate  = VOYAGER_RANKS.includes(rank);

  // RSVP dialog helpers
  const openRsvpDialog = async (op) => {
    const rsvps = await base44.entities.OpRsvp.filter({ op_id: op.id });
    setRsvpDialogRsvps(rsvps || []);
    setRsvpDialogOp(op);
  };
  const closeRsvpDialog = () => {
    setRsvpDialogOp(null);
    setRsvpDialogRsvps([]);
  };

  const userRsvpForOp = (opId) => userRsvps.find(r => r.op_id === opId);

  // Tab badge counts
  const tabBadge = { LIVE: liveOp ? 1 : 0, UPCOMING: upcoming.length, ARCHIVE: archive.length };

  return (
    // position:relative so Overlay (position:absolute) is scoped here
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* ── Top bar ──────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)', flexShrink: 0,
      }}>
        {/* Section tabs */}
        <div style={{ display: 'flex' }}>
          {SECTION_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '11px 14px', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--t0)' : '2px solid transparent',
                color: tab === t ? 'var(--t0)' : 'var(--t2)',
                fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'color 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {t}
              {tabBadge[t] > 0 && (
                <span style={{
                  fontSize: 9, background: t === 'LIVE' ? 'var(--live)' : 'var(--bg4)',
                  color: t === 'LIVE' ? 'var(--bg0)' : 'var(--t1)',
                  borderRadius: 10, padding: '0 5px', fontWeight: 700,
                  minWidth: 16, textAlign: 'center',
                }}>
                  {tabBadge[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Create button */}
        {canCreate && (
          <button
            onClick={() => navigate('/app/ops/new')}
            className="nexus-btn primary"
            style={{ padding: '4px 12px', fontSize: 10, flexShrink: 0 }}
          >
            <Plus size={11} /> CREATE OP
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="nexus-fade-in">

        {/* LIVE TAB */}
        {tab === 'LIVE' && (
          <div style={{ maxWidth: 680 }}>
            {liveOp ? (
              <>
                <SectionHeader label="LIVE NOW" />
                <LiveOpCard
                  op={liveOp}
                  rsvps={liveRsvps}
                  onEnter={() => navigate(`/app/ops/${liveOp.id}`)}
                />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--b3)' }} />
                </div>
                <span style={{ color: 'var(--t2)', fontSize: 12 }}>No active op</span>
                {canCreate && (
                  <button
                    onClick={() => navigate('/app/ops/new')}
                    className="nexus-btn primary"
                    style={{ padding: '7px 18px', fontSize: 11, marginTop: 6 }}
                  >
                    <Plus size={11} /> CREATE OP
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* UPCOMING TAB */}
        {tab === 'UPCOMING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
            <SectionHeader label={`UPCOMING — ${upcoming.length}`} />
            {upcoming.length === 0 ? (
              <div style={{ color: 'var(--t2)', fontSize: 12, padding: '20px 0' }}>No upcoming ops scheduled.</div>
            ) : (
              upcoming.map(op => (
                <UpcomingCard
                  key={op.id}
                  op={op}
                  userRsvp={userRsvpForOp(op.id)}
                  onRsvp={() => openRsvpDialog(op)}
                  onView={() => navigate(`/app/ops/${op.id}`)}
                />
              ))
            )}
          </div>
        )}

        {/* ARCHIVE TAB */}
        {tab === 'ARCHIVE' && (
          <div>
            <SectionHeader label={`ARCHIVE — ${archive.length}`} />
            <ArchiveTable ops={archive} />
          </div>
        )}

      </div>

      {/* ── RSVP dialog (position:absolute, scoped) ── */}
      {rsvpDialogOp && (
        <RSVPDialog
          op={rsvpDialogOp}
          rsvps={rsvpDialogRsvps}
          discordId={selfDiscordId}
          callsign={callsign}
          onClose={closeRsvpDialog}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
