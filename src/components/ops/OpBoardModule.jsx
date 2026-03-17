/**
 * OpBoardModule — Op Board list view
 * Shows all ops grouped by status: LIVE → PUBLISHED → DRAFT → COMPLETE
 * Op Leaders can create new ops, regular members can RSVP.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, RefreshCw } from 'lucide-react';

const STATUS_ORDER = ['LIVE', 'PUBLISHED', 'DRAFT', 'COMPLETE', 'ARCHIVED'];

const STATUS_CONFIG = {
  LIVE:      { label: 'LIVE',      color: 'var(--live)',  bg: 'var(--live-bg)',  border: 'var(--live-b)',  stripe: 'op-stripe-live' },
  PUBLISHED: { label: 'PUBLISHED', color: 'var(--info)',  bg: 'var(--info-bg)',  border: 'var(--info-b)',  stripe: 'op-stripe-published' },
  DRAFT:     { label: 'DRAFT',     color: 'var(--warn)',  bg: 'var(--warn-bg)',  border: 'var(--warn-b)',  stripe: 'op-stripe-draft' },
  COMPLETE:  { label: 'COMPLETE',  color: 'var(--t1)',    bg: 'var(--bg2)',      border: 'var(--b2)',      stripe: 'op-stripe-complete' },
  ARCHIVED:  { label: 'ARCHIVED',  color: 'var(--t2)',    bg: 'var(--bg2)',      border: 'var(--b1)',      stripe: 'op-stripe-archived' },
};

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];

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
  const totalSlots = Object.values(op.role_slots || {}).reduce((s, v) => s + (typeof v === 'object' ? v.capacity ?? v : v), 0);

  return (
    <Link to={`/app/ops/${op.id}`} style={{ textDecoration: 'none' }}>
      <div
        className={`nexus-card ${cfg.stripe}`}
        style={{
          padding: '12px 14px',
          marginBottom: 6,
          cursor: 'pointer',
          transition: 'border-color 0.1s, background 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {isLive && <div className="pulse-live" />}
              <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {op.name}
              </span>
              <span className="nexus-tag" style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg, flexShrink: 0 }}>
                {cfg.label}
              </span>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="nexus-tag">{(op.type || '').replace(/_/g, ' ')}</span>
              {op.system && <span style={{ color: 'var(--t2)', fontSize: 9 }}>{op.system}{op.location ? ` · ${op.location}` : ''}</span>}
              {op.scheduled_at && (
                <span style={{ color: 'var(--t2)', fontSize: 9 }}>
                  {isLive ? 'started' : 'scheduled'} {relativeTime(op.scheduled_at)}
                </span>
              )}
              {op.access_type === 'EXCLUSIVE' && (
                <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'rgba(var(--warn-rgb), 0.3)', background: 'rgba(var(--warn-rgb), 0.05)' }}>EXCLUSIVE</span>
              )}
              {op.buy_in_cost > 0 && (
                <span style={{ color: 'var(--t2)', fontSize: 9 }}>{op.buy_in_cost.toLocaleString()} aUEC buy-in</span>
              )}
            </div>
          </div>

          {/* Right side: crew count + RSVP */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--t1)', fontSize: 11 }}>{rsvpCount}</span>
              <span style={{ color: 'var(--t3)', fontSize: 9 }}>/ {totalSlots || '?'} crew</span>
            </div>
            {['PUBLISHED', 'LIVE'].includes(op.status) && !canLead && (
              <button
                onClick={e => { e.preventDefault(); onRsvp(op.id); }}
                style={{
                  padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 9, letterSpacing: '0.08em',
                  background: myRsvp ? 'rgba(var(--live-rgb), 0.1)' : 'var(--bg3)',
                  border: `0.5px solid ${myRsvp ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b2)'}`,
                  color: myRsvp ? 'var(--live)' : 'var(--t1)',
                }}
              >
                {myRsvp ? '✓ RSVP\'D' : 'RSVP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OpBoardModule({ rank, callsign, discordId }) {
  const navigate = useNavigate();
  const [ops, setOps] = useState([]);
  const [rsvpMap, setRsvpMap] = useState({}); // op_id → count
  const [myRsvps, setMyRsvps] = useState({}); // op_id → rsvp record
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'all' | 'complete'

  const canLead = LEADER_RANKS.includes(rank);

  const load = async () => {
    setLoading(true);
    const [allOps, allRsvps] = await Promise.all([
      base44.entities.Op.list('-scheduled_at', 100),
      discordId ? base44.entities.OpRsvp.filter({ discord_id: discordId }) : Promise.resolve([]),
    ]);

    const opList = allOps || [];
    setOps(opList);

    // Count confirmed RSVPs per op
    const counts = {};
    const myMap = {};
    const allRsvpData = await Promise.all(
      opList.filter(o => ['LIVE', 'PUBLISHED', 'DRAFT'].includes(o.status)).map(o =>
        base44.entities.OpRsvp.filter({ op_id: o.id, status: 'CONFIRMED' })
      )
    );
    opList.filter(o => ['LIVE', 'PUBLISHED', 'DRAFT'].includes(o.status)).forEach((o, i) => {
      counts[o.id] = (allRsvpData[i] || []).length;
    });

    (allRsvps || []).forEach(r => {
      if (r.status === 'CONFIRMED') myMap[r.op_id] = r;
    });

    setRsvpMap(counts);
    setMyRsvps(myMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, [discordId]);

  const handleRsvp = async (opId) => {
    if (!discordId) return;
    if (myRsvps[opId]) {
      // Toggle off
      await base44.entities.OpRsvp.update(myRsvps[opId].id, { status: 'DECLINED' });
    } else {
      await base44.entities.OpRsvp.create({ op_id: opId, discord_id: discordId, callsign, status: 'CONFIRMED' });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', flexShrink: 0,
      }}>
        {/* Live badge */}
        {liveCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 4,
            background: 'var(--live-bg)', border: '0.5px solid var(--live-b)',
          }}>
            <div className="pulse-live" />
            <span style={{ color: 'var(--live)', fontSize: 9, letterSpacing: '0.1em' }}>
              {liveCount} OP{liveCount > 1 ? 'S' : ''} LIVE
            </span>
          </div>
        )}

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { id: 'active', label: 'ACTIVE' },
            { id: 'complete', label: 'COMPLETE' },
            { id: 'all', label: 'ALL' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 9, letterSpacing: '0.1em',
                background: statusFilter === f.id ? 'var(--bg3)' : 'transparent',
                border: `0.5px solid ${statusFilter === f.id ? 'var(--b2)' : 'transparent'}`,
                color: statusFilter === f.id ? 'var(--t0)' : 'var(--t2)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex' }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>

        {canLead && (
          <button onClick={() => navigate('/app/ops/new')} className="nexus-btn primary" style={{ padding: '5px 12px', fontSize: 10 }}>
            <Plus size={11} /> NEW OP
          </button>
        )}
      </div>

      {/* Op list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div className="nexus-loading-dots"><span /><span /><span /></div>
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', padding: 40 }}>
            No ops found.{canLead && <span> Create the first one →</span>}
          </div>
        ) : (
          grouped.map(({ status, ops: group }) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: cfg.color, fontSize: 9, letterSpacing: '0.15em' }}>{cfg.label}</span>
                  <span style={{ color: 'var(--t3)', fontSize: 9 }}>{group.length}</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
                </div>
                {group.map(op => (
                  <OpCard
                    key={op.id}
                    op={op}
                    rsvpCount={rsvpMap[op.id] || 0}
                    myRsvp={myRsvps[op.id]}
                    onRsvp={handleRsvp}
                    canLead={canLead}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}