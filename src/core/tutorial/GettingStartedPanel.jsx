/**
 * GettingStartedPanel — Collapsible checklist panel shown in the sidebar area.
 * Tracks user progress through recommended first actions with categories,
 * progress visualization, and celebrate-on-complete animation.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GETTING_STARTED_ITEMS, CATEGORIES } from './tutorialSteps';
import { Check, ChevronDown, ChevronUp, Play, RotateCcw, X, Sparkles } from 'lucide-react';

function ChecklistItem({ item, completed, onToggle, onNavigate }) {
  const cat = CATEGORIES[item.category] || CATEGORIES.SETUP;

  return (
    <button
      onClick={() => {
        if (!completed && item.route) {
          onNavigate(item.route);
        }
        onToggle(item.id);
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '7px 12px',
        background: completed ? 'rgba(46,219,122,0.02)' : 'transparent',
        border: 'none',
        borderBottom: '0.5px solid rgba(200,170,100,0.03)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = completed ? 'rgba(46,219,122,0.04)' : 'rgba(200,170,100,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = completed ? 'rgba(46,219,122,0.02)' : 'transparent'; }}
      title={completed ? `✓ ${item.label} — click to undo` : item.description}
    >
      {/* Checkbox */}
      <div style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        border: `0.5px solid ${completed ? '#2edb7a' : 'rgba(200,170,100,0.18)'}`,
        background: completed ? 'rgba(46,219,122,0.15)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
        transition: 'all 200ms',
      }}>
        {completed && <Check size={9} style={{ color: '#2edb7a' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10,
          color: completed ? '#5A5850' : '#E8E4DC',
          textDecoration: completed ? 'line-through' : 'none',
          lineHeight: 1.3,
        }}>
          {item.label}
        </div>
        {!completed && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 8,
            color: '#4A4640',
            marginTop: 1,
            lineHeight: 1.3,
          }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Category dot */}
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: cat.color,
          flexShrink: 0,
          marginTop: 6,
          opacity: completed ? 0.3 : 0.8,
        }}
        title={cat.label}
      />
    </button>
  );
}

export default function GettingStartedPanel({
  completedItems,
  progress,
  completedCount,
  totalItems,
  onCompleteItem,
  onStartTour,
  onDismiss,
  onReset,
  dismissed,
  tourComplete,
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(!tourComplete);
  const [showAll, setShowAll] = useState(false);

  // Always hide when explicitly dismissed
  if (dismissed) return null;

  const allDone = progress >= 100;
  const incompleteItems = GETTING_STARTED_ITEMS.filter(i => !completedItems.includes(i.id));
  const displayItems = showAll
    ? GETTING_STARTED_ITEMS
    : (allDone ? GETTING_STARTED_ITEMS.slice(0, 3) : incompleteItems.slice(0, 5));

  return (
    <div style={{
      margin: '6px 10px',
      borderRadius: 4,
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      overflow: 'hidden',
      animation: 'nexus-fade-in 200ms ease-out both',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {allDone ? (
          <Sparkles size={9} style={{ color: '#2edb7a', flexShrink: 0 }} />
        ) : (
          <span style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#C0392B',
            animation: 'pulse 2.5s ease-in-out infinite',
            flexShrink: 0,
          }} />
        )}
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          color: allDone ? '#2edb7a' : '#C8A84B',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          flex: 1,
          textAlign: 'left',
          fontWeight: 600,
        }}>
          {allDone ? 'ALL DONE!' : 'GETTING STARTED'}
        </span>

        {/* Progress count */}
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          color: allDone ? '#2edb7a' : '#5A5850',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {completedCount}/{totalItems}
        </span>

        {expanded ? <ChevronUp size={9} style={{ color: '#5A5850' }} /> : <ChevronDown size={9} style={{ color: '#5A5850' }} />}
      </button>

      {/* Progress bar — always visible */}
      <div style={{
        height: 2,
        background: 'rgba(200,170,100,0.04)',
        margin: '0 10px 2px',
        borderRadius: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: allDone ? '#2edb7a' : '#C0392B',
          borderRadius: 1,
          transition: 'width 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background 300ms ease',
        }} />
      </div>

      {expanded && (
        <div style={{ paddingTop: 4, paddingBottom: 2 }}>
          {/* Tour button — always accessible */}
          <button
            onClick={onStartTour}
            style={{
              width: 'calc(100% - 20px)',
              margin: '2px 10px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '6px 10px',
              background: tourComplete
                ? 'rgba(200,170,100,0.04)'
                : 'linear-gradient(135deg, rgba(192,57,43,0.1) 0%, rgba(192,57,43,0.04) 100%)',
              border: `0.5px solid ${tourComplete ? 'rgba(200,170,100,0.1)' : 'rgba(192,57,43,0.25)'}`,
              borderRadius: 3,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9,
              fontWeight: 600,
              color: tourComplete ? '#9A9488' : '#C0392B',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = tourComplete ? 'rgba(200,170,100,0.06)' : 'rgba(192,57,43,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = tourComplete ? 'rgba(200,170,100,0.04)' : 'linear-gradient(135deg, rgba(192,57,43,0.1) 0%, rgba(192,57,43,0.04) 100%)'; }}
            title={tourComplete ? 'Replay the guided tour of all modules' : 'Start the interactive guided tour'}
          >
            {tourComplete ? <RotateCcw size={9} /> : <Play size={9} />}
            {tourComplete ? 'REPLAY TOUR' : 'START GUIDED TOUR'}
          </button>

          {/* Category legend */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '2px 10px 4px',
            flexWrap: 'wrap',
          }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}>
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: cat.color,
                  opacity: 0.7,
                }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 7,
                  color: '#4A4640',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Items */}
          {displayItems.map(item => (
            <ChecklistItem
              key={item.id}
              item={item}
              completed={completedItems.includes(item.id)}
              onToggle={onCompleteItem}
              onNavigate={navigate}
            />
          ))}

          {/* Show all / less toggle */}
          {GETTING_STARTED_ITEMS.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                width: '100%',
                padding: '5px 10px',
                background: 'none',
                border: 'none',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 8,
                color: '#4A4640',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4A4640'; }}
            >
              {showAll ? '↑ SHOW LESS' : `↓ SHOW ALL ${GETTING_STARTED_ITEMS.length} ITEMS`}
            </button>
          )}

          {/* Dismiss */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '3px 10px 4px',
          }}>
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 8,
                color: '#4A4640',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 4px',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4A4640'; }}
              title="Hide this panel — reopen via the help button"
            >
              <X size={7} /> DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}