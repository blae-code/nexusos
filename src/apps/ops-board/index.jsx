/**
 * Op Board list view — LIVE | UPCOMING | ARCHIVE
 * Props: { rank, callsign, userId }
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { Plus } from 'lucide-react';
import { SectionHeader } from './opBoardHelpers';
import RSVPDialog from './RSVPDialog';
import LiveOpCard from './LiveOpCard';
import UpcomingCard from './UpcomingCard';
import ArchiveTable from './ArchiveTable';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCOUT_RANKS  = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];
const SECTION_TABS = ['LIVE', 'UPCOMING', 'ARCHIVE'];

// ─── Main OpBoard module ──────────────────────────────────────────────────────

export default function OpBoardModule({ rank, callsign, userId: userIdProp }) {
  const navigate = useNavigate();

  const [tab, setTab]                         = useState('LIVE');
  const [ops, setOps]                         = useState([]);
  const [liveRsvps, setLiveRsvps]             = useState([]);
  const [userRsvps, setUserRsvps]             = useState([]);
  const [rsvpDialogOp, setRsvpDialogOp]       = useState(null);
  const [rsvpDialogRsvps, setRsvpDialogRsvps] = useState([]);
  const [selfUserId, setSelfUserId]           = useState(userIdProp || null);

  // Resolve session user id if not passed as prop
  useEffect(() => {
    if (!userIdProp) {
      base44.auth.me()
        .then(u => { if (u?.id) setSelfUserId(String(u.id)); })
        .catch(() => {});
    }
  }, [userIdProp]);

  const loadOps = async () => {
    const data = await base44.entities.Op.list('-scheduled_at', 100);
    setOps(data || []);
    return data || [];
  };

  const loadUserRsvps = async (id) => {
    if (!id) return;
    const data = await base44.entities.OpRsvp.filter({ user_id: id });
    setUserRsvps(data || []);
  };

  const loadLiveRsvps = async (opsData) => {
    const live = opsData.find(o => o.status === 'LIVE');
    if (!live) { setLiveRsvps([]); return; }
    const data = await base44.entities.OpRsvp.filter({ op_id: live.id });
    setLiveRsvps(data || []);
  };

  useEffect(() => {
    loadOps().then(opsData => loadLiveRsvps(opsData));
  }, []);

  useEffect(() => {
    loadUserRsvps(selfUserId);
  }, [selfUserId]);

  const refresh = async () => {
    const opsData = await loadOps();
    loadLiveRsvps(opsData);
    loadUserRsvps(selfUserId);
  };

  // Partition ops
  const liveOp   = ops.find(o => o.status === 'LIVE');
  const upcoming = ops.filter(o => o.status === 'PUBLISHED')
                      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const archive  = ops.filter(o => ['COMPLETE', 'ARCHIVED'].includes(o.status));

  const canCreate = SCOUT_RANKS.includes(rank);

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
          sessionUserId={selfUserId}
          onClose={closeRsvpDialog}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
