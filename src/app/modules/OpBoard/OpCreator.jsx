/**
 * Op Creator — full-page panel, not a dialog.
 * Props: { rank, callsign, discordId }
 *
 * Sections: BASICS | ACCESS | ROLE SLOTS | SETTINGS | PHASES
 * Publish: validates name+type+scheduled_at, creates Op, fires heraldBot if toggle on,
 *          routes to /app/ops/[id] on success.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft } from 'lucide-react';
import {
  OP_TYPES, SYSTEMS, RANK_GATES, getDefaults,
  SectionHeader, FormField, SegmentedControl, Toggle,
  RoleSlotEditor, PhaseEditor,
} from './opCreatorHelpers';
import { opTypeToken } from '@/lib/tokenMap';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];
const SCOUT_RANKS   = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

// ─── OpCreator ────────────────────────────────────────────────────────────────

export default function OpCreator({ rank, callsign, discordId: discordIdProp }) {
  const navigate  = useNavigate();
  const isPioneer = PIONEER_RANKS.includes(rank);

  const [selfDiscordId, setSelfDiscordId] = useState(discordIdProp || null);

  useEffect(() => {
    if (!discordIdProp) {
      base44.auth.me()
        .then(u => { if (u?.discord_id) setSelfDiscordId(String(u.discord_id)); })
        .catch(() => {});
    }
  }, [discordIdProp]);

  // ── Form state ─────────────────────────────────────

  const [form, setForm] = useState({
    name:         '',
    type:         'ROCKBREAKER',
    system_name:  'Stanton',
    location:     '',
    access_type:  'EXCLUSIVE',
    buy_in_cost:  0,
    scheduled_at: '',
    rank_gate:    'AFFILIATE',
  });

  const defaults   = getDefaults(form.type);
  const [roleSlots, setRoleSlots] = useState(defaults.roles);
  const [phases, setPhases]       = useState(defaults.phases);

  const [settings, setSettings] = useState({
    reminder24h:        true,
    reminder1h:         true,
    createDiscordEvent: true,
    postPhaseUpdates:   true,
    autoWrapUp:         true,
    atHereOnGo:         false,  // Pioneer+ only
  });

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

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

  const set        = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSetting = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  // ── Publish / draft ────────────────────────────────

  const submit = async (publish) => {
    if (!form.name.trim())  { setError('OP NAME IS REQUIRED'); return; }
    if (!form.type)         { setError('OP TYPE IS REQUIRED'); return; }
    if (!form.scheduled_at) { setError('SCHEDULED TIME IS REQUIRED'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name:               form.name.trim(),
        type:               form.type,
        system_name:        form.system_name,
        location:           form.location.trim() || null,
        access_type:        form.access_type,
        buy_in_cost:        form.access_type === 'EXCLUSIVE' ? (form.buy_in_cost || 0) : 0,
        scheduled_at:       form.scheduled_at,
        rank_gate:          form.rank_gate,
        role_slots:         roleSlots,
        phases,
        phase_current:      0,
        status:             publish ? 'PUBLISHED' : 'DRAFT',
        created_by:         selfDiscordId,
        reminders_enabled:  settings.reminder24h || settings.reminder1h,
        post_phase_updates: settings.postPhaseUpdates,
        auto_wrap_up:       settings.autoWrapUp,
        at_here_on_go:      isPioneer ? settings.atHereOnGo : false,
        session_log:        [],
      };

      const op = await base44.entities.Op.create(payload);

      if (publish && settings.createDiscordEvent) {
        base44.functions.invoke('heraldBot', {
          action:  'publishOp',
          payload: { ...payload, id: op.id },
        }).catch(e => console.warn('[OpCreator] heraldBot publishOp failed:', e.message));
      }

      navigate(`/app/ops/${op.id}`);
    } catch {
      setError('Failed to save op. Please try again.');
    }

    setSaving(false);
  };

  // ── Guard — Scout+ only ───────────────────────────

  if (!SCOUT_RANKS.includes(rank)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--t2)', fontSize: 13 }}>
        Scout rank or above required to create ops
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        padding: '12px 20px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)',
      }}>
        <button
          onClick={() => navigate('/app/ops')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 4 }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em' }}>CREATE OP</span>
      </div>

      {/* Scrollable form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', maxWidth: 760 }}>

        {error && (
          <div style={{
            background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.3)',
            borderRadius: 6, padding: '8px 12px', color: 'var(--danger)',
            fontSize: 12, marginBottom: 20, letterSpacing: '0.04em',
          }}>
            {error}
          </div>
        )}

        {/* BASICS */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="BASICS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="OP NAME *">
              <input
                className="nexus-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Redscar Industrial — Nyx Push"
                style={{ fontSize: 13 }}
              />
            </FormField>
            <FormField label="TYPE *">
              <SegmentedControl
                options={OP_TYPES}
                value={form.type}
                onChange={v => set('type', v)}
                tokenFn={opTypeToken}
              />
            </FormField>
            <div style={{ display: 'flex', gap: 14 }}>
              <FormField label="SYSTEM">
                <SegmentedControl
                  options={SYSTEMS}
                  value={form.system_name}
                  onChange={v => set('system_name', v)}
                />
              </FormField>
            </div>
            <FormField label="LOCATION">
              <input
                className="nexus-input"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="QV Station Alpha-7 · Keeger Belt"
              />
            </FormField>
            <FormField label="SCHEDULED (UTC) *">
              <input
                className="nexus-input"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => set('scheduled_at', e.target.value)}
                style={{ colorScheme: 'dark', maxWidth: 260 }}
              />
            </FormField>
          </div>
        </div>

        {/* ACCESS */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="ACCESS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="ACCESS TYPE">
              <SegmentedControl
                options={[
                  { value: 'EXCLUSIVE', label: 'EXCLUSIVE' },
                  { value: 'SHARED',    label: 'SHARED' },
                ]}
                value={form.access_type}
                onChange={v => set('access_type', v)}
              />
            </FormField>
            {form.access_type === 'EXCLUSIVE' && (
              <FormField label="BUY-IN (aUEC)">
                <input
                  className="nexus-input"
                  type="number"
                  min={0}
                  step={1000}
                  value={form.buy_in_cost}
                  onChange={e => set('buy_in_cost', parseInt(e.target.value) || 0)}
                  style={{ maxWidth: 180 }}
                />
              </FormField>
            )}
            <FormField label="MINIMUM RANK TO RSVP">
              <select
                className="nexus-input"
                value={form.rank_gate}
                onChange={e => set('rank_gate', e.target.value)}
                style={{ maxWidth: 200, cursor: 'pointer' }}
              >
                {RANK_GATES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* ROLE SLOTS */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="ROLE SLOTS" />
          <RoleSlotEditor slots={roleSlots} onChange={setRoleSlots} />
        </div>

        {/* SETTINGS */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="SETTINGS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Toggle label="24h Discord Reminder" checked={settings.reminder24h} onChange={v => setSetting('reminder24h', v)} />
            <Toggle label="1h Discord Reminder" checked={settings.reminder1h} onChange={v => setSetting('reminder1h', v)} />
            <Toggle
              label="Create Discord Scheduled Event"
              description="Posts op embed to #nexusos-ops with RSVP buttons"
              checked={settings.createDiscordEvent}
              onChange={v => setSetting('createDiscordEvent', v)}
            />
            <Toggle label="Post Phase Updates to Discord" checked={settings.postPhaseUpdates} onChange={v => setSetting('postPhaseUpdates', v)} />
            <Toggle
              label="Auto Wrap-Up on End Op"
              description="Generates and posts session summary when op ends"
              checked={settings.autoWrapUp}
              onChange={v => setSetting('autoWrapUp', v)}
            />
            {isPioneer && (
              <Toggle
                label="@here on GO"
                description="Pings @here in #nexusos-ops when op goes live"
                checked={settings.atHereOnGo}
                onChange={v => setSetting('atHereOnGo', v)}
              />
            )}
          </div>
        </div>

        {/* PHASES */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="PHASES" />
          <PhaseEditor phases={phases} onChange={setPhases} />
        </div>

        {/* Publish row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 40 }}>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={saving}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 7,
              background: 'var(--bg3)', border: '0.5px solid var(--b2)',
              color: 'var(--t0)', fontFamily: 'inherit', fontSize: 12,
              fontWeight: 600, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--bg4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
          >
            {saving ? 'PUBLISHING...' : 'PUBLISH OP →'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={saving}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--t2)', fontSize: 11, fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/ops')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--t2)', fontSize: 11, fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
