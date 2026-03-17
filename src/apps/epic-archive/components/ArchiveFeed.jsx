/**
 * ArchiveFeed — vertical data-vault entry feed.
 * Shows completed ops, patch digests, after-action reviews.
 * Props: entries (array), onSelectEntry, activeCategory, onCategoryChange
 *
 * Left border stripes keyed to category color.
 * DivisionIcon filter bar for op-type division filter.
 * RankBadge per entry author.
 * Hover lift + fade preview mask on long body text.
 */
import React, { useState, useMemo } from 'react';
import { RankBadge, DivisionIcon } from '@/core/design';

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'ALL',         label: 'ALL',          color: 'var(--t2)' },
  { key: 'OP_REPORT',  label: 'OPS',           color: 'var(--danger)' },
  { key: 'AFTER_ACTION',label: 'AFTER ACTION', color: 'var(--warn)' },
  { key: 'PATCH',      label: 'PATCH',         color: 'var(--info)' },
  { key: 'SCOUT_INTEL',label: 'INTEL',         color: 'var(--live)' },
  { key: 'FABRICATION',label: 'FABRICATION',   color: 'var(--acc2)' },
];

const CATEGORY_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.key, c.color]));

// Division filter maps to op_type for OP_REPORT entries
const DIVISION_FILTERS = [
  { division: 'rangers',    opType: 'ROCKBREAKER', label: 'RANGERS' },
  { division: 'rescue',     opType: 'RESCUE',      label: 'RESCUE' },
  { division: 'industrial', opType: 'MINING',      label: 'INDUSTRIAL' },
  { division: 'racing',     opType: 'RACING',      label: 'RACING' },
  { division: 'report',     opType: null,          label: 'REPORTS' },
];

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, category, onClick }) {
  const [hovered, setHovered] = useState(false);
  const borderColor = CATEGORY_COLOR[category] || 'var(--b2)';
  const bodyPreview = entry.body || entry.summary || entry.content || entry.wrap_up || '';
  const title = entry.title || entry.name || entry.op_name || 'UNTITLED';
  const authorCallsign = entry.author_callsign || entry.created_by_callsign || entry.callsign || '—';
  const authorRank = entry.author_rank || entry.rank || 'SCOUT';
  const entryDate = entry.date || entry.created_date || entry.start_date;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 0,
        cursor: 'pointer',
        borderBottom: '0.5px solid var(--b1)',
        transition: 'transform 120ms ease, background 120ms ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        background: hovered ? 'rgba(var(--bg2-rgb), 0.6)' : 'transparent',
        position: 'relative',
      }}
    >
      {/* Category stripe */}
      <div style={{
        width: 3,
        flexShrink: 0,
        background: borderColor,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 120ms ease',
      }} />

      {/* Content */}
      <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 8,
            letterSpacing: '0.12em',
            color: borderColor,
            textTransform: 'uppercase',
            fontFamily: 'var(--font)',
          }}>
            {CATEGORIES.find(c => c.key === category)?.label || category}
          </span>

          {entry.op_type && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 8 }}>·</span>
              <span style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {entry.op_type}
              </span>
            </>
          )}
          {entry.encrypted && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 8 }}>·</span>
              <span style={{ fontSize: 8, color: 'var(--warn)', letterSpacing: '0.1em' }}>ENCRYPTED</span>
            </>
          )}
          {entryDate && (
            <span style={{ fontSize: 8, color: 'var(--t3)', marginLeft: 'auto', flexShrink: 0 }}>
              {new Date(entryDate).toLocaleDateString('en-GB', { year: '2-digit', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 13,
          color: 'var(--t0)',
          fontFamily: 'var(--font)',
          fontWeight: 500,
          letterSpacing: '0.02em',
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </div>

        {/* Body preview with fade mask */}
        {bodyPreview && (
          <div style={{ position: 'relative', maxHeight: 44, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
              fontSize: 11,
              color: 'var(--t2)',
              lineHeight: 1.6,
              fontFamily: 'var(--font)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {bodyPreview.slice(0, 200)}
            </div>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 28,
              background: `linear-gradient(to bottom, transparent, ${hovered ? 'rgba(var(--bg2-rgb), 0.95)' : 'var(--bg0)'})`,
              transition: 'background 120ms ease',
            }} />
          </div>
        )}

        {/* Footer: author + rank + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <RankBadge rank={authorRank} size={12} />
          <span style={{ fontSize: 9, color: 'var(--t2)', letterSpacing: '0.06em' }}>{authorCallsign}</span>

          {entry.crew_count != null && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 8 }}>·</span>
              <span style={{ fontSize: 9, color: 'var(--t3)' }}>{entry.crew_count} CREW</span>
            </>
          )}
          {entry.haul_value != null && (
            <>
              <span style={{ color: 'var(--b2)', fontSize: 8 }}>·</span>
              <span style={{ fontSize: 9, color: 'var(--live)' }}>⬡ {Number(entry.haul_value).toLocaleString()}</span>
            </>
          )}
          {entry.outcome && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 8,
              letterSpacing: '0.1em',
              padding: '1px 5px',
              border: '0.5px solid var(--b1)',
              color: entry.outcome === 'SUCCESS' ? 'var(--live)' : 'var(--danger)',
              flexShrink: 0,
            }}>
              {entry.outcome}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ArchiveFeed({
  entries = [],
  onSelectEntry,
  activeCategory = 'ALL',
  onCategoryChange,
  loading = false,
}) {
  const [activeDivision, setActiveDivision] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let list = entries;

    // Category filter
    if (activeCategory !== 'ALL') {
      list = list.filter(e => (e.category || 'OP_REPORT') === activeCategory);
    }

    // Division filter (applies to OP_REPORT entries with op_type)
    if (activeDivision) {
      const df = DIVISION_FILTERS.find(d => d.division === activeDivision);
      if (df) {
        if (df.opType) {
          list = list.filter(e => !e.op_type || e.op_type === df.opType);
        } else {
          // 'report' division = non-OP_REPORT categories
          list = list.filter(e => (e.category || 'OP_REPORT') !== 'OP_REPORT');
        }
      }
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e => {
        const title = (e.title || e.name || e.op_name || '').toLowerCase();
        const body = (e.body || e.summary || e.content || '').toLowerCase();
        const callsign = (e.author_callsign || e.callsign || '').toLowerCase();
        return title.includes(q) || body.includes(q) || callsign.includes(q);
      });
    }

    return list;
  }, [entries, activeCategory, activeDivision, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font)' }}>

      {/* Category tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderBottom: '0.5px solid var(--b1)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange?.(cat.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeCategory === cat.key ? `2px solid ${cat.color}` : '2px solid transparent',
              color: activeCategory === cat.key ? cat.color : 'var(--t3)',
              cursor: 'pointer',
              fontSize: 9,
              letterSpacing: '0.1em',
              padding: '10px 14px',
              fontFamily: 'var(--font)',
              transition: 'color 120ms, border-color 120ms',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Division icon filter + search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '0.5px solid var(--b1)',
        flexShrink: 0,
      }}>
        {/* Division icons */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {DIVISION_FILTERS.map(df => (
            <button
              key={df.division}
              onClick={() => setActiveDivision(activeDivision === df.division ? null : df.division)}
              title={df.label}
              style={{
                background: activeDivision === df.division ? 'rgba(var(--b2-rgb), 0.3)' : 'none',
                border: `0.5px solid ${activeDivision === df.division ? 'var(--b2)' : 'transparent'}`,
                borderRadius: 3,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: activeDivision && activeDivision !== df.division ? 0.35 : 1,
                transition: 'opacity 120ms, background 120ms',
              }}
            >
              <DivisionIcon division={df.division} size={14} />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: '0.5px', height: 20, background: 'var(--b1)', flexShrink: 0 }} />

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="SEARCH ARCHIVE…"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--t1)',
            fontSize: 10,
            letterSpacing: '0.06em',
            fontFamily: 'var(--font)',
          }}
        />

        {/* Entry count */}
        <span style={{ fontSize: 9, color: 'var(--t3)', flexShrink: 0 }}>
          {filtered.length} ENTR{filtered.length === 1 ? 'Y' : 'IES'}
        </span>
      </div>

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span style={{ fontSize: 10, color: 'var(--t3)', letterSpacing: '0.12em' }}>LOADING…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '0.5px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--t3)' }}>—</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--t3)', letterSpacing: '0.1em' }}>NO ENTRIES FOUND</span>
          </div>
        ) : (
          filtered.map((entry, idx) => (
            <EntryCard
              key={entry.id || idx}
              entry={entry}
              category={entry.category || 'OP_REPORT'}
              onClick={() => onSelectEntry?.(entry, idx)}
            />
          ))
        )}
      </div>
    </div>
  );
}
