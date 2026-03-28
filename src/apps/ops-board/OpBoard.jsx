/**
 * OpBoard — Op Board list view
 * Route: /app/ops
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { Plus, RefreshCw, CalendarDays } from 'lucide-react';
import OpsCommandTab from './command/OpsCommandTab';
import EmptyState from '@/core/design/EmptyState';
import OperationalReferenceStrip from '@/core/design/OperationalReferenceStrip';
import OpsDashboard from '@/pages/OpsDashboard';

const STATUS_ORDER = ['LIVE', 'PUBLISHED', 'DRAFT', 'COMPLETE', 'ARCHIVED'];

const STATUS_CONFIG = {
  LIVE:      { label: 'LIVE',      color: '#C0392B', bg: 'rgba(192,57,43,0.18)', border: '#C0392B', stripe: '#C0392B' },
  PUBLISHED: { label: 'STAGING',   color: '#C8A84B', bg: 'rgba(200,168,75,0.12)', border: '#C8A84B', stripe: '#C8A84B' },
  DRAFT:     { label: 'PLANNING',  color: '#5A5850', bg: 'rgba(90,88,80,0.12)',  border: '#5A5850', stripe: '#5A5850' },
  COMPLETE:  { label: 'COMPLETE',  color: '#5A5850', bg: 'rgba(90,88,80,0.12)',  border: '#5A5850', stripe: '#5A5850' },
  ARCHIVED:  { label: 'ARCHIVED',  color: '#5A5850', bg: 'rgba(90,88,80,0.12)',  border: '#5A5850', stripe: '#5A5850' },
};

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER'];

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 0) {
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    if (h > 48) return `in ${Math.floor(h / 24)}d`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function OpCard({ op, rsvpCount, myRsvp, onRsvp, canLead }) {
  const cfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.DRAFT;
  const isLive = op.status === 'LIVE';
  const totalSlots = Object.values(op.role_slots || {}).reduce((s, v) => s + (typeof v === 'object' ? (v.capacity ?? v) : v), 0);
  const phases = Array.isArray(op.phases) ? op.phases : [];
  const currentPhase = op.phase_current || 0;

  return (
    <Link to={`/app/ops/${op.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div
        style={{
          background: '#0F0F0D',
          borderLeft: `2px solid ${cfg.stripe}`,
          borderTop: '0.5px solid rgba(200,170,100,0.10)',
          borderRight: '0.5px solid rgba(200,170,100,0.10)',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2,
          padding: '20px 20px 16px',
          cursor: 'pointer',
          transition: 'background 150ms, border-color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#0F0F0D'; }}
      >
        {/* Status row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: cfg.color, background: cfg.bg,
            border: `0.5px solid ${cfg.border}`, borderRadius: 2, padding: '2px 8px',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0,
              animation: isLive ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }} />
            {cfg.label}
          </span>
          {op.scheduled_at && (
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 10, color: '#5A5850', textTransform: 'uppercase' }}>
              {relativeTime(op.scheduled_at)}
            </span>
          )}
        </div>

        {/* Op name */}
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#E8E4DC', marginTop: 10, marginBottom: 4 }}>
          {op.name}
        </div>

        {/* System/location */}
        <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 12, color: '#9A9488' }}>
          {[op.type?.replace(/_/g, ' '), op.system_name || op.system, op.location].filter(Boolean).join(' · ')}
        </div>

        {/* Participant chips */}
        {(rsvpCount > 0 || totalSlots > 0) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10,
              color: '#9A9488', background: 'rgba(200,170,100,0.08)',
              border: '0.5px solid rgba(200,170,100,0.15)', borderRadius: 2, padding: '2px 6px',
            }}>{rsvpCount} / {totalSlots || '?'} CREW</span>
            {op.access_type === 'EXCLUSIVE' && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10,
                color: '#C8A84B', background: 'rgba(200,168,75,0.08)',
                border: '0.5px solid rgba(200,168,75,0.15)', borderRadius: 2, padding: '2px 6px',
              }}>EXCLUSIVE</span>
            )}
          </div>
        )}

        {/* Bottom row */}
        <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(200,170,100,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 11, color: '#5A5850' }}>
            {phases.length > 0 ? `PHASE ${Math.min(phases.length, currentPhase + 1)} / ${phases.length}` : 'NO PHASES'}
          </span>
          <span style={{ color: '#5A5850', fontSize: 11 }}>→</span>
        </div>
      </div>
    </Link>
  );
}

export default function OpBoard() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const rank = outletContext.rank;
  const sessionUserId = outletContext.sessionUserId;
  const [searchParams, setSearchParams] = useSearchParams();
  const opsView = ['analytics', 'command'].includes(searchParams.get('view')) ? searchParams.get('view') : 'board';
  const statusFilter = ['active', 'complete', 'all'].includes(searchParams.get('status')) ? searchParams.get('status') : 'active';
  const setOpsView = (v) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'board') next.delete('view'); else next.set('view', v);
    setSearchParams(next, { replace: true });
  };
  const setStatusFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'active') next.delete('status'); else next.set('status', value);
    setSearchParams(next, { replace: true });
  };

  const navigate = useNavigate();
  const [ops, setOps] = useState([]);
  const [rsvpMap, setRsvpMap] = useState({});
  const [myRsvps, setMyRsvps] = useState({});
  const [loading, setLoading] = useState(true);

  const canLead = LEADER_RANKS.includes(rank);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch ops, this user's RSVPs, and ALL confirmed RSVPs in 3 parallel requests
    // instead of 2 + N (one per active op). We then group the confirmed RSVPs
    // by op_id on the client side, which is O(n) and avoids the request waterfall.
    const [allOps, allRsvps, confirmedRsvps] = await Promise.all([
      base44.entities.Op.list('-scheduled_at', 100),
      sessionUserId ? base44.entities.OpRsvp.filter({ user_id: sessionUserId }) : Promise.resolve([]),
      base44.entities.OpRsvp.filter({ status: 'CONFIRMED' }),
    ]);

    const opList = allOps || [];
    setOps(opList);

    const counts = {};
    opList
      .filter(o => ['LIVE', 'PUBLISHED', 'DRAFT'].includes(o.status))
      .forEach(o => { counts[o.id] = 0; });
    (confirmedRsvps || []).forEach(r => {
      if (counts.hasOwnProperty(r.op_id)) counts[r.op_id]++;
    });

    const myMap = {};
    (allRsvps || []).forEach(r => { if (r.status === 'CONFIRMED') myMap[r.op_id] = r; });

    setRsvpMap(counts);
    setMyRsvps(myMap);
    setLoading(false);
  }, [sessionUserId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubOps = base44.entities.Op.subscribe(() => { load(); });
    const unsubRsvps = base44.entities.OpRsvp.subscribe(() => { load(); });
    return () => {
      unsubOps();
      unsubRsvps();
    };
  }, [load]);

  const handleRsvp = async (opId) => {
    if (!sessionUserId) return;
    if (myRsvps[opId]) {
      await nexusWriteApi.declineOpRsvp(opId);
    } else {
      await nexusWriteApi.upsertOpRsvp({ op_id: opId, role: '', status: 'CONFIRMED', ship: '' });
    }
    load();
  };

  const filtered = ops.filter(op => {
    if (statusFilter === 'active') return ['LIVE', 'PUBLISHED', 'DRAFT'].includes(op.status);
    if (statusFilter === 'complete') return ['COMPLETE', 'ARCHIVED'].includes(op.status);
    return true;
  });

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    const group = filtered.filter(o => o.status === s);
    if (group.length > 0) acc.push({ status: s, ops: group });
    return acc;
  }, []);

  const liveCount = ops.filter(o => o.status === 'LIVE').length;

  if (opsView === 'analytics' || opsView === 'command') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 0, padding: '0 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
          {[{ id: 'board', label: 'OPS BOARD' }, { id: 'command', label: 'OPS COMMAND' }, { id: 'analytics', label: 'ANALYTICS' }].map(t => (
            <button key={t.id} onClick={() => setOpsView(t.id)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: opsView === t.id ? '2px solid #C0392B' : '2px solid transparent', color: opsView === t.id ? '#E8E4DC' : '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', transition: 'color 150ms' }} onMouseEnter={e => { if (opsView !== t.id) e.currentTarget.style.color = '#9A9488'; }} onMouseLeave={e => { if (opsView !== t.id) e.currentTarget.style.color = '#5A5850'; }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {opsView === 'analytics' && <OpsDashboard />}
          {opsView === 'command' && <OpsCommandTab />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', animation: 'opsPageEntrance 200ms ease-out' }}>
      <style>{`@keyframes opsPageEntrance { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 20px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.10)', background: '#0A0908', flexShrink: 0 }}>
        {/* OPS BOARD / COMMAND / ANALYTICS tab bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 4 }}>
          {[{ id: 'board', label: 'OPS BOARD' }, { id: 'command', label: 'OPS COMMAND' }, { id: 'analytics', label: 'ANALYTICS' }].map(t => (
            <button key={t.id} onClick={() => setOpsView(t.id)} style={{ padding: '6px 14px', background: 'transparent', border: 'none', borderBottom: opsView === t.id ? '2px solid #C0392B' : '2px solid transparent', color: opsView === t.id ? '#E8E4DC' : '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer', transition: 'color 150ms' }} onMouseEnter={e => { if (opsView !== t.id) e.currentTarget.style.color = '#9A9488'; }} onMouseLeave={e => { if (opsView !== t.id) e.currentTarget.style.color = '#5A5850'; }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(16px, 3vw, 22px)', color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OPS BOARD</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 13, color: '#9A9488', marginTop: 2 }}>Manage and monitor field operations</div>
          </div>
          {canLead && (
            <button onClick={() => navigate('/app/ops/new')} style={{
              background: '#C0392B', border: 'none', borderRadius: 2, cursor: 'pointer',
              color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 12, textTransform: 'uppercase', padding: '9px 16px', transition: 'background 150ms',
            }} onMouseEnter={e => { e.currentTarget.style.background = '#9B2D20'; }}
               onMouseLeave={e => { e.currentTarget.style.background = '#C0392B'; }}>
              + CREATE OP
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {liveCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 2, background: 'rgba(192,57,43,0.18)', border: '0.5px solid #C0392B' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C0392B', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <span style={{ color: '#C0392B', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{liveCount} OP{liveCount > 1 ? 'S' : ''} LIVE</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 0 }}>
          {[{ id: 'active', label: 'ACTIVE' }, { id: 'complete', label: 'COMPLETE' }, { id: 'all', label: 'ALL' }].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer',
              borderBottom: statusFilter === f.id ? '2px solid #C0392B' : '2px solid transparent',
              background: 'transparent', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: statusFilter === f.id ? '#E8E4DC' : '#5A5850', transition: 'color 150ms',
            }} onMouseEnter={e => { if (statusFilter !== f.id) e.currentTarget.style.color = '#9A9488'; }}
               onMouseLeave={e => { if (statusFilter !== f.id) e.currentTarget.style.color = '#5A5850'; }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2, display: 'flex' }}>
          <RefreshCw size={12} />
        </button>
        <button onClick={() => navigate('/app/ops/timeline')} style={{
          background: '#141410', border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          cursor: 'pointer', color: '#9A9488', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          <CalendarDays size={11} /> TIMELINE
        </button>
        </div>
      </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <OperationalReferenceStrip
          sectionLabel="OPS REFERENCE"
          title="Plan, Publish, Go Live, Then Wrap"
          description="Use the board to move operations from planning into live execution, keep the current phase and readiness state current while the op is running, and close out with a clean archive and debrief."
          notes={[
            { label: 'When To Use', value: 'Shared Ops Source', detail: 'Use this for scheduling, crew commitment, readiness checks, and live phase management rather than keeping side notes elsewhere.' },
            { label: 'Data Depends On', value: 'Op + OpRsvp', detail: 'Board state comes from shared op records, RSVP commitments, readiness gate items, and the live session log.' },
            { label: 'Next Step', value: canLead ? 'Create Or Publish' : 'RSVP Or Enter Live Op', detail: canLead ? 'Create a new op when the concept is clear, then only move it live once crew, route, and supply chain are actually ready.' : 'Review the board, commit to a role, then enter the live op view when the operation starts.' },
          ]}
          actions={[
            ...(canLead ? [{ label: 'Create Op', onClick: () => navigate('/app/ops/new'), tone: 'live' }] : []),
            { label: 'Open Timeline', onClick: () => navigate('/app/ops/timeline'), tone: 'info' },
            { label: 'Open Rescue Board', onClick: () => navigate('/app/ops/rescue'), tone: 'warn' },
          ]}
        />
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.15 }}>
              <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
              <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
              <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.6" />
              <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
              <line x1="22" y1="2" x2="22" y2="7.5" stroke="#E8E4DC" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em', textAlign: 'center' }}>
              NO ACTIVE OPERATIONS — STAND BY
            </span>
          </div>
        ) : (
          grouped.map(({ status, ops: group }) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10, color: cfg.color, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{cfg.label}</span>
                  <span style={{ color: '#5A5850', fontSize: 9 }}>{group.length}</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(200,170,100,0.06)' }} />
                </div>
                {group.map(op => (
                  <OpCard key={op.id} op={op} rsvpCount={rsvpMap[op.id] || 0} myRsvp={myRsvps[op.id]} onRsvp={handleRsvp} canLead={canLead} />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}