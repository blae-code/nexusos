/**
 * LiveOp — Live operation management screen
 * Route: /app/ops/:id
 *
 * Tabs: CREW | SUPPLY CHAIN | SESSION LOG
 * Phase tracker + controls for Op Leaders (VOYAGER+)
 * Threat alert, Phase Brief, End Op actions
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, ChevronLeft, ChevronRight, Square } from 'lucide-react';
import LiveOpCrewTab from '@/components/ops/LiveOpCrewTab';
import SupplyChainView from '@/components/ops/SupplyChainView';
import LiveOpSessionLog from '@/components/ops/LiveOpSessionLog';
import PhaseTracker from '@/components/ops/PhaseTracker';

const STATUS_CONFIG = {
  DRAFT:     { label: 'DRAFT',     color: 'var(--warn)',  bg: 'var(--warn-bg)',  border: 'var(--warn-b)' },
  PUBLISHED: { label: 'PUBLISHED', color: 'var(--info)',  bg: 'var(--info-bg)',  border: 'var(--info-b)' },
  LIVE:      { label: 'LIVE',      color: 'var(--live)',  bg: 'var(--live-bg)',  border: 'var(--live-b)' },
  COMPLETE:  { label: 'COMPLETE',  color: 'var(--t1)',    bg: 'var(--bg2)',      border: 'var(--b2)' },
  ARCHIVED:  { label: 'ARCHIVED',  color: 'var(--t2)',    bg: 'var(--bg2)',      border: 'var(--b1)' },
};

const TABS = [
  { id: 'crew',   label: 'CREW' },
  { id: 'supply', label: 'SUPPLY CHAIN' },
  { id: 'log',    label: 'SESSION LOG' },
];

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];

// ─── Phase progress bar ────────────────────────────────────────────────────────
function PhaseBar({ op, canEdit, onPhaseChange }) {
  const phases = op.phases || [];
  if (phases.length === 0) return null;
  const current = op.phase_current || 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', flexShrink: 0 }}>PHASE</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'auto', flex: 1 }}>
        {phases.map((p, i) => {
          const name = typeof p === 'object' ? p.name : p;
          const isCurrent = i === current;
          const isDone = i < current;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              <div style={{
                padding: '3px 8px', borderRadius: 3, fontSize: 9, letterSpacing: '0.08em',
                background: isCurrent ? 'rgba(232,160,32,0.12)' : isDone ? 'var(--bg2)' : 'transparent',
                border: `0.5px solid ${isCurrent ? 'rgba(232,160,32,0.4)' : isDone ? 'var(--b1)' : 'transparent'}`,
                color: isCurrent ? 'var(--warn)' : isDone ? 'var(--live)' : 'var(--t3)',
              }}>
                {isDone ? '✓' : isCurrent ? '▶' : `${i + 1}`} {name || `P${i + 1}`}
              </div>
              {i < phases.length - 1 && (
                <div style={{ width: 12, height: '0.5px', background: isDone ? 'var(--b2)' : 'var(--b0)', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button
            onClick={() => onPhaseChange(Math.max(0, current - 1))}
            disabled={current === 0}
            className="nexus-btn"
            style={{ padding: '3px 7px', fontSize: 10, opacity: current === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={10} />
          </button>
          <button
            onClick={() => onPhaseChange(Math.min(phases.length - 1, current + 1))}
            disabled={current >= phases.length - 1}
            className="nexus-btn"
            style={{ padding: '3px 7px', fontSize: 10, opacity: current >= phases.length - 1 ? 0.3 : 1 }}
          >
            <ChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Threat alert modal ────────────────────────────────────────────────────────
function ThreatAlertModal({ op, callsign, onClose }) {
  const [form, setForm] = useState({ threat_type: 'HOSTILE', description: '', system: op.system || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    await base44.functions.invoke('heraldBot', {
      action: 'threatAlert',
      payload: { op_id: op.id, op_name: op.name, threat_type: form.threat_type, description: form.description, system: form.system, callsign },
    });
    const entry = { type: 'threat', t: new Date().toISOString(), author: callsign, text: `${form.threat_type}: ${form.description}` };
    await base44.entities.Op.update(op.id, { session_log: [...(op.session_log || []), entry] });
    setSaving(false);
    onClose();
  };

  const TYPES = ['HOSTILE', 'GRIEFER', 'SERVER_ISSUE', 'DISCONNECT', 'EMERGENCY', 'OTHER'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,9,14,0.88)' }}>
      <div className="nexus-fade-in" style={{ width: 420, background: 'var(--bg2)', border: '0.5px solid rgba(224,72,72,0.3)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={13} style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>THREAT ALERT</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 5 }}>TYPE</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => set('threat_type', t)} style={{
                  padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 9, letterSpacing: '0.08em',
                  background: form.threat_type === t ? 'rgba(224,72,72,0.12)' : 'var(--bg3)',
                  border: `0.5px solid ${form.threat_type === t ? 'var(--danger)' : 'var(--b2)'}`,
                  color: form.threat_type === t ? 'var(--danger)' : 'var(--t1)',
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 5 }}>DESCRIPTION</div>
            <textarea className="nexus-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ship type, location, count…" rows={3} style={{ fontSize: 11, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onClose} className="nexus-btn" style={{ padding: '7px 14px', fontSize: 10 }}>CANCEL</button>
            <button onClick={handleSubmit} disabled={saving} className="nexus-btn danger-btn" style={{ flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 10 }}>
              {saving ? 'POSTING...' : '⚠ BROADCAST ALERT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
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
  const [showThreat, setShowThreat] = useState(false);
  const [showPhaseBrief, setShowPhaseBrief] = useState(false);
  const [goLoading, setGoLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

  const canLead = LEADER_RANKS.includes(rank);

  const load = useCallback(async () => {
    const [ops, rv, ro, cq] = await Promise.all([
      base44.entities.Op.filter({ id }),
      base44.entities.OpRsvp.filter({ op_id: id }),
      base44.entities.RefineryOrder.list('-started_at', 30),
      base44.entities.CraftQueue.list('-created_date', 30),
    ]);
    setOp(ops?.[0] || null);
    setRsvps(rv || []);
    setRefineryOrders(ro || []);
    setCraftQueue(cq || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Op.subscribe(event => {
      if (event.id === id && event.data) setOp(event.data);
    });
    const unsubRsvp = base44.entities.OpRsvp.subscribe(() => { load(); });
    return () => { unsub(); unsubRsvp(); };
  }, [id, load]);

  const handleGoLive = async () => {
    setGoLoading(true);
    await base44.entities.Op.update(id, { status: 'LIVE', started_at: new Date().toISOString() });
    await base44.functions.invoke('heraldBot', { action: 'opGo', payload: { op_id: id, at_here: true } });
    setGoLoading(false);
  };

  const handleEndOp = async () => {
    if (!window.confirm('End this op and generate wrap-up report?')) return;
    setEndLoading(true);
    try {
      // Calculate duration
      const startTime = op.started_at ? new Date(op.started_at) : new Date();
      const endTime = new Date();
      const durationMinutes = Math.round((endTime - startTime) / 60000);

      // Collect crew data from RSVPs
      const crewList = rsvps
        .filter(r => r.status === 'CONFIRMED')
        .map(r => ({
          callsign: r.callsign,
          role: r.role || 'crew',
          ship: r.ship,
        }));

      // Collect logged materials from session
      const materialsLogged = (op.session_log || [])
        .filter(log => log.type === 'material_logged')
        .map(log => ({
          material_name: log.material_name,
          quantity_scu: log.quantity_scu,
          quality_pct: log.quality_pct,
        }));

      // Calculate total value estimate
      const totalValue = materialsLogged.reduce((sum, m) => sum + (m.quantity_scu * 50), 0); // Rough estimate

      // Mark op as complete and get debrief
      await base44.entities.Op.update(id, { status: 'COMPLETE', ended_at: new Date().toISOString() });

      const res = await base44.functions.invoke('opWrapUp', {
        op_id: id,
        op_name: op.name,
        op_type: op.type,
        duration_minutes: durationMinutes,
        crew_list: crewList,
        session_log: op.session_log || [],
        materials_logged: materialsLogged,
        total_value_aUEC: totalValue,
      });

      if (res.data?.debrief_text) {
        // Store debrief in op record
        await base44.entities.Op.update(id, { wrap_up_report: res.data.debrief_text });

        // Post to Discord via Herald Bot
        if (res.data?.discord_embed) {
          await base44.functions.invoke('heraldBot', {
            action: 'opDebrief',
            payload: {
              op_id: id,
              debrief: res.data.debrief_text,
              embed: res.data.discord_embed,
            },
          });
        }

        setTimeout(() => navigate('/app/ops'), 1500);
      } else {
        alert('Wrap-up generation failed. Op marked complete.');
        navigate('/app/ops');
      }
    } catch (err) {
      alert('Error ending op: ' + err.message);
    }
    setEndLoading(false);
  };

  const handlePhaseChange = async (newPhase) => {
    setOp(prev => ({ ...prev, phase_current: newPhase }));
    await base44.entities.Op.update(id, { phase_current: newPhase });

    // Auto-trigger phase briefing
    const phases = op.phases || [];
    const currentPhase = phases[newPhase];
    const phaseName = typeof currentPhase === 'object' ? currentPhase.name : `Phase ${newPhase + 1}`;
    const nextPhase = newPhase + 1 < phases.length ? (typeof phases[newPhase + 1] === 'object' ? phases[newPhase + 1].name : null) : null;

    // Prepare crew list from RSVPs
    const briefingCrew = rsvps
      .filter(r => r.status === 'CONFIRMED')
      .map(r => ({
        callsign: r.callsign,
        role: r.role || 'crew',
      }));

    // Prepare materials status from session log
    const materialsStatus = {};
    (op.session_log || [])
      .filter(log => log.type === 'material_logged')
      .slice(-5)
      .forEach(log => {
        materialsStatus[log.material_name] = `${log.quantity_scu} SCU @ ${log.quality_pct}%`;
      });

    // Get active threats from session log
    const threats = (op.session_log || [])
      .filter(log => log.type === 'threat')
      .slice(-3)
      .map(log => log.text || 'Unspecified threat');

    try {
      await base44.functions.invoke('phaseBriefing', {
        op_id: id,
        op_name: op.name,
        phase_name: phaseName,
        phase_number: newPhase + 1,
        total_phases: phases.length,
        crew_list: briefingCrew,
        materials_status: materialsStatus,
        threats,
        next_phase: nextPhase,
      });
    } catch (err) {
      console.warn('Phase briefing failed:', err.message);
      // Continue anyway, briefing is optional
    }
  };

  const handleLogEntry = (entry) => {
    setOp(prev => prev ? { ...prev, session_log: [...(prev.session_log || []), entry] } : prev);
  };

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
        <span style={{ color: 'var(--t2)', fontSize: 12 }}>Op not found</span>
        <button onClick={() => navigate('/app/ops')} className="nexus-btn" style={{ padding: '6px 14px', fontSize: 10 }}>← BACK</button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.DRAFT;
  const isLive = op.status === 'LIVE';
  const isMyOp = op.created_by === discordId || canLead;
  const canEdit = canLead && ['LIVE', 'PUBLISHED'].includes(op.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'var(--bg1)', borderBottom: '0.5px solid var(--b1)', padding: '0 16px' }}>

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 6 }}>
          <button onClick={() => navigate('/app/ops')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', padding: 0 }}>
            <ChevronLeft size={14} />
          </button>

          {/* Status */}
          <div style={{
            padding: '2px 8px', borderRadius: 3, flexShrink: 0,
            background: statusCfg.bg, border: `0.5px solid ${statusCfg.border}`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {isLive && <div className="pulse-live" />}
            <span style={{ color: statusCfg.color, fontSize: 9, letterSpacing: '0.12em' }}>{statusCfg.label}</span>
          </div>

          {/* Name */}
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {op.name}
          </span>

          {/* Meta */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {op.system && <span style={{ color: 'var(--t2)', fontSize: 9 }}>{op.system}{op.location ? ` · ${op.location}` : ''}</span>}
            <span className="nexus-tag">{(op.type || '').replace(/_/g, ' ')}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {canEdit && (
              <button onClick={() => setShowThreat(true)} className="nexus-btn danger-btn" style={{ padding: '4px 10px', fontSize: 9 }}>
                <AlertTriangle size={10} /> THREAT
              </button>
            )}

            {isMyOp && op.status === 'PUBLISHED' && (
              <button onClick={handleGoLive} disabled={goLoading} className="nexus-btn live-btn" style={{ padding: '4px 12px', fontSize: 9 }}>
                {goLoading ? 'GOING LIVE...' : '▶ GO LIVE'}
              </button>
            )}
            {isMyOp && isLive && (
              <button onClick={handleEndOp} disabled={endLoading} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 9, borderColor: 'var(--b2)', color: 'var(--t1)' }}>
                <Square size={9} /> {endLoading ? 'ENDING...' : 'END OP'}
              </button>
            )}
          </div>
        </div>

        {/* Phase tracker */}
        {(op.phases || []).length > 0 && (
          <div style={{ paddingBottom: 8 }}>
            <PhaseTracker 
              op={op} 
              canEdit={canEdit} 
              onPhaseChange={handlePhaseChange}
            />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--acc2)' : '2px solid transparent',
                color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
                fontSize: 10, letterSpacing: '0.1em', fontFamily: 'inherit', transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        {tab === 'crew' && <LiveOpCrewTab op={op} rsvps={rsvps} canEdit={canEdit} />}
        {tab === 'supply' && (
          <SupplyChainView
            op={op} rsvps={rsvps} refineryOrders={refineryOrders} craftQueue={craftQueue}
            canEdit={canEdit} onUpdate={setOp}
          />
        )}
        {tab === 'log' && <LiveOpSessionLog op={op} callsign={callsign} canEdit={canEdit} />}
      </div>

      {/* Modals */}
      {showThreat && (
        <ThreatAlertModal op={op} callsign={callsign} onClose={() => { setShowThreat(false); load(); }} />
      )}
    </div>
  );
}
