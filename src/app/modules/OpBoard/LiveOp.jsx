/**
 * LiveOp — full live op command center.
 * Route: /app/ops/:id
 *
 * Two layout modes (toggled in header, persisted to localStorage 'nexusos_layout_mode'):
 *   ALT-TAB      — single scrollable column, all panels stacked
 *   2ND MONITOR  — 3 fixed columns (phases+gate | crew | log+threats), no scroll
 *
 * Polls op + rsvps every 15s.
 * rank/callsign from useOutletContext (NexusShell passes { rank, callsign }).
 * discordId via base44.auth.me() fallback.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Play, Square } from 'lucide-react';

import PhaseTracker  from './PhaseTracker';
import ReadinessGate from './ReadinessGate';
import CrewGrid      from './CrewGrid';
import SessionLog    from './SessionLog';
import ThreatPanel   from './ThreatPanel';
import LootTally     from './LootTally';
import SplitCalc     from './SplitCalc';

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];

// ─── Elapsed timer ─────────────────────────────────────────────────────────────

function ElapsedTimer({ startedAt }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>—</span>;

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const str = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <span style={{ color: 'var(--live)', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600 }}>
      {str}
    </span>
  );
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg1)',
      border: '0.5px solid var(--b1)',
      borderRadius: 8,
      padding: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em',
      textTransform: 'uppercase', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

// ─── LiveOp ───────────────────────────────────────────────────────────────────

export default function LiveOp() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const ctx      = useOutletContext() || {};
  const rank     = ctx.rank     || 'VAGRANT';
  const callsign = ctx.callsign || 'UNKNOWN';

  const [op,         setOp]         = useState(null);
  const [rsvps,      setRsvps]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activating, setActivating] = useState(false);
  const [ending,     setEnding]     = useState(false);

  // Layout mode — persisted to localStorage (user-authorized exception to general rule)
  const [layoutMode, setLayoutMode] = useState(() =>
    localStorage.getItem('nexusos_layout_mode') || 'ALT-TAB'
  );

  const applyLayout = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('nexusos_layout_mode', mode);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchOp = useCallback(async () => {
    try {
      const [ops, rsvpData] = await Promise.all([
        base44.entities.Op.filter({ id }),
        base44.entities.OpRsvp.filter({ op_id: id }),
      ]);
      const opData = Array.isArray(ops) ? ops[0] : null;
      if (!opData) { setError('Op not found'); return; }
      setOp(opData);
      setRsvps(rsvpData || []);
      setError(null);
    } catch (e) {
      console.error('[LiveOp] fetch failed:', e);
      setError('Failed to load op');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOp();
    const interval = setInterval(fetchOp, 15000);
    return () => clearInterval(interval);
  }, [fetchOp]);

  // ── Update callbacks ──────────────────────────────────────────────────────

  // PhaseTracker advances optimistically; gate/log trigger a re-fetch
  const handlePhaseAdvance = useCallback((newPhase) => {
    setOp(prev => prev ? { ...prev, phase_current: newPhase } : prev);
  }, []);

  const handleGateUpdate = useCallback(() => {
    fetchOp();
  }, [fetchOp]);

  const handleLogUpdate = useCallback((newLog) => {
    setOp(prev => prev ? { ...prev, session_log: newLog } : prev);
  }, []);

  // ── ACTIVATE ──────────────────────────────────────────────────────────────

  const handleActivate = async () => {
    if (!op || activating) return;
    setActivating(true);
    try {
      await base44.entities.Op.update(op.id, {
        status:     'LIVE',
        started_at: new Date().toISOString(),
      });
      base44.functions.invoke('heraldBot', {
        action:  'opActivate',
        payload: { op_id: op.id, op_name: op.name },
      }).catch(e => console.warn('[LiveOp] heraldBot opActivate failed:', e.message));
      await fetchOp();
    } catch (e) {
      console.error('[LiveOp] activate failed:', e);
    }
    setActivating(false);
  };

  // ── END OP ────────────────────────────────────────────────────────────────

  const handleEndOp = async () => {
    if (!op || ending) return;
    setEnding(true);
    try {
      await base44.entities.Op.update(op.id, {
        status:   'COMPLETE',
        ended_at: new Date().toISOString(),
      });
      base44.functions.invoke('heraldBot', {
        action:  'opEnd',
        payload: { op_id: op.id, op_name: op.name },
      }).catch(e => console.warn('[LiveOp] heraldBot opEnd failed:', e.message));
      navigate('/app/ops');
    } catch (e) {
      console.error('[LiveOp] end op failed:', e);
      setEnding(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--b3)', borderTopColor: 'var(--acc2)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  // ── Derived state ─────────────────────────────────────────────────────────

  const phases       = Array.isArray(op.phases) ? op.phases : [];
  const currentPhase = op.phase_current || 0;
  const isPioneer    = PIONEER_RANKS.includes(rank);
  const isLive       = op.status === 'LIVE';
  const isPublished  = op.status === 'PUBLISHED';
  const phaseName    = phases[currentPhase] || '—';
  const is2ndMonitor = layoutMode === '2ND MONITOR';

  // ── Shared sub-component props ────────────────────────────────────────────

  const phaseTrackerProps  = { phases, currentPhase, opId: op.id, rank, onAdvance: handlePhaseAdvance };
  const readinessGateProps = { op, rank, onUpdate: handleGateUpdate };
  const crewGridProps      = { rsvps, op };
  const sessionLogProps    = { op, callsign, onUpdate: handleLogUpdate };
  const threatPanelProps   = { op, callsign, onUpdate: handleLogUpdate };
  const lootTallyProps     = { op, callsign, currentPhase, onUpdate: handleLogUpdate };
  const splitCalcProps     = { op, rsvps };

  // ── Header bar ────────────────────────────────────────────────────────────

  const Header = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      padding: '9px 14px', borderBottom: '0.5px solid var(--b1)',
      background: 'var(--bg1)', minWidth: 0,
    }}>
      {/* Back */}
      <button
        onClick={() => navigate('/app/ops')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 4, flexShrink: 0 }}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Op name */}
      <span style={{
        color: 'var(--t0)', fontSize: 13, fontWeight: 600,
        letterSpacing: '0.04em', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {op.name}
      </span>

      {/* Status badge */}
      {isLive && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 9, letterSpacing: '0.1em', fontWeight: 700,
          padding: '2px 7px', borderRadius: 4, flexShrink: 0,
          background: 'rgba(39,201,106,0.08)',
          border: '0.5px solid rgba(39,201,106,0.3)',
          color: 'var(--live)',
        }}>
          <div className="pulse-live" style={{ width: 5, height: 5 }} />
          LIVE
        </span>
      )}
      {isPublished && (
        <span style={{
          fontSize: 9, letterSpacing: '0.1em', fontWeight: 700,
          padding: '2px 7px', borderRadius: 4, flexShrink: 0,
          background: 'rgba(74,143,208,0.08)',
          border: '0.5px solid rgba(74,143,208,0.3)',
          color: 'var(--info)',
        }}>
          PUBLISHED
        </span>
      )}

      {/* Current phase name */}
      <span style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.06em', flexShrink: 0 }}>
        {phaseName}
      </span>

      <div style={{ flex: 1 }} />

      {/* Elapsed timer — live ops only */}
      {isLive && op.started_at && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 1 }}>
          <div style={{ color: 'var(--t3)', fontSize: 8, letterSpacing: '0.1em' }}>ELAPSED</div>
          <ElapsedTimer startedAt={op.started_at} />
        </div>
      )}

      {/* Layout toggle chips */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {['ALT-TAB', '2ND MONITOR'].map(mode => (
          <button
            key={mode}
            onClick={() => applyLayout(mode)}
            style={{
              padding: '3px 8px', fontSize: 9, letterSpacing: '0.06em',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              border: layoutMode === mode ? '0.5px solid var(--b3)' : '0.5px solid var(--b1)',
              background: layoutMode === mode ? 'var(--bg4)' : 'var(--bg2)',
              color: layoutMode === mode ? 'var(--t0)' : 'var(--t2)',
              fontWeight: layoutMode === mode ? 600 : 400,
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ACTIVATE — PUBLISHED, Pioneer+ */}
      {isPublished && isPioneer && (
        <button
          onClick={handleActivate}
          disabled={activating}
          className="nexus-btn"
          style={{
            padding: '5px 12px', fontSize: 10, letterSpacing: '0.08em',
            background: 'rgba(39,201,106,0.08)',
            borderColor: 'rgba(39,201,106,0.3)',
            color: 'var(--live)',
            opacity: activating ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Play size={10} />
          {activating ? 'ACTIVATING...' : 'ACTIVATE'}
        </button>
      )}

      {/* END OP — LIVE, Pioneer+ */}
      {isLive && isPioneer && (
        <button
          onClick={handleEndOp}
          disabled={ending}
          className="nexus-btn"
          style={{
            padding: '5px 12px', fontSize: 10, letterSpacing: '0.08em',
            background: 'rgba(224,72,72,0.08)',
            borderColor: 'rgba(224,72,72,0.3)',
            color: 'var(--danger)',
            opacity: ending ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Square size={10} />
          {ending ? 'ENDING...' : 'END OP'}
        </button>
      )}
    </div>
  );

  // ── ALT-TAB layout — single scrollable column ─────────────────────────────

  if (!is2ndMonitor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {Header}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860, margin: '0 auto' }}>

            <Panel>
              <SectionLabel>PHASE TRACKER</SectionLabel>
              <PhaseTracker {...phaseTrackerProps} />
            </Panel>

            <ReadinessGate {...readinessGateProps} />

            <Panel>
              <SectionLabel>CREW</SectionLabel>
              <CrewGrid {...crewGridProps} />
            </Panel>

            <Panel>
              <ThreatPanel {...threatPanelProps} />
            </Panel>

            <Panel style={{ minHeight: 200 }}>
              <SectionLabel>SESSION LOG</SectionLabel>
              <SessionLog {...sessionLogProps} />
            </Panel>

            {/* LootTally self-hides when currentPhase < 4 */}
            <Panel>
              <LootTally {...lootTallyProps} />
            </Panel>

            <Panel>
              <SectionLabel>SPLIT CALCULATOR</SectionLabel>
              <SplitCalc {...splitCalcProps} />
            </Panel>

          </div>
        </div>
      </div>
    );
  }

  // ── 2ND MONITOR layout — 3 fixed columns, no scroll ───────────────────────
  // Columns: (phases + gate) | (crew) | (log + threats)
  // Bottom strip: LootTally (phase>=4 only) + SplitCalc

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {Header}

      {/* 3-column grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
        padding: 10,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Col 1: Phase tracker + Readiness gate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
          <Panel style={{ flexShrink: 0 }}>
            <SectionLabel>PHASE TRACKER</SectionLabel>
            <PhaseTracker {...phaseTrackerProps} />
          </Panel>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <ReadinessGate {...readinessGateProps} />
          </div>
        </div>

        {/* Col 2: Crew */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Panel style={{ flex: 1, overflow: 'auto' }}>
            <SectionLabel>CREW</SectionLabel>
            <CrewGrid {...crewGridProps} />
          </Panel>
        </div>

        {/* Col 3: Session log + Threats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
          <Panel style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <SectionLabel>SESSION LOG</SectionLabel>
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <SessionLog {...sessionLogProps} />
            </div>
          </Panel>
          <Panel style={{ flexShrink: 0 }}>
            <ThreatPanel {...threatPanelProps} />
          </Panel>
        </div>
      </div>

      {/* Bottom strip: LootTally (phase>=4) + SplitCalc */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: currentPhase >= 4 ? '1fr 1fr' : '1fr',
        gap: 10,
        padding: '0 10px 10px',
        flexShrink: 0,
        borderTop: '0.5px solid var(--b1)',
        paddingTop: 10,
      }}>
        {currentPhase >= 4 && (
          <Panel>
            <LootTally {...lootTallyProps} />
          </Panel>
        )}
        <Panel>
          <SectionLabel>SPLIT CALCULATOR</SectionLabel>
          <SplitCalc {...splitCalcProps} />
        </Panel>
      </div>
    </div>
  );
}
