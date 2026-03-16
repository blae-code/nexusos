import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Plus, Minus } from 'lucide-react';

const OP_TYPES = [
  'ROCKBREAKER', 'SHIP_MINING', 'VEHICLE_MINING', 'HAND_MINING',
  'MIXED_INDUSTRIAL', 'SALVAGE', 'CARGO_RUN',
  'FOCUSED_EVENT', 'PATROL', 'BOUNTY', 'EXPLORATION', 'PVP_TRAINING',
];

const SYSTEMS = ['STANTON', 'PYRO', 'NYX'];

// Role presets keyed by op type — capacity values, label is the key
const ROLE_PRESETS = {
  ROCKBREAKER:      { mining: 3, escort: 2, fabricator: 1, hauler: 2, medic: 1, scout: 1 },
  SHIP_MINING:      { mining: 3, hauler: 2, escort: 2, medic: 1 },
  VEHICLE_MINING:   { roc_operator: 3, escort: 2, hauler: 1, medic: 1 },
  HAND_MINING:      { hand_miner: 4, escort: 2, hauler: 1 },
  MIXED_INDUSTRIAL: { mining: 2, salvage: 2, hauler: 2, escort: 2, fabricator: 1, medic: 1 },
  SALVAGE:          { salvage: 3, hauler: 2, escort: 2 },
  CARGO_RUN:        { hauler: 4, escort: 2, scout: 1 },
  FOCUSED_EVENT:    { mining: 3, escort: 2, fabricator: 1, scout: 2 },
  PATROL:           { escort: 4, scout: 2, medic: 1 },
  BOUNTY:           { escort: 3, scout: 2 },
  EXPLORATION:      { scout: 4, escort: 1, medic: 1 },
  PVP_TRAINING:     { escort: 6 },
};

const MINING_MODES = ['SHIP', 'VEHICLE', 'HAND', 'MIXED'];

// Op types that involve mining/extraction (show mining_mode selector)
const MINING_OP_TYPES = new Set(['ROCKBREAKER', 'SHIP_MINING', 'VEHICLE_MINING', 'HAND_MINING', 'MIXED_INDUSTRIAL']);

// Op types that involve significant cargo movement (show hauling SCU field)
const HAULING_OP_TYPES = new Set(['ROCKBREAKER', 'SHIP_MINING', 'VEHICLE_MINING', 'HAND_MINING', 'MIXED_INDUSTRIAL', 'SALVAGE', 'CARGO_RUN']);

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.12em' }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, description }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '10px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6 }}
    >
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 12 }}>{label}</div>
        {description && <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? 'var(--live)' : 'var(--bg4)',
          border: `0.5px solid ${checked ? 'var(--live)' : 'var(--b3)'}`,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'var(--bg0)',
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}

function RoleSlotEditor({ slots, onChange }) {
  const add = () => onChange({ ...slots, [`role_${Object.keys(slots).length + 1}`]: 1 });
  const remove = (key) => { const s = { ...slots }; delete s[key]; onChange(s); };
  const adjust = (key, delta) => onChange({ ...slots, [key]: Math.max(0, (slots[key] || 0) + delta) });
  const rename = (oldKey, newKey) => {
    if (oldKey === newKey || !newKey) return;
    const s = {};
    Object.entries(slots).forEach(([k, v]) => { s[k === oldKey ? newKey : k] = v; });
    onChange(s);
  };

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(slots).map(([role, capacity]) => (
        <div key={role} className="flex items-center gap-2">
          <input
            className="nexus-input"
            style={{ flex: 1, fontSize: 12, padding: '5px 10px' }}
            value={role}
            onChange={e => rename(role, e.target.value.toLowerCase().replace(/\s+/g, '_'))}
          />
          <button onClick={() => adjust(role, -1)} className="nexus-btn" style={{ padding: '5px 8px', fontSize: 12 }}><Minus size={11} /></button>
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{capacity}</span>
          <button onClick={() => adjust(role, 1)} className="nexus-btn" style={{ padding: '5px 8px', fontSize: 12 }}><Plus size={11} /></button>
          <button onClick={() => remove(role)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, padding: '4px' }}>×</button>
        </div>
      ))}
      <button onClick={add} className="nexus-btn" style={{ padding: '5px 12px', fontSize: 11 }}>
        <Plus size={11} /> ADD ROLE
      </button>
    </div>
  );
}

export default function OpCreator() {
  const { rank, callsign } = useOutletContext() || {};
  const navigate = useNavigate();

  const canCreate = ['PIONEER', 'FOUNDER', 'VOYAGER'].includes(rank);

  const [form, setForm] = useState({
    name: '',
    type: 'ROCKBREAKER',
    mining_mode: 'SHIP',
    system: 'STANTON',
    location: '',
    access_type: 'EXCLUSIVE',
    buy_in_cost: 0,
    hauling_scu_required: 0,
    scheduled_at: '',
    min_rank: 'VAGRANT',
  });

  const [roleSlots, setRoleSlots] = useState({ ...ROLE_PRESETS['ROCKBREAKER'] });

  // When op type changes, auto-load the role preset for that type
  const handleTypeChange = (newType) => {
    set('type', newType);
    if (ROLE_PRESETS[newType]) setRoleSlots({ ...ROLE_PRESETS[newType] });
    // Auto-set mining_mode for mining op types
    if (newType === 'VEHICLE_MINING') set('mining_mode', 'VEHICLE');
    else if (newType === 'HAND_MINING') set('mining_mode', 'HAND');
    else if (newType === 'SHIP_MINING') set('mining_mode', 'SHIP');
    else if (newType === 'MIXED_INDUSTRIAL') set('mining_mode', 'MIXED');
  };
  const [options, setOptions] = useState({
    reminder_24h: true,
    reminder_1h: true,
    create_discord_event: true,
    post_phase_updates: true,
    auto_wrap_up: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e, publish) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Op name required'); return; }
    if (!form.scheduled_at) { setError('Scheduled time required'); return; }

    setSaving(true);
    setError('');

    const discord_id = localStorage.getItem('nexus_discord_id') || '';

    try {
      const op = await base44.entities.Op.create({
        ...form,
        role_slots: roleSlots,
        reminders_enabled: options.reminder_24h || options.reminder_1h,
        post_phase_updates: options.post_phase_updates,
        auto_wrap_up: options.auto_wrap_up,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        created_by: discord_id,
        phase_current: 0,
        session_log: [],
      });

      if (publish && options.create_discord_event) {
        await base44.functions.invoke('publishOpToDiscord', { op_id: op.id });
      }

      navigate('/app/ops');
    } catch (err) {
      setError('Failed to create op');
    }

    setSaving(false);
  };

  if (!canCreate) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--t2)', fontSize: 13 }}>
        Voyager+ rank required to create ops
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}
      >
        <button onClick={() => navigate('/app/ops')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em' }}>CREATE NEW OP</span>
      </div>

      <form className="flex-1 overflow-auto p-6" style={{ maxWidth: 700 }}>
        {error && (
          <div style={{ background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.3)', borderRadius: 6, padding: '8px 12px', color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Basic info */}
          <div className="nexus-card" style={{ padding: '16px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 14 }}>OP DETAILS</div>
            <div className="flex flex-col gap-3">
              <FormField label="OP NAME">
                <input className="nexus-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Redscar Industrial — Nyx Push" />
              </FormField>

              <div className="flex gap-3">
                <FormField label="TYPE">
                  <select className="nexus-input" value={form.type} onChange={e => handleTypeChange(e.target.value)} style={{ cursor: 'pointer' }}>
                    {OP_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </FormField>
                <FormField label="SYSTEM">
                  <select className="nexus-input" value={form.system} onChange={e => set('system', e.target.value)} style={{ cursor: 'pointer' }}>
                    {SYSTEMS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField label="LOCATION">
                <input className="nexus-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Keeger Belt · Sector 9" />
              </FormField>

              {/* Mining mode — only shown for mining op types */}
              {MINING_OP_TYPES.has(form.type) && (
                <FormField label="MINING MODE">
                  <div className="flex gap-2">
                    {MINING_MODES.map(m => (
                      <button key={m} type="button" onClick={() => set('mining_mode', m)} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', fontSize: 10, background: form.mining_mode === m ? 'var(--bg4)' : 'var(--bg2)', borderColor: form.mining_mode === m ? 'var(--b3)' : 'var(--b1)', color: form.mining_mode === m ? 'var(--t0)' : 'var(--t2)' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </FormField>
              )}

              <div className="flex gap-3">
                <FormField label="SCHEDULED (UTC)">
                  <input className="nexus-input" type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} style={{ colorScheme: 'dark' }} />
                </FormField>
                <FormField label="BUY-IN (aUEC)">
                  <input className="nexus-input" type="number" min={0} value={form.buy_in_cost} onChange={e => set('buy_in_cost', +e.target.value)} placeholder="0" />
                </FormField>
              </div>

              {/* Hauling capacity field — only shown for extraction/cargo ops */}
              {HAULING_OP_TYPES.has(form.type) && (
                <FormField label="HAULING CAPACITY NEEDED (SCU)">
                  <input className="nexus-input" type="number" min={0} value={form.hauling_scu_required} onChange={e => set('hauling_scu_required', +e.target.value)} placeholder="Estimated SCU to transport during op" />
                </FormField>
              )}

              <div className="flex gap-3">
                <FormField label="ACCESS TYPE">
                  <div className="flex gap-2">
                    {['EXCLUSIVE','SHARED'].map(t => (
                      <button key={t} type="button" onClick={() => set('access_type', t)} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', background: form.access_type === t ? 'var(--bg4)' : 'var(--bg2)', borderColor: form.access_type === t ? 'var(--b3)' : 'var(--b1)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </FormField>
                <FormField label="MIN RANK">
                  <select className="nexus-input" value={form.min_rank} onChange={e => set('min_rank', e.target.value)} style={{ cursor: 'pointer' }}>
                    {['PIONEER','FOUNDER','VOYAGER','SCOUT','VAGRANT','AFFILIATE'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          </div>

          {/* Role slots */}
          <div className="nexus-card" style={{ padding: '16px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 14 }}>ROLE SLOTS</div>
            <RoleSlotEditor slots={roleSlots} onChange={setRoleSlots} />
          </div>

          {/* Options */}
          <div className="nexus-card" style={{ padding: '16px' }}>
            <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>OPTIONS</div>
            <div className="flex flex-col gap-2">
              <Toggle label="24h Discord Reminder" checked={options.reminder_24h} onChange={v => setOptions(o => ({ ...o, reminder_24h: v }))} />
              <Toggle label="1h Discord Reminder" checked={options.reminder_1h} onChange={v => setOptions(o => ({ ...o, reminder_1h: v }))} />
              <Toggle label="Create Discord Scheduled Event" checked={options.create_discord_event} onChange={v => setOptions(o => ({ ...o, create_discord_event: v }))} description="Posts to #nexusos-ops with RSVP buttons" />
              <Toggle label="Post Phase Updates to Discord" checked={options.post_phase_updates} onChange={v => setOptions(o => ({ ...o, post_phase_updates: v }))} />
              <Toggle label="Auto Wrap-Up Report" checked={options.auto_wrap_up} onChange={v => setOptions(o => ({ ...o, auto_wrap_up: v }))} description="Generates and posts summary after op ends" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate('/app/ops')}
              className="nexus-btn"
              style={{ padding: '10px 20px' }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={saving}
              className="nexus-btn"
              style={{ padding: '10px 20px' }}
            >
              SAVE DRAFT
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              className="nexus-btn primary"
              style={{ padding: '10px 24px', flex: 1, justifyContent: 'center' }}
            >
              {saving ? 'PUBLISHING...' : 'PUBLISH TO DISCORD →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}