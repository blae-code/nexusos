/**
 * OpsTimeline — Visual timeline of upcoming operations
 * Features: drag-to-RSVP, ship availability swimlanes, calendar export
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { Calendar, ChevronLeft, ChevronRight, Download, Ship, Users, X, Check, Clock } from 'lucide-react';
import { normalizeRoleSlots } from './opBoardHelpers';

// ─── Constants ──────────────────────────────────────────────────────────────

const OP_TYPE_COLORS = {
  ROCKBREAKER:      '#C8A84B',
  SHIP_MINING:      '#C8A84B',
  VEHICLE_MINING:   '#C8A84B',
  HAND_MINING:      '#C8A84B',
  SALVAGE:          '#9DA1CD',
  CARGO_RUN:        '#5297FF',
  MIXED_INDUSTRIAL: '#C8A84B',
  FOCUSED_EVENT:    '#FF6B35',
  PATROL:           '#C0392B',
  BOUNTY:           '#C0392B',
  EXPLORATION:      '#4AE830',
  PVP_TRAINING:     '#C0392B',
};

const HOUR_PX = 80;   // pixels per hour
const DAY_HEADER_H = 36;
const HOUR_HEADER_H = 28;
const LANE_H = 64;
const SHIP_LANE_H = 28;

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function formatHour(h) {
  if (h === 0) return '00:00';
  if (h === 12) return '12:00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}${suffix}`;
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isoToIcs(iso) {
  return iso.replace(/[-:]/g, '').replace('.000Z', 'Z').split('.')[0] + 'Z';
}

function exportToIcs(ops) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NexusOS//Redscar Nomads//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const op of ops) {
    if (!op.scheduled_at) continue;
    const start = new Date(op.scheduled_at);
    const end = new Date(start.getTime() + 2 * 3600000); // 2h default
    lines.push(
      'BEGIN:VEVENT',
      `UID:nexusos-op-${op.id}@redscar.org`,
      `DTSTAMP:${isoToIcs(new Date().toISOString())}`,
      `DTSTART:${isoToIcs(start.toISOString())}`,
      `DTEND:${isoToIcs(end.toISOString())}`,
      `SUMMARY:${op.name} [${op.type}]`,
      `DESCRIPTION:System: ${op.system || '?'}\\nLocation: ${op.location || '?'}\\nStatus: ${op.status}`,
      `LOCATION:${op.system || ''} - ${op.location || ''}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'redscar-ops.ics';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── DragRSVP Ghost ──────────────────────────────────────────────────────────

function DragGhost({ op, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', pointerEvents: 'none', zIndex: 9999,
      padding: '6px 12px', background: 'rgba(200,168,75,0.9)',
      borderRadius: 4, color: '#000', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      transform: 'translate(-50%, -50%)',
      left: 'var(--gx)', top: 'var(--gy)',
      transition: 'none',
    }}>
      DROP TO RSVP: {op?.name}
    </div>
  );
}

// ─── RSVP Quick Panel ────────────────────────────────────────────────────────

function RSVPQuickPanel({ op, rsvps, sessionUserId, onClose, onRefresh }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [ship, setShip] = useState('');
  const slots = normalizeRoleSlots(op.role_slots);
  const existing = rsvps.find(r => String(r.user_id) === String(sessionUserId));

  const submit = async (role, status = 'CONFIRMED') => {
    setSubmitting(true);
    await nexusWriteApi.upsertOpRsvp({
      op_id: op.id,
      role,
      status,
      ship: ship.trim() || existing?.ship || '',
    });
    setDone(true);
    onRefresh?.();
    setTimeout(onClose, 700);
    setSubmitting(false);
  };

  const decline = async () => {
    setSubmitting(true);
    await nexusWriteApi.declineOpRsvp(op.id);
    setDone(true);
    onRefresh?.();
    setTimeout(onClose, 700);
    setSubmitting(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="nexus-fade-in" style={{
        width: 380, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 8, padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>RSVP — {op.name}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)' }}><X size={14} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Check size={24} style={{ color: 'var(--live)', margin: '0 auto 8px' }} />
            <div style={{ color: 'var(--live)', fontSize: 12 }}>RSVP recorded.</div>
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>ROLE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {slots.map((slot, i) => {
                const filled = rsvps.filter(r => r.role === slot.name && r.status === 'CONFIRMED').length;
                const full = filled >= slot.capacity;
                const selected = existing?.role === slot.name && existing?.status === 'CONFIRMED';
                return (
                  <button
                    key={i}
                    onClick={() => !full && submit(slot.name)}
                    disabled={full || submitting}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 4, cursor: full ? 'not-allowed' : 'pointer',
                      background: selected ? 'rgba(var(--live-rgb),0.08)' : 'var(--bg3)',
                      border: `0.5px solid ${selected ? 'rgba(var(--live-rgb),0.3)' : 'var(--b2)'}`,
                      opacity: full ? 0.5 : 1, fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ color: selected ? 'var(--live)' : 'var(--t0)', fontSize: 11 }}>
                      {slot.name.toUpperCase()} {selected && '✓'}
                    </span>
                    <span style={{ color: full ? 'var(--danger)' : 'var(--t2)', fontSize: 10 }}>
                      {filled}/{slot.capacity}
                    </span>
                  </button>
                );
              })}
              {slots.length === 0 && (
                <button
                  onClick={() => submit('crew')}
                  disabled={submitting}
                  style={{
                    padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
                    background: existing?.status === 'CONFIRMED' ? 'rgba(var(--live-rgb),0.08)' : 'var(--bg3)',
                    border: `0.5px solid ${existing?.status === 'CONFIRMED' ? 'rgba(var(--live-rgb),0.3)' : 'var(--b2)'}`,
                    color: 'var(--t0)', fontSize: 11, fontFamily: 'inherit',
                  }}
                >
                  JOIN AS CREW {existing?.status === 'CONFIRMED' && '✓'}
                </button>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}>SHIP (OPTIONAL)</div>
              <input
                className="nexus-input"
                style={{ width: '100%', fontSize: 11, padding: '7px 10px', boxSizing: 'border-box' }}
                placeholder="e.g. Cutlass Black, Prospector"
                value={ship}
                onChange={e => setShip(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button
              onClick={decline}
              disabled={submitting}
              style={{
                width: '100%', padding: '7px 0', borderRadius: 4,
                background: 'transparent', border: '0.5px solid var(--b2)',
                color: 'var(--t2)', fontSize: 10, letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              DECLINE OP
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Op Block ────────────────────────────────────────────────────────────────

function OpBlock({ op, left, width, myRsvp, rsvpCount, onDragStart, onClick }) {
  const color = OP_TYPE_COLORS[op.type] || '#9DA1CD';
  const isLive = op.status === 'LIVE';
  const hasRsvp = myRsvp?.status === 'CONFIRMED';

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, op)}
      onClick={() => onClick(op)}
      title={`${op.name}\n${op.type}\n${op.system || ''} ${op.location || ''}\nClick to RSVP`}
      style={{
        position: 'absolute',
        left: left + 2,
        width: Math.max(width - 4, 40),
        top: 10,
        height: LANE_H - 20,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`,
        border: `1px solid ${color}66`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
        cursor: 'grab',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 8px',
        transition: 'box-shadow 0.15s, transform 0.15s',
        zIndex: 2,
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 16px ${color}44`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
        {isLive && <div className="pulse-live" style={{ flexShrink: 0 }} />}
        <span style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.name}
        </span>
        {hasRsvp && <span style={{ fontSize: 8, color: 'var(--live)', flexShrink: 0 }}>✓</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 8, color, letterSpacing: '0.06em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {(op.type || '').replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: 8, color: 'var(--t2)', flexShrink: 0 }}>
          <Users size={7} style={{ display: 'inline', verticalAlign: 'middle' }} /> {rsvpCount}
        </span>
      </div>
    </div>
  );
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────

function DropZone({ onDrop, children, style }) {
  const [over, setOver] = useState(false);
  return (
    <div
      style={{
        ...style,
        outline: over ? '2px dashed rgba(200,168,75,0.5)' : 'none',
        outlineOffset: -2,
        transition: 'outline 0.1s',
      }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(e); }}
    >
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OpsTimeline() {
  const outletContext = (useOutletContext() || {});
  const { sessionUserId, callsign, rank } = outletContext;
  const navigate = useNavigate();

  const [ops, setOps] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOp, setDragOp] = useState(null);
  const [rsvpTarget, setRsvpTarget] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'ships'
  const [daysOffset, setDaysOffset] = useState(0);
  const [daysSpan] = useState(7);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [allOps, allRsvps, orgShips] = await Promise.all([
      base44.entities.Op.filter({ status: { $in: ['LIVE', 'PUBLISHED', 'DRAFT'] } }, '-scheduled_at', 100),
      base44.entities.OpRsvp.list('-created_date', 500),
      base44.entities.OrgShip.list('name', 100),
    ]);
    setOps((allOps || []).filter(o => o.scheduled_at));
    setRsvps(allRsvps || []);
    setShips(orgShips || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Date window ──
  const windowStart = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + daysOffset);
    return d;
  }, [daysOffset]);

  const windowEnd = useMemo(() => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + daysSpan);
    return d;
  }, [windowStart, daysSpan]);

  // ── Ops in window ──
  const visibleOps = useMemo(() =>
    ops.filter(op => {
      const t = new Date(op.scheduled_at).getTime();
      return t >= windowStart.getTime() && t < windowEnd.getTime();
    }),
    [ops, windowStart, windowEnd]
  );

  // Build day columns (7 days × 24 hours)
  const days = useMemo(() => {
    return Array.from({ length: daysSpan }, (_, i) => {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [windowStart, daysSpan]);

  const totalWidth = daysSpan * 24 * HOUR_PX;

  // Position of an op block
  function opPosition(op) {
    const t = new Date(op.scheduled_at).getTime();
    const offsetMs = t - windowStart.getTime();
    const offsetPx = (offsetMs / 3600000) * HOUR_PX;
    const widthPx = HOUR_PX * 2; // 2h default duration
    return { left: offsetPx, width: widthPx };
  }

  // ── RSVP helpers ──
  const myRsvpMap = useMemo(() => {
    const m = {};
    rsvps.filter(r => String(r.user_id) === String(sessionUserId)).forEach(r => { m[r.op_id] = r; });
    return m;
  }, [rsvps, sessionUserId]);

  const rsvpCountMap = useMemo(() => {
    const m = {};
    rsvps.filter(r => r.status === 'CONFIRMED').forEach(r => { m[r.op_id] = (m[r.op_id] || 0) + 1; });
    return m;
  }, [rsvps]);

  // Ships with scheduled ops
  const shipAssignments = useMemo(() => {
    const m = {};
    rsvps.forEach(r => {
      if (r.ship && r.status === 'CONFIRMED' && r.op_id) {
        if (!m[r.ship]) m[r.ship] = [];
        const op = ops.find(o => o.id === r.op_id);
        if (op && op.scheduled_at) m[r.ship].push(op);
      }
    });
    return m;
  }, [rsvps, ops]);

  // ── Drag ──
  const handleDragStart = (e, op) => {
    setDragOp(op);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnSlot = (op) => {
    if (!op) return;
    setRsvpTarget(op);
    setDragOp(null);
  };

  // Scroll to now on mount
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const now = new Date();
      const offsetMs = now.getTime() - windowStart.getTime();
      const offsetPx = (offsetMs / 3600000) * HOUR_PX - 100;
      scrollRef.current.scrollLeft = Math.max(0, offsetPx);
    }
  }, [loading, windowStart]);

  const upcomingForExport = ops.filter(o => ['LIVE', 'PUBLISHED'].includes(o.status));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Calendar size={14} style={{ color: 'var(--acc2)' }} />
        <span style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em' }}>
          OPS TIMELINE
        </span>

        {/* date nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <button
            onClick={() => setDaysOffset(d => d - 7)}
            style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, cursor: 'pointer', color: 'var(--t1)', padding: '3px 6px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={12} />
          </button>
          <span style={{ color: 'var(--t1)', fontSize: 10, letterSpacing: '0.06em', minWidth: 160, textAlign: 'center' }}>
            {formatDate(days[0])} — {formatDate(days[days.length - 1])}
          </span>
          <button
            onClick={() => setDaysOffset(d => d + 7)}
            style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, cursor: 'pointer', color: 'var(--t1)', padding: '3px 6px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={12} />
          </button>
          <button
            onClick={() => setDaysOffset(0)}
            style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, cursor: 'pointer', color: 'var(--t2)', padding: '3px 8px', fontSize: 9, letterSpacing: '0.08em', fontFamily: 'inherit', marginLeft: 4 }}
          >
            TODAY
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* view toggle */}
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
          {[
            { id: 'timeline', icon: Clock, label: 'TIMELINE' },
            { id: 'ships', icon: Ship, label: 'SHIPS' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                padding: '4px 10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: viewMode === id ? 'var(--bg3)' : 'transparent',
                color: viewMode === id ? 'var(--t0)' : 'var(--t2)',
                fontSize: 9, letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Icon size={10} /> {label}
            </button>
          ))}
        </div>

        {/* export */}
        <button
          onClick={() => exportToIcs(upcomingForExport)}
          title="Export to calendar (.ics)"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', background: 'var(--bg2)',
            border: '0.5px solid var(--b1)', borderRadius: 3,
            color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 9, letterSpacing: '0.08em',
          }}
        >
          <Download size={11} /> EXPORT .ICS
        </button>
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px',
        borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)', flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.1em' }}>DRAG A BLOCK TO RSVP →</span>
        {visibleOps.length === 0 && (
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>No ops scheduled in this window.</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--t3)', fontSize: 9 }}>{visibleOps.length} op{visibleOps.length !== 1 ? 's' : ''} in view</span>
      </div>

      {/* ── Timeline View ── */}
      {viewMode === 'timeline' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* sticky row labels + header */}
          <div style={{ display: 'flex', flexShrink: 0, overflow: 'hidden' }}>
            {/* corner */}
            <div style={{ width: 120, flexShrink: 0, borderRight: '0.5px solid var(--b1)', background: 'var(--bg1)' }} />
            {/* scrollable header */}
            <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
              <div style={{ width: totalWidth, position: 'relative', height: DAY_HEADER_H + HOUR_HEADER_H }}>
                {/* Day labels */}
                {days.map((day, di) => (
                  <div key={di} style={{
                    position: 'absolute',
                    left: di * 24 * HOUR_PX,
                    width: 24 * HOUR_PX,
                    height: DAY_HEADER_H,
                    display: 'flex', alignItems: 'center',
                    borderRight: '0.5px solid var(--b1)',
                    borderBottom: '0.5px solid var(--b0)',
                    padding: '0 12px',
                    background: 'var(--bg1)',
                  }}>
                    <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{formatDate(day)}</span>
                  </div>
                ))}
                {/* Hour labels */}
                {days.map((day, di) =>
                  Array.from({ length: 24 }, (_, h) => (
                    <div key={`${di}-${h}`} style={{
                      position: 'absolute',
                      left: (di * 24 + h) * HOUR_PX,
                      top: DAY_HEADER_H,
                      width: HOUR_PX,
                      height: HOUR_HEADER_H,
                      borderRight: `0.5px solid ${h === 0 ? 'var(--b1)' : 'var(--b0)'}`,
                      borderBottom: '0.5px solid var(--b1)',
                      display: 'flex', alignItems: 'center',
                      padding: '0 6px',
                      background: 'var(--bg0)',
                    }}>
                      <span style={{ color: h % 6 === 0 ? 'var(--t2)' : 'var(--t3)', fontSize: 8, letterSpacing: '0.05em' }}>
                        {h % 6 === 0 ? formatHour(h) : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Body rows */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
            {/* Row labels */}
            <div style={{ width: 120, flexShrink: 0, borderRight: '0.5px solid var(--b1)', background: 'var(--bg1)' }}>
              {/* Ops row label */}
              <div style={{ height: LANE_H, borderBottom: '0.5px solid var(--b0)', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>OPS</span>
              </div>
            </div>

            {/* Scrollable body synced to header */}
            <div
              style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}
              onScroll={e => {
                // sync header scroll
                if (scrollRef.current) scrollRef.current.scrollLeft = e.target.scrollLeft;
              }}
            >
              <div style={{ width: totalWidth, position: 'relative', minHeight: LANE_H }}>
                {/* Hour grid lines */}
                {days.map((_, di) =>
                  Array.from({ length: 24 }, (_, h) => (
                    <div key={`g-${di}-${h}`} style={{
                      position: 'absolute',
                      left: (di * 24 + h) * HOUR_PX,
                      top: 0, bottom: 0, width: 1,
                      background: h === 0 ? 'var(--b1)' : 'var(--b0)',
                      pointerEvents: 'none',
                    }} />
                  ))
                )}

                {/* Now marker */}
                {(() => {
                  const nowPx = (new Date().getTime() - windowStart.getTime()) / 3600000 * HOUR_PX;
                  if (nowPx < 0 || nowPx > totalWidth) return null;
                  return (
                    <div style={{
                      position: 'absolute', left: nowPx, top: 0, bottom: 0, width: 1.5,
                      background: '#C0392B', zIndex: 5, pointerEvents: 'none',
                    }}>
                      <div style={{ position: 'absolute', top: 2, left: -3, width: 7, height: 7, borderRadius: '50%', background: '#C0392B' }} />
                    </div>
                  );
                })()}

                {/* Op blocks as drop targets */}
                <DropZone
                  onDrop={() => dragOp && handleDropOnSlot(dragOp)}
                  style={{ position: 'relative', height: LANE_H, borderBottom: '0.5px solid var(--b0)' }}
                >
                  {visibleOps.map(op => {
                    const { left, width } = opPosition(op);
                    return (
                      <OpBlock
                        key={op.id}
                        op={op}
                        left={left}
                        width={width}
                        myRsvp={myRsvpMap[op.id]}
                        rsvpCount={rsvpCountMap[op.id] || 0}
                        onDragStart={handleDragStart}
                        onClick={setRsvpTarget}
                      />
                    );
                  })}
                </DropZone>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ship Availability View ── */}
      {viewMode === 'ships' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 16 }}>
              SHIP AVAILABILITY — Based on confirmed RSVPs with ship declarations
            </div>

            {/* Available ships (no ops in window) */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em' }}>
                ✓ AVAILABLE SHIPS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {ships
                  .filter(s => {
                    const assignedShip = Object.keys(shipAssignments).find(name => name.toLowerCase() === s.name?.toLowerCase());
                    return !assignedShip && s.status === 'AVAILABLE';
                  })
                  .map(ship => (
                    <div key={ship.id} style={{
                      padding: '10px 12px', background: 'var(--bg1)',
                      border: '0.5px solid var(--b1)', borderLeft: '2px solid #4AE830',
                      borderRadius: 4,
                    }}>
                      <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{ship.name}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>{ship.model} · {ship.class}</div>
                      {ship.cargo_scu > 0 && (
                        <div style={{ color: '#4AE830', fontSize: 9, marginTop: 2 }}>{ship.cargo_scu} SCU</div>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Committed ships */}
            {Object.keys(shipAssignments).length > 0 && (
              <div>
                <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em' }}>
                  ⚓ COMMITTED TO OPS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(shipAssignments).map(([shipName, assignedOps]) => (
                    <div key={shipName} style={{
                      padding: '12px 14px', background: 'var(--bg1)',
                      border: '0.5px solid var(--b1)', borderLeft: '2px solid #C8A84B',
                      borderRadius: 4, display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{shipName}</div>
                        <div style={{ color: '#C8A84B', fontSize: 9, marginTop: 2 }}>{assignedOps.length} op{assignedOps.length !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                        {assignedOps.map(op => (
                          <div
                            key={op.id}
                            onClick={() => setRsvpTarget(op)}
                            style={{
                              padding: '4px 8px', background: 'var(--bg3)',
                              border: '0.5px solid var(--b2)', borderRadius: 3,
                              cursor: 'pointer', fontSize: 9, color: 'var(--t1)',
                            }}
                          >
                            {op.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All upcoming ops list for quick RSVP */}
            <div style={{ marginTop: 32 }}>
              <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em' }}>
                UPCOMING OPS — QUICK RSVP
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {visibleOps.map(op => {
                  const myRsvp = myRsvpMap[op.id];
                  const count = rsvpCountMap[op.id] || 0;
                  const color = OP_TYPE_COLORS[op.type] || '#9DA1CD';
                  return (
                    <div key={op.id} style={{
                      padding: '10px 14px', background: 'var(--bg1)',
                      border: '0.5px solid var(--b1)', borderLeft: `2px solid ${color}`,
                      borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {op.name}
                        </div>
                        <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                          {new Date(op.scheduled_at).toLocaleString()} · {op.system || ''}
                        </div>
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: 9, flexShrink: 0 }}>
                        <Users size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {count}
                      </div>
                      <button
                        onClick={() => setRsvpTarget(op)}
                        style={{
                          padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 9, letterSpacing: '0.08em',
                          background: myRsvp?.status === 'CONFIRMED' ? 'rgba(var(--live-rgb),0.1)' : 'var(--bg3)',
                          border: `0.5px solid ${myRsvp?.status === 'CONFIRMED' ? 'rgba(var(--live-rgb),0.3)' : 'var(--b2)'}`,
                          color: myRsvp?.status === 'CONFIRMED' ? 'var(--live)' : 'var(--t1)',
                          flexShrink: 0,
                        }}
                      >
                        {myRsvp?.status === 'CONFIRMED' ? '✓ RSVP\'D' : 'RSVP'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RSVP Panel ── */}
      {rsvpTarget && (
        <RSVPQuickPanel
          op={rsvpTarget}
          rsvps={rsvps.filter(r => r.op_id === rsvpTarget.id)}
          sessionUserId={sessionUserId}
          onClose={() => setRsvpTarget(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
