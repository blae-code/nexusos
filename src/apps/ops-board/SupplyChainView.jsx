/**
 * SupplyChainView — Live op supply chain visualizer
 * Maps: Extraction Sites → Haulers → Refinery → Fabrication Queue
 * Op Leader can assign haulers to extraction jobs and set transit status.
 *
 * State is stored in op.session_log as typed entries (type: 'supply_chain')
 * so it persists across refreshes without a new entity.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import {
  STAGE_COLOR,
  TRANSIT_COLOR,
  FlowArrow,
  StageColumn,
  ExtractionCard,
  HaulerCard,
  RefineryCard,
  FabCard,
  AddJobForm,
} from './SupplyChainCards';

// ─── Main component ────────────────────────────────────────────────────────────
export default function SupplyChainView({ op, rsvps, refineryOrders, craftQueue, canEdit, onUpdate }) {
  const [showAddJob, setShowAddJob] = useState(false);

  // Supply chain state is stored in op.session_log as a special entry.
  // We find the latest 'supply_chain' entry and use it as our state store.
  const scState = useMemo(() => {
    const logs = op.session_log || [];
    const entry = [...logs].reverse().find(e => e.type === 'supply_chain');
    return entry?.data || { jobs: [], hauler_overrides: {} };
  }, [op.session_log]);

  const jobs = scState.jobs || [];
  const haulerOverrides = scState.hauler_overrides || {}; // rsvpId → { transit_status, assigned_job }

  // Build hauler list from RSVPs, merged with overrides
  const haulers = useMemo(() => {
    return rsvps
      .filter(r => r.status === 'CONFIRMED' && (r.ship_class === 'HAULER' || r.role === 'hauler' || r.role === 'logistics'))
      .map(r => {
        const ov = haulerOverrides[r.id] || {};
        const assignedJob = ov.assigned_job || null;
        const assignedJobLabel = assignedJob ? (jobs.find(j => j.id === assignedJob)?.material || null) : null;
        return {
          ...r,
          transit_status: ov.transit_status || 'IDLE',
          assigned_job: assignedJob,
          assigned_job_label: assignedJobLabel,
        };
      });
  }, [rsvps, haulerOverrides, jobs]);

  // Persist updated state into the op session_log
  const persistState = async (newState) => {
    const logs = (op.session_log || []).filter(e => e.type !== 'supply_chain');
    const updated = [...logs, { type: 'supply_chain', t: new Date().toISOString(), data: newState }];
    await base44.entities.Op.update(op.id, { session_log: updated });
    onUpdate && onUpdate({ ...op, session_log: updated });
  };

  const handleAddJob = async (form) => {
    const newJob = { id: `job_${Date.now()}`, ...form };
    const newState = { ...scState, jobs: [...jobs, newJob] };
    await persistState(newState);
    setShowAddJob(false);
  };

  const handleRemoveJob = async (jobId) => {
    const newState = { ...scState, jobs: jobs.filter(j => j.id !== jobId) };
    await persistState(newState);
  };

  const handleAssign = async (rsvpId, jobId) => {
    const newOverrides = {
      ...haulerOverrides,
      [rsvpId]: { ...(haulerOverrides[rsvpId] || {}), assigned_job: jobId },
    };
    await persistState({ ...scState, hauler_overrides: newOverrides });
  };

  const handleTransitStatus = async (rsvpId, status) => {
    const newOverrides = {
      ...haulerOverrides,
      [rsvpId]: { ...(haulerOverrides[rsvpId] || {}), transit_status: status },
    };
    await persistState({ ...scState, hauler_overrides: newOverrides });
  };

  // Active refinery orders for this op (filter by op_id if set, else show active orders)
  const activeRefinery = refineryOrders.filter(r => r.status === 'ACTIVE' || r.status === 'READY');
  const openCraft = craftQueue.filter(c => ['OPEN', 'CLAIMED', 'IN_PROGRESS'].includes(c.status));

  // Transit summary counts
  const inTransit = haulers.filter(h => h.transit_status === 'IN_TRANSIT').length;
  const docked    = haulers.filter(h => h.transit_status === 'DOCKED').length;
  const unloading = haulers.filter(h => h.transit_status === 'UNLOADING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0', height: '100%', overflow: 'auto' }}>

      {/* ── Status summary bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '0 4px', flexShrink: 0 }}>
        {[
          { label: 'EXTRACTION JOBS', value: jobs.length, color: STAGE_COLOR.extraction },
          { label: 'IN TRANSIT', value: inTransit, color: TRANSIT_COLOR.IN_TRANSIT },
          { label: 'DOCKED', value: docked, color: TRANSIT_COLOR.DOCKED },
          { label: 'UNLOADING', value: unloading, color: TRANSIT_COLOR.UNLOADING },
          { label: 'REFINING', value: activeRefinery.filter(r => r.status === 'ACTIVE').length, color: STAGE_COLOR.refinery },
          { label: 'READY TO COLLECT', value: activeRefinery.filter(r => r.status === 'READY').length, color: 'var(--live)' },
          { label: 'CRAFT QUEUE', value: openCraft.length, color: STAGE_COLOR.fabrication },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '6px 8px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6, textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Pipeline flow ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', padding: '0 4px', flexShrink: 0 }}>

        {/* EXTRACTION */}
        <StageColumn label="Extraction" color={STAGE_COLOR.extraction} width={210}>
          {showAddJob && canEdit && (
            <AddJobForm onAdd={handleAddJob} onClose={() => setShowAddJob(false)} />
          )}
          {jobs.map(job => (
            <div key={job.id} style={{ position: 'relative' }}>
              <ExtractionCard job={job} haulers={haulers} onAssign={handleAssign} canEdit={canEdit} />
              {canEdit && (
                <button
                  onClick={() => handleRemoveJob(job.id)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--t3)', fontSize: 11, lineHeight: 1, padding: 2,
                  }}
                  title="Remove job"
                >×</button>
              )}
            </div>
          ))}
          {jobs.length === 0 && !showAddJob && (
            <div style={{ color: 'var(--t2)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>No jobs defined</div>
          )}
          {canEdit && !showAddJob && (
            <button
              onClick={() => setShowAddJob(true)}
              className="nexus-btn"
              style={{ padding: '4px 0', fontSize: 9, justifyContent: 'center', letterSpacing: '0.08em' }}
            >
              + ADD JOB
            </button>
          )}
        </StageColumn>

        <FlowArrow active={jobs.length > 0} />

        {/* HAULERS (TRANSIT) */}
        <StageColumn label="Haulers / Transit" color={STAGE_COLOR.transit} width={210}>
          {haulers.length === 0 && (
            <div style={{ color: 'var(--t2)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>No haulers confirmed</div>
          )}
          {haulers.map(h => (
            <HaulerCard key={h.id} hauler={h} onStatusChange={handleTransitStatus} canEdit={canEdit} />
          ))}
        </StageColumn>

        <FlowArrow active={haulers.some(h => h.transit_status === 'DOCKED' || h.transit_status === 'UNLOADING')} />

        {/* REFINERY */}
        <StageColumn label="Refinery" color={STAGE_COLOR.refinery} width={200}>
          {activeRefinery.length === 0 && (
            <div style={{ color: 'var(--t2)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>No active orders</div>
          )}
          {activeRefinery.map(o => (
            <RefineryCard key={o.id} order={o} />
          ))}
        </StageColumn>

        <FlowArrow active={activeRefinery.some(r => r.status === 'READY')} />

        {/* FABRICATION */}
        <StageColumn label="Fabrication Queue" color={STAGE_COLOR.fabrication} width={200}>
          {openCraft.length === 0 && (
            <div style={{ color: 'var(--t2)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>Queue empty</div>
          )}
          {openCraft.slice(0, 8).map(c => (
            <FabCard key={c.id} item={c} />
          ))}
          {openCraft.length > 8 && (
            <div style={{ color: 'var(--t2)', fontSize: 9, textAlign: 'center', padding: 4 }}>+{openCraft.length - 8} more</div>
          )}
        </StageColumn>

      </div>
    </div>
  );
}
