/**
 * OpBoard — Op Board list view
 * Route: /app/ops
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { Plus, RefreshCw, Crosshair } from 'lucide-react';
import EmptyState from '@/core/design/EmptyState';

const STATUS_ORDER = ['LIVE', 'PUBLISHED', 'DRAFT', 'COMPLETE', 'ARCHIVED'];

const STATUS_CONFIG = {
  LIVE:      { label: 'LIVE',      color: 'var(--live)',  bg: 'var(--live-bg)',  border: 'var(--live-b)',  stripe: '#27c96a',           stripeHover: '#4ddc88' },
  PUBLISHED: { label: 'PUBLISHED', color: 'var(--info)',  bg: 'var(--info-bg)',  border: 'var(--info-b)',  stripe: 'var(--acc)',         stripeHover: 'var(--acc2)' },
  DRAFT:     { label: 'DRAFT',     color: 'var(--warn)',  bg: 'var(--warn-bg)',  border: 'var(--warn-b)',  stripe: '#e8a020',           stripeHover: '#f0b840' },
  COMPLETE:  { label: 'COMPLETE',  color: 'var(--t1)',    bg: 'var(--bg2)',      border: 'var(--b2)',      stripe: '#4a5070',           stripeHover: '#6a7090' },
  ARCHIVED:  { label: 'ARCHIVED',  color: 'var(--t2)',    bg: 'var(--bg2)',      border: 'var(--b1)',      stripe: '#2e3248',           stripeHover: '#4a5070' },
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
  const totalSlots = Object.values(op.role_slots || {}).reduce((s, v) => s + (typeof v === 'object' ? (v.capacity ?? v) : v), 0);
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link to={`/app/ops/${op.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8, overflow: 'hidden' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--bg1)',
          border: '0.5px solid var(--b1)',
          borderLeft: `3px solid ${hovered ? cfg.stripeHover : cfg.stripe}`,
          borderRadius: 6,
          overflow: 'hidden',
          cursor: 'pointer',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'border-left-color 150ms ease, transform 150ms ease, box-shadow 150ms ease',
          boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {isLive && <div className="pulse-live" style={{ flexShrink: 0 }} />}
          <span style={{
            color: 'var(--t0)', fontSize: 14, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {op.name}
          </span>
          <span
            style={{
              flexShrink: 0, padding: '2px 7px', borderRadius: 3, fontSize: 9,
              letterSpacing: '0.1em', fontWeight: 500,
              color: cfg.color, background: cfg.bg, border: `0.5px solid ${cfg.border}`,
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '0 14px 8px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{
            padding: '2px 6px', borderRadius: 3, fontSize: 9, letterSpacing: '0.08em',
            color: 'var(--t2)', background: 'var(--bg3)', border: '0.5px solid var(--b1)',
            whiteSpace: 'nowrap',
          }}>
            {(op.type || '').replace(/_/g, ' ')}
          </span>
          {(op.system_name || op.location) && (
            <span style={{ color: 'var(--t2)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {op.system_name}{op.location ? ` · ${op.location}` : ''}
            </span>
          )}
          {op.scheduled_at && (
            <span style={{ color: 'var(--t3)', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {isLive ? 'started' : 'scheduled'} {relativeTime(op.scheduled_at)}
            </span>
          )}
          {op.access_type === 'EXCLUSIVE' && (
            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, letterSpacing: '0.08em', color: 'var(--warn)', background: 'rgba(var(--warn-rgb), 0.05)', border: '0.5px solid rgba(var(--warn-rgb), 0.3)', whiteSpace: 'nowrap' }}>
              EXCLUSIVE
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '7px 14px', borderTop: '0.5px solid var(--b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'var(--t1)', fontSize: 11 }}>{rsvpCount}</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>/ {totalSlots || '?'} crew</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            <span style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 9, letterSpacing: '0.08em',
              color: 'var(--t2)', background: 'var(--bg3)', border: '0.5px solid var(--b1)',
            }}>
              VIEW →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OpBoard() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const rank = outletContext.rank;
  const callsign = outletContext.callsign;
  const discordId = outletContext.discordId;

  const navigate = useNavigate();
  const [ops, setOps] = useState([]);
  const [rsvpMap, setRsvpMap] = useState({});
  const [myRsvps, setMyRsvps] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');

  const canLead = LEADER_RANKS.includes(rank);

  const load = useCallback(async () => {
    setLoading(true);
    const [allOps, allRsvps] = await Promise.all([
      base44.entities.Op.list('-scheduled_at', 100),
      discordId ? base44.entities.OpRsvp.filter({ discord_id: discordId }) : Promise.resolve([]),
    ]);

    const opList = allOps || [];
    setOps(opList);

    const activeOps = opList.filter(o => ['LIVE', 'PUBLISHED', 'DRAFT'].includes(o.status));
    const allRsvpData = await Promise.all(
      activeOps.map(o => base44.entities.OpRsvp.filter({ op_id: o.id, status: 'CONFIRMED' }))
    );

    const counts = {};
    activeOps.forEach((o, i) => { counts[o.id] = (allRsvpData[i] || []).length; });

    const myMap = {};
    (allRsvps || []).forEach(r => { if (r.status === 'CONFIRMED') myMap[r.op_id] = r; });

    setRsvpMap(counts);
    setMyRsvps(myMap);
    setLoading(false);
  }, [callsign, discordId]);

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
    if (!discordId) return;
    if (myRsvps[opId]) {
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
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Operations
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {liveCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, background: 'var(--live-bg)', border: '0.5px solid var(--live-b)' }}>
            <div className="pulse-live" />
            <span style={{ color: 'var(--live)', fontSize: 9, letterSpacing: '0.1em' }}>{liveCount} OP{liveCount > 1 ? 'S' : ''} LIVE</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 2 }}>
          {[{ id: 'active', label: 'ACTIVE' }, { id: 'complete', label: 'COMPLETE' }, { id: 'all', label: 'ALL' }].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
              padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 9, letterSpacing: '0.1em',
              background: statusFilter === f.id ? 'var(--bg3)' : 'transparent',
              border: `0.5px solid ${statusFilter === f.id ? 'var(--b2)' : 'transparent'}`,
              color: statusFilter === f.id ? 'var(--t0)' : 'var(--t2)',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex' }}>
          <RefreshCw size={12} />
        </button>
        {canLead && (
          <button
            onClick={() => navigate('/app/ops/new')}
            className="nexus-btn primary"
            style={{
              padding: '5px 12px',
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              const arrow = e.currentTarget.querySelector('.op-arrow');
              if (arrow) arrow.style.transform = 'translateX(3px)';
            }}
            onMouseLeave={(e) => {
              const arrow = e.currentTarget.querySelector('.op-arrow');
              if (arrow) arrow.style.transform = 'translateX(0)';
            }}
          >
            <Plus size={11} /> NEW OP{' '}
            <span className="op-arrow" style={{ display: 'inline-block', transition: 'transform 150ms ease' }}>
              →
            </span>
          </button>
        )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div className="nexus-loading-dots"><span /><span /><span /></div>
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={Crosshair}
            title="No operations found"
            detail="No ops match your current filters, or none have been created yet."
            action={canLead}
            actionLabel="Create Operation"
            actionOnClick={() => navigate('/app/ops/new')}
          />
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