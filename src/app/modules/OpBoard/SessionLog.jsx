/**
 * SessionLog — scrollable op event feed with manual entry.
 * Props: { op, callsign, onUpdate }
 *
 * session_log entries: { t, type, author, text, severity?, location? }
 * Entry types: MANUAL, PHASE_ADVANCE, THREAT, THREAT_RESOLVED,
 *              MATERIAL, CRAFT, PING
 * Auto-scrolls to bottom on new entry.
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send } from 'lucide-react';

// ─── Type icons (text-based to avoid SVG complexity) ─────────────────────────

const TYPE_ICON = {
  PHASE_ADVANCE:    '▶',
  THREAT:           '⚠',
  THREAT_RESOLVED:  '✓',
  MATERIAL:         '◈',
  CRAFT:            '⚙',
  PING:             '◉',
  MANUAL:           '·',
};

const TYPE_COLOR = {
  PHASE_ADVANCE:    'var(--info)',
  THREAT:           'var(--danger)',
  THREAT_RESOLVED:  'var(--live)',
  MATERIAL:         'var(--acc2)',
  CRAFT:            'var(--acc)',
  PING:             'var(--warn)',
  MANUAL:           'var(--t2)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Single log entry ─────────────────────────────────────────────────────────

function LogEntry({ entry }) {
  const type  = entry.type || 'MANUAL';
  const icon  = TYPE_ICON[type]  || '·';
  const color = TYPE_COLOR[type] || 'var(--t2)';

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 7,
      padding: '5px 0', borderBottom: '0.5px solid var(--b0)',
    }}>
      {/* Timestamp */}
      <span style={{
        color: 'var(--t3)', fontSize: 9, flexShrink: 0,
        fontVariantNumeric: 'tabular-nums', minWidth: 28,
      }}>
        {relativeTime(entry.t)}
      </span>

      {/* Type icon */}
      <span style={{ color, fontSize: 10, flexShrink: 0, width: 12, textAlign: 'center' }}>
        {icon}
      </span>

      {/* Author */}
      {entry.author && (
        <span style={{ color: 'var(--acc)', fontSize: 10, flexShrink: 0, letterSpacing: '0.04em' }}>
          {entry.author}
        </span>
      )}

      {/* Text */}
      <span style={{ color: 'var(--t1)', fontSize: 11, flex: 1, lineHeight: 1.4 }}>
        {entry.text}
      </span>
    </div>
  );
}

// ─── SessionLog ───────────────────────────────────────────────────────────────

export default function SessionLog({ op, callsign, onUpdate }) {
  const [input, setInput]     = useState('');
  const [posting, setPosting] = useState(false);
  const scrollRef             = useRef(null);
  const entries               = Array.isArray(op.session_log) ? op.session_log : [];

  // Auto-scroll to bottom when entries change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  const submit = async () => {
    const text = input.trim();
    if (!text) return;
    setPosting(true);

    const entry = {
      t:      new Date().toISOString(),
      type:   'MANUAL',
      author: callsign,
      text,
    };
    const newLog = [...entries, entry];

    try {
      await base44.entities.Op.update(op.id, { session_log: newLog });
      setInput('');
      onUpdate?.(newLog);
    } catch (e) {
      console.error('[SessionLog] submit failed:', e);
    }
    setPosting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 200 }}>
      {/* Feed */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '6px 0', minHeight: 120 }}
      >
        {entries.length === 0 ? (
          <div style={{ color: 'var(--t3)', fontSize: 11, textAlign: 'center', padding: '16px 0' }}>
            No entries yet
          </div>
        ) : (
          entries.map((e, i) => <LogEntry key={i} entry={e} />)
        )}
      </div>

      {/* Manual entry */}
      <div style={{
        display: 'flex', gap: 6, paddingTop: 8,
        borderTop: '0.5px solid var(--b1)',
      }}>
        <input
          className="nexus-input"
          style={{ flex: 1, fontSize: 11, padding: '5px 10px' }}
          placeholder="Add log entry..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          disabled={posting}
        />
        <button
          onClick={submit}
          disabled={posting || !input.trim()}
          className="nexus-btn"
          style={{ padding: '5px 10px', fontSize: 10, flexShrink: 0, opacity: posting ? 0.6 : 1 }}
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  );
}
