/**
 * GettingStartedBanner — Slim, non-intrusive banner at top of main content.
 * Collapsed by default to a single row. Expands on click to show checklist.
 * Once dismissed, it never reappears unless user explicitly re-enables via the help button.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GETTING_STARTED_ITEMS, CATEGORIES } from './tutorialSteps';
import { Check, ChevronDown, ChevronUp, Play, RotateCcw, X, ArrowRight } from 'lucide-react';

function ChecklistItem({ item, completed, onToggle, onNavigate }) {
  const cat = CATEGORIES[item.category] || CATEGORIES.SETUP;

  return (
    <button
      onClick={() => {
        if (!completed && item.route) onNavigate(item.route);
        onToggle(item.id);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        background: completed ? 'rgba(46,219,122,0.03)' : 'var(--bg2)',
        border: `0.5px solid ${completed ? 'rgba(46,219,122,0.1)' : 'var(--b1)'}`,
        borderRadius: 5,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 150ms',
        minWidth: 0,
      }}
      onMouseEnter={e => { if (!completed) { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.background = 'var(--bg3)'; } }}
      onMouseLeave={e => { if (!completed) { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.background = 'var(--bg2)'; } }}
    >
      {/* Checkbox */}
      <div style={{
        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
        border: `1px solid ${completed ? '#2edb7a' : 'var(--b2)'}`,
        background: completed ? 'rgba(46,219,122,0.12)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 200ms',
      }}>
        {completed && <Check size={10} style={{ color: '#2edb7a' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500,
          color: completed ? 'var(--t3)' : 'var(--t0)',
          textDecoration: completed ? 'line-through' : 'none',
          lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{item.label}</span>
          {!completed && item.route && <ArrowRight size={10} style={{ color: 'var(--t3)', flexShrink: 0 }} />}
        </div>
        {!completed && (
          <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2, lineHeight: 1.45 }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Category indicator */}
      <div style={{
        fontSize: 8, color: cat.color, opacity: completed ? 0.3 : 0.6,
        letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
        fontWeight: 600,
      }}>
        {item.category === 'SETUP' ? 'SETUP' : item.category === 'EXPLORE' ? 'EXPLORE' : 'DO'}
      </div>
    </button>
  );
}

export default function GettingStartedBanner({ tutorial }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const {
    completedItems, progress, completedCount, totalItems,
    completeItem, startTour, dismissChecklist, tourComplete,
  } = tutorial;

  const incompleteItems = GETTING_STARTED_ITEMS.filter(i => !completedItems.includes(i.id));
  const allDone = progress >= 100;

  const handleDismiss = () => {
    setDismissing(true);
    // Animate out then dismiss permanently
    setTimeout(() => dismissChecklist(), 200);
  };

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--bg1)',
      borderBottom: expanded ? '0.5px solid var(--b1)' : 'none',
      overflow: 'hidden',
      transition: 'max-height 250ms ease, opacity 200ms ease',
      maxHeight: dismissing ? 0 : expanded ? 600 : 44,
      opacity: dismissing ? 0 : 1,
    }}>
      {/* Collapsed header — always visible */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px',
          height: 44,
          cursor: 'pointer',
          borderBottom: '0.5px solid var(--b0)',
          transition: 'background 150ms',
        }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Mini progress bar */}
        <div style={{
          width: 60, height: 3, borderRadius: 2,
          background: 'var(--b1)', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${progress}%`,
            background: allDone ? '#2edb7a' : '#C0392B',
            transition: 'width 500ms ease',
          }} />
        </div>

        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', letterSpacing: '0.04em' }}>
          Getting Started
        </span>

        <span style={{ fontSize: 10, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
          {completedCount}/{totalItems}
        </span>

        {!allDone && incompleteItems.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            — next: {incompleteItems[0].label}
          </span>
        )}

        {allDone && (
          <span style={{ fontSize: 10, color: '#2edb7a', fontWeight: 600 }}>All complete!</span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Tour button inline */}
          <button
            onClick={e => { e.stopPropagation(); startTour(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 3,
              background: 'transparent',
              border: '0.5px solid var(--b2)',
              fontSize: 9, fontWeight: 600, color: 'var(--t2)',
              letterSpacing: '0.06em', cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t0)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t2)'; }}
          >
            {tourComplete ? <RotateCcw size={9} /> : <Play size={9} />}
            {tourComplete ? 'REPLAY' : 'TOUR'}
          </button>

          {/* Expand/collapse chevron */}
          <div style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {/* Dismiss */}
          <button
            onClick={e => { e.stopPropagation(); handleDismiss(); }}
            style={{
              width: 22, height: 22, borderRadius: 3,
              background: 'transparent', border: '0.5px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--t3)', cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger-b)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'transparent'; }}
            title="Dismiss permanently — reopen via the help button (bottom-right)"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Expanded checklist */}
      {expanded && (
        <div style={{ padding: '12px 20px 16px', animation: 'nexus-fade-in 150ms ease-out both' }}>
          {/* Category legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: cat.color, opacity: 0.6 }} />
                <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 6,
          }}>
            {GETTING_STARTED_ITEMS.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                completed={completedItems.includes(item.id)}
                onToggle={completeItem}
                onNavigate={navigate}
              />
            ))}
          </div>

          {/* Dismiss hint */}
          <div style={{
            marginTop: 10, fontSize: 9, color: 'var(--t3)', textAlign: 'center',
            letterSpacing: '0.06em',
          }}>
            Dismiss this banner with ✕. You can always re-enable it from the help button.
          </div>
        </div>
      )}
    </div>
  );
}
