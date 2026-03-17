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
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        padding: '12px 20px', borderBottom: '0.5px solid var(--b1)',
        background: 'var(--bg1)',
      }}>
        <span style={{ color: 'var(--t3)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
          Create Operation
        </span>
        <button
          onClick={() => navigate('/app/ops')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t2)',
            fontSize: 9,
            fontFamily: 'inherit',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t2)'; }}
        >
          Discard
        </button>
      </div>

      {/* Scrollable form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', animation: 'nexus-page-enter 200ms ease-out both', maxWidth: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>

        {error && (
          <div style={{
            background: 'rgba(var(--danger-rgb), 0.08)', border: '0.5px solid rgba(var(--danger-rgb), 0.3)',
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
            {/* Op Type Selector */}
            <div>
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: 'inherit' }}>Op Type *</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ROCKBREAKER', 'ESCORT', 'SALVAGE', 'CARGO', 'RECON', 'OTHER'].map((type, i) => (
                  <button
                    key={type}
                    onClick={() => set('type', type)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 10,
                      fontFamily: 'var(--font)',
                      background: form.type === type ? 'var(--bg3)' : 'var(--bg2)',
                      border: `0.5px solid ${form.type === type ? 'var(--acc)' : 'var(--b1)'}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: form.type === type ? 'var(--t0)' : 'var(--t2)',
                      borderLeft: form.type === type && type === 'ROCKBREAKER' ? '3px solid var(--live)' : undefined,
                      transition: 'background 120ms, border-color 120ms',
                      opacity: 0,
                      animation: `nexus-fade-in 200ms ease-out both ${i * 60}ms`,
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.style.background || e.currentTarget.style.background === 'var(--bg2)') {
                        e.currentTarget.style.background = 'rgba(var(--bg3-rgb, 23,28,52), 0.8)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = form.type === type ? 'var(--bg3)' : 'var(--bg2)';
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* System Selector */}
            <div>
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: 'inherit' }}>System</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['STANTON', 'PYRO', 'NYX'].map((sys, i) => {
                  const systemBorder = { STANTON: 'var(--info)', PYRO: 'var(--danger)', NYX: 'var(--acc2)' }[sys];
                  return (
                    <button
                      key={sys}
                      onClick={() => set('system_name', sys)}
                      style={{
                        padding: '6px 14px',
                        fontSize: 10,
                        fontFamily: 'var(--font)',
                        background: form.system_name === sys ? 'var(--bg3)' : 'var(--bg2)',
                        border: `0.5px solid ${form.system_name === sys ? systemBorder : 'var(--b1)'}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: form.system_name === sys ? systemBorder : 'var(--t2)',
                        transition: 'background 120ms, border-color 120ms',
                        opacity: 0,
                        animation: `nexus-fade-in 200ms ease-out both ${(i + 6) * 60}ms`,
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.style.background || e.currentTarget.style.background === 'var(--bg2)') {
                          e.currentTarget.style.background = 'rgba(var(--bg3-rgb, 23,28,52), 0.8)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = form.system_name === sys ? 'var(--bg3)' : 'var(--bg2)';
                      }}
                    >
                      {sys}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, fontFamily: 'inherit' }}>Location</div>
              <input
                className="nexus-input"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Aaron Halo, Yela Belt"
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, fontFamily: 'inherit' }}>Scheduled Time (UTC) *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="nexus-input"
                  type="date"
                  value={form.scheduled_at.split('T')[0] || ''}
                  onChange={e => {
                    const date = e.target.value;
                    const time = form.scheduled_at.split('T')[1] || '00:00';
                    set('scheduled_at', date && time ? `${date}T${time}` : form.scheduled_at);
                  }}
                  style={{ flex: 1, colorScheme: 'dark' }}
                />
                <input
                  className="nexus-input"
                  type="time"
                  value={form.scheduled_at.split('T')[1] || ''}
                  onChange={e => {
                    const time = e.target.value;
                    const date = form.scheduled_at.split('T')[0] || new Date().toISOString().split('T')[0];
                    set('scheduled_at', date && time ? `${date}T${time}` : form.scheduled_at);
                  }}
                  style={{ flex: 0.8, colorScheme: 'dark' }}
                />
              </div>
              <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 6, fontFamily: 'inherit' }}>All times are displayed in UTC across the org.</div>
            </div>
          </div>
        </div>

        {/* ACCESS */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="ACCESS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Access Type Pills */}
            <div>
              <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, fontFamily: 'inherit' }}>Access Type</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {['OPEN', 'EXCLUSIVE'].map(type => {
                  const activeBorder = type === 'OPEN' ? 'var(--live)' : 'var(--warn)';
                  return (
                    <button
                      key={type}
                      onClick={() => set('access_type', type)}
                      style={{
                        padding: '6px 14px',
                        fontSize: 10,
                        fontFamily: 'var(--font)',
                        background: form.access_type === type ? 'var(--bg3)' : 'var(--bg2)',
                        border: `0.5px solid ${form.access_type === type ? activeBorder : 'var(--b1)'}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: form.access_type === type ? activeBorder : 'var(--t2)',
                        transition: 'background 120ms, border-color 120ms, color 120ms',
                      }}
                      onMouseEnter={e => { if (form.access_type !== type) e.currentTarget.style.background = 'rgba(var(--bg3-rgb, 23,28,52), 0.8)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = form.access_type === type ? 'var(--bg3)' : 'var(--bg2)'; }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'inherit' }}>
                {form.access_type === 'OPEN'
                  ? 'All org members may join and share the payout.'
                  : 'Buy-in required. Payout split covers buy-in deduction.'}
              </div>
            </div>

            {/* Buy-In Field */}
            {form.access_type === 'EXCLUSIVE' && (
              <div style={{
                opacity: 0,
                animation: 'nexus-fade-in 150ms ease-out forwards',
              }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, fontFamily: 'inherit' }}>Buy-In Amount</div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="nexus-input"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.buy_in_cost}
                    onChange={e => set('buy_in_cost', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    style={{ paddingRight: 48 }}
                  />
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 9, color: 'var(--t3)', pointerEvents: 'none', fontFamily: 'inherit',
                  }}>
                    aUEC
                  </div>
                </div>
              </div>
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
          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, fontFamily: 'inherit' }}>Settings</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SettingsToggle label="Require Discord RSVP" checked={settings.requireDiscordRsvp} onChange={v => setSetting('requireDiscordRsvp', v)} />
            <SettingsToggle label="Post to #ops-board" checked={settings.postToOpsBoard} onChange={v => setSetting('postToOpsBoard', v)} />
            <SettingsToggle label="Allow late joins" checked={settings.allowLateJoins} onChange={v => setSetting('allowLateJoins', v)} />
            <SettingsToggle label="Hide from non-members" checked={settings.hideFromNonMembers} onChange={v => setSetting('hideFromNonMembers', v)} />
            <SettingsToggle label="Log loot tally" checked={settings.logLootTally} onChange={v => setSetting('logLootTally', v)} />
            <SettingsToggle label="Calculate split on close" checked={settings.calcSplitOnClose} onChange={v => setSetting('calcSplitOnClose', v)} />
          </div>
        </div>

        {/* PHASES */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: 'inherit' }}>Phases</div>
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
          </div>
          );
          }