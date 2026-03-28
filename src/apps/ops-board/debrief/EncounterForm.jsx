/**
 * EncounterForm — add an encounter report to the debrief.
 */
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

const TYPES = ['PVP', 'PVE', 'AMBUSH', 'PATROL_CONTACT', 'INTERDICTION', 'ENVIRONMENTAL', 'OTHER'];
const THREATS = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
const THREAT_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B', EXTREME: '#C0392B' };

export default function EncounterForm({ encounters, onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'PVE', description: '', threat_level: 'LOW', casualties: 0, ships_lost: 0 });

  const add = () => {
    if (!form.description.trim()) return;
    onChange([...encounters, { ...form, casualties: parseInt(form.casualties) || 0, ships_lost: parseInt(form.ships_lost) || 0 }]);
    setForm({ type: 'PVE', description: '', threat_level: 'LOW', casualties: 0, ships_lost: 0 });
    setShowAdd(false);
  };

  const remove = (i) => onChange(encounters.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* Existing encounters */}
      {encounters.map((e, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
          borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        }}>
          <span style={{
            fontSize: 8, fontWeight: 600, padding: '2px 5px', borderRadius: 2,
            color: THREAT_COLORS[e.threat_level] || '#5A5850',
            background: `${THREAT_COLORS[e.threat_level] || '#5A5850'}15`,
            flexShrink: 0,
          }}>{e.type}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif" }}>{e.description}</div>
            <div style={{ fontSize: 9, color: '#5A5850', marginTop: 2 }}>
              Threat: {e.threat_level} · Casualties: {e.casualties || 0} · Ships lost: {e.ships_lost || 0}
            </div>
          </div>
          <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#5A5850', cursor: 'pointer', padding: 2, flexShrink: 0 }}><X size={10} /></button>
        </div>
      ))}

      {/* Add form */}
      {showAdd ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0', animation: 'nexus-fade-in 120ms ease-out both' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                padding: '3px 6px', borderRadius: 2, cursor: 'pointer', fontSize: 8,
                background: form.type === t ? 'rgba(192,57,43,0.10)' : '#141410',
                border: `0.5px solid ${form.type === t ? '#C0392B' : 'rgba(200,170,100,0.08)'}`,
                color: form.type === t ? '#C0392B' : '#5A5850',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              }}>{t}</button>
            ))}
          </div>
          <textarea className="nexus-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What happened?" style={{ minHeight: 48, resize: 'none', fontSize: 10 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {THREATS.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, threat_level: t }))} style={{
                  padding: '3px 6px', borderRadius: 2, cursor: 'pointer', fontSize: 8,
                  background: form.threat_level === t ? `${THREAT_COLORS[t]}15` : '#141410',
                  border: `0.5px solid ${form.threat_level === t ? THREAT_COLORS[t] : 'rgba(200,170,100,0.08)'}`,
                  color: form.threat_level === t ? THREAT_COLORS[t] : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                }}>{t}</button>
              ))}
            </div>
            <input type="number" min={0} value={form.casualties} onChange={e => setForm(f => ({ ...f, casualties: e.target.value }))}
              placeholder="Deaths" style={{ width: 60, fontSize: 9, padding: '4px 6px' }} />
            <input type="number" min={0} value={form.ships_lost} onChange={e => setForm(f => ({ ...f, ships_lost: e.target.value }))}
              placeholder="Ships lost" style={{ width: 70, fontSize: 9, padding: '4px 6px' }} />
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, padding: '4px 10px', cursor: 'pointer', color: '#5A5850', fontSize: 9 }}>CANCEL</button>
            <button onClick={add} style={{ background: '#C0392B', border: 'none', borderRadius: 2, padding: '4px 12px', cursor: 'pointer', color: '#E8E4DC', fontSize: 9, fontWeight: 600 }}>ADD</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          marginTop: 6, padding: '6px 12px', background: 'none',
          border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          color: '#9A9488', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}><Plus size={9} /> ADD ENCOUNTER</button>
      )}
    </div>
  );
}