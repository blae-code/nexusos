/**
 * OpDebriefPanel — full debrief form + display for completed/archived ops.
 * Logs mission outcome, encounter reports, resource haul, commendations, and lessons learned.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { FileText, Save, Star, Users, Clock, DollarSign, Package, AlertTriangle, Award, Loader2 } from 'lucide-react';
import DebriefMetricsCard from './DebriefMetricsCard';
import EncounterForm from './EncounterForm';
import ResourceHaulForm from './ResourceHaulForm';

const LEADER_RANKS = ['SCOUT', 'VOYAGER', 'QUARTERMASTER', 'FOUNDER', 'PIONEER'];
const OUTCOMES = [
  { id: 'SUCCESS', label: 'SUCCESS', color: '#4A8C5C', desc: 'Objectives achieved' },
  { id: 'PARTIAL', label: 'PARTIAL', color: '#C8A84B', desc: 'Some objectives met' },
  { id: 'FAILURE', label: 'FAILURE', color: '#C0392B', desc: 'Objectives failed' },
  { id: 'ABORTED', label: 'ABORTED', color: '#5A5850', desc: 'Mission called off' },
];

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
      color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
      marginBottom: 8, paddingBottom: 6,
      borderBottom: '0.5px solid rgba(200,170,100,0.06)',
    }}>{children}</div>
  );
}

function CommendationRow({ c, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <Award size={10} style={{ color: '#C8A84B', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8A84B', fontWeight: 600 }}>{c.callsign}</span>
      <span style={{ flex: 1, fontSize: 10, color: '#9A9488' }}>{c.reason}</span>
      {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 2, fontSize: 9 }}>✕</button>}
    </div>
  );
}

export default function OpDebriefPanel({ op, rsvps, callsign, rank, onUpdate }) {
  const canEdit = LEADER_RANKS.includes(rank);
  const [debrief, setDebrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [outcome, setOutcome] = useState('SUCCESS');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [encounters, setEncounters] = useState([]);
  const [resourceHaul, setResourceHaul] = useState([]);
  const [shipsDeployed, setShipsDeployed] = useState('');
  const [shipsLost, setShipsLost] = useState(0);
  const [crewCasualties, setCrewCasualties] = useState(0);
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [commendations, setCommendations] = useState([]);
  const [performanceRating, setPerformanceRating] = useState(3);
  const [newCommCallsign, setNewCommCallsign] = useState('');
  const [newCommReason, setNewCommReason] = useState('');

  // Derived from op
  const confirmed = (rsvps || []).filter(r => r.status === 'CONFIRMED');
  const durationMin = op?.started_at && op?.ended_at
    ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000) : 0;
  const wrapUp = op?.wrap_up_data || {};
  const totalRevenue = (wrapUp.sales || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = (wrapUp.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  // Load existing debrief
  const loadDebrief = useCallback(async () => {
    const debriefs = await base44.entities.OpDebrief.filter({ op_id: op.id }).catch(() => []);
    const existing = Array.isArray(debriefs) && debriefs.length > 0 ? debriefs[0] : null;
    if (existing) {
      setDebrief(existing);
      setOutcome(existing.outcome || 'SUCCESS');
      setOutcomeNotes(existing.outcome_notes || '');
      setEncounters(existing.encounters || []);
      setResourceHaul(existing.resource_haul || []);
      setShipsDeployed((existing.ships_deployed || []).join(', '));
      setShipsLost(existing.ships_lost || 0);
      setCrewCasualties(existing.crew_casualties || 0);
      setLessonsLearned(existing.lessons_learned || '');
      setCommendations(existing.commendations || []);
      setPerformanceRating(existing.performance_rating || 3);
    }
    setLoading(false);
  }, [op?.id]);

  useEffect(() => { if (op?.id) loadDebrief(); }, [loadDebrief, op?.id]);

  const totalHaulScu = resourceHaul.reduce((s, h) => s + (h.quantity_scu || 0), 0);
  const totalHaulValue = resourceHaul.reduce((s, h) => s + (h.value_aUEC || 0), 0);

  const addCommendation = () => {
    if (!newCommCallsign.trim()) return;
    setCommendations(prev => [...prev, { callsign: newCommCallsign.trim(), reason: newCommReason.trim() }]);
    setNewCommCallsign('');
    setNewCommReason('');
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      op_id: op.id,
      op_name: op.name,
      op_type: op.type || '',
      debrief_by_callsign: callsign,
      outcome,
      outcome_notes: outcomeNotes,
      crew_count: confirmed.length,
      duration_minutes: durationMin,
      system: op.system_name || op.system || '',
      total_revenue_aUEC: Math.round(totalRevenue),
      total_expenses_aUEC: Math.round(totalExpenses),
      net_profit_aUEC: Math.round(totalRevenue - totalExpenses),
      resource_haul: resourceHaul,
      total_haul_scu: totalHaulScu,
      total_haul_value_aUEC: totalHaulValue,
      encounters,
      ships_deployed: shipsDeployed.split(',').map(s => s.trim()).filter(Boolean),
      ships_lost: parseInt(shipsLost) || 0,
      crew_casualties: parseInt(crewCasualties) || 0,
      lessons_learned: lessonsLearned,
      commendations,
      performance_rating: performanceRating,
      filed_at: new Date().toISOString(),
    };

    try {
      if (debrief) {
        await base44.entities.OpDebrief.update(debrief.id, payload);
      } else {
        const created = await base44.entities.OpDebrief.create(payload);
        setDebrief(created);
      }
      showToast('Debrief saved', 'success');
      onUpdate?.();
    } catch (err) {
      showToast(err?.message || 'Failed to save debrief', 'error');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  const outcomeCfg = OUTCOMES.find(o => o.id === outcome) || OUTCOMES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Metrics overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
        <DebriefMetricsCard label="OUTCOME" value={outcome} color={outcomeCfg.color} icon={FileText} />
        <DebriefMetricsCard label="CREW" value={confirmed.length} color="#3498DB" icon={Users} />
        <DebriefMetricsCard label="DURATION" value={durationMin > 0 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : '—'} color="#9A9488" icon={Clock} />
        <DebriefMetricsCard label="REVENUE" value={`${Math.round(totalRevenue).toLocaleString()}`} sub="aUEC" color="#4A8C5C" icon={DollarSign} />
        <DebriefMetricsCard label="HAUL" value={`${totalHaulScu.toFixed(1)} SCU`} sub={totalHaulValue > 0 ? `${totalHaulValue.toLocaleString()} aUEC` : ''} color="#C8A84B" icon={Package} />
        <DebriefMetricsCard label="RATING" value={'★'.repeat(performanceRating)} color="#C8A84B" icon={Star} />
      </div>

      {!canEdit && debrief ? (
        /* Read-only view for non-leaders */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <SectionLabel>MISSION SUMMARY</SectionLabel>
            <div style={{ fontSize: 12, color: '#E8E4DC', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{outcomeNotes || 'No summary provided.'}</div>
          </div>
          {encounters.length > 0 && (
            <div>
              <SectionLabel>ENCOUNTERS ({encounters.length})</SectionLabel>
              <EncounterForm encounters={encounters} onChange={() => {}} />
            </div>
          )}
          {resourceHaul.length > 0 && (
            <div>
              <SectionLabel>RESOURCE HAUL</SectionLabel>
              <ResourceHaulForm haul={resourceHaul} onChange={() => {}} />
            </div>
          )}
          {lessonsLearned && (
            <div>
              <SectionLabel>LESSONS LEARNED</SectionLabel>
              <div style={{ fontSize: 11, color: '#9A9488', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lessonsLearned}</div>
            </div>
          )}
          {commendations.length > 0 && (
            <div>
              <SectionLabel>COMMENDATIONS</SectionLabel>
              {commendations.map((c, i) => <CommendationRow key={i} c={c} />)}
            </div>
          )}
          <div style={{ fontSize: 9, color: '#5A5850', fontStyle: 'italic' }}>Filed by {debrief.debrief_by_callsign} on {new Date(debrief.filed_at).toLocaleString()}</div>
        </div>
      ) : canEdit ? (
        /* Editable form for leaders */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Outcome selector */}
          <div>
            <SectionLabel>MISSION OUTCOME</SectionLabel>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {OUTCOMES.map(o => (
                <button key={o.id} onClick={() => setOutcome(o.id)} style={{
                  flex: 1, padding: '8px 6px', borderRadius: 2, cursor: 'pointer',
                  background: outcome === o.id ? `${o.color}15` : '#141410',
                  border: `0.5px solid ${outcome === o.id ? o.color : 'rgba(200,170,100,0.08)'}`,
                  color: outcome === o.id ? o.color : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
                  textAlign: 'center', letterSpacing: '0.06em',
                }}>
                  {o.label}
                  <div style={{ fontSize: 7, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{o.desc}</div>
                </button>
              ))}
            </div>
            <textarea className="nexus-input" value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)}
              placeholder="What happened? Summarize the mission outcome..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 80, resize: 'vertical', fontSize: 11 }} />
          </div>

          {/* Performance rating */}
          <div>
            <SectionLabel>PERFORMANCE RATING</SectionLabel>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setPerformanceRating(n)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                  fontSize: 20, color: n <= performanceRating ? '#C8A84B' : '#3A3530',
                  transition: 'color 100ms',
                }}>★</button>
              ))}
              <span style={{ marginLeft: 8, fontSize: 10, color: '#5A5850', alignSelf: 'center' }}>
                {performanceRating}/5
              </span>
            </div>
          </div>

          {/* Encounters */}
          <div>
            <SectionLabel>ENCOUNTER REPORTS ({encounters.length})</SectionLabel>
            <EncounterForm encounters={encounters} onChange={setEncounters} />
          </div>

          {/* Resource haul */}
          <div>
            <SectionLabel>RESOURCE HAUL</SectionLabel>
            <ResourceHaulForm haul={resourceHaul} onChange={setResourceHaul} />
          </div>

          {/* Ships + casualties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <span style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SHIPS DEPLOYED</span>
              <input className="nexus-input" value={shipsDeployed} onChange={e => setShipsDeployed(e.target.value)}
                placeholder="e.g. Cutlass, MOLE, Cat" style={{ width: '100%', boxSizing: 'border-box', fontSize: 10 }} />
            </div>
            <div>
              <span style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SHIPS LOST</span>
              <input className="nexus-input" type="number" min={0} value={shipsLost} onChange={e => setShipsLost(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 10 }} />
            </div>
            <div>
              <span style={{ fontSize: 8, color: '#5A5850', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CREW CASUALTIES</span>
              <input className="nexus-input" type="number" min={0} value={crewCasualties} onChange={e => setCrewCasualties(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 10 }} />
            </div>
          </div>

          {/* Lessons learned */}
          <div>
            <SectionLabel>LESSONS LEARNED</SectionLabel>
            <textarea className="nexus-input" value={lessonsLearned} onChange={e => setLessonsLearned(e.target.value)}
              placeholder="What would you do differently? Key takeaways for future ops..."
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical', fontSize: 11 }} />
          </div>

          {/* Commendations */}
          <div>
            <SectionLabel>COMMENDATIONS</SectionLabel>
            {commendations.map((c, i) => <CommendationRow key={i} c={c} onRemove={() => setCommendations(prev => prev.filter((_, idx) => idx !== i))} />)}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input className="nexus-input" value={newCommCallsign} onChange={e => setNewCommCallsign(e.target.value)}
                placeholder="Callsign" style={{ width: 100, fontSize: 10 }} />
              <input className="nexus-input" value={newCommReason} onChange={e => setNewCommReason(e.target.value)}
                placeholder="Outstanding performance reason" style={{ flex: 1, fontSize: 10 }} />
              <button onClick={addCommendation} disabled={!newCommCallsign.trim()} style={{
                background: '#C8A84B', border: 'none', borderRadius: 2, padding: '4px 10px',
                color: '#0A0908', fontSize: 9, fontWeight: 600, cursor: newCommCallsign.trim() ? 'pointer' : 'not-allowed',
                opacity: newCommCallsign.trim() ? 1 : 0.4,
              }}>ADD</button>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '12px', background: saving ? '#5A5850' : '#C0392B',
            border: 'none', borderRadius: 2, color: '#E8E4DC',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600,
            letterSpacing: '0.12em', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {saving ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> SAVING...</> : <><Save size={12} /> {debrief ? 'UPDATE DEBRIEF' : 'FILE DEBRIEF'}</>}
          </button>

          {debrief && (
            <div style={{ fontSize: 9, color: '#5A5850', fontStyle: 'italic', textAlign: 'center' }}>
              Last filed by {debrief.debrief_by_callsign} on {new Date(debrief.filed_at).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
          No debrief filed yet. Lead crew (Scout+) can file the debrief.
        </div>
      )}
    </div>
  );
}