/**
 * PhaseObjectivesEditor — view and edit phase objectives & threats for an op
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Target, AlertTriangle, Plus, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

function PhaseCard({ phase, index, isCurrent, objectives, threats, onSave, canEdit }) {
  const [expanded, setExpanded] = useState(isCurrent);
  const [editMode, setEditMode] = useState(false);
  const [objText, setObjText] = useState((objectives || []).join('\n'));
  const [threatText, setThreatText] = useState((threats || []).join('\n'));

  const handleSave = () => {
    const newObj = objText.split('\n').map(s => s.trim()).filter(Boolean);
    const newThreats = threatText.split('\n').map(s => s.trim()).filter(Boolean);
    onSave(index, newObj, newThreats);
    setEditMode(false);
  };

  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div style={{
      background: isCurrent ? 'var(--bg2)' : 'var(--bg1)',
      border: `0.5px solid ${isCurrent ? 'var(--b2)' : 'var(--b0)'}`,
      borderLeft: isCurrent ? '2px solid var(--danger)' : '2px solid var(--b1)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: 'none', border: 'none',
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <Chevron size={12} style={{ color: 'var(--t3)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.1em', minWidth: 24 }}>
          P{index + 1}
        </span>
        <span style={{ fontSize: 11, color: isCurrent ? 'var(--t0)' : 'var(--t1)', fontWeight: 600, flex: 1 }}>
          {phase}
        </span>
        {isCurrent && (
          <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 2, background: 'rgba(192,57,43,0.18)', color: 'var(--danger)', border: '0.5px solid var(--danger)', letterSpacing: '0.1em' }}>
            CURRENT
          </span>
        )}
        {objectives.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--t3)' }}>{objectives.length} obj</span>
        )}
        {threats.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--warn)' }}>{threats.length} threats</span>
        )}
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {editMode ? (
            <>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Target size={10} style={{ color: 'var(--live)' }} />
                  <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em' }}>OBJECTIVES (one per line)</span>
                </div>
                <textarea
                  value={objText}
                  onChange={e => setObjText(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                    borderRadius: 'var(--r-md)', color: 'var(--t0)', fontFamily: 'var(--font)',
                    fontSize: 11, padding: 8, outline: 'none', resize: 'vertical',
                  }}
                  placeholder="e.g. Secure perimeter&#10;Deploy mining equipment"
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <AlertTriangle size={10} style={{ color: 'var(--warn)' }} />
                  <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.1em' }}>THREATS (one per line)</span>
                </div>
                <textarea
                  value={threatText}
                  onChange={e => setThreatText(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                    borderRadius: 'var(--r-md)', color: 'var(--t0)', fontFamily: 'var(--font)',
                    fontSize: 11, padding: 8, outline: 'none', resize: 'vertical',
                  }}
                  placeholder="e.g. PvP gankers in area&#10;Hostile NPCs at extraction"
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleSave} className="nexus-btn nexus-btn-go" style={{ fontSize: 9, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={10} /> SAVE
                </button>
                <button onClick={() => setEditMode(false)} className="nexus-btn" style={{ fontSize: 9, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X size={10} /> CANCEL
                </button>
              </div>
            </>
          ) : (
            <>
              {objectives.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Target size={10} style={{ color: 'var(--live)' }} />
                    <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>OBJECTIVES</span>
                  </div>
                  {objectives.map((obj, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--t1)', padding: '2px 0', display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--t3)' }}>·</span> {obj}
                    </div>
                  ))}
                </div>
              )}
              {threats.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <AlertTriangle size={10} style={{ color: 'var(--warn)' }} />
                    <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>THREATS</span>
                  </div>
                  {threats.map((t, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--warn)', padding: '2px 0', display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--t3)' }}>⚠</span> {t}
                    </div>
                  ))}
                </div>
              )}
              {objectives.length === 0 && threats.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--t3)', fontStyle: 'italic' }}>No objectives or threats defined</div>
              )}
              {canEdit && (
                <button onClick={() => setEditMode(true)} className="nexus-btn" style={{ fontSize: 9, padding: '4px 10px', alignSelf: 'flex-start' }}>
                  <Plus size={9} style={{ verticalAlign: 'middle' }} /> EDIT
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PhaseObjectivesEditor({ op, onUpdate, canEdit }) {
  const phases = Array.isArray(op.phases) ? op.phases : [];
  const phaseNames = phases.map(p => typeof p === 'string' ? p : p.name || `Phase ${phases.indexOf(p) + 1}`);

  // Phase objectives/threats stored in op.phases as objects
  const getPhaseData = (idx) => {
    const p = phases[idx];
    if (typeof p === 'object' && p !== null) {
      return { objectives: p.objectives || [], threats: p.threats || [] };
    }
    return { objectives: [], threats: [] };
  };

  const handleSave = async (idx, objectives, threats) => {
    const newPhases = phases.map((p, i) => {
      if (i !== idx) return p;
      const name = typeof p === 'string' ? p : (p.name || `Phase ${i + 1}`);
      return { name, objectives, threats };
    });
    await base44.entities.Op.update(op.id, { phases: newPhases });
    onUpdate();
  };

  return (
    <div className="nexus-card" style={{ padding: 14 }}>
      <div className="nexus-section-header" style={{ marginBottom: 12 }}>
        <Target size={10} /> PHASE OBJECTIVES & THREATS
      </div>
      {phaseNames.length === 0 ? (
        <div style={{ color: 'var(--t3)', fontSize: 10, textAlign: 'center', padding: 20 }}>No phases defined</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {phaseNames.map((name, idx) => {
            const data = getPhaseData(idx);
            return (
              <PhaseCard
                key={idx}
                phase={name}
                index={idx}
                isCurrent={idx === (op.phase_current || 0)}
                objectives={data.objectives}
                threats={data.threats}
                onSave={handleSave}
                canEdit={canEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}