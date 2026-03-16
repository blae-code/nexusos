/**
 * LiveOpSessionLog — SESSION LOG tab for LiveOp
 * Displays all session_log entries with timestamps.
 * Op Leader can add notes; system entries rendered differently.
 */
import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const ENTRY_STYLES = {
  note:          { color: 'var(--t0)',   dot: 'var(--t2)',   label: null },
  phase_brief:   { color: 'var(--info)', dot: 'var(--info)', label: 'PHASE BRIEF' },
  supply_chain:  { color: 'var(--acc2)', dot: 'var(--acc2)', label: null }, // internal, skip rendering
  phase_change:  { color: 'var(--warn)', dot: 'var(--warn)', label: 'PHASE' },
  threat:        { color: 'var(--danger)', dot: 'var(--danger)', label: 'THREAT' },
  op_start:      { color: 'var(--live)', dot: 'var(--live)', label: 'OP START' },
  op_end:        { color: 'var(--t1)',   dot: 'var(--t1)',   label: 'OP END' },
  system:        { color: 'var(--acc2)', dot: 'var(--acc2)', label: 'SYSTEM' },
};

function formatTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function LogEntry({ entry }) {
  if (entry.type === 'supply_chain') return null; // internal state, don't display

  const style = ENTRY_STYLES[entry.type] || ENTRY_STYLES.note;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '6px 0',
      borderBottom: '0.5px solid var(--b0)',
    }}>
      {/* Time */}
      <span style={{ color: 'var(--t3)', fontSize: 9, fontVariantNumeric: 'tabular-nums', minWidth: 38, paddingTop: 1, flexShrink: 0 }}>
        {formatTime(entry.t)}
      </span>

      {/* Dot */}
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: style.dot,
        flexShrink: 0, marginTop: 4,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: entry.text ? 2 : 0 }}>
          {entry.author && (
            <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.08em' }}>{entry.author}</span>
          )}
          {style.label && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 2,
              background: 'var(--bg3)', border: '0.5px solid var(--b2)',
              color: style.color, letterSpacing: '0.1em',
            }}>
              {style.label}
            </span>
          )}
        </div>
        {entry.text && (
          <div style={{ color: style.color, fontSize: 11, lineHeight: 1.4 }}>
            {entry.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveOpSessionLog({ op, callsign, canEdit }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);

  const entries = (op.session_log || []).filter(e => e.type !== 'supply_chain');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const handleLog = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    const entry = {
      type: 'note',
      t: new Date().toISOString(),
      author: callsign || 'OP LEADER',
      text: noteText.trim(),
    };
    const updated = [...(op.session_log || []), entry];
    await base44.entities.Op.update(op.id, { session_log: updated });
    setNoteText('');
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Log entries */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 0' }}>
        {entries.length === 0 && (
          <div style={{ color: 'var(--t2)', fontSize: 11, padding: '20px 0', textAlign: 'center' }}>
            No session log entries yet
          </div>
        )}
        {entries.map((entry, i) => (
          <LogEntry key={i} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canEdit && (
        <div style={{
          borderTop: '0.5px solid var(--b1)', paddingTop: 10, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="nexus-input"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLog(); }}
              placeholder="Log a note to session…"
              style={{ flex: 1, fontSize: 11 }}
            />
            <button
              onClick={handleLog}
              disabled={saving || !noteText.trim()}
              className="nexus-btn"
              style={{ padding: '6px 12px', fontSize: 10, opacity: noteText.trim() ? 1 : 0.4 }}
            >
              LOG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}