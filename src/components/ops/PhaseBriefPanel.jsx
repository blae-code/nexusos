/**
 * PhaseBriefPanel — Phase Briefing modal for Op Leaders
 * Claude #5: Most frequently used during live ops.
 * Generates and optionally posts a tactical phase brief to Discord.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function PhaseBriefPanel({ op, onClose, onLogEntry }) {
  const phases = op.phases || [];
  const currentPhaseIdx = op.phase_current || 0;
  const currentPhaseName = phases[currentPhaseIdx]?.name || phases[currentPhaseIdx] || `Phase ${currentPhaseIdx + 1}`;

  const [phaseIdx, setPhaseIdx] = useState(currentPhaseIdx);
  const [phaseName, setPhaseName] = useState(typeof phases[currentPhaseIdx] === 'object' ? phases[currentPhaseIdx]?.name : phases[currentPhaseIdx] || '');
  const [threatNotes, setThreatNotes] = useState('');
  const [materialStatus, setMaterialStatus] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [postToDiscord, setPostToDiscord] = useState(true);
  const [loading, setLoading] = useState(false);
  const [briefText, setBriefText] = useState('');
  const [error, setError] = useState('');
  const [posted, setPosted] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setBriefText('');
    setPosted(false);

    const phaseLabel = phaseName || `Phase ${phaseIdx + 1}`;

    const res = await base44.functions.invoke('phaseBriefing', {
      op_id: op.id,
      phase_name: phaseLabel,
      phase_index: phaseIdx,
      threat_notes: threatNotes,
      material_status: materialStatus,
      custom_notes: customNotes,
      post_to_discord: postToDiscord,
    });

    const data = res?.data || res;
    if (data?.error) {
      setError(data.error);
    } else {
      setBriefText(data?.brief_text || '');
      setPosted(data?.discord_posted || false);
      if (onLogEntry) {
        onLogEntry({
          type: 'phase_brief',
          t: new Date().toISOString(),
          author: 'NEXUSOS',
          text: `Phase brief generated: ${phaseLabel}`,
          phase: phaseLabel,
          phase_index: phaseIdx,
        });
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--bg0-rgb), 0.88)',
    }}>
      <div className="nexus-fade-in" style={{
        width: 540, maxHeight: '80vh',
        background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0,
        }}>
          <div>
            <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>
              POST PHASE BRIEF
            </span>
            <span style={{ color: 'var(--t2)', fontSize: 9, marginLeft: 10 }}>{op.name}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex' }}>
            <X size={13} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Phase selector */}
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 5 }}>PHASE</div>
              {phases.length > 0 ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {phases.map((p, i) => {
                    const name = typeof p === 'object' ? p.name : p;
                    const isActive = phaseIdx === i;
                    return (
                      <button
                        key={i}
                        onClick={() => { setPhaseIdx(i); setPhaseName(name || ''); }}
                        style={{
                          padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                          fontSize: 10, letterSpacing: '0.08em',
                          background: isActive ? 'rgba(74,143,208,0.12)' : 'var(--bg3)',
                          border: `0.5px solid ${isActive ? 'var(--info)' : 'var(--b2)'}`,
                          color: isActive ? 'var(--info)' : 'var(--t1)',
                        }}
                      >
                        {i === currentPhaseIdx && <span style={{ color: 'var(--warn)', marginRight: 4 }}>▶</span>}
                        {name || `Phase ${i + 1}`}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  className="nexus-input"
                  value={phaseName}
                  onChange={e => setPhaseName(e.target.value)}
                  placeholder="Phase name (e.g. EXTRACTION, TRANSIT)"
                  style={{ fontSize: 11 }}
                />
              )}
            </div>

            {/* Threat notes */}
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 5 }}>
                THREAT STATUS <span style={{ color: 'var(--t3)' }}>(optional)</span>
              </div>
              <input
                className="nexus-input"
                value={threatNotes}
                onChange={e => setThreatNotes(e.target.value)}
                placeholder="e.g. 2x hostile Gladius, Yela vicinity, medium threat"
                style={{ fontSize: 11 }}
              />
            </div>

            {/* Material status */}
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 5 }}>
                MATERIAL STATUS <span style={{ color: 'var(--t3)' }}>(optional override)</span>
              </div>
              <input
                className="nexus-input"
                value={materialStatus}
                onChange={e => setMaterialStatus(e.target.value)}
                placeholder="e.g. 48 SCU Quantainium @ 84%, 2 loads pending"
                style={{ fontSize: 11 }}
              />
            </div>

            {/* Custom notes */}
            <div>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 5 }}>
                ADDITIONAL NOTES <span style={{ color: 'var(--t3)' }}>(optional)</span>
              </div>
              <textarea
                className="nexus-input"
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Any other context for the briefing…"
                rows={2}
                style={{ fontSize: 11, resize: 'none' }}
              />
            </div>

            {/* Post to Discord toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', background: 'var(--bg3)', border: '0.5px solid var(--b1)', borderRadius: 5,
            }}>
              <span style={{ color: 'var(--t1)', fontSize: 11 }}>Post to #nexusos-ops</span>
              <button
                type="button"
                onClick={() => setPostToDiscord(v => !v)}
                style={{
                  width: 34, height: 18, borderRadius: 9,
                  background: postToDiscord ? 'var(--live)' : 'var(--bg4)',
                  border: `0.5px solid ${postToDiscord ? 'var(--live)' : 'var(--b3)'}`,
                  cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', background: 'var(--bg0)',
                  position: 'absolute', top: 2, left: postToDiscord ? 18 : 2, transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 11, padding: '6px 10px', background: 'rgba(var(--danger-rgb), 0.06)', border: '0.5px solid rgba(var(--danger-rgb), 0.2)', borderRadius: 5 }}>
                {error}
              </div>
            )}

            {/* Generated brief */}
            {briefText && (
              <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)' }} />
                  <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em' }}>
                    GENERATED BRIEF
                    {posted && <span style={{ color: 'var(--live)', marginLeft: 8 }}>· POSTED TO DISCORD</span>}
                  </span>
                </div>
                <pre style={{
                  color: 'var(--t0)', fontSize: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit', margin: 0,
                }}>
                  {briefText}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ borderTop: '0.5px solid var(--b1)', padding: '10px 16px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} className="nexus-btn" style={{ padding: '7px 14px', fontSize: 10 }}>
            CLOSE
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="nexus-btn"
            style={{
              flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 10,
              background: 'rgba(var(--info-rgb), 0.08)', borderColor: 'rgba(var(--info-rgb), 0.35)',
              color: loading ? 'var(--t2)' : 'var(--info)',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="nexus-loading-dots"><span /><span /><span /></span>
                GENERATING...
              </span>
            ) : briefText ? 'REGENERATE BRIEF' : 'GENERATE & POST BRIEF'}
          </button>
        </div>
      </div>
    </div>
  );
}