/**
 * GettingStartedBanner — Full-width banner at the top of the main content area.
 * Much more readable than the previous cramped sidebar panel.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GETTING_STARTED_ITEMS, CATEGORIES } from './tutorialSteps';
import { Check, ChevronDown, ChevronUp, Play, RotateCcw, X } from 'lucide-react';

function ChecklistItem({ item, completed, onToggle, onNavigate }) {
  const cat = CATEGORIES[item.category] || CATEGORIES.SETUP;

  return (
    <button
      onClick={() => {
        if (!completed && item.route) onNavigate(item.route);
        onToggle(item.id);
      }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px',
        background: completed ? 'rgba(46,219,122,0.03)' : 'var(--bg2)',
        border: `0.5px solid ${completed ? 'rgba(46,219,122,0.12)' : 'var(--b1)'}`,
        borderRadius: 6,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 150ms',
        minWidth: 0,
      }}
      onMouseEnter={e => { if (!completed) e.currentTarget.style.borderColor = 'var(--b3)'; }}
      onMouseLeave={e => { if (!completed) e.currentTarget.style.borderColor = 'var(--b1)'; }}
      title={completed ? `✓ ${item.label} — click to undo` : item.description}
    >
      {/* Checkbox */}
      <div style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `1px solid ${completed ? '#2edb7a' : 'var(--b2)'}`,
        background: completed ? 'rgba(46,219,122,0.12)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 200ms',
      }}>
        {completed && <Check size={11} style={{ color: '#2edb7a' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500,
          color: completed ? 'var(--t3)' : 'var(--t0)',
          textDecoration: completed ? 'line-through' : 'none',
          lineHeight: 1.3,
        }}>
          {item.icon} {item.label}
        </div>
        {!completed && (
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3, lineHeight: 1.5 }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Category dot */}
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: cat.color, flexShrink: 0, marginTop: 7,
        opacity: completed ? 0.3 : 0.7,
      }} title={cat.label} />
    </button>
  );
}

export default function GettingStartedBanner({ tutorial }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const {
    completedItems, progress, completedCount, totalItems,
    completeItem, startTour, dismissChecklist, tourComplete,
  } = tutorial;

  const incompleteItems = GETTING_STARTED_ITEMS.filter(i => !completedItems.includes(i.id));
  const displayItems = showAll ? GETTING_STARTED_ITEMS : incompleteItems.slice(0, 6);

  return (
    <div style={{
      margin: 0,
      background: 'var(--bg1)',
      borderBottom: '0.5px solid var(--b1)',
      flexShrink: 0,
      animation: 'nexus-fade-in 200ms ease-out both',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 24px',
      }}>
        {/* Progress ring */}
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="var(--b1)" strokeWidth="2" />
            <circle
              cx="16" cy="16" r="13" fill="none"
              stroke={progress >= 100 ? '#2edb7a' : '#C0392B'}
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 16 16)"
              style={{ transition: 'stroke-dashoffset 500ms ease' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'var(--t1)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.round(progress)}%
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', letterSpacing: '0.04em' }}>
            Getting Started
          </div>
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>
            {completedCount} of {totalItems} tasks complete — {incompleteItems.length > 0
              ? `next: ${incompleteItems[0].label}`
              : 'All done!'}
          </div>
        </div>

        {/* Category legend */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color, opacity: 0.7 }} />
              <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Tour button */}
        <button
          onClick={startTour}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 4,
            background: tourComplete ? 'var(--bg2)' : 'rgba(192,57,43,0.08)',
            border: `0.5px solid ${tourComplete ? 'var(--b2)' : 'rgba(192,57,43,0.25)'}`,
            fontSize: 10, fontWeight: 600, color: tourComplete ? 'var(--t2)' : '#C0392B',
            letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0,
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = tourComplete ? 'var(--b3)' : 'rgba(192,57,43,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = tourComplete ? 'var(--b2)' : 'rgba(192,57,43,0.25)'; }}
        >
          {tourComplete ? <RotateCcw size={10} /> : <Play size={10} />}
          {tourComplete ? 'REPLAY TOUR' : 'START TOUR'}
        </button>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'var(--bg2)', border: '0.5px solid var(--b1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t3)', cursor: 'pointer', flexShrink: 0,
            transition: 'all 150ms',
          }}
          title={expanded ? 'Collapse checklist' : 'Expand checklist'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Dismiss */}
        <button
          onClick={dismissChecklist}
          style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'var(--bg2)', border: '0.5px solid var(--b1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t3)', cursor: 'pointer', flexShrink: 0,
            transition: 'all 150ms',
          }}
          title="Dismiss — reopen via Settings or Help button"
        >
          <X size={12} />
        </button>
      </div>

      {/* Expanded checklist grid */}
      {expanded && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 8,
          }}>
            {displayItems.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                completed={completedItems.includes(item.id)}
                onToggle={completeItem}
                onNavigate={navigate}
              />
            ))}
          </div>

          {/* Show all toggle */}
          {GETTING_STARTED_ITEMS.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                marginTop: 8, padding: '4px 12px',
                background: 'none', border: 'none',
                fontSize: 10, color: 'var(--t3)', letterSpacing: '0.06em',
                cursor: 'pointer', textAlign: 'center', width: '100%',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; }}
            >
              {showAll ? '↑ SHOW LESS' : `↓ SHOW ALL ${GETTING_STARTED_ITEMS.length} TASKS`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}