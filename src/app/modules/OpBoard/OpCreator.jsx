/**
 * Op Creator — full-page panel, not a dialog.
 * Props: { rank, callsign, discordId }
 * discordId: pass from page or module fetches via auth.me() fallback
 *
 * Sections: BASICS | ACCESS | ROLE SLOTS | SETTINGS | PHASES
 * Publish: validates name+type+scheduled_at, creates Op, fires heraldBot if toggle on,
 *          routes to /app/ops/[id] on success.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Plus, X, GripVertical } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { opTypeToken } from '@/lib/tokenMap';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIONEER_RANKS = ['PIONEER', 'FOUNDER'];
const VOYAGER_RANKS  = ['PIONEER', 'FOUNDER', 'VOYAGER'];

const OP_TYPES = [
  'INDUSTRY', 'MINING', 'ROCKBREAKER', 'SALVAGE',
  'PATROL', 'COMBAT', 'ESCORT', 'S17', 'RESCUE', 'RACING',
];

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

const RANK_GATES = [
  { value: 'AFFILIATE', label: 'Any rank' },
  { value: 'SCOUT',     label: 'Scout+' },
  { value: 'VOYAGER',   label: 'Voyager+' },
  { value: 'PIONEER',   label: 'Founder+' },
];

// Pre-fills per op type
const OP_TYPE_DEFAULTS = {
  ROCKBREAKER: {
    roles:  [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Fabricator', capacity: 1 }, { name: 'Scout', capacity: 1 }],
    phases: ['Staging', 'Breach & Clear', 'Power Up', 'Craft Lenses', 'Fire Laser', 'Harvest & Extract'],
  },
  MINING: {
    roles:  [{ name: 'Mining', capacity: 3 }, { name: 'Escort', capacity: 2 }, { name: 'Fabricator', capacity: 1 }, { name: 'Scout', capacity: 1 }],
    phases: ['Staging', 'Transit', 'Mining', 'Extraction', 'Refinery Run'],
  },
  PATROL: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  COMBAT: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  ESCORT: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  S17: {
    roles:  [{ name: 'Combat', capacity: 4 }, { name: 'Support', capacity: 2 }],
    phases: ['Staging', 'Patrol', 'Engagement', 'Extraction'],
  },
  SALVAGE: {
    roles:  [{ name: 'Salvage', capacity: 3 }, { name: 'Escort', capacity: 2 }],
    phases: ['Staging', 'Main Op', 'Extraction'],
  },
  RESCUE: {
    roles:  [{ name: 'Rescue', capacity: 3 }, { name: 'Medical', capacity: 1 }],
    phases: ['Staging', 'Main Op', 'Extraction'],
  },
};

const DEFAULT_DEFAULTS = {
  roles:  [{ name: '', capacity: 1 }],
  phases: ['Staging', 'Main Op', 'Extraction'],
};

function getDefaults(type) {
  return OP_TYPE_DEFAULTS[type] || DEFAULT_DEFAULTS;
}

// ─── Shared style atoms ───────────────────────────────────────────────────────

const LABEL = {
  color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em',
  display: 'block', marginBottom: 5,
};

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl({ options, value, onChange, tokenFn = null }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 3,
      background: 'var(--bg3)', border: '0.5px solid var(--b2)',
      borderRadius: 8, padding: 3,
    }}>
      {options.map(opt => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lbl = typeof opt === 'object' ? opt.label : opt;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            style={{
              padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.07em',
              border: active ? '0.5px solid var(--b3)' : '0.5px solid transparent',
              background: active ? 'var(--bg5)' : 'transparent',
              color: active ? 'var(--t0)' : 'var(--t2)',
              transition: 'all 0.12s',
              fontWeight: active ? 600 : 400,
              display: tokenFn ? 'inline-flex' : undefined,
              alignItems: tokenFn ? 'center' : undefined,
              gap: tokenFn ? 4 : undefined,
            }}
          >
            {tokenFn && <NexusToken src={tokenFn(val)} size={16} alt={val} />}
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ label, description = '', checked, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', background: 'var(--bg2)',
      border: '0.5px solid var(--b1)', borderRadius: 6,
    }}>
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 12 }}>{label}</div>
        {description && <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
          background: checked ? 'var(--live)' : 'var(--bg4)',
          border: `0.5px solid ${checked ? 'var(--live)' : 'var(--b3)'}`,
          position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: 'var(--bg0)',
          position: 'absolute', top: 2, left: checked ? 18 : 2, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// ─── Role slot editor ─────────────────────────────────────────────────────────

function RoleSlotEditor({ slots, onChange }) {
  const adjust = (i, delta) => {
    const next = [...slots];
    next[i] = { ...next[i], capacity: Math.max(1, Math.min(10, (next[i].capacity || 1) + delta)) };
    onChange(next);
  };
  const rename = (i, name) => {
    const next = [...slots];
    next[i] = { ...next[i], name };
    onChange(next);
  };
  const remove = (i) => onChange(slots.filter((_, idx) => idx !== i));
  const add    = () => onChange([...slots, { name: '', capacity: 1 }]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 2px 2px' }}>
        <span style={{ flex: 1, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>ROLE NAME</span>
        <span style={{ width: 88, color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em', textAlign: 'center' }}>CAPACITY</span>
        <span style={{ width: 24 }} />
      </div>
      {slots.map((slot, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="nexus-input"
            style={{ flex: 1, fontSize: 12 }}
            placeholder="Role name"
            value={slot.name}
            onChange={e => rename(i, e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 88 }}>
            <button
              type="button"
              onClick={() => adjust(i, -1)}
              style={{
                width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                color: 'var(--t1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
            <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {slot.capacity}
            </span>
            <button
              type="button"
              onClick={() => adjust(i, 1)}
              style={{
                width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                color: 'var(--t1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={slots.length === 1}
            style={{
              width: 24, background: 'none', border: 'none', cursor: slots.length > 1 ? 'pointer' : 'not-allowed',
              color: slots.length > 1 ? 'var(--t2)' : 'var(--t3)', padding: 2, opacity: slots.length === 1 ? 0.4 : 1,
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--acc)', fontSize: 11, fontFamily: 'inherit',
          letterSpacing: '0.06em', textAlign: 'left', padding: '3px 2px',
        }}
      >
        + Add role
      </button>
    </div>
  );
}

// ─── Phase editor (drag to reorder) ──────────────────────────────────────────

function PhaseEditor({ phases, onChange }) {
  const [dragging, setDragging] = useState(null);

  const handleDrop = (e, target) => {
    e.preventDefault();
    if (dragging === null || dragging === target) { setDragging(null); return; }
    const next = [...phases];
    const [item] = next.splice(dragging, 1);
    next.splice(target, 0, item);
    onChange(next);
    setDragging(null);
  };

  const updateName = (i, val) => {
    const next = [...phases];
    next[i] = val;
    onChange(next);
  };

  const remove = (i) => onChange(phases.filter((_, idx) => idx !== i));
  const add    = () => onChange([...phases, '']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {phases.map((phase, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => setDragging(i)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, i)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: dragging === i ? 'var(--bg3)' : 'var(--bg2)',
            border: '0.5px solid var(--b1)', borderRadius: 6,
            padding: '5px 10px', cursor: 'grab',
            opacity: dragging === i ? 0.6 : 1,
            transition: 'opacity 0.1s',
          }}
        >
          <GripVertical size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <span style={{ color: 'var(--t2)', fontSize: 9, minWidth: 18, textAlign: 'center' }}>{i + 1}</span>
          <input
            className="nexus-input"
            value={phase}
            onChange={e => updateName(i, e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '2px 4px', fontSize: 12 }}
            placeholder="Phase name"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={phases.length === 1}
            style={{
              background: 'none', border: 'none', cursor: phases.length > 1 ? 'pointer' : 'not-allowed',
              color: 'var(--t2)', padding: 2, opacity: phases.length === 1 ? 0.3 : 1,
            }}
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--acc)', fontSize: 11, fontFamily: 'inherit',
          letterSpacing: '0.06em', textAlign: 'left', padding: '3px 2px',
        }}
      >
        + Add phase
      </button>
    </div>
  );
}

// ─── Main OpCreator component ─────────────────────────────────────────────────

export default function OpCreator({ rank, callsign, discordId: discordIdProp }) {
  const navigate = useNavigate();
  const isPioneer = PIONEER_RANKS.includes(rank);

  const [selfDiscordId, setSelfDiscordId] = useState(discordIdProp || null);

  // Fetch discord_id if not passed as prop
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

  const defaults = getDefaults(form.type);
  const [roleSlots, setRoleSlots] = useState(defaults.roles);
  const [phases, setPhases]       = useState(defaults.phases);

  const [settings, setSettings] = useState({
    reminder24h:         true,
    reminder1h:          true,
    createDiscordEvent:  true,
    postPhaseUpdates:    true,
    autoWrapUp:          true,
    atHereOnGo:          false,  // Pioneer+ only
  });

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

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

  const set    = (k, v)  => setForm(f => ({ ...f, [k]: v }));
  const setSetting = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  // ── Publish / draft ────────────────────────────────

  const submit = async (publish) => {
    // Validate required fields
    if (!form.name.trim()) { setError('OP NAME IS REQUIRED'); return; }
    if (!form.type)        { setError('OP TYPE IS REQUIRED'); return; }
    if (!form.scheduled_at){ setError('SCHEDULED TIME IS REQUIRED'); return; }

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

      // heraldBot — only fires if discord event toggle is on AND publishing
      if (publish && settings.createDiscordEvent) {
        base44.functions.invoke('heraldBot', {
          action:  'publishOp',
          payload: { ...payload, id: op.id },
        }).catch(e => console.warn('[OpCreator] heraldBot publishOp failed:', e.message));
      }

      navigate(`/app/ops/${op.id}`);
    } catch (e) {
      console.error('[OpCreator] submit failed:', e);
      setError('Failed to save op. Please try again.');
    }

    setSaving(false);
  };

  // ── Guard — Voyager+ only ──────────────────────────

  if (!VOYAGER_RANKS.includes(rank)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--t2)', fontSize: 13 }}>
        Voyager+ rank required to create ops
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

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.3)',
            borderRadius: 6, padding: '8px 12px', color: 'var(--danger)',
            fontSize: 12, marginBottom: 20, letterSpacing: '0.04em',
          }}>
            {error}
          </div>
        )}

        {/* ── Section 1: BASICS ──────────────────────── */}
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

        {/* ── Section 2: ACCESS ──────────────────────── */}
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

            {/* Buy-in only visible when EXCLUSIVE */}
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

        {/* ── Section 3: ROLE SLOTS ──────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="ROLE SLOTS" />
          <RoleSlotEditor slots={roleSlots} onChange={setRoleSlots} />
        </div>

        {/* ── Section 4: SETTINGS ────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="SETTINGS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Toggle
              label="24h Discord Reminder"
              checked={settings.reminder24h}
              onChange={v => setSetting('reminder24h', v)}
            />
            <Toggle
              label="1h Discord Reminder"
              checked={settings.reminder1h}
              onChange={v => setSetting('reminder1h', v)}
            />
            <Toggle
              label="Create Discord Scheduled Event"
              description="Posts op embed to #nexusos-ops with RSVP buttons"
              checked={settings.createDiscordEvent}
              onChange={v => setSetting('createDiscordEvent', v)}
            />
            <Toggle
              label="Post Phase Updates to Discord"
              checked={settings.postPhaseUpdates}
              onChange={v => setSetting('postPhaseUpdates', v)}
            />
            <Toggle
              label="Auto Wrap-Up on End Op"
              description="Generates and posts session summary when op ends"
              checked={settings.autoWrapUp}
              onChange={v => setSetting('autoWrapUp', v)}
            />
            {/* @here on GO — Pioneer+ only */}
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

        {/* ── Section 5: PHASES ──────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="PHASES" />
          <PhaseEditor phases={phases} onChange={setPhases} />
        </div>

        {/* ── Publish row ────────────────────────────── */}
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
