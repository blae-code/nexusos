/**
 * ArchiveEntry — immersive single-entry reading view.
 * Props: entry (object), category (string), onBack, onPrev, onNext
 *
 * Categories: OP_REPORT | AFTER_ACTION | PATCH | SCOUT_INTEL | FABRICATION
 * Typewriter effect at 20ms/char; click anywhere to skip.
 * Cipher mode: encrypted entries animate garbled → readable over 2s.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RankBadge, DivisionIcon } from '@/core/design';

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_META = {
  OP_REPORT:   { label: 'OPERATION REPORT', color: 'var(--danger)', borderColor: 'rgba(var(--danger-rgb), 0.4)' },
  AFTER_ACTION:{ label: 'AFTER ACTION',     color: 'var(--warn)',   borderColor: 'rgba(var(--warn-rgb), 0.4)' },
  PATCH:       { label: 'PATCH DIGEST',     color: 'var(--info)',   borderColor: 'rgba(var(--info-rgb), 0.4)' },
  SCOUT_INTEL: { label: 'SCOUT INTEL',      color: 'var(--live)',   borderColor: 'rgba(var(--live-rgb), 0.4)' },
  FABRICATION: { label: 'FABRICATION LOG',  color: 'var(--acc2)',   borderColor: 'rgba(var(--acc2-rgb), 0.4)' },
};

const CIPHER_CHARS = '!@#$%^&*<>?/\\|[]{}0123456789ABCDEF';

function randomCipher(len) {
  return Array.from({ length: len }, () =>
    CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
  ).join('');
}

// ─── Immersive category decorations ──────────────────────────────────────────

function OpReportDecoration() {
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.04, pointerEvents: 'none', overflow: 'hidden', width: 200, height: 200 }}>
      <svg viewBox="0 0 200 200" width={200} height={200} fill="none" stroke="var(--danger)" strokeWidth="0.5">
        <circle cx="100" cy="100" r="90" />
        <circle cx="100" cy="100" r="60" />
        <circle cx="100" cy="100" r="10" />
        <line x1="100" y1="10" x2="100" y2="190" />
        <line x1="10" y1="100" x2="190" y2="100" />
        <line x1="36.4" y1="36.4" x2="163.6" y2="163.6" />
        <line x1="163.6" y1="36.4" x2="36.4" y2="163.6" />
      </svg>
    </div>
  );
}

function AfterActionDecoration() {
  return (
    <div style={{ position: 'absolute', bottom: 32, right: 0, opacity: 0.05, pointerEvents: 'none' }}>
      <svg viewBox="0 0 180 60" width={180} height={60} fill="none" stroke="var(--warn)" strokeWidth="0.5">
        <line x1="0" y1="30" x2="180" y2="30" />
        <line x1="20" y1="10" x2="20" y2="50" />
        <line x1="60" y1="5" x2="60" y2="55" />
        <line x1="100" y1="15" x2="100" y2="45" />
        <line x1="140" y1="8" x2="140" y2="52" />
        <polyline points="0,40 20,20 60,35 100,18 140,28 180,10" />
      </svg>
    </div>
  );
}

function PatchDecoration() {
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.04, pointerEvents: 'none' }}>
      <svg viewBox="0 0 160 80" width={160} height={80} fill="none" stroke="var(--info)" strokeWidth="0.4">
        {[0,1,2,3,4].map(i => (
          <rect key={i} x={10 + i*30} y={10 + i*5} width={20} height={60 - i*10} rx="1" />
        ))}
      </svg>
    </div>
  );
}

function ScoutIntelDecoration({ system }) {
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.05, pointerEvents: 'none', width: 140, height: 140 }}>
      <svg viewBox="0 0 140 140" width={140} height={140} fill="none" stroke="var(--live)" strokeWidth="0.4">
        <circle cx="70" cy="70" r="60" strokeDasharray="4 6" />
        <circle cx="70" cy="70" r="35" />
        <circle cx="70" cy="70" r="4" />
        <line x1="70" y1="10" x2="70" y2="35" />
        <line x1="70" y1="105" x2="70" y2="130" />
        <line x1="10" y1="70" x2="35" y2="70" />
        <line x1="105" y1="70" x2="130" y2="70" />
        {system && <text x="70" y="73" textAnchor="middle" fontSize="7" fill="var(--live)" fontFamily="var(--font)">{system}</text>}
      </svg>
    </div>
  );
}

function FabricationDecoration() {
  return (
    <div style={{ position: 'absolute', bottom: 16, right: 0, opacity: 0.05, pointerEvents: 'none' }}>
      <svg viewBox="0 0 120 48" width={120} height={48} fill="none" stroke="var(--acc2)" strokeWidth="0.5">
        <rect x="4" y="20" width="16" height="24" rx="1" />
        <rect x="24" y="12" width="16" height="32" rx="1" />
        <rect x="44" y="4" width="16" height="40" rx="1" />
        <rect x="64" y="16" width="16" height="28" rx="1" />
        <rect x="84" y="8" width="16" height="36" rx="1" />
        <rect x="104" y="20" width="12" height="24" rx="1" />
      </svg>
    </div>
  );
}

// ─── Cipher text hook ─────────────────────────────────────────────────────────

function useCipherReveal(text, enabled) {
  const [displayed, setDisplayed] = useState(enabled ? randomCipher(text.length) : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); setDone(true); return; }
    let frame = 0;
    const total = 18; // steps to full reveal
    const id = setInterval(() => {
      frame++;
      const progress = frame / total;
      const revealedCount = Math.floor(progress * text.length);
      const cipher = text.slice(0, revealedCount) +
        randomCipher(text.length - revealedCount);
      setDisplayed(cipher);
      if (frame >= total) {
        setDisplayed(text);
        setDone(true);
        clearInterval(id);
      }
    }, 110);
    return () => clearInterval(id);
  }, [text, enabled]);

  return { displayed, done };
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(body, skip) {
  const [chars, setChars] = useState(0);
  const skipRef = useRef(skip);
  skipRef.current = skip;

  useEffect(() => {
    setChars(0);
    if (!body) return;
    const id = setInterval(() => {
      if (skipRef.current) {
        setChars(body.length);
        clearInterval(id);
        return;
      }
      setChars(prev => {
        if (prev >= body.length) { clearInterval(id); return prev; }
        return prev + 1;
      });
    }, 20);
    return () => clearInterval(id);
  }, [body]);

  return chars >= (body?.length || 0) ? body : body?.slice(0, chars);
}

// ─── Tactical divider (used in Guide entries) ────────────────────────────────

function TacticalDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 16px' }}>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b2)' }} />
      {label && (
        <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--t3)', fontFamily: 'var(--font)', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b2)' }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ArchiveEntry({ entry = {}, category = 'OP_REPORT', onBack, onPrev, onNext }) {
  const [skipped, setSkipped] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const scrollRef = useRef(null);
  const meta = CATEGORY_META[category] || CATEGORY_META.OP_REPORT;

  const isEncrypted = entry.encrypted === true;
  const bodyText = entry.body || entry.summary || entry.content || entry.wrap_up || '';
  const titleText = entry.title || entry.name || entry.op_name || 'UNTITLED';
  const authorCallsign = entry.author_callsign || entry.created_by_callsign || entry.callsign || '—';
  const authorRank = entry.author_rank || entry.rank || 'SCOUT';
  const entryDate = entry.date || entry.created_date || entry.start_date || null;

  const { displayed: cipherTitle, done: titleReady } = useCipherReveal(titleText, isEncrypted);
  const displayedBody = useTypewriter(isEncrypted ? (titleReady ? bodyText : '') : bodyText, skipped);

  // Show nav arrows when scrolled to 80%
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
      if (ratio >= 0.8) setShowNav(true);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-show nav for short entries
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 20) setShowNav(true);
  }, [displayedBody]);

  const handleSkip = useCallback(() => setSkipped(true), []);

  const decorations = {
    OP_REPORT:   <OpReportDecoration />,
    AFTER_ACTION:<AfterActionDecoration />,
    PATCH:       <PatchDecoration />,
    SCOUT_INTEL: <ScoutIntelDecoration system={entry.system} />,
    FABRICATION: <FabricationDecoration />,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg0)',
        fontFamily: 'var(--font)',
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={!skipped ? handleSkip : undefined}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderBottom: '0.5px solid var(--b1)',
        flexShrink: 0,
        zIndex: 2,
      }}>
        {onBack && (
          <button
            onClick={e => { e.stopPropagation(); onBack(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 11, padding: '2px 6px', marginRight: 4 }}
          >
            ← BACK
          </button>
        )}
        <div style={{ width: 3, height: 20, background: meta.color, flexShrink: 0 }} />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: meta.color, textTransform: 'uppercase' }}>
          {meta.label}
        </span>
        {entryDate && (
          <span style={{ fontSize: 9, color: 'var(--t3)', marginLeft: 'auto' }}>
            {new Date(entryDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Scroll body */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 32px',
          position: 'relative',
        }}
      >
        {/* Category decoration (positioned in corner) */}
        {decorations[category]}

        {/* Title */}
        <h1 style={{
          fontSize: 18,
          color: 'var(--t0)',
          fontFamily: 'var(--font)',
          fontWeight: 500,
          letterSpacing: '0.04em',
          marginBottom: 16,
          lineHeight: 1.3,
          position: 'relative',
          zIndex: 1,
          filter: isEncrypted && !titleReady ? 'blur(1px)' : 'none',
          transition: 'filter 0.4s ease',
        }}>
          {cipherTitle}
        </h1>

        {/* Meta row: author + rank + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          <RankBadge rank={authorRank} size={14} />
          <span style={{ fontSize: 11, color: 'var(--t1)', letterSpacing: '0.06em' }}>{authorCallsign}</span>

          {entry.op_type && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 9 }}>·</span>
              <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{entry.op_type}</span>
            </>
          )}
          {entry.crew_count != null && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 9 }}>·</span>
              <span style={{ fontSize: 9, color: 'var(--t3)' }}>{entry.crew_count} CREW</span>
            </>
          )}
          {entry.haul_value != null && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 9 }}>·</span>
              <span style={{ fontSize: 9, color: 'var(--live)' }}>⬡ {Number(entry.haul_value).toLocaleString()} aUEC</span>
            </>
          )}
          {entry.outcome && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 9 }}>·</span>
              <span style={{
                fontSize: 8,
                letterSpacing: '0.1em',
                padding: '2px 6px',
                border: '0.5px solid var(--b2)',
                color: entry.outcome === 'SUCCESS' ? 'var(--live)' : 'var(--danger)',
              }}>
                {entry.outcome}
              </span>
            </>
          )}
        </div>

        {/* Category-specific header (pull-quote style) */}
        {category === 'AFTER_ACTION' && entry.lesson && (
          <div style={{
            borderLeft: `3px solid ${meta.color}`,
            paddingLeft: 16,
            marginBottom: 24,
            fontStyle: 'italic',
            color: 'var(--t1)',
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            {entry.lesson}
          </div>
        )}

        {category === 'PATCH' && entry.version && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            border: `0.5px solid ${meta.color}`,
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 9, color: meta.color, letterSpacing: '0.12em' }}>PATCH {entry.version}</span>
            {entry.live_date && (
              <span style={{ fontSize: 9, color: 'var(--t3)' }}>LIVE {new Date(entry.live_date).toLocaleDateString('en-GB')}</span>
            )}
          </div>
        )}

        {/* Guide tactical dividers — injected into body before rendering */}
        {category === 'OP_REPORT' && (
          <>
            <TacticalDivider label="MISSION DEBRIEF" />
          </>
        )}

        {/* Body text with typewriter */}
        {bodyText ? (
          <div style={{
            fontSize: 12,
            color: 'var(--t1)',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font)',
          }}>
            {displayedBody}
            {displayedBody && displayedBody.length < bodyText.length && (
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 13,
                background: 'var(--t1)',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'cursor-blink 1s step-end infinite',
              }} />
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--t3)', fontStyle: 'italic' }}>No content recorded.</div>
        )}

        {/* Session phases (Op reports) */}
        {category === 'OP_REPORT' && entry.phases?.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <TacticalDivider label="PHASES" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entry.phases.map((ph, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 20, height: 20, border: '0.5px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--t0)', letterSpacing: '0.06em' }}>{ph.name || `PHASE ${i + 1}`}</div>
                    {ph.notes && <div style={{ fontSize: 9, color: 'var(--t2)', marginTop: 2 }}>{ph.notes}</div>}
                  </div>
                  {ph.duration_min && (
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>{ph.duration_min}m</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Encrypted overlay */}
        {isEncrypted && !titleReady && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(var(--bg0-rgb), 0.85)',
            zIndex: 3,
          }}>
            <span style={{ fontSize: 9, color: 'var(--warn)', letterSpacing: '0.18em', animation: 'archive-decrypt-pulse 0.8s ease-in-out infinite' }}>
              DECRYPTING…
            </span>
          </div>
        )}

        {/* Bottom padding for nav arrow space */}
        <div style={{ height: 80 }} />
      </div>

      {/* Nav arrows — appear at 80% scroll */}
      {showNav && (onPrev || onNext) && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: 'linear-gradient(to top, var(--bg0) 60%, transparent)',
          pointerEvents: 'none',
          zIndex: 4,
        }}>
          <button
            onClick={e => { e.stopPropagation(); onPrev?.(); }}
            disabled={!onPrev}
            style={{
              pointerEvents: 'all',
              background: 'none',
              border: '0.5px solid var(--b2)',
              color: onPrev ? 'var(--t1)' : 'var(--b2)',
              cursor: onPrev ? 'pointer' : 'default',
              fontSize: 10,
              padding: '6px 14px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font)',
            }}
          >
            ← PREV
          </button>
          <button
            onClick={e => { e.stopPropagation(); onNext?.(); }}
            disabled={!onNext}
            style={{
              pointerEvents: 'all',
              background: 'none',
              border: '0.5px solid var(--b2)',
              color: onNext ? 'var(--t1)' : 'var(--b2)',
              cursor: onNext ? 'pointer' : 'default',
              fontSize: 10,
              padding: '6px 14px',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font)',
            }}
          >
            NEXT →
          </button>
        </div>
      )}

      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes archive-decrypt-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
