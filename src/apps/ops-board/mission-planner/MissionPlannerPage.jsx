/**
 * MissionPlannerPage — unified mission planning view
 * Create ops, define phase objectives/threats, visualize crew status.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { useCoalescedRefresh } from '@/core/hooks/useCoalescedRefresh';
import { Crosshair, Users, Plus, ChevronRight } from 'lucide-react';
import MissionCreateForm from './MissionCreateForm';
import PhaseObjectivesEditor from './PhaseObjectivesEditor';
import CrewStatusPanel from './CrewStatusPanel';
import { isOpsLeader } from '../rankPolicies';

export default function MissionPlannerPage() {
  const outletContext = useOutletContext() || {};
  const { rank, callsign, sessionUserId } = outletContext;
  const navigate = useNavigate();

  const [ops, setOps] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [selectedOpId, setSelectedOpId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const canLead = isOpsLeader(rank);

  const load = useCallback(async () => {
    const [opsData, rsvpData] = await Promise.all([
      base44.entities.Op.list('-scheduled_at', 50).catch(() => []),
      base44.entities.OpRsvp.filter({ status: 'CONFIRMED' }).catch(() => []),
    ]);
    const active = (opsData || []).filter(o => ['DRAFT', 'PUBLISHED', 'LIVE'].includes(o.status));
    setOps(active);
    setRsvps(rsvpData || []);
    if (!selectedOpId && active.length > 0) setSelectedOpId(active[0].id);
    setLoading(false);
  }, [selectedOpId]);
  const { refreshNow, scheduleRefresh } = useCoalescedRefresh(load);

  useEffect(() => { void refreshNow(); }, [refreshNow]);
  useEffect(() => {
    const u1 = base44.entities.Op.subscribe(scheduleRefresh);
    const u2 = base44.entities.OpRsvp.subscribe(scheduleRefresh);
    return () => { u1(); u2(); };
  }, [scheduleRefresh]);

  const selectedOp = ops.find(o => o.id === selectedOpId) || null;
  const opRsvps = rsvps.filter(r => r.op_id === selectedOpId);

  const handleCreated = (op) => {
    setShowCreate(false);
    setSelectedOpId(op.id);
    load();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}>LOADING MISSION PLANNER…</span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '12px 20px',
        borderBottom: '0.5px solid var(--b0)', background: 'var(--bg0)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Crosshair size={14} style={{ color: 'var(--danger)' }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--t0)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          MISSION PLANNER
        </span>
        <div style={{ flex: 1 }} />
        {canLead && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="nexus-btn nexus-btn-go"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 10 }}
          >
            <Plus size={11} /> {showCreate ? 'CANCEL' : 'NEW OPERATION'}
          </button>
        )}
      </div>

      {/* Create form overlay */}
      {showCreate && canLead && (
        <div style={{
          flexShrink: 0, padding: '16px 20px',
          borderBottom: '0.5px solid var(--b0)', background: 'var(--bg1)',
          maxHeight: 400, overflow: 'auto',
        }}>
          <MissionCreateForm
            callsign={callsign}
            sessionUserId={sessionUserId}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Op selector sidebar */}
        <div style={{
          width: 240, flexShrink: 0, borderRight: '0.5px solid var(--b0)',
          overflow: 'auto', background: 'var(--bg0)',
        }}>
          <div style={{ padding: '10px 12px', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.12em' }}>
            ACTIVE OPERATIONS ({ops.length})
          </div>
          {ops.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--t3)', fontSize: 10 }}>
              No active ops
            </div>
          )}
          {ops.map(op => {
            const isSelected = op.id === selectedOpId;
            const count = rsvps.filter(r => r.op_id === op.id).length;
            const statusColor = op.status === 'LIVE' ? 'var(--danger)' : op.status === 'PUBLISHED' ? 'var(--warn)' : 'var(--t3)';
            return (
              <button
                key={op.id}
                onClick={() => setSelectedOpId(op.id)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 12px', cursor: 'pointer',
                  background: isSelected ? 'var(--bg2)' : 'transparent',
                  border: 'none', borderLeft: isSelected ? '2px solid var(--danger)' : '2px solid transparent',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  transition: 'background 100ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0,
                    animation: op.status === 'LIVE' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: isSelected ? 'var(--t0)' : 'var(--t1)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                  }}>
                    {op.name || 'Unnamed Op'}
                  </span>
                  <ChevronRight size={10} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--t3)', display: 'flex', gap: 8 }}>
                  <span>{op.type?.replace(/_/g, ' ')}</span>
                  <span><Users size={8} style={{ verticalAlign: 'middle' }} /> {count}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', minWidth: 0 }}>
          {selectedOp ? (
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Op header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--t0)', letterSpacing: '0.04em' }}>
                  {selectedOp.name}
                </span>
                <span className="nexus-pill" style={{
                  background: selectedOp.status === 'LIVE' ? 'rgba(192,57,43,0.18)' : selectedOp.status === 'PUBLISHED' ? 'var(--warn-bg)' : 'var(--bg3)',
                  color: selectedOp.status === 'LIVE' ? 'var(--danger)' : selectedOp.status === 'PUBLISHED' ? 'var(--warn)' : 'var(--t2)',
                  borderColor: selectedOp.status === 'LIVE' ? 'var(--danger)' : selectedOp.status === 'PUBLISHED' ? 'var(--warn-b)' : 'var(--b1)',
                }}>
                  {selectedOp.status}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => navigate(`/app/ops/${selectedOp.id}`)}
                  className="nexus-btn"
                  style={{ fontSize: 10 }}
                >
                  OPEN LIVE VIEW →
                </button>
              </div>

              <div style={{ fontSize: 11, color: 'var(--t2)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {selectedOp.type && <span>{selectedOp.type.replace(/_/g, ' ')}</span>}
                {selectedOp.system && <span>· {selectedOp.system}</span>}
                {selectedOp.system_name && <span>· {selectedOp.system_name}</span>}
                {selectedOp.location && <span>· {selectedOp.location}</span>}
              </div>

              {/* Two-column layout: phases + crew */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
                <PhaseObjectivesEditor op={selectedOp} onUpdate={refreshNow} canEdit={canLead} />
                <CrewStatusPanel op={selectedOp} rsvps={opRsvps} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <Crosshair size={32} style={{ color: 'var(--t3)', opacity: 0.2 }} />
              <span style={{ color: 'var(--t2)', fontSize: 11 }}>
                {ops.length === 0 ? 'No active operations — create one to get started' : 'Select an operation from the sidebar'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
