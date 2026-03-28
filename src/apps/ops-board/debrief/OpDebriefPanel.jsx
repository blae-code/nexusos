/**
 * OpDebriefPanel — full debrief form that shows after op is COMPLETE/ARCHIVED.
 * Loads existing debrief or creates a new one. Lead crew can edit.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { FileText, Save, CheckCircle2, Award } from 'lucide-react';
import DebriefMetricsForm from './DebriefMetricsForm';
import EncounterLog from './EncounterLog';
import HaulSummary from './HaulSummary';

const LEADER_RANKS = ['SCOUT', 'VOYAGER', 'QUARTERMASTER', 'FOUNDER', 'PIONEER'];
const LABEL = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

function CommendationRow({ c, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
      background: '#141410', borderRadius: 2, borderLeft: '2px solid #C8A84B',
    }}>
      <Award size={10} style={{ color: '#C8A84B', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, color: '#E8E4DC' }}>{c.callsign}</span>
      <span style={{ flex: 1, fontSize: 10, color: '#9A9488' }}>{c.reason}</span>
      {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2, fontSize: 10 }}>×</button>}
    </div>
  );
}

export default function OpDebriefPanel({ op, rsvps, callsign, rank }) {
  const canEdit = LEADER_RANKS.includes(rank);
  const [debrief, setDebrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const confirmed = (rsvps || []).filter(r => r.status === 'CONFIRMED');
  const duration = op.started_at && op.ended_at
    ? Math.round((new Date(op.ended_at) - new Date(op.started_at)) / 60000) : 0;

  // Derive initial financial data from wrap_up_data if available
  const wrapUp = op.wrap_up_data || {};
  const wuRevenue = (wrapUp.sales || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const wuExpenses = (wrapUp.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const [form, setForm] = useState({
    outcome: 'SUCCESS',
    mission_rating: 3,
    objectives_met: 0,
    objectives_total: 0,
    total_revenue_aUEC: Math.round(wuRevenue),
    total_expenses_aUEC: Math.round(wuExpenses),
    haul_items: [],
    encounters: [],
    lessons_learned: '',
    commendations: [],
    tags: [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Commendation add
  const [commCallsign, setCommCallsign] = useState('');
  const [commReason, setCommReason] = useState('');
  const addCommendation = () => {
    if (!commCallsign.trim()) return;
    set('commendations', [...form.commendations, { callsign: commCallsign, reason: commReason }]);
    setCommCallsign('');
    setCommReason('');
  };

  // Tag management
  const [tagInput, setTagInput] = useState('');
  const addTag = () => {
    const t = tagInput.trim().toUpperCase();
    if (!t || form.tags.includes(t)) return;
    set('tags', [...form.tags, t]);
    setTagInput('');
  };

  // Load existing debrief
  const loadDebrief = useCallback(async () => {
    const existing = await base44.entities.OpDebrief.filter({ op_id: op.id }).catch(() => []);
    if (existing && existing.length > 0) {
      const d = existing[0];
      setDebrief(d);
      setForm({
        outcome: d.outcome || 'SUCCESS',
        mission_rating: d.mission_rating || 3,
        objectives_met: d.objectives_met || 0,
        objectives_total: d.objectives_total || 0,
        total_revenue_aUEC: d.total_revenue_aUEC || 0,
        total_expenses_aUEC: d.total_expenses_aUEC || 0,
        haul_items: d.haul_items || [],
        encounters: d.encounters || [],
        lessons_learned: d.lessons_learned || '',
        commendations: d.commendations || [],
        tags: d.tags || [],
      });
    }
    setLoading(false);
  }, [op.id]);

  useEffect(() => { loadDebrief(); }, [loadDebrief]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      op_id: op.id,
      op_name: op.name,
      op_type: op.type,
      submitted_by: callsign,
      submitted_at: new Date().toISOString(),
      outcome: form.outcome,
      mission_rating: form.mission_rating,
      crew_count: confirmed.length,
      duration_minutes: duration,
      objectives_met: form.objectives_met,
      objectives_total: form.objectives_total,
      total_revenue_aUEC: form.total_revenue_aUEC,
      total_expenses_aUEC: form.total_expenses_aUEC,
      net_profit_aUEC: form.total_revenue_aUEC - form.total_expenses_aUEC,
      haul_items: form.haul_items,
      encounters: form.encounters,
      lessons_learned: form.lessons_learned,
      commendations: form.commendations,
      system_location: op.system || op.system_name || '',
      tags: form.tags,
    };

    try {
      if (debrief) {
        await base44.entities.OpDebrief.update(debrief.id, payload);
      } else {
        const created = await base44.entities.OpDebrief.create(payload);
        setDebrief(created);
      }
      showToast('Debrief saved', 'success');
    } catch (err) {
      showToast(err?.message || 'Save failed', 'error');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="nexus-loading-dots" style={{ color: '#9A9488', padding: 20 }}><span /><span /><span /></div>;
  }

  const isSubmitted = !!debrief;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={14} style={{ color: '#3498DB' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#E8E4DC', letterSpacing: '0.08em' }}>
            OP DEBRIEF
          </span>
          {isSubmitted && (
            <span style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 2,
              background: 'rgba(74,140,92,0.10)', border: '0.5px solid rgba(74,140,92,0.3)',
              color: '#4A8C5C', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 3,
            }}><CheckCircle2 size={8} /> SUBMITTED</span>
          )}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>
          {duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '—'} · {confirmed.length} crew
        </div>
      </div>

      {!canEdit && !isSubmitted ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
          Debrief not yet submitted. Lead crew (SCOUT+) can fill this out.
        </div>
      ) : (
        <>
          {/* Metrics */}
          <DebriefMetricsForm form={form} set={canEdit ? set : () => {}} />

          {/* Haul */}
          <div style={{ borderTop: '0.5px solid rgba(200,170,100,0.08)', paddingTop: 14 }}>
            <HaulSummary items={form.haul_items} onChange={canEdit ? (v) => set('haul_items', v) : () => {}} />
          </div>

          {/* Encounters */}
          <div style={{ borderTop: '0.5px solid rgba(200,170,100,0.08)', paddingTop: 14 }}>
            <EncounterLog encounters={form.encounters} onChange={canEdit ? (v) => set('encounters', v) : () => {}} />
          </div>

          {/* Commendations */}
          <div style={{ borderTop: '0.5px solid rgba(200,170,100,0.08)', paddingTop: 14 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              <Award size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              COMMENDATIONS ({form.commendations.length})
            </span>
            {form.commendations.map((c, i) => (
              <CommendationRow key={i} c={c} onRemove={canEdit ? () => set('commendations', form.commendations.filter((_, idx) => idx !== i)) : null} />
            ))}
            {canEdit && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <select value={commCallsign} onChange={e => setCommCallsign(e.target.value)} style={{ flex: 1 }}>
                  <option value="">— member —</option>
                  {confirmed.map(r => <option key={r.id} value={r.callsign}>{r.callsign}</option>)}
                </select>
                <input value={commReason} onChange={e => setCommReason(e.target.value)} placeholder="Reason..." style={{ flex: 2 }} />
                <button onClick={addCommendation} disabled={!commCallsign} style={{
                  padding: '6px 12px', background: '#C8A84B', border: 'none', borderRadius: 2, color: '#0A0908',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, cursor: 'pointer',
                  opacity: commCallsign ? 1 : 0.4,
                }}>ADD</button>
              </div>
            )}
          </div>

          {/* Lessons learned */}
          <div style={{ borderTop: '0.5px solid rgba(200,170,100,0.08)', paddingTop: 14 }}>
            <span style={LABEL}>LESSONS LEARNED / IMPROVEMENTS</span>
            <textarea className="nexus-input" value={form.lessons_learned}
              onChange={e => canEdit && set('lessons_learned', e.target.value)}
              readOnly={!canEdit} placeholder="What went well? What could improve?"
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'none' }} />
          </div>

          {/* Tags */}
          <div style={{ borderTop: '0.5px solid rgba(200,170,100,0.08)', paddingTop: 14 }}>
            <span style={LABEL}>TAGS (for analytics)</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {form.tags.map((t, i) => (
                <span key={i} style={{
                  padding: '2px 8px', borderRadius: 2, fontSize: 9,
                  background: 'rgba(52,152,219,0.10)', border: '0.5px solid rgba(52,152,219,0.25)',
                  color: '#3498DB', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {t}
                  {canEdit && <button onClick={() => set('tags', form.tags.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3498DB', padding: 0, fontSize: 10 }}>×</button>}
                </span>
              ))}
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add tag..." style={{ flex: 1 }} />
                <button onClick={addTag} style={{
                  padding: '6px 10px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.10)',
                  borderRadius: 2, color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, cursor: 'pointer',
                }}>ADD</button>
              </div>
            )}
          </div>

          {/* Save */}
          {canEdit && (
            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '12px', background: saving ? '#5A5850' : '#3498DB',
              border: 'none', borderRadius: 2, color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Save size={13} /> {saving ? 'SAVING...' : isSubmitted ? 'UPDATE DEBRIEF' : 'SUBMIT DEBRIEF'}
            </button>
          )}
        </>
      )}
    </div>
  );
}