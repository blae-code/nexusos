/**
 * SessionLog — scrollable op event feed with manual entry.
 * Props: { op, callsign, onUpdate }
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown } from 'lucide-react';

const TYPE_DOT_COLORS = {
  PHASE_ADVANCE:    'var(--acc)',
  THREAT:           'var(--danger)',
  THREAT_RESOLVED:  'var(--live)',
  MATERIAL:         'var(--live)',
  CRAFT:            'var(--live)',
  PING:             'var(--live)',
  MANUAL:           'var(--b2)',
};

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function LogEntry({ entry, index }) {
  const type = entry.type || 'MANUAL';
  const dotColor = TYPE_DOT_COLORS[type] || 'var(--b2)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '6px 0',
        borderBottom: '0.5px solid var(--b0)',
        animation: `log-entry-in 200ms ease-out both`,
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Type dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          marginTop: 4,
        }}
      />

      {/* Timestamp */}
      <span
        style={{
          fontSize: 9,
          color: 'var(--t3)',
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          minWidth: 48,
          flexShrink: 0,
        }}
      >
        {relativeTime(entry.t)}
      </span>

      {/* Entry text */}
      <span style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'var(--font)', flex: 1, lineHeight: 1.5 }}>
        {entry.text}
      </span>
    </div>
  );
}

// ─── SessionLog ───────────────────────────────────────────────────────────────

const SCOUT_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

export default function SessionLog({ op, callsign, rank, onUpdate }) {
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
    } catch {
      setPosting(false);
    }
    setPosting(false);
  };

  const canPost = SCOUT_RANKS.includes(rank);

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

      {/* Manual entry — SCOUT+ only */}
      {canPost && (
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
      )}
    </div>
  );
}