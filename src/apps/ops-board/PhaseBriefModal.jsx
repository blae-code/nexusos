/**
 * PhaseBriefModal — phase briefing dialog
 * Calls phaseBriefing and previews the NexusOS brief.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';

export default function PhaseBriefModal({ op, onClose, onPosted }) {
  const phases = op.phases || [];
  const currentPhase = op.phase_current || 0;

  const [phaseName, setPhaseName] = useState(
    phases[currentPhase]?.name || phases[currentPhase] || `Phase ${currentPhase + 1}`
  );
  const [threatNotes, setThreatNotes] = useState('');
  const [materialStatus, setMaterialStatus] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const handleGenerate = async () => {
    setLoading(true);
    setPreview('');
    const res = await base44.functions.invoke('phaseBriefing', {
      op_id: op.id,
      phase_name: phaseName,
      phase_index: currentPhase,
      threat_notes: threatNotes,
      material_status: materialStatus,
      custom_notes: customNotes,
    });
    const text = res?.data?.brief_text || '';
    setPreview(text);
    setLoading(false);
    onPosted && onPosted();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--bg0-rgb), 0.82)',
    }}>
      <div className="nexus-fade-in" style={{
        width: 520,
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: '80vh',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0,
        }}>
          <span style={{ color: 'var(--t0)', fontSize: 11, letterSpacing: '0.1em', fontWeight: 500 }}>
            PHASE BRIEF
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 14, lineHeight: 1, padding: 2 }}>×</button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Phase name */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>PHASE</label>
            <input
              className="nexus-input"
              value={phaseName}
              onChange={e => setPhaseName(e.target.value)}
              placeholder="e.g. EXTRACTION, TRANSIT, REFINERY"
            />
          </div>

          {/* Threat notes */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>THREATS (optional)</label>
            <input
              className="nexus-input"
              value={threatNotes}
              onChange={e => setThreatNotes(e.target.value)}
              placeholder="e.g. Hostile interceptors reported at Yela — avoid Belt Alpha"
            />
          </div>

          {/* Material status */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>MATERIAL STATUS (optional)</label>
            <input
              className="nexus-input"
              value={materialStatus}
              onChange={e => setMaterialStatus(e.target.value)}
              placeholder="e.g. 48 SCU Quantainium @ 82% — 3 loads pending"
            />
          </div>

          {/* Custom notes */}
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>ADDITIONAL NOTES (optional)</label>
            <textarea
              className="nexus-input"
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              placeholder="Any other context for the brief..."
              style={{ resize: 'none', height: 56 }}
            />
          </div>

          {/* Preview */}
          {preview && (
            <div style={{
              background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6,
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>GENERATED BRIEF</span>
              </div>
              <pre style={{
                color: 'var(--t1)', fontSize: 10, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                fontFamily: 'inherit',
              }}>
                {preview}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 8, padding: '10px 16px',
          borderTop: '0.5px solid var(--b1)', flexShrink: 0,
        }}>
          <button onClick={onClose} className="nexus-btn" style={{ padding: '7px 16px', fontSize: 10 }}>
            CLOSE
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !phaseName.trim()}
            className="nexus-btn live-btn"
            style={{ flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 10, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'GENERATING...' : preview ? 'REGENERATE BRIEF' : 'GENERATE BRIEF'}
          </button>
        </div>
      </div>
    </div>
  );
}
