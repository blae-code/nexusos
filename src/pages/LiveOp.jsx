/**
 * LiveOp — Full live operation command screen
 * Route: /app/ops/:id
 * Tabs: CREW · SUPPLY CHAIN · SESSION LOG
 * Actions: Go Live · End Op · Threat Alert · Phase Brief · Phase Advance
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft } from 'lucide-react';
import LiveOpHeader from '@/components/ops/LiveOpHeader';
import CrewRoster from '@/components/ops/CrewRoster';
import SupplyChainView from '@/components/ops/SupplyChainView';
import SessionLog from '@/components/ops/SessionLog';
import PhaseBriefModal from '@/components/ops/PhaseBriefModal';
import ThreatAlertModal from '@/components/ops/ThreatAlertModal';

const TABS = [
  { id: 'crew',    label: 'CREW' },
  { id: 'supply',  label: 'SUPPLY CHAIN' },
  { id: 'log',     label: 'SESSION LOG' },
];

const CAN_LEAD_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];

export default function LiveOp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const rank = outletContext.rank;
  const callsign = outletContext.callsign;
  const discordId = outletContext.discordId;

  const [op, setOp] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [refineryOrders, setRefineryOrders] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('crew');

  const [showPhaseBrief, setShowPhaseBrief] = useState(false);
  const [showThreat, setShowThreat] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [wrapUpPending, setWrapUpPending] = useState(false);

  const canLead = CAN_LEAD_RANKS.includes(rank);

  const load = useCallback(async () => {
    const [ops, rv, ro, cq] = await Promise.all([
      base44.entities.Op.filter({ id }),
      base44.entities.OpRsvp.filter({ op_id: id }),
      base44.entities.RefineryOrder.list('-started_at', 30),
      base44.entities.CraftQueue.list('-created_date', 30),
    ]);
    const found = ops?.[0];
    if (found) setOp(found);
    setRsvps(rv || []);
    setRefineryOrders(ro || []);
    setCraftQueue(cq || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Real-time op subscription
  useEffect(() => {
    const unsub = base44.entities.Op.subscribe(event => {
      if (event.id === id && event.data) setOp(event.data);
    });
    return unsub;
  }, [id]);

  const handleGoLive = async () => {
    setActionPending(true);
    const updated = await base44.entities.Op.update(id, {
      status: 'LIVE',
      started_at: new Date().toISOString(),
    });
    setOp(prev => ({ ...prev, status: 'LIVE', started_at: updated.started_at }));

    // Herald opGo
    await base44.functions.invoke('heraldBot', {
      action: 'opGo',
      payload: { op_id: id, at_here: true },
    });

    // Log
    const entry = { type: 'system', t: new Date().toISOString(), author: 'NEXUSOS', text: `Op went LIVE — called by ${callsign}` };
    await base44.entities.Op.update(id, { session_log: [...(op?.session_log || []), entry] });
    setActionPending(false);
    await load();
  };

  const handleEndOp = async () => {
    if (!window.confirm('End this op and generate wrap-up report?')) return;
    setWrapUpPending(true);
    const ended_at = new Date().toISOString();
    await base44.entities.Op.update(id, { status: 'COMPLETE', ended_at });
    setOp(prev => ({ ...prev, status: 'COMPLETE', ended_at }));

    // Generate wrap-up report
    await base44.functions.invoke('opWrapUp', { op_id: id });
    setWrapUpPending(false);
    await load();
  };

  const handlePhaseAdvance = async (nextPhase) => {
    const phases = op.phases || [];
    await base44.entities.Op.update(id, { phase_current: nextPhase });
    setOp(prev => ({ ...prev, phase_current: nextPhase }));

    const phaseName = phases[nextPhase]?.name || phases[nextPhase] || `Phase ${nextPhase + 1}`;
    const entry = { type: 'system', t: new Date().toISOString(), author: 'NEXUSOS', text: `Phase advanced → ${phaseName}` };
    const updated = [...(op.session_log || []), entry];
    await base44.entities.Op.update(id, { session_log: updated });
    setOp(prev => ({ ...prev, phase_current: nextPhase, session_log: updated }));

    // Post to Discord
    await base44.functions.invoke('heraldBot', {
      action: 'phaseAdvance',
      payload: { op_id: id, phase_name: phaseName, phase_index: nextPhase },
    });
  };

  const handleOpUpdate = (updatedOp) => setOp(updatedOp);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (!op) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <span style={{ color: 'var(--danger)', fontSize: 13 }}>Op not found</span>
        <button onClick={() => navigate('/app/ops')} className="nexus-btn" style={{ padding: '6px 16px', fontSize: 11 }}>← BACK</button>
      </div>
    );
  }

  const newLogCount = (op.session_log || []).filter(e => e.type !== 'supply_chain').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/app/ops')}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '10px 12px 10px 16px',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)',
            borderRight: '0.5px solid var(--b1)', flexShrink: 0,
            borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)',
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{ flex: 1 }}>
          <LiveOpHeader
            op={op}
            canLead={canLead}
            onGoLive={handleGoLive}
            onEndOp={handleEndOp}
            onThreatAlert={() => setShowThreat(true)}
            onPhaseAdvance={handlePhaseAdvance}
          />
        </div>
        {/* Phase brief button — only during LIVE ops with phases */}
        {canLead && op.status === 'LIVE' && (
          <button
            onClick={() => setShowPhaseBrief(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 16px', height: '100%',
              background: 'rgba(232,160,32,0.07)', border: 'none',
              borderLeft: '0.5px solid var(--warn-b)',
              borderBottom: '0.5px solid var(--b1)',
              cursor: 'pointer', color: 'var(--warn)', fontSize: 10,
              letterSpacing: '0.08em', fontFamily: 'inherit', flexShrink: 0,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,160,32,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,160,32,0.07)'}
          >
            POST PHASE BRIEF
          </button>
        )}
      </div>

      {/* Wrap-up pending banner */}
      {wrapUpPending && (
        <div style={{
          padding: '8px 16px', background: 'rgba(232,160,32,0.08)', borderBottom: '0.5px solid var(--warn-b)',
          color: 'var(--warn)', fontSize: 10, letterSpacing: '0.08em', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div className="nexus-loading-dots"><span /><span /><span /></div>
          Generating wrap-up report and posting to Discord...
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
        borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)', padding: '0 16px',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 14px',
              background: 'none', border: 'none',
              borderBottom: tab === t.id ? '1.5px solid var(--acc2)' : '1.5px solid transparent',
              color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'color 0.12s',
              position: 'relative',
            }}
          >
            {t.label}
            {t.id === 'log' && newLogCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 4,
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--live)',
              }} />
            )}
          </button>
        ))}

        {/* RSVP me button for non-leads */}
        {!canLead && op.status !== 'COMPLETE' && op.status !== 'ARCHIVED' && (
          <div style={{ marginLeft: 'auto' }}>
            <RsvpMeButton op={op} discordId={discordId} callsign={callsign} onDone={load} />
          </div>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'crew' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <CrewRoster op={op} rsvps={rsvps} canLead={canLead} onRsvpUpdate={load} />
          </div>
        )}
        {tab === 'supply' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <SupplyChainView
              op={op}
              rsvps={rsvps}
              refineryOrders={refineryOrders}
              craftQueue={craftQueue}
              canEdit={canLead && op.status === 'LIVE'}
              onUpdate={handleOpUpdate}
            />
          </div>
        )}
        {tab === 'log' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SessionLog op={op} callsign={callsign} canLead={canLead} onUpdate={handleOpUpdate} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showPhaseBrief && (
        <PhaseBriefModal
          op={op}
          onClose={() => setShowPhaseBrief(false)}
          onPosted={() => { setShowPhaseBrief(false); load(); }}
        />
      )}
      {showThreat && (
        <ThreatAlertModal
          op={op}
          callsign={callsign}
          onClose={() => setShowThreat(false)}
          onPosted={(updated) => { handleOpUpdate(updated); setShowThreat(false); }}
        />
      )}
    </div>
  );
}

// ── Inline RSVP button for crew members ──────────────────────────────────────
function RsvpMeButton({ op, discordId, callsign, onDone }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('');
  const [ship, setShip] = useState('');
  const [posting, setPosting] = useState(false);

  const roles = Object.keys(op.role_slots || {});

  const handleRsvp = async (status) => {
    setPosting(true);
    const existing = await base44.entities.OpRsvp.filter({ op_id: op.id, discord_id: discordId });
    if (existing?.[0]) {
      await base44.entities.OpRsvp.update(existing[0].id, { status, role: role || existing[0].role, ship: ship || existing[0].ship });
    } else {
      await base44.entities.OpRsvp.create({ op_id: op.id, discord_id: discordId, callsign, role, ship, status });
    }
    setPosting(false);
    setOpen(false);
    onDone && onDone();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="nexus-btn" style={{ padding: '4px 12px', fontSize: 10 }}>
        RSVP
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
      background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 5,
      padding: '4px 8px',
    }}>
      <select className="nexus-input" value={role} onChange={e => setRole(e.target.value)} style={{ fontSize: 10, padding: '2px 6px', width: 100 }}>
        <option value="">Role...</option>
        {roles.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <input className="nexus-input" value={ship} onChange={e => setShip(e.target.value)} placeholder="Ship..." style={{ fontSize: 10, padding: '2px 6px', width: 90 }} />
      <button onClick={() => handleRsvp('CONFIRMED')} disabled={posting} className="nexus-btn live-btn" style={{ padding: '2px 8px', fontSize: 9 }}>CONFIRM</button>
      <button onClick={() => handleRsvp('DECLINED')} disabled={posting} className="nexus-btn danger-btn" style={{ padding: '2px 8px', fontSize: 9 }}>DECLINE</button>
      <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 13, padding: 2 }}>×</button>
    </div>
  );
}