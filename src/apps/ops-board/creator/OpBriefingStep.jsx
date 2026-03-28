/**
 * OpBriefingStep — Smart briefing form with autocomplete locations,
 * contextual name suggestions, quick-schedule buttons, and styled selectors.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── System data with POIs ──────────────────────────────────────────────────

const SYSTEMS = [
  {
    id: 'STANTON', label: 'STANTON', color: '#7AAECC', glow: 'rgba(122,174,204,0.10)',
    desc: '4 planets · Civilised · Trade hub',
    locations: [
      'Aaron Halo', 'Yela Belt', 'CRU-L1', 'CRU-L5', 'ARC-L1', 'HUR-L1', 'HUR-L2', 'HUR-L3', 'HUR-L4', 'HUR-L5',
      'MIC-L1', 'Cellin', 'Daymar', 'Yela', 'Aberdeen', 'Arial', 'Ita', 'Magda',
      'Clio', 'Calliope', 'Euterpe', 'Lyria', 'Wala',
      'Port Olisar', 'Everus Harbor', 'Baijini Point', 'Port Tressler', 'Seraphim Station',
      'New Babbage', 'Lorville', 'Area 18', 'Orison',
      'HDMS-Edmond', 'HDMS-Pinewood', 'HDMS-Stanhope', 'HDMS-Thedus',
      'Reclamation & Disposal', 'Brio\'s Breaker Yard',
    ],
  },
  {
    id: 'PYRO', label: 'PYRO', color: '#C0392B', glow: 'rgba(192,57,43,0.10)',
    desc: '6 planets · Lawless · High threat',
    locations: [
      'Pyro I', 'Pyro II', 'Pyro III', 'Pyro IV', 'Pyro V', 'Pyro VI',
      'Ruin Station', 'Checkmate Station',
      'Pyro Gateway', 'Stanton-Pyro Jump Point',
      'The Ruins', 'Ignis', 'Vatra', 'Adir', 'Fairo', 'Terminus',
    ],
  },
  {
    id: 'NYX', label: 'NYX', color: '#9B59B6', glow: 'rgba(155,89,182,0.10)',
    desc: '2 planets · Frontier · Low-pop',
    locations: [
      'Delamar', 'Levski', 'Nyx I', 'Nyx II',
      'Glaciem Ring', 'Nyx-Pyro Jump Point', 'Nyx-Stanton Jump Point',
    ],
  },
];

// ─── Op name templates per type ──────────────────────────────────────────────

const NAME_TEMPLATES = {
  ROCKBREAKER: ['Rockbreaker {sys}', 'Redscar Industrial — {loc}', 'Deep Bore — {sys}', 'Lens Run — {loc}'],
  MINING: ['Mining Op — {loc}', 'Extraction {sys}', 'Ore Push — {loc}', 'Belt Run — {sys}'],
  SALVAGE: ['Salvage Op — {loc}', 'Wreck Recovery — {sys}', 'Scrap Haul — {loc}'],
  PATROL: ['Patrol — {sys}', 'Sector Sweep — {loc}', 'Overwatch — {sys}'],
  COMBAT: ['Strike — {loc}', 'Engagement — {sys}', 'Combat Op — {loc}'],
  ESCORT: ['Escort Run — {sys}', 'Convoy Guard — {loc}', 'VIP Detail — {sys}'],
  CARGO: ['Cargo Run — {loc}', 'Trade Haul — {sys}', 'Supply Line — {loc}'],
  RECON: ['Recon — {loc}', 'Scout Sweep — {sys}', 'Intel Run — {loc}'],
  RESCUE: ['SAR — {loc}', 'Rescue Op — {sys}', 'Medevac — {loc}'],
  S17: ['Classified — {sys}', 'Black Op — {loc}', 'S17 — {sys}'],
};

function generateNames(type, system, location) {
  const templates = NAME_TEMPLATES[type] || NAME_TEMPLATES.PATROL;
  const sys = system || '???';
  const loc = location || sys;
  return templates.map(t => t.replace('{sys}', sys).replace('{loc}', loc));
}

// ─── Access type configs ─────────────────────────────────────────────────────

const ACCESS_TYPES = [
  { id: 'OPEN', label: 'OPEN', desc: 'All org members may join and share the payout.', color: '#4A8C5C', icon: '◉' },
  { id: 'EXCLUSIVE', label: 'EXCLUSIVE', desc: 'Buy-in required. Payout split covers buy-in deduction.', color: '#C8A84B', icon: '◈' },
];

const RANK_GATES = [
  { value: 'AFFILIATE', label: 'Any Rank', color: '#D89B50' },
  { value: 'SCOUT', label: 'Scout+', color: '#4A8C5C' },
  { value: 'VOYAGER', label: 'Voyager+', color: '#7AAECC' },
  { value: 'PIONEER', label: 'Founder+', color: '#9B59B6' },
];

// ─── Quick schedule helpers ──────────────────────────────────────────────────

function getQuickDates() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(20, 0, 0, 0); // 8 PM local tonight

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);

  // Next Saturday
  const saturday = new Date(now);
  const daysUntilSat = (6 - saturday.getDay() + 7) % 7 || 7;
  saturday.setDate(saturday.getDate() + daysUntilSat);
  saturday.setHours(18, 0, 0, 0);

  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  return [
    { label: 'TONIGHT 8PM', value: fmt(today), disabled: now > today },
    { label: 'TOMORROW 8PM', value: fmt(tomorrow) },
    { label: `SAT ${saturday.getMonth() + 1}/${saturday.getDate()} 6PM`, value: fmt(saturday) },
  ];
}

// ─── Field label ─────────────────────────────────────────────────────────────

const LABEL_STYLE = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
  color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
  marginBottom: 8, display: 'block',
};

// ─── Smart autocomplete input ────────────────────────────────────────────────

function SmartInput({ value, onChange, suggestions, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const q = (filter || value || '').toLowerCase();
    if (!q) return suggestions.slice(0, 12);
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 10);
  }, [filter, value, suggestions]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="nexus-input"
        value={value}
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', background: '#0C0C0A', border: '1px solid rgba(200,170,100,0.10)', borderRadius: 3, ...style }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40,
          background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.15)',
          borderRadius: '0 0 3px 3px', maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          animation: 'nexus-fade-in 100ms ease-out both',
        }}>
          {filtered.map(item => (
            <button
              key={item} type="button"
              onClick={() => { onChange(item); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', border: 'none', cursor: 'pointer',
                background: item === value ? '#1A1A16' : 'transparent',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                color: item === value ? '#E8E4DC' : '#9A9488',
                borderBottom: '0.5px solid rgba(200,170,100,0.04)',
                transition: 'all 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; e.currentTarget.style.color = '#E8E4DC'; }}
              onMouseLeave={e => { if (item !== value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9A9488'; }}}
            >{item}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function OpBriefingStep({ form, set, validationErrors, opType }) {
  const selectedSystem = SYSTEMS.find(s => s.id === form.system_name);
  const locationSuggestions = selectedSystem?.locations || [];
  const quickDates = useMemo(getQuickDates, []);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const nameSuggestions = useMemo(
    () => generateNames(opType || form.type || 'PATROL', form.system_name, form.location),
    [opType, form.type, form.system_name, form.location],
  );

  // Format scheduled display
  const scheduledDisplay = useMemo(() => {
    if (!form.scheduled_at) return null;
    try {
      const parts = form.scheduled_at.split('T');
      if (parts.length < 2) return null;
      const d = new Date(`${parts[0]}T${parts[1]}:00`);
      if (isNaN(d.getTime())) return null;
      const local = d.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      return local;
    } catch { return null; }
  }, [form.scheduled_at]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Op Name with smart suggestions ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={LABEL_STYLE}>OPERATION NAME *</span>
          <button type="button" onClick={() => setShowNameSuggestions(!showNameSuggestions)} style={{
            background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
            borderRadius: 2, padding: '3px 10px', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
            color: '#5A5850', letterSpacing: '0.12em',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#C8A84B'; e.currentTarget.style.borderColor = 'rgba(200,168,75,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; e.currentTarget.style.borderColor = 'rgba(200,170,100,0.10)'; }}
          >✦ SUGGEST NAME</button>
        </div>
        <input
          className="nexus-input"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Redscar Industrial — Nyx Push"
          style={{
            fontSize: 16, fontWeight: 500, letterSpacing: '0.04em',
            padding: '14px 16px', width: '100%', boxSizing: 'border-box',
            background: '#0C0C0A',
            border: `1px solid ${validationErrors.name ? '#C8A84B' : 'rgba(200,170,100,0.10)'}`,
            borderRadius: 3, transition: 'border-color 200ms',
          }}
        />
        {showNameSuggestions && (
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8,
            animation: 'nexus-fade-in 150ms ease-out both',
          }}>
            {nameSuggestions.map(name => (
              <button key={name} type="button" onClick={() => { set('name', name); setShowNameSuggestions(false); }} style={{
                padding: '5px 12px', borderRadius: 2, cursor: 'pointer',
                background: form.name === name ? 'rgba(200,168,75,0.10)' : '#0C0C0A',
                border: `0.5px solid ${form.name === name ? 'rgba(200,168,75,0.25)' : 'rgba(200,170,100,0.08)'}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                color: form.name === name ? '#C8A84B' : '#9A9488',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#141410'; e.currentTarget.style.color = '#E8E4DC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = form.name === name ? 'rgba(200,168,75,0.10)' : '#0C0C0A'; e.currentTarget.style.color = form.name === name ? '#C8A84B' : '#9A9488'; }}
              >{name}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── System Selector with descriptions ── */}
      <div>
        <span style={LABEL_STYLE}>STAR SYSTEM *</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {SYSTEMS.map((sys, i) => {
            const isActive = form.system_name === sys.id;
            return (
              <button key={sys.id} type="button" onClick={() => set('system_name', sys.id)} style={{
                flex: 1, padding: '14px 12px',
                background: isActive ? `linear-gradient(135deg, ${sys.glow} 0%, #0F0F0D 100%)` : '#0C0C0A',
                border: `1px solid ${isActive ? sys.color : validationErrors.system ? '#C8A84B' : 'rgba(200,170,100,0.06)'}`,
                borderRadius: 3, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                opacity: 0, animation: `nexus-fade-in 200ms ease-out both ${i * 80}ms`,
                boxShadow: isActive ? `0 2px 16px ${sys.glow}` : 'none',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Pulse ring on active */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                    width: 18, height: 18, borderRadius: '50%',
                    border: `1px solid ${sys.color}`,
                    animation: 'ring 2.2s ease-out infinite',
                    opacity: 0.4,
                  }} />
                )}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isActive ? sys.color : 'rgba(200,170,100,0.15)',
                  boxShadow: isActive ? `0 0 12px ${sys.color}` : 'none',
                  transition: 'all 300ms', position: 'relative', zIndex: 1,
                }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: 14, color: isActive ? sys.color : '#5A5850',
                  letterSpacing: '0.18em', transition: 'color 200ms',
                }}>{sys.label}</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400,
                  fontSize: 9, color: isActive ? 'rgba(255,255,255,0.35)' : '#3A3830',
                  transition: 'color 200ms',
                }}>{sys.desc}</span>
              </button>
            );
          })}
        </div>
        {validationErrors.system && (
          <div style={{ fontSize: 9, color: '#C8A84B', marginTop: 6, animation: 'nexus-fade-in 150ms ease-out both' }}>
            {validationErrors.system}
          </div>
        )}
      </div>

      {/* ── Smart location autocomplete ── */}
      <div>
        <span style={LABEL_STYLE}>LOCATION</span>
        <SmartInput
          value={form.location}
          onChange={v => set('location', v)}
          suggestions={locationSuggestions}
          placeholder={selectedSystem ? `Search ${selectedSystem.label} locations…` : 'Select a system first'}
        />
        {form.location && (
          <div style={{
            marginTop: 6, fontSize: 9, color: '#3A3830',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {locationSuggestions.includes(form.location) ? '✓ Known location' : '⚡ Custom location'}
          </div>
        )}
      </div>

      {/* ── Schedule with quick-pick ── */}
      <div>
        <span style={LABEL_STYLE}>SCHEDULED TIME *</span>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {quickDates.filter(q => !q.disabled).map(q => (
            <button key={q.label} type="button" onClick={() => set('scheduled_at', q.value)} style={{
              padding: '6px 12px', borderRadius: 2, cursor: 'pointer',
              background: form.scheduled_at === q.value ? 'rgba(200,168,75,0.10)' : '#0C0C0A',
              border: `0.5px solid ${form.scheduled_at === q.value ? 'rgba(200,168,75,0.25)' : 'rgba(200,170,100,0.08)'}`,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
              color: form.scheduled_at === q.value ? '#C8A84B' : '#5A5850',
              letterSpacing: '0.10em', transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; e.currentTarget.style.borderColor = 'rgba(200,170,100,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = form.scheduled_at === q.value ? '#C8A84B' : '#5A5850'; e.currentTarget.style.borderColor = form.scheduled_at === q.value ? 'rgba(200,168,75,0.25)' : 'rgba(200,170,100,0.08)'; }}
            >{q.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="nexus-input" type="date"
            value={form.scheduled_at.split('T')[0] || ''}
            onChange={e => {
              const date = e.target.value;
              const time = form.scheduled_at.split('T')[1] || '20:00';
              set('scheduled_at', date && time ? `${date}T${time}` : form.scheduled_at);
            }}
            style={{
              flex: 1, colorScheme: 'dark', background: '#0C0C0A',
              border: `1px solid ${validationErrors.schedule ? '#C8A84B' : 'rgba(200,170,100,0.08)'}`,
              borderRadius: 3,
            }}
          />
          <input
            className="nexus-input" type="time"
            value={form.scheduled_at.split('T')[1] || ''}
            onChange={e => {
              const time = e.target.value;
              const date = form.scheduled_at.split('T')[0] || new Date().toISOString().split('T')[0];
              set('scheduled_at', date && time ? `${date}T${time}` : form.scheduled_at);
            }}
            style={{
              flex: 0.5, colorScheme: 'dark', background: '#0C0C0A',
              border: `1px solid ${validationErrors.schedule ? '#C8A84B' : 'rgba(200,170,100,0.08)'}`,
              borderRadius: 3,
            }}
          />
        </div>
        {validationErrors.schedule && (
          <div style={{ fontSize: 9, color: '#C8A84B', marginTop: 6, animation: 'nexus-fade-in 150ms ease-out both' }}>
            {validationErrors.schedule}
          </div>
        )}
        {scheduledDisplay && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 2,
            background: 'rgba(200,168,75,0.04)', border: '0.5px solid rgba(200,168,75,0.10)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B',
            display: 'inline-block',
          }}>
            ⏱ {scheduledDisplay} (your local time)
          </div>
        )}
      </div>

      {/* ── Access type with descriptions ── */}
      <div>
        <span style={LABEL_STYLE}>ACCESS TYPE</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {ACCESS_TYPES.map(at => {
            const isActive = form.access_type === at.id;
            return (
              <button key={at.id} type="button" onClick={() => set('access_type', at.id)} style={{
                flex: 1, padding: '12px 14px', borderRadius: 3, cursor: 'pointer',
                background: isActive ? `${at.color}0C` : '#0C0C0A',
                border: `1px solid ${isActive ? `${at.color}44` : 'rgba(200,170,100,0.06)'}`,
                borderLeft: isActive ? `3px solid ${at.color}` : '1px solid rgba(200,170,100,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                textAlign: 'left', transition: 'all 200ms',
                boxShadow: isActive ? `0 2px 8px ${at.color}15` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: isActive ? at.color : '#5A5850' }}>{at.icon}</span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    fontSize: 12, color: isActive ? at.color : '#5A5850',
                    letterSpacing: '0.12em',
                  }}>{at.label}</span>
                </div>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400,
                  fontSize: 9, color: isActive ? 'rgba(255,255,255,0.3)' : '#3A3830',
                  lineHeight: 1.4,
                }}>{at.desc}</span>
              </button>
            );
          })}
        </div>
        {form.access_type === 'EXCLUSIVE' && (
          <div style={{ marginTop: 12, animation: 'nexus-fade-in 150ms ease-out both' }}>
            <span style={{ ...LABEL_STYLE, marginBottom: 6 }}>BUY-IN AMOUNT (aUEC)</span>
            <div style={{ position: 'relative' }}>
              <input
                className="nexus-input" type="number" min={0} step={1000}
                value={form.buy_in_cost}
                onChange={e => set('buy_in_cost', parseInt(e.target.value) || 0)}
                style={{ width: '100%', boxSizing: 'border-box', background: '#0C0C0A', border: '1px solid rgba(200,170,100,0.08)', borderRadius: 3, paddingRight: 48 }}
              />
              <span style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#3A3830', pointerEvents: 'none',
              }}>aUEC</span>
            </div>
            {/* Quick buy-in presets */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[5000, 10000, 25000, 50000].map(amt => (
                <button key={amt} type="button" onClick={() => set('buy_in_cost', amt)} style={{
                  padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                  background: form.buy_in_cost === amt ? 'rgba(200,168,75,0.08)' : 'transparent',
                  border: `0.5px solid ${form.buy_in_cost === amt ? 'rgba(200,168,75,0.20)' : 'rgba(200,170,100,0.06)'}`,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                  color: form.buy_in_cost === amt ? '#C8A84B' : '#5A5850',
                  transition: 'all 150ms',
                }}>{(amt / 1000)}K</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Rank gate as styled pills ── */}
      <div>
        <span style={LABEL_STYLE}>MINIMUM RANK TO RSVP</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANK_GATES.map(r => {
            const isActive = form.rank_gate === r.value;
            return (
              <button key={r.value} type="button" onClick={() => set('rank_gate', r.value)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 3, cursor: 'pointer',
                background: isActive ? `${r.color}0C` : '#0C0C0A',
                border: `1px solid ${isActive ? `${r.color}44` : 'rgba(200,170,100,0.06)'}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: 11, color: isActive ? r.color : '#5A5850',
                letterSpacing: '0.10em', textTransform: 'uppercase',
                transition: 'all 200ms',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isActive ? r.color : '#2A2A28',
                  boxShadow: isActive ? `0 0 6px ${r.color}` : 'none',
                  transition: 'all 200ms',
                }} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}