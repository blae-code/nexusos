import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Play, Square, Upload } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';
import { sendNexusNotification } from '@/core/data/nexus-notify';
import { safeLocalStorage } from '@/core/data/safe-storage';
import CrewGrid from './CrewGrid';
import LootTally from './LootTally';
import OpRsvpSection from './OpRsvpSection';
import PhaseTracker from './PhaseTracker';
import ReadinessGate from './ReadinessGate';
import SessionLog from './SessionLog';
import LiveEventLog from './live-log/LiveEventLog';
import SplitCalc from './SplitCalc';
import ThreatPanel from './ThreatPanel';
import LiveOpTopbar from './LiveOpTopbar';
import MissionControlPanel from './MissionControlPanel';
import RoleReassignPanel from './RoleReassignPanel';
import OpWrapUpPanel from './OpWrapUpPanel';
import ResourceReportPanel from './ResourceReportPanel';
import OpDebriefPanel from './debrief/OpDebriefPanel';
import ShipRoleAssigner from './ship-roles/ShipRoleAssigner';
import ShipRoleDisplay from './ship-roles/ShipRoleDisplay';

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];
const SCOUT_RANKS   = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

function ElapsedTimer({ startedAt }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000)));
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAt]);

  if (!startedAt) {
    return <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>—</span>;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const value = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return <span className="nexus-timer">{value}</span>;
}

function Panel({ title, children, style }) {
  return (
    <div
      style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        padding: 14,
        ...style,
      }}
    >
      {title ? <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.10)' }}>{title}</div> : null}
      {children}
    </div>
  );
}



export default function LiveOp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const rank = ctx.rank || 'VAGRANT';
  const callsign = ctx.callsign || 'UNKNOWN';
  const sessionUserId = ctx.sessionUserId || null;

  const [layoutMode, setLayoutMode] = useState(() => {
    return safeLocalStorage.getItem('nexusos_layout_mode') || 'ALT-TAB';
  });

  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    safeLocalStorage.setItem('nexusos_layout_mode', mode);
  };

  const [op, setOp] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchOp = useCallback(async () => {
    try {
      const [ops, rsvpData, memberData] = await Promise.all([
        base44.entities.Op.filter({ id }),
        base44.entities.OpRsvp.filter({ op_id: id }),
        base44.entities.NexusUser.list('-last_seen_at', 200).catch(() => []),
      ]);

      const opData = Array.isArray(ops) ? ops[0] : null;
      if (!opData) {
        setError('Op not found');
        return;
      }

      setOp(opData);
      setRsvps(rsvpData || []);
      setMembers(memberData || []);
      setError(null);
    } catch {
      setError('Failed to load op');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOp();
    const intervalId = window.setInterval(fetchOp, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchOp]);

  const handlePhaseAdvance = useCallback((nextPhase) => {
    setOp((current) => (current ? { ...current, phase_current: nextPhase } : current));
  }, []);

  const handleGateUpdate = useCallback(() => {
    fetchOp();
  }, [fetchOp]);

  const handleLogUpdate = useCallback((nextLog) => {
    setOp((current) => (current ? { ...current, session_log: nextLog } : current));
  }, []);

  const handleActivate = async () => {
    if (!op || activating) return;
    setActivating(true);
    try {
      await base44.entities.Op.update(op.id, {
        status: 'LIVE',
        started_at: new Date().toISOString(),
      });
      await sendNexusNotification({
        type: 'OP_LIVE',
        title: 'Operation Live',
        body: `${op.name} is now live${op.location ? ` · ${op.location}` : ''}.`,
        severity: 'INFO',
        target_user_id: null,
        source_module: 'OPS',
        source_id: op.id,
      });
      await fetchOp();
    } catch {
      // activating failed — button re-enables via finally
    } finally {
      setActivating(false);
    }
  };

  const handleEndOp = async () => {
    if (!op || ending) return;
    setEnding(true);
    try {
      await base44.entities.Op.update(op.id, {
        status: 'COMPLETE',
        ended_at: new Date().toISOString(),
      });
      await sendNexusNotification({
        type: 'OP_COMPLETE',
        title: 'Operation Complete',
        body: `${op.name} has completed.`,
        severity: 'INFO',
        target_user_id: null,
        source_module: 'OPS',
        source_id: op.id,
      });
      navigate('/app/ops');
    } catch {
      setEnding(false);
    }
  };

  const handlePublish = async () => {
    if (!op || publishing) return;
    setPublishing(true);
    try {
      await base44.entities.Op.update(op.id, { status: 'PUBLISHED' });
      await sendNexusNotification({
        type: 'OP_PUBLISHED',
        title: 'Operation Published',
        body: `${op.name} is published${op.system_name || op.system ? ` · ${op.system_name || op.system}` : ''}.`,
        severity: 'INFO',
        target_user_id: null,
        source_module: 'OPS',
        source_id: op.id,
      });
      await fetchOp();
    } catch {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (error || !op) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error || 'Op not found'}</span>
        <button onClick={() => navigate('/app/ops')} className="nexus-btn" style={{ padding: '6px 16px', fontSize: 10 }}>
          ← BACK TO OPS
        </button>
      </div>
    );
  }

  const phases = Array.isArray(op.phases) ? op.phases : [];
  const currentPhase = op.phase_current || 0;
  const isPioneer = PIONEER_RANKS.includes(rank);
  const canManage = SCOUT_RANKS.includes(rank);
  const isLive = op.status === 'LIVE';
  const isPublished = op.status === 'PUBLISHED';
  const isDraft = op.status === 'DRAFT';
  const canPublish = isDraft && (
    (canManage && String(op.created_by_user_id || '') === String(sessionUserId || '')) || isPioneer
  );
  const confirmedCrew = rsvps.filter((item) => item.status === 'CONFIRMED').length;
  const crewCapacity = normalizeRoleSlots(op.role_slots).reduce((sum, item) => sum + (item.capacity || 0), 0);
  const phaseLabel = phases[currentPhase] || 'Awaiting phase';
  const isSecondMonitor = layoutMode === '2ND MONITOR';

  const phaseTrackerProps = { phases, currentPhase, opId: op.id, opName: op.name, rank, onAdvance: handlePhaseAdvance };
  const readinessGateProps = { op, rank, onUpdate: handleGateUpdate };
  const crewGridProps = { rsvps, op, layoutMode, members };
  const opRsvpProps = { op, rsvps, callsign, sessionUserId, rank };
  const sessionLogProps = { op, callsign, rank, onUpdate: handleLogUpdate };
  const liveEventLogProps = { op, callsign, rank, currentPhase, onSessionLogSync: handleLogUpdate };
  const threatPanelProps = { op, callsign, onUpdate: handleLogUpdate };
  const lootTallyProps = { op, callsign, rank, currentPhase, onUpdate: handleLogUpdate };
  const splitCalcProps = { op, rsvps };
  const missionControlProps = { op, rsvps, callsign, rank };
  const roleReassignProps = { op, rsvps, rank, onUpdate: fetchOp };
  const wrapUpProps = { op, rsvps, callsign, rank, onUpdate: fetchOp };
  const resourceReportProps = { op, rsvps, callsign, rank };
  const debriefProps = { op, rsvps, callsign, rank };
  const shipRoleAssignerProps = { op, rsvps, members, rank, onUpdate: fetchOp };
  const shipRoleDisplayProps = { rsvps, members };
  const isComplete = op.status === 'COMPLETE';
  const isArchived = op.status === 'ARCHIVED';
  const showDebrief = isComplete || isArchived;

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <LiveOpTopbar
        op={op}
        isLive={isLive}
        phases={phases}
        currentPhase={currentPhase}
        startedAt={op.started_at}
        layoutMode={layoutMode}
        onLayoutChange={handleLayoutChange}
      />

      {/* Financial wrap-up + debrief for completed/archived ops */}
      {showDebrief && (
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Panel title="RESOURCE INTELLIGENCE">
            <ResourceReportPanel {...resourceReportProps} />
          </Panel>
          <div style={{ height: 16 }} />
          <Panel title="FINANCIAL WRAP-UP">
            <OpWrapUpPanel {...wrapUpProps} />
          </Panel>
          <div style={{ height: 16 }} />
          <Panel title="OP DEBRIEF — MISSION ANALYSIS">
            <OpDebriefPanel {...debriefProps} />
          </Panel>
        </div>
      )}

      {!showDebrief && layoutMode === 'ALT-TAB' && (
        // Standard 2-column layout
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '60% 40%', gap: 16, padding: 24, overflow: 'hidden', minHeight: 0 }}>
          {/* Left column: Phase tracker + Mission Control + Crew grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflow: 'auto' }}>
            <Panel title="PHASE TRACKER">
              <PhaseTracker {...phaseTrackerProps} />
            </Panel>
            {isLive && (
              <Panel title="MISSION CONTROL">
                <MissionControlPanel {...missionControlProps} />
              </Panel>
            )}
            {isLive && (
              <Panel title="RESOURCE INTELLIGENCE">
                <ResourceReportPanel {...resourceReportProps} />
              </Panel>
            )}
            <Panel title="CREW & RSVP">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <OpRsvpSection {...opRsvpProps} />
                {isLive && canManage && (
                  <>
                    <div style={{ height: '0.5px', background: 'var(--b0)' }} />
                    <RoleReassignPanel {...roleReassignProps} />
                  </>
                )}
                <div style={{ height: '0.5px', background: 'var(--b0)' }} />
                {canManage ? (
                  <ShipRoleAssigner {...shipRoleAssignerProps} />
                ) : (
                  <ShipRoleDisplay {...shipRoleDisplayProps} />
                )}
                <div style={{ height: '0.5px', background: 'var(--b0)' }} />
                <CrewGrid {...crewGridProps} />
              </div>
            </Panel>
          </div>

          {/* Right column: Live Event Log */}
          <div style={{ minHeight: 0, overflow: 'auto' }}>
            <Panel title="LIVE EVENT LOG" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <LiveEventLog {...liveEventLogProps} />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {!showDebrief && layoutMode !== 'ALT-TAB' && (
        // 2nd monitor 3-column layout
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: 12, overflow: 'hidden', height: `calc(100vh - 88px)`, minHeight: 0 }}>
          {/* Column 1: Phase tracker + Crew */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
            <Panel title="PHASE TRACKER">
              <PhaseTracker {...phaseTrackerProps} />
            </Panel>
            <Panel title="CREW & RSVP">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <OpRsvpSection {...opRsvpProps} />
                <div style={{ height: '0.5px', background: 'var(--b0)' }} />
                <CrewGrid {...crewGridProps} />
              </div>
            </Panel>
          </div>

          {/* Column 2: Live Event Log */}
          <div style={{ minHeight: 0, overflow: 'auto' }}>
            <Panel title="LIVE EVENT LOG" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <LiveEventLog {...liveEventLogProps} />
              </div>
            </Panel>
          </div>

          {/* Column 3: Mission Control + Loot tally + Split calc */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
            {isLive && (
              <Panel title="MISSION CONTROL">
                <MissionControlPanel {...missionControlProps} />
              </Panel>
            )}
            {isLive && (
              <Panel title="RESOURCE INTELLIGENCE">
                <ResourceReportPanel {...resourceReportProps} />
              </Panel>
            )}
            <Panel title="LOOT TALLY">
              <LootTally {...lootTallyProps} />
            </Panel>
            <Panel title="SPLIT CALCULATOR">
              <SplitCalc {...splitCalcProps} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}