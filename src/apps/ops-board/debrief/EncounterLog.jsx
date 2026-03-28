/**
 * EncounterLog — add/remove encounter reports.
 */
import React, { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';

const ENCOUNTER_TYPES = [
  'PVP_ENGAGEMENT', 'PVE_COMBAT', 'PIRATE_ATTACK', 'SHIP_LOSS',
  'EQUIPMENT_FAILURE', 'NAVIGATION_HAZARD', 'TRADE_DISPUTE', 'FRIENDLY_CONTACT', 'OTHER',
];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEV_COLORS = { LOW: '#5A5850', MEDIUM: '#C8A84B', HIGH: '#E67E22', CRITICAL: '#C0392B' };
const TYPE_COLORS = {
  PVP_ENGAGEMENT: '#C0392B', PVE_COMBAT: '#E67E22', PIRATE_ATTACK: '#C0392B',
  SHIP_LOSS: '#C0392B', EQUIPMENT_FAILURE: '#C8A84B', NAVIGATION_HAZARD: '#E67E22',
  TRADE_DISPUTE: '#3498DB', FRIENDLY_CONTACT: '#4A8C5C', OTHER: '#5A5850',
};

const LABEL = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

export default function EncounterLog({ encounters, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ type: 'PVP_ENGAGEMENT', description: '', severity: 'MEDIUM', location: '', resolved: true });

  const add = () => {
    if (!draft.description.trim()) return;
    onChange([...encounters, { ...draft }]);
    setDraft({ type: 'PVP_ENGAGEMENT', description: '', severity: 'MEDIUM', location: '', resolved: true });
    setShowForm(false);
  };

  const remove = (i) => onChange(encounters.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C0392B', fontWeight: 700, letterSpacing: '0.08em' }}>
          <AlertTriangle size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          ENCOUNTER REPORTS ({encounters.length})
        </span>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: 'none', border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
          padding: '3px 8px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9, color: '#9A9488', display: 'flex', alignItems: 'center', gap: 3,
        }}>{showForm ? <><X size={8} /> CANCEL</> : <><Plus size={8} /> ADD</>}</button>
      </div>

      {showForm && (
        <div style={{
          padding: 10, background: '#141410', border: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8,
          animation: 'nexus-fade-in 120ms ease-out both',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={LABEL}>TYPE</span>
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                {ENCOUNTER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <span style={LABEL}>SEVERITY</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {SEVERITIES.map(s => (
                  <button key={s} onClick={() => setDraft(d => ({ ...d, severity: s }))} style={{
                    flex: 1, padding: '5px 0', borderRadius: 2, cursor: 'pointer', fontSize: 8,
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                    background: draft.severity === s ? `${SEV_COLORS[s]}18` : '#0F0F0D',
                    border: `0.5px solid ${draft.severity === s ? SEV_COLORS[s] : 'rgba(200,170,100,0.06)'}`,
                    color: draft.severity === s ? SEV_COLORS[s] : '#5A5850',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <span style={LABEL}>DESCRIPTION</span>
            <textarea className="nexus-input" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="What happened..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <span style={LABEL}>LOCATION</span>
              <input value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="e.g. Yela belt"
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 9, color: '#9A9488', padding: '8px 0' }}>
              <input type="checkbox" checked={draft.resolved} onChange={e => setDraft(d => ({ ...d, resolved: e.target.checked }))} /> Resolved
            </label>
            <button onClick={add} disabled={!draft.description.trim()} style={{
              padding: '7px 14px', background: '#C0392B', border: 'none', borderRadius: 2, color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, cursor: 'pointer',
              opacity: draft.description.trim() ? 1 : 0.4,
            }}>ADD</button>
          </div>
        </div>
      )}

      {encounters.length === 0 ? (
        <div style={{ padding: '12px 0', fontSize: 10, color: '#5A5850', fontStyle: 'italic' }}>No encounters reported.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {encounters.map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
              background: '#141410', borderRadius: 2, border: `0.5px solid ${SEV_COLORS[e.severity] || '#5A5850'}22`,
              borderLeft: `2px solid ${SEV_COLORS[e.severity] || '#5A5850'}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 2,
                    color: TYPE_COLORS[e.type] || '#5A5850', background: `${TYPE_COLORS[e.type] || '#5A5850'}15`,
                    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em',
                  }}>{(e.type || '').replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 8, color: SEV_COLORS[e.severity] || '#5A5850', fontWeight: 600 }}>{e.severity}</span>
                  {e.location && <span style={{ fontSize: 8, color: '#5A5850' }}>{e.location}</span>}
                  {!e.resolved && <span style={{ fontSize: 7, color: '#C0392B', fontWeight: 700 }}>UNRESOLVED</span>}
                </div>
                <div style={{ fontSize: 10, color: '#9A9488', lineHeight: 1.4 }}>{e.description}</div>
              </div>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5850', padding: 2, flexShrink: 0 }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}