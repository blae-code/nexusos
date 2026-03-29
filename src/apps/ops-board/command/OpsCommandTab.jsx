/**
 * OpsCommandTab — Approval layer for requisitions.
 * Leaders (PIONEER, FOUNDER, VOYAGER) can review, prioritize, approve/deny,
 * and tag requests to specific ships or missions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { useSession } from '@/core/data/SessionContext';
import { Shield, Package, Filter } from 'lucide-react';
import { showToast } from '@/components/NexusToast';
import RequisitionCommandRow from './RequisitionCommandRow';

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER'];
const STATUS_FILTERS = [
  { id: 'pending', label: 'PENDING', statuses: ['OPEN', 'UNDER_REVIEW'] },
  { id: 'approved', label: 'APPROVED', statuses: ['APPROVED'] },
  { id: 'closed', label: 'CLOSED', statuses: ['FULFILLED', 'DENIED', 'CANCELLED'] },
  { id: 'all', label: 'ALL', statuses: null },
];

export default function OpsCommandTab() {
  const { user } = useSession();
  const callsign = user?.callsign || 'UNKNOWN';
  const rank = user?.nexus_rank || user?.rank || 'VAGRANT';
  const isLeader = LEADER_RANKS.includes(rank);

  const [reqs, setReqs] = useState([]);
  const [ships, setShips] = useState([]);
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const load = useCallback(async () => {
    const [r, s, o] = await Promise.all([
      base44.entities.Requisition.list('-requested_at', 200).catch(() => []),
      base44.entities.OrgShip.list('name', 200).catch(() => []),
      base44.entities.Op.list('-scheduled_at', 100).catch(() => []),
    ]);
    setReqs(r || []);
    setShips((s || []).filter(sh => sh.status === 'AVAILABLE' || sh.status === 'ASSIGNED'));
    setOps((o || []).filter(op => ['DRAFT', 'PUBLISHED', 'LIVE'].includes(op.status)));
    setLoading(false);
  }, []);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const unsubscribers = [
      base44.entities.Requisition.subscribe(scheduleRefresh),
      base44.entities.OrgShip.subscribe(scheduleRefresh),
      base44.entities.Op.subscribe(scheduleRefresh),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, [scheduleRefresh]);

  const filtered = useMemo(() => {
    const sf = STATUS_FILTERS.find(f => f.id === statusFilter);
    let list = reqs;
    if (sf?.statuses) list = list.filter(r => sf.statuses.includes(r.status));
    if (typeFilter !== 'ALL') list = list.filter(r => r.request_type === typeFilter);
    if (priorityFilter !== 'ALL') list = list.filter(r => r.priority === priorityFilter);
    // Sort: command_priority desc, then URGENT first, then by date
    return [...list].sort((a, b) => {
      if ((b.command_priority || 0) !== (a.command_priority || 0)) return (b.command_priority || 0) - (a.command_priority || 0);
      const priOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
      if ((priOrder[b.priority] || 0) !== (priOrder[a.priority] || 0)) return (priOrder[b.priority] || 0) - (priOrder[a.priority] || 0);
      return new Date(b.requested_at || b.created_date || 0) - new Date(a.requested_at || a.created_date || 0);
    });
  }, [reqs, statusFilter, typeFilter, priorityFilter]);

  const handleAction = async (req, action, extra = {}) => {
    const now = new Date().toISOString();
    const updates = { ...extra };

    if (action === 'approve') {
      updates.status = 'APPROVED';
      updates.reviewed_by = callsign;
      updates.reviewed_at = now;
    } else if (action === 'deny') {
      updates.status = 'DENIED';
      updates.reviewed_by = callsign;
      updates.reviewed_at = now;
    } else if (action === 'review') {
      updates.status = 'UNDER_REVIEW';
      updates.reviewed_by = callsign;
      updates.reviewed_at = now;
    } else if (action === 'fulfill') {
      updates.status = 'FULFILLED';
      updates.fulfilled_by = callsign;
      updates.fulfilled_at = now;
    } else if (action === 'tag') {
      // Just save the extra fields
    }

    await base44.entities.Requisition.update(req.id, updates);
    await refreshNow();
    showToast(`Request ${action === 'tag' ? 'tagged' : action.toUpperCase() + 'D'}`, 'success');
  };

  const pendingCount = reqs.filter(r => ['OPEN', 'UNDER_REVIEW'].includes(r.status)).length;

  if (!isLeader) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 20px', gap: 12,
      }}>
        <Shield size={32} style={{ color: '#5A5850', opacity: 0.3 }} />
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#5A5850',
          textAlign: 'center', maxWidth: 300, lineHeight: 1.5,
        }}>
          Ops Command requires VOYAGER rank or higher. Contact your leadership for access.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} style={{ color: '#C0392B' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 16, color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>OPS COMMAND</span>
          {pendingCount > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 2,
              color: '#C8A84B', background: 'rgba(200,168,75,0.10)', border: '0.5px solid rgba(200,168,75,0.25)',
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em',
            }}>{pendingCount} PENDING</span>
          )}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
        }}>Reviewing as <span style={{ color: '#C8A84B' }}>{callsign}</span></div>
      </div>

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850', lineHeight: 1.5,
      }}>
        Review, prioritize, and approve incoming requisitions. Tag requests to ships or missions for logistics coordination.
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
              padding: '6px 12px', border: 'none', cursor: 'pointer',
              borderBottom: statusFilter === f.id ? '2px solid #C0392B' : '2px solid transparent',
              background: 'transparent',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.10em',
              color: statusFilter === f.id ? '#E8E4DC' : '#5A5850',
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Filter size={9} style={{ color: '#5A5850' }} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
            padding: '4px 8px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          }}>
            <option value="ALL">ALL TYPES</option>
            <option value="MATERIAL">MATERIAL</option>
            <option value="ITEM">ITEM</option>
            <option value="CREDIT">CREDIT</option>
            <option value="BLUEPRINT">BLUEPRINT</option>
            <option value="SHIP_LOAN">SHIP LOAN</option>
          </select>
        </div>

        {/* Priority filter */}
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{
          padding: '4px 8px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
          borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        }}>
          <option value="ALL">ALL PRIORITY</option>
          <option value="URGENT">URGENT</option>
          <option value="HIGH">HIGH</option>
          <option value="NORMAL">NORMAL</option>
          <option value="LOW">LOW</option>
        </select>
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em',
        }}>
          <Package size={28} style={{ opacity: 0.15, marginBottom: 8 }} />
          <div>NO REQUISITIONS MATCH FILTERS</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(r => (
            <RequisitionCommandRow
              key={r.id}
              req={r}
              ships={ships}
              ops={ops}
              callsign={callsign}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
