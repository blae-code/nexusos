/**
 * OpBriefingStep — Name, system, location, and schedule inputs.
 */
import React from 'react';

const SYSTEMS = [
  { id: 'STANTON', label: 'STANTON', color: '#7AAECC', glow: 'rgba(122,174,204,0.10)' },
  { id: 'PYRO', label: 'PYRO', color: '#C0392B', glow: 'rgba(192,57,43,0.10)' },
  { id: 'NYX', label: 'NYX', color: '#9B59B6', glow: 'rgba(155,89,182,0.10)' },
];

const ACCESS_TYPES = [
  { id: 'OPEN', label: 'OPEN', desc: 'All org members may join.', color: '#4A8C5C' },
  { id: 'EXCLUSIVE', label: 'EXCLUSIVE', desc: 'Buy-in required. Payout covers deduction.', color: '#C8A84B' },
];

const RANK_GATES = [
  { value: 'AFFILIATE', label: 'Any Rank' },
  { value: 'SCOUT', label: 'Scout+' },
  { value: 'VOYAGER', label: 'Voyager+' },
  { value: 'PIONEER', label: 'Founder+' },
];

const FIELD_LABEL = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
  color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
  marginBottom: 8, display: 'block',
};

export default function OpBriefingStep({ form, set, validationErrors }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Op Name */}
      <div>
        <span style={FIELD_LABEL}>OPERATION NAME *</span>
        <input
          className="nexus-input"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Redscar Industrial — Nyx Push"
          style={{
            fontSize: 16, fontWeight: 500, letterSpacing: '0.04em',
            padding: '14px 16px', width: '100%', boxSizing: 'border-box',
            background: '#0C0C0A',
            border: '1px solid rgba(200,170,100,0.10)',
            borderRadius: 3,
            transition: 'border-color 200ms',
          }}
        />
      </div>

      {/* System Selector */}
      <div>
        <span style={FIELD_LABEL}>STAR SYSTEM *</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {SYSTEMS.map((sys, i) => {
            const isActive = form.system_name === sys.id;
            return (
              <button
                key={sys.id}
                type="button"
                onClick={() => set('system_name', sys.id)}
                style={{
                  flex: 1, padding: '16px 14px',
                  background: isActive
                    ? `linear-gradient(135deg, ${sys.glow} 0%, #0F0F0D 100%)`
                    : '#0C0C0A',
                  border: `1px solid ${isActive ? sys.color : validationErrors.system ? '#C8A84B' : 'rgba(200,170,100,0.06)'}`,
                  borderRadius: 3, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transition: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  opacity: 0,
                  animation: `nexus-fade-in 200ms ease-out both ${i * 80}ms`,
                  boxShadow: isActive ? `0 2px 12px ${sys.glow}` : 'none',
                  position: 'relative',
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isActive ? sys.color : 'rgba(200,170,100,0.15)',
                  boxShadow: isActive ? `0 0 12px ${sys.color}` : 'none',
                  transition: 'all 300ms',
                }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: 14, color: isActive ? sys.color : '#5A5850',
                  letterSpacing: '0.18em', transition: 'color 200ms',
                }}>{sys.label}</span>
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

      {/* Location */}
      <div>
        <span style={FIELD_LABEL}>LOCATION</span>
        <input
          className="nexus-input"
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder="e.g. Aaron Halo, Yela Belt, CRU-L1"
          style={{ width: '100%', boxSizing: 'border-box', background: '#0C0C0A', border: '1px solid rgba(200,170,100,0.08)', borderRadius: 3 }}
        />
      </div>

      {/* Schedule */}
      <div>
        <span style={FIELD_LABEL}>SCHEDULED TIME (UTC) *</span>
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
            style={{
              flex: 1, colorScheme: 'dark', background: '#0C0C0A',
              border: `1px solid ${validationErrors.schedule ? '#C8A84B' : 'rgba(200,170,100,0.08)'}`,
              borderRadius: 3,
            }}
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
            style={{
              flex: 0.6, colorScheme: 'dark', background: '#0C0C0A',
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
        <div style={{ fontSize: 9, color: '#3A3830', marginTop: 8 }}>All times are displayed in UTC across the org.</div>
      </div>

      {/* Access & Rank */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <span style={FIELD_LABEL}>ACCESS TYPE</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {ACCESS_TYPES.map(at => {
              const isActive = form.access_type === at.id;
              return (
                <button
                  key={at.id} type="button"
                  onClick={() => set('access_type', at.id)}
                  style={{
                    flex: 1, padding: '10px 12px',
                    background: isActive ? `${at.color}12` : '#0C0C0A',
                    border: `1px solid ${isActive ? `${at.color}55` : 'rgba(200,170,100,0.06)'}`,
                    borderRadius: 3, cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    fontSize: 11, color: isActive ? at.color : '#5A5850',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    transition: 'all 200ms',
                  }}
                >{at.label}</button>
              );
            })}
          </div>
          {form.access_type === 'EXCLUSIVE' && (
            <div style={{ marginTop: 10, animation: 'nexus-fade-in 150ms ease-out both' }}>
              <span style={{ ...FIELD_LABEL, marginBottom: 5 }}>BUY-IN (aUEC)</span>
              <input
                className="nexus-input" type="number" min={0} step={1000}
                value={form.buy_in_cost}
                onChange={e => set('buy_in_cost', parseInt(e.target.value) || 0)}
                style={{ width: '100%', boxSizing: 'border-box', background: '#0C0C0A', border: '1px solid rgba(200,170,100,0.08)', borderRadius: 3 }}
              />
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <span style={FIELD_LABEL}>MINIMUM RANK</span>
          <select
            className="nexus-input"
            value={form.rank_gate}
            onChange={e => set('rank_gate', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer', background: '#0C0C0A', border: '1px solid rgba(200,170,100,0.08)', borderRadius: 3 }}
          >
            {RANK_GATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}