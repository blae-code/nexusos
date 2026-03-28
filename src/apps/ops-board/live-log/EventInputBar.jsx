/**
 * EventInputBar — multi-mode input for logging events during live ops.
 * Modes: NOTE (default), STATUS, LOOT, KEY_EVENT, THREAT
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Send, ChevronUp, Package, AlertTriangle, Crosshair, Radio, MessageSquare } from 'lucide-react';

const MODES = [
  { id: 'NOTE',      icon: MessageSquare, label: 'Note',       color: 'var(--t3)' },
  { id: 'STATUS',    icon: Radio,         label: 'Status',     color: 'var(--info)' },
  { id: 'LOOT',      icon: Package,       label: 'Loot',       color: 'var(--acc)' },
  { id: 'KEY_EVENT', icon: Crosshair,     label: 'Key Event',  color: 'var(--danger)' },
  { id: 'THREAT',    icon: AlertTriangle, label: 'Threat',     color: 'var(--warn)' },
];

export default function EventInputBar({ opId, callsign, currentPhase, onCreated }) {
  const [mode, setMode] = useState('NOTE');
  const [message, setMessage] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [quantityScu, setQuantityScu] = useState('');
  const [qualityScore, setQualityScore] = useState('');
  const [severity, setSeverity] = useState('INFO');
  const [showModes, setShowModes] = useState(false);
  const [posting, setPosting] = useState(false);

  const activeCfg = MODES.find(m => m.id === mode) || MODES[0];
  const ActiveIcon = activeCfg.icon;

  const canSubmit = () => {
    if (posting) return false;
    if (mode === 'LOOT') return materialName.trim() && quantityScu;
    return message.trim();
  };

  const submit = async () => {
    if (!canSubmit()) return;
    setPosting(true);

    const text = mode === 'LOOT'
      ? `Logged ${quantityScu} SCU ${materialName.trim()}${qualityScore ? ` @ Q${qualityScore}` : ''}`
      : message.trim();

    const record = {
      op_id: opId,
      event_type: mode,
      callsign,
      message: text,
      severity: mode === 'THREAT' ? 'WARN' : mode === 'KEY_EVENT' ? severity : 'INFO',
      phase_index: currentPhase || 0,
      logged_at: new Date().toISOString(),
      pinned: false,
    };

    if (mode === 'LOOT') {
      record.material_name = materialName.trim();
      record.quantity_scu = parseFloat(quantityScu) || 0;
      record.quality_score = parseInt(qualityScore) || 0;
    }

    await base44.entities.OpEvent.create(record);
    setMessage('');
    setMaterialName('');
    setQuantityScu('');
    setQualityScore('');
    setSeverity('INFO');
    setPosting(false);
    onCreated?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const inputStyle = {
    height: 32, background: 'var(--bg2)', border: '0.5px solid var(--b1)',
    borderRadius: 'var(--r-md)', color: 'var(--t0)', fontSize: 11, padding: '0 10px',
    outline: 'none', flex: 1, minWidth: 0,
  };

  return (
    <div style={{ flexShrink: 0, borderTop: '0.5px solid var(--b0)', paddingTop: 8 }}>
      {/* Mode selector popup */}
      {showModes && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap',
          animation: 'nexus-fade-in 100ms ease-out',
        }}>
          {MODES.map(m => {
            const MIcon = m.icon;
            const isActive = m.id === mode;
            return (
              <button key={m.id} onClick={() => { setMode(m.id); setShowModes(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  background: isActive ? 'var(--bg3)' : 'var(--bg1)',
                  border: `0.5px solid ${isActive ? m.color : 'var(--b0)'}`,
                  borderRadius: 'var(--r-md)', cursor: 'pointer',
                  color: isActive ? m.color : 'var(--t2)', fontSize: 9, letterSpacing: '0.06em',
                  transition: 'all 100ms',
                }}
              >
                <MIcon size={10} /> {m.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loot mode: material fields */}
      {mode === 'LOOT' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input style={{ ...inputStyle, flex: 2 }} value={materialName}
            onChange={e => setMaterialName(e.target.value)} placeholder="Material name…"
            onKeyDown={handleKeyDown} disabled={posting} />
          <input style={{ ...inputStyle, width: 80, flex: 0 }} type="number" min="0" step="0.1"
            value={quantityScu} onChange={e => setQuantityScu(e.target.value)} placeholder="SCU"
            onKeyDown={handleKeyDown} disabled={posting} />
          <input style={{ ...inputStyle, width: 70, flex: 0 }} type="number" min="0" max="1000"
            value={qualityScore} onChange={e => setQualityScore(e.target.value)} placeholder="Quality"
            onKeyDown={handleKeyDown} disabled={posting} />
        </div>
      )}

      {/* Main input row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Mode toggle button */}
        <button onClick={() => setShowModes(!showModes)} style={{
          width: 32, height: 32, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg2)', border: `0.5px solid ${showModes ? activeCfg.color : 'var(--b1)'}`,
          borderRadius: 'var(--r-md)', cursor: 'pointer', color: activeCfg.color,
          transition: 'all 100ms',
        }}>
          {showModes ? <ChevronUp size={12} /> : <ActiveIcon size={12} />}
        </button>

        {/* Message input (hidden for LOOT if material fields shown) */}
        {mode !== 'LOOT' ? (
          <input style={inputStyle} value={message} onChange={e => setMessage(e.target.value)}
            placeholder={mode === 'STATUS' ? 'Status update…' : mode === 'THREAT' ? 'Describe threat…' : mode === 'KEY_EVENT' ? 'Key event…' : 'Log a note…'}
            onKeyDown={handleKeyDown} disabled={posting} />
        ) : (
          <input style={inputStyle} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Optional note…" onKeyDown={handleKeyDown} disabled={posting} />
        )}

        {/* Severity toggle for KEY_EVENT */}
        {mode === 'KEY_EVENT' && (
          <button onClick={() => setSeverity(s => s === 'INFO' ? 'WARN' : s === 'WARN' ? 'CRITICAL' : 'INFO')}
            style={{
              height: 32, padding: '0 8px', flexShrink: 0, fontSize: 8, letterSpacing: '0.08em',
              background: severity === 'CRITICAL' ? 'rgba(192,57,43,0.15)' : severity === 'WARN' ? 'rgba(200,170,100,0.12)' : 'var(--bg2)',
              border: `0.5px solid ${severity === 'CRITICAL' ? 'var(--danger)' : severity === 'WARN' ? 'var(--warn)' : 'var(--b1)'}`,
              borderRadius: 'var(--r-md)', cursor: 'pointer',
              color: severity === 'CRITICAL' ? 'var(--danger)' : severity === 'WARN' ? 'var(--warn)' : 'var(--t2)',
            }}>
            {severity}
          </button>
        )}

        {/* Send */}
        <button onClick={submit} disabled={!canSubmit()} style={{
          width: 32, height: 32, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: canSubmit() ? 'var(--bg3)' : 'var(--bg2)',
          border: `0.5px solid ${canSubmit() ? 'var(--b2)' : 'var(--b1)'}`,
          borderRadius: 'var(--r-md)',
          cursor: canSubmit() ? 'pointer' : 'not-allowed',
          color: canSubmit() ? 'var(--t0)' : 'var(--t3)',
          opacity: canSubmit() ? 1 : 0.4,
          transition: 'all 100ms',
        }}>
          <Send size={11} />
        </button>
      </div>
    </div>
  );
}