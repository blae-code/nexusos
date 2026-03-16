import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Square, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CrewGrid from './CrewGrid';
import LootTally from './LootTally';
import PhaseTracker from './PhaseTracker';
import ReadinessGate from './ReadinessGate';
import SessionLog from './SessionLog';
import SplitCalc from './SplitCalc';
import ThreatPanel from './ThreatPanel';

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
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
        padding: 14,
        ...style,
      }}
    >
      {title ? <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div> : null}
      {children}
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'var(--t0)', fontSize: 18, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ color: 'var(--t3)', fontSize: 8, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function LiveOp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const rank = ctx.rank || 'VAGRANT';
  const callsign = ctx.callsign || 'UNKNOWN';
  const discordId = ctx.discordId || null;
  const layoutMode = ctx.layoutMode || 'ALT-TAB';
  const setLayoutMode = ctx.setLayoutMode;

  const [op, setOp] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchOp = useCallback(async () => {
    try {
      const [ops, rsvpData] = await Promise.all([
        base44.entities.Op.filter({ id }),
        base44.entities.OpRsvp.filter({ op_id: id }),
      ]);

      const opData = Array.isArray(ops) ? ops[0] : null;
      if (!opData) {
        setError('Op not found');
        return;
      }

      setOp(opData);
      setRsvps(rsvpData || []);
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
      base44.functions.invoke('heraldBot', {
        action: 'opActivate',
        payload: { op_id: op.id, op_name: op.name },
      }).catch((error) => console.warn('[LiveOp] heraldBot opActivate failed:', error.message));
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
      base44.functions.invoke('heraldBot', {
        action: 'opEnd',
        payload: { op_id: op.id, op_name: op.name },
      }).catch((err) => console.warn('[LiveOp] heraldBot opEnd failed:', err.message));
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
      base44.functions.invoke('heraldBot', {
        action: 'publishOp',
        payload: { op_id: op.id, op_name: op.name },
      }).catch((err) => console.warn('[LiveOp] heraldBot publishOp failed:', err.message));
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
    (canManage && String(op.created_by) === String(discordId)) || isPioneer
  );
  const confirmedCrew = rsvps.filter((item) => item.status === 'CONFIRMED').length;
  const crewCapacity = normalizeRoleSlots(op.role_slots).reduce((sum, item) => sum + (item.capacity || 0), 0);
  const phaseLabel = phases[currentPhase] || 'Awaiting phase';
  const isSecondMonitor = layoutMode === '2ND MONITOR';

  const phaseTrackerProps = { phases, currentPhase, opId: op.id, rank, onAdvance: handlePhaseAdvance };
  const readinessGateProps = { op, rank, onUpdate: handleGateUpdate };
  const crewGridProps = { rsvps, op };
  const sessionLogProps = { op, callsign, rank, onUpdate: handleLogUpdate };
  const threatPanelProps = { op, callsign, onUpdate: handleLogUpdate };
  const lootTallyProps = { op, callsign, rank, currentPhase, onUpdate: handleLogUpdate };
  const splitCalcProps = { op, rsvps };

  const hero = (
    <div
      style={{
        background: 'var(--bg1)',
        borderBottom: '0.5px solid var(--b0)',
        padding: '16px 18px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}
    >
      <button
        onClick={() => navigate('/app/ops')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 4, marginTop: 10 }}
      >
        <ChevronLeft size={15} />
      </button>

      <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
        {isLive ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '0.5px solid var(--live)',
              animation: 'ring 2.2s ease-out infinite',
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 5,
            borderRadius: '50%',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: isLive ? 'var(--live)' : 'var(--warn)' }} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 500, letterSpacing: '0.05em', marginBottom: 4 }}>
          {op.name}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: 'var(--t2)', fontSize: 10 }}>
          <span>{[op.type, op.system_name || op.system, op.location].filter(Boolean).join(' · ')}</span>
          <span><ElapsedTimer startedAt={op.started_at} /></span>
          <span>{phaseLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          <span className={isLive ? 'nexus-pill nexus-pill-live' : 'nexus-pill nexus-pill-warn'}>{op.status}</span>
          {op.access_type ? <span className="nexus-pill nexus-pill-neu">{op.access_type}</span> : null}
          {op.min_rank ? <span className="nexus-pill nexus-pill-neu">{op.min_rank}</span> : null}
          {op.buy_in_cost ? <span className="nexus-pill nexus-pill-warn">{op.buy_in_cost.toLocaleString()} aUEC</span> : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
          <HeroStat label="CREW" value={`${confirmedCrew}/${crewCapacity || 0}`} />
          <div style={{ width: '0.5px', background: 'var(--b1)' }} />
          <HeroStat label="PHASE" value={`${Math.min(phases.length, currentPhase + 1)}/${Math.max(1, phases.length)}`} />
          <div style={{ width: '0.5px', background: 'var(--b1)' }} />
          <HeroStat label="STATUS" value={isLive ? 'LIVE' : op.status} />
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setLayoutMode?.('ALT-TAB')}
            className="nexus-btn"
            style={{ padding: '5px 10px', fontSize: 9, background: layoutMode === 'ALT-TAB' ? 'var(--bg4)' : 'var(--bg2)', borderColor: layoutMode === 'ALT-TAB' ? 'var(--b3)' : 'var(--b1)' }}
          >
            ALT-TAB
          </button>
          <button
            onClick={() => setLayoutMode?.('2ND MONITOR')}
            className="nexus-btn"
            style={{ padding: '5px 10px', fontSize: 9, background: layoutMode === '2ND MONITOR' ? 'var(--bg4)' : 'var(--bg2)', borderColor: layoutMode === '2ND MONITOR' ? 'var(--b3)' : 'var(--b1)' }}
          >
            2ND MONITOR
          </button>
          {canPublish ? (
            <button onClick={handlePublish} disabled={publishing} className="nexus-btn" style={{ padding: '5px 12px', fontSize: 10 }}>
              <Upload size={10} />
              {publishing ? 'PUBLISHING' : 'PUBLISH'}
            </button>
          ) : null}
          {isPublished && canManage ? (
            <button onClick={handleActivate} disabled={activating} className="nexus-btn nexus-btn-go" style={{ padding: '5px 12px', fontSize: 10 }}>
              <Play size={10} />
              {activating ? 'ACTIVATING' : 'ACTIVATE'}
            </button>
          ) : null}
          {isLive && canManage ? (
            <button onClick={handleEndOp} disabled={ending} className="nexus-btn nexus-btn-danger" style={{ padding: '5px 12px', fontSize: 10 }}>
              <Square size={10} />
              {ending ? 'ENDING' : 'END OP'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!isSecondMonitor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {hero}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 960, margin: '0 auto' }}>
            <Panel title="PHASE TRACKER">
              <PhaseTracker {...phaseTrackerProps} />
            </Panel>
            <ReadinessGate {...readinessGateProps} />
            <Panel title="CREW">
              <CrewGrid {...crewGridProps} />
            </Panel>
            <Panel>
              <ThreatPanel {...threatPanelProps} />
            </Panel>
            <Panel title="SESSION LOG" style={{ minHeight: 220 }}>
              <SessionLog {...sessionLogProps} />
            </Panel>
            <Panel>
              <LootTally {...lootTallyProps} />
            </Panel>
            <Panel title="SPLIT CALCULATOR">
              <SplitCalc {...splitCalcProps} />
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {hero}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: 10, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <Panel title="PHASE TRACKER">
            <PhaseTracker {...phaseTrackerProps} />
          </Panel>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ReadinessGate {...readinessGateProps} />
          </div>
        </div>

        <div style={{ minHeight: 0, overflow: 'auto' }}>
          <Panel title="CREW" style={{ minHeight: '100%' }}>
            <CrewGrid {...crewGridProps} />
          </Panel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <Panel title="SESSION LOG" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <SessionLog {...sessionLogProps} />
            </div>
          </Panel>
          <Panel>
            <ThreatPanel {...threatPanelProps} />
          </Panel>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: currentPhase >= 4 ? '1fr 1fr' : '1fr', gap: 10, padding: '0 10px 10px', borderTop: '0.5px solid var(--b1)' }}>
        {currentPhase >= 4 ? (
          <Panel>
            <LootTally {...lootTallyProps} />
          </Panel>
        ) : null}
        <Panel title="SPLIT CALCULATOR">
          <SplitCalc {...splitCalcProps} />
        </Panel>
      </div>
    </div>
  );
}
