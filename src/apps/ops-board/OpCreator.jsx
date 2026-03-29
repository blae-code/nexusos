/**
 * OpCreator — Multi-step wizard "Mission Briefing Terminal"
 * Steps: TYPE → BRIEFING → CREW → TIMELINE → REVIEW → PUBLISH
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { sendNexusNotification } from '@/core/data/nexus-notify';
import WizardStepIndicator from './creator/WizardStepIndicator';
import OpTypeSelector from './creator/OpTypeSelector';
import OpBriefingStep from './creator/OpBriefingStep';
import OpCrewStep from './creator/OpCrewStep';
import OpTimelineStep from './creator/OpTimelineStep';
import OpReviewStep from './creator/OpReviewStep';
import OpPublishOverlay from './creator/OpPublishOverlay';
import { OPS_LEADER_RANKS } from './rankPolicies';
const TOTAL_STEPS = 5;

const OP_TYPE_DEFAULTS = {
  ROCKBREAKER: {
    roles: [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Hauler', capacity: 2 }, { name: 'Refinery Coord', capacity: 1 }],
    phases: ['Staging', 'Breach & Clear', 'Power Up', 'Craft Lenses', 'Fire Laser', 'Harvest & Extract'],
  },
  MINING: {
    roles: [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Fabricator', capacity: 1 }, { name: 'Scout', capacity: 1 }],
    phases: ['Staging', 'Transit', 'Mining', 'Extraction', 'Refinery Run'],
  },
  PATROL: {
    roles: [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  COMBAT: {
    roles: [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  ESCORT: {
    roles: [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  S17: {
    roles: [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  SALVAGE: {
    roles: [{ name: 'Salvage', capacity: 3 }, { name: 'Escort', capacity: 2 }],
    phases: ['Staging', 'Main Op', 'Extraction'],
  },
  RESCUE: {
    roles: [{ name: 'Rescue', capacity: 3 }, { name: 'Medical', capacity: 1 }],
    phases: ['Staging', 'Main Op', 'Extraction'],
  },
  CARGO: {
    roles: [{ name: 'Hauler', capacity: 3 }, { name: 'Escort', capacity: 2 }],
    phases: ['Staging', 'Loading', 'Transit', 'Delivery'],
  },
  RECON: {
    roles: [{ name: 'Scout', capacity: 3 }, { name: 'Escort', capacity: 1 }],
    phases: ['Staging', 'Recon', 'Report', 'Extraction'],
  },
};

const DEFAULT_DEFAULTS = { roles: [{ name: '', capacity: 1 }], phases: ['Staging', 'Main Op', 'Extraction'] };
function getDefaults(type) { return OP_TYPE_DEFAULTS[type] || DEFAULT_DEFAULTS; }

export default function OpCreator({ rank, callsign, sessionUserId }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const contentRef = useRef(null);

  const [form, setForm] = useState({
    name: '', type: 'ROCKBREAKER', system_name: 'STANTON',
    location: '', access_type: 'EXCLUSIVE', buy_in_cost: 0,
    scheduled_at: '', rank_gate: 'AFFILIATE',
  });

  const defaults = getDefaults(form.type);
  const [roleSlots, setRoleSlots] = useState(defaults.roles);
  const [phases, setPhases] = useState(defaults.phases);
  const [fleetAssignments, setFleetAssignments] = useState({});
  const [settings, setSettings] = useState({
    allowLateJoins: false, hideFromNonMembers: false,
    logLootTally: true, calcSplitOnClose: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState({ type: null, system: null, roleSlots: null, schedule: null });

  // Re-seed roles + phases when op type changes
  const prevType = useRef(form.type);
  useEffect(() => {
    if (form.type !== prevType.current) {
      const d = getDefaults(form.type);
      setRoleSlots(d.roles);
      setPhases(d.phases);
      prevType.current = form.type;
    }
  }, [form.type]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'type') setValidationErrors(e => ({ ...e, type: null }));
    if (k === 'system_name') setValidationErrors(e => ({ ...e, system: null }));
    if (k === 'scheduled_at') setValidationErrors(e => ({ ...e, schedule: null }));
  };

  // Validation
  const getValidationErrors = () => {
    const errors = {};
    if (!form.type) errors.type = 'Select an op type.';
    if (!form.system_name) errors.system = 'Select a star system.';
    if (!roleSlots || roleSlots.length === 0) errors.roleSlots = 'Add at least one role slot.';
    if (roleSlots && roleSlots.some(r => !r.name?.trim())) errors.roleSlots = 'Enter a name for every role.';
    if (!form.scheduled_at) errors.schedule = 'Set a date and time.';
    return errors;
  };

  // Step navigation
  const scrollToTop = () => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) { setStep(step + 1); scrollToTop(); }
  };
  const goPrev = () => {
    if (step > 0) { setStep(step - 1); scrollToTop(); }
  };
  const goToStep = (i) => {
    if (i <= step + 1 && i >= 0) { setStep(i); scrollToTop(); }
  };

  // Submit
  const submit = async (publish) => {
    if (publish) {
      const errors = getValidationErrors();
      if (!form.name.trim()) errors.name = 'OP NAME IS REQUIRED';
      if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }
    }

    setSaving(true);
    setError('');

    try {
      // Build role_slots as an object keyed by role name (entity schema expects object, not array)
      const roleSlotsObj = {};
      (roleSlots || []).forEach(r => {
        if (r.name?.trim()) roleSlotsObj[r.name.trim()] = { capacity: r.capacity || 1 };
      });

      const payload = {
        name: form.name.trim() || 'Untitled Op',
        type: form.type,
        system: form.system_name,           // entity field is "system", not "system_name"
        location: form.location.trim() || null,
        access_type: form.access_type,
        buy_in_cost: form.access_type === 'EXCLUSIVE' ? (form.buy_in_cost || 0) : 0,
        scheduled_at: form.scheduled_at || null,
        min_rank: form.rank_gate || 'AFFILIATE',
        role_slots: roleSlotsObj,
        phases: phases.map(p => (typeof p === 'string' ? { name: p } : p)),
        phase_current: 0,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        session_log: [],
      };

      const op = await base44.entities.Op.create(payload);

      if (publish) {
        await sendNexusNotification({
          type: 'OP_PUBLISHED', title: 'Operation Published',
          body: `${payload.name} is published${payload.system ? ` · ${payload.system}` : ''}.`,
          severity: 'INFO', target_user_id: null, source_module: 'OPS', source_id: op.id,
        });
        setShowOverlay(true);
        setTimeout(() => {
          navigate(`/app/ops/${op.id}?scrollTo=readinessGate&expandReadiness=true`);
        }, 1800);
      } else {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    } catch {
      setError('Failed to save op. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Guard
  if (!OPS_LEADER_RANKS.includes(rank)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5A5850', fontSize: 13 }}>
        Scout rank or above required to create ops
      </div>
    );
  }

  // Step titles
  const STEP_TITLES = ['Select Operation Type', 'Mission Briefing', 'Crew Configuration', 'Operation Phases', 'Review & Authorize'];
  const stepTitle = STEP_TITLES[step];

  // Can advance?
  const canAdvance = () => {
    if (step === 0) return Boolean(form.type);
    if (step === 1) return Boolean(form.name.trim() && form.system_name && form.scheduled_at);
    if (step === 2) return roleSlots.length > 0 && roleSlots.every(r => r.name?.trim());
    if (step === 3) return phases.length > 0;
    return true;
  };

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <OpPublishOverlay opName={form.name} visible={showOverlay} />

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '0 24px',
        background: 'linear-gradient(180deg, #0C0B09 0%, #0A0908 100%)',
        borderBottom: '1px solid rgba(200,170,100,0.06)',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#C0392B',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 12, color: '#C0392B',
              letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>MISSION COMMAND</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/ops')}
            style={{
              background: 'none', border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 2, padding: '5px 12px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'; e.currentTarget.style.color = '#C0392B'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.08)'; e.currentTarget.style.color = '#5A5850'; }}
          >ABORT</button>
        </div>

        {/* Step indicator */}
        <WizardStepIndicator currentStep={step} onStepClick={goToStep} />
      </div>

      {/* Step title */}
      <div style={{
        padding: '20px 28px 8px',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #0A0908 0%, transparent 100%)',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 20, color: '#E8E4DC',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>{stepTitle}</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color: '#3A3830', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginTop: 4,
        }}>STEP {step + 1} OF {TOTAL_STEPS}</div>
      </div>

      {/* Scrollable body */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 120px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {error && (
            <div style={{
              background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)',
              borderRadius: 3, padding: '10px 14px', color: '#C0392B',
              fontSize: 11, marginBottom: 20, letterSpacing: '0.04em',
            }}>{error}</div>
          )}

          {/* Steps */}
          <div style={{ animation: 'nexus-fade-in 200ms ease-out both' }} key={step}>
            {step === 0 && <OpTypeSelector value={form.type} onChange={v => set('type', v)} />}
            {step === 1 && <OpBriefingStep form={form} set={set} validationErrors={validationErrors} opType={form.type} />}
            {step === 2 && (
              <OpCrewStep
                roleSlots={roleSlots} onRoleSlotsChange={setRoleSlots}
                fleetAssignments={fleetAssignments} onFleetChange={setFleetAssignments}
                validationErrors={validationErrors}
              />
            )}
            {step === 3 && <OpTimelineStep phases={phases} onChange={setPhases} />}
            {step === 4 && <OpReviewStep form={form} roleSlots={roleSlots} phases={phases} settings={settings} />}
          </div>

          {/* Settings toggles (only on review step) */}
          {step === 4 && (
            <div style={{
              marginTop: 20, padding: '16px',
              background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.06)',
              borderRadius: 3,
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
                marginBottom: 12,
              }}>ADJUST SETTINGS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { key: 'allowLateJoins', label: 'Allow late joins' },
                  { key: 'hideFromNonMembers', label: 'Hide from non-members' },
                  { key: 'logLootTally', label: 'Log loot tally' },
                  { key: 'calcSplitOnClose', label: 'Calculate split on close' },
                ].map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))} style={{
                      width: 32, height: 18, borderRadius: 9, cursor: 'pointer',
                      background: settings[s.key] ? '#4A8C5C' : '#1A1A18',
                      border: `0.5px solid ${settings[s.key] ? '#4A8C5C' : '#2A2A28'}`,
                      position: 'relative', transition: 'all 200ms', flexShrink: 0,
                    }}>
                      <div style={{
                        position: 'absolute', top: 1, left: settings[s.key] ? 16 : 1,
                        width: 16, height: 16, borderRadius: '50%', background: '#0A0908',
                        transition: 'left 200ms',
                      }} />
                    </button>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, rgba(10,9,8,0.8) 0%, #0A0908 30%)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(200,170,100,0.06)',
        padding: '16px 28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        {/* Left: Back */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          {step > 0 && (
            <button type="button" onClick={goPrev} style={{
              background: 'none', border: '1px solid rgba(200,170,100,0.10)',
              borderRadius: 3, padding: '10px 20px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 11, color: '#9A9488', letterSpacing: '0.12em',
              textTransform: 'uppercase', transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.10)'; }}
            >← BACK</button>
          )}
        </div>

        {/* Center: Draft save (review step only) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {step === TOTAL_STEPS - 1 && (
            <button type="button" onClick={() => submit(false)} disabled={saving} style={{
              background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: draftSaved ? '#4A8C5C' : '#5A5850',
              letterSpacing: '0.08em', transition: 'color 150ms',
            }}
            onMouseEnter={e => { if (!saving && !draftSaved) e.currentTarget.style.color = '#9A9488'; }}
            onMouseLeave={e => { e.currentTarget.style.color = draftSaved ? '#4A8C5C' : '#5A5850'; }}
            >{draftSaved ? 'DRAFT SAVED ✓' : 'SAVE AS DRAFT'}</button>
          )}
        </div>

        {/* Right: Next / Publish */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {step < TOTAL_STEPS - 1 ? (
            <button type="button" onClick={goNext} disabled={!canAdvance()} style={{
              background: canAdvance() ? 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)' : '#1A1A18',
              border: canAdvance() ? '1px solid rgba(192,57,43,0.6)' : '1px solid #2A2A28',
              borderRadius: 3, padding: '10px 24px', cursor: canAdvance() ? 'pointer' : 'not-allowed',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 12, color: canAdvance() ? '#F0EDE5' : '#5A5850',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              boxShadow: canAdvance() ? '0 4px 16px rgba(192,57,43,0.3)' : 'none',
              transition: 'all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              opacity: canAdvance() ? 1 : 0.5,
            }}>CONTINUE →</button>
          ) : (
            <button type="button" onClick={() => submit(true)} disabled={saving} style={{
              background: saving ? '#7B2218' : 'linear-gradient(135deg, #C0392B 0%, #8E2A1E 100%)',
              border: '1px solid rgba(192,57,43,0.7)',
              borderRadius: 3, padding: '12px 28px', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 13, color: '#F0EDE5',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              boxShadow: saving ? 'none' : '0 6px 24px rgba(192,57,43,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
              transition: 'all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}>
              {saving ? (
                <span className="nexus-loading-dots" style={{ color: '#F0EDE5' }}><span /><span /><span /></span>
              ) : 'AUTHORIZE OP →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
