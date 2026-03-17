/**
 * SessionLog — SESSION LOG tab for LiveOp
 * Scrollable chronological log of all op events. Op Leaders can add entries.
 */
import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/core/data/base44Client';

const ENTRY_COLORS = {
  phase_brief:   'var(--warn)',
  threat:        'var(--danger)',
  system:        'var(--info)',
  supply_chain:  'var(--acc)',
  note:          'var(--t1)',
};

function entryColor(entry) {
  return ENTRY_COLORS[entry.type] || ENTRY_COLORS.note;
}

function formatTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function SessionLog({ op, callsign, canLead, onUpdate }) {
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef(null);

  const entries = (op.session_log || []).filter(e => e.type !== 'supply_chain');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const handlePost = async () => {
    if (!input.trim()) return;
    setPosting(true);
    const newEntry = {
      type: 'note',
      t: new Date().toISOString(),
      author: callsign,
      text: input.trim(),
    };
    const updated = [...(op.session_log || []), newEntry];
    await base44.entities.Op.update(op.id, { session_log: updated });
    onUpdate && onUpdate({ ...op, session_log: updated });
    setInput('');
    setPosting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 16px 12px' }}>
      {/* Log entries */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12 }}>
        {entries.length === 0 && (
          <div style={{ color: 'var(--t2)', fontSize: 11, textAlign: 'center', padding: '32px 0' }}>
            No log entries yet
          </div>
        )}
        {entries.map((entry, i) => {
          const color = entryColor(entry);
          const isSystem = entry.author === 'NEXUSOS' || entry.type === 'system' || entry.type === 'phase_brief';
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '5px 0',
              borderBottom: '0.5px solid var(--b0)',
            }}>
              <span style={{ color: 'var(--t3)', fontSize: 9, fontVariantNumeric: 'tabular-nums', flexShrink: 0, paddingTop: 1, minWidth: 38 }}>
                {formatTime(entry.t)}
              </span>
              <div style={{ width: '0.5px', background: color, flexShrink: 0, alignSelf: 'stretch', marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {!isSystem && entry.author && (
                  <span style={{ color: 'var(--acc2)', fontSize: 9, marginRight: 6 }}>{entry.author}</span>
                )}
                {isSystem && (
                  <span style={{ color: color, fontSize: 9, marginRight: 6, letterSpacing: '0.06em' }}>
                    {entry.type === 'phase_brief' ? 'PHASE BRIEF' : 'SYSTEM'}
                  </span>
                )}
                <span style={{ color: isSystem ? color : 'var(--t1)', fontSize: 11 }}>{entry.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canLead && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexShrink: 0 }}>
          <input
            className="nexus-input"
            style={{ flex: 1, fontSize: 11 }}
            placeholder="Log an entry..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handlePost(); }}
            disabled={posting}
          />
          <button
            onClick={handlePost}
            disabled={posting || !input.trim()}
            className="nexus-btn"
            style={{ padding: '6px 14px', fontSize: 10, opacity: input.trim() ? 1 : 0.4 }}
          >
            POST
          </button>
        </div>
      )}
    </div>
  );
}