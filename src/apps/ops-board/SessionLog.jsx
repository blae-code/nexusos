/**
 * SessionLog — scrollable op event feed with manual entry.
 * Props: { op, callsign, onUpdate }
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/core/data/base44Client';
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

const SCOUT_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

export default function SessionLog({ op, callsign, rank, onUpdate }) {
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [showNewEntries, setShowNewEntries] = useState(false);
  const scrollRef = useRef(null);
  const prevLengthRef = useRef(0);
  const entries = Array.isArray(op.session_log) ? op.session_log : [];

  useEffect(() => {
    // Only auto-scroll if user is within 80px of the bottom
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

      if (entries.length > prevLengthRef.current && isNearBottom) {
        // New entry and user is near bottom — scroll to bottom
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 0);
        setShowNewEntries(false);
      } else if (entries.length > prevLengthRef.current && !isNearBottom) {
        // New entry but user has scrolled up — show "new entries" pill
        setShowNewEntries(true);
      }

      prevLengthRef.current = entries.length;
    }
  }, [entries.length]);

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowNewEntries(false);
    }
  };

  const submit = async () => {
    const text = input.trim();
    if (!text) return;
    setPosting(true);

    const entry = {
      t: new Date().toISOString(),
      type: 'MANUAL',
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      <style>{`
        @keyframes log-entry-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header label + entry count badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Session Log
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font)',
            color: 'var(--t3)',
            background: 'var(--bg3)',
            padding: '2px 6px',
            borderRadius: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {entries.length}
        </span>
      </div>

      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: canPost ? 8 : 0,
        }}
      >
        {entries.length === 0 ? (
          <div style={{ color: 'var(--t3)', fontSize: 11, fontFamily: 'var(--font)', textAlign: 'center', padding: '16px 0' }}>
            No entries yet
          </div>
        ) : (
          entries.map((e, i) => <LogEntry key={i} entry={e} index={i} />)
        )}
      </div>

      {/* New entries pill */}
      {showNewEntries && (
        <div style={{ position: 'absolute', bottom: canPost ? 60 : 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <button
            onClick={handleScrollToBottom}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 9,
              fontFamily: 'var(--font)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(var(--acc-rgb), 0.08)',
              border: '0.5px solid rgba(var(--acc-rgb), 0.3)',
              borderRadius: 3,
              color: 'var(--acc)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(var(--acc-rgb), 0.12)';
              e.currentTarget.style.borderColor = 'rgba(var(--acc-rgb), 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(var(--acc-rgb), 0.08)';
              e.currentTarget.style.borderColor = 'rgba(var(--acc-rgb), 0.3)';
            }}
          >
            <ChevronDown size={10} style={{ opacity: 0.7 }} />
            New entries
          </button>
        </div>
      )}

      {/* Manual entry input — SCOUT+ only */}
      {canPost && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '0.5px solid var(--b0)', flexShrink: 0 }}>
          <input
            className="nexus-input"
            style={{ flex: 1, height: 32, fontSize: 11 }}
            placeholder="Log a note..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={posting}
          />
          <button
            onClick={submit}
            disabled={posting || !input.trim()}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'var(--bg2)',
              border: '0.5px solid var(--b1)',
              borderRadius: 3,
              cursor: posting || !input.trim() ? 'not-allowed' : 'pointer',
              color: 'var(--t1)',
              opacity: posting || !input.trim() ? 0.4 : 1,
              transition: 'all 150ms ease',
              fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => {
              if (!posting && input.trim()) {
                e.currentTarget.style.background = 'var(--bg3)';
                e.currentTarget.style.borderColor = 'var(--b2)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg2)';
              e.currentTarget.style.borderColor = 'var(--b1)';
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}