/**
 * GettingStartedPanel — Collapsible checklist panel shown in the sidebar area.
 * Tracks user progress through recommended first actions.
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
        padding: '8px 10px',
        background: completed ? 'rgba(46,219,122,0.03)' : 'transparent',
        border: 'none',
        borderBottom: '0.5px solid rgba(200,170,100,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!completed) e.currentTarget.style.background = 'rgba(200,170,100,0.04)'; }}
      onMouseLeave={e => { if (!completed) e.currentTarget.style.background = 'transparent'; }}
      title={item.description}
    >
      {/* Checkbox */}
      <div style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: `0.5px solid ${completed ? '#2edb7a' : 'rgba(200,170,100,0.2)'}`,
        background: completed ? 'rgba(46,219,122,0.12)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
        transition: 'all 200ms',
      }}>
        {completed && <Check size={10} style={{ color: '#2edb7a' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          color: completed ? '#5A5850' : '#E8E4DC',
          textDecoration: completed ? 'line-through' : 'none',
          lineHeight: 1.3,
        }}>
          {item.label}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          color: '#5A5850',
          marginTop: 2,
          lineHeight: 1.4,
        }}>
          {item.description}
        </div>
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
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (dismissed && progress >= 100) return null;

  // Group items by category
  const grouped = {};
  for (const item of GETTING_STARTED_ITEMS) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const incompleteItems = GETTING_STARTED_ITEMS.filter(i => !completedItems.includes(i.id));
  const displayItems = showAll ? GETTING_STARTED_ITEMS : incompleteItems.slice(0, 5);

  return (
    <div style={{
      margin: '8px 12px',
      borderRadius: 4,
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.12)',
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
          gap: 8,
          padding: '10px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          color: '#C8A84B',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          flex: 1,
          textAlign: 'left',
        }}>
          GETTING STARTED
        </span>

        {/* Progress pill */}
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9,
          color: progress >= 100 ? '#2edb7a' : '#9A9488',
          fontWeight: 600,
        }}>
          {completedCount}/{totalItems}
        </span>

        {expanded ? <ChevronUp size={10} style={{ color: '#5A5850' }} /> : <ChevronDown size={10} style={{ color: '#5A5850' }} />}
      </button>

      {/* Progress bar */}
      <div style={{
        height: 2,
        background: 'rgba(200,170,100,0.06)',
        margin: '0 12px',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: progress >= 100 ? '#2edb7a' : '#C0392B',
          borderRadius: 1,
          transition: 'width 400ms ease, background 300ms ease',
        }} />
      </div>

      {expanded && (
        <div style={{ padding: '8px 0 4px' }}>
          {/* Tour button */}
          {!tourComplete && (
            <button
              onClick={onStartTour}
              style={{
                width: 'calc(100% - 24px)',
                margin: '0 12px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'linear-gradient(135deg, rgba(192,57,43,0.12) 0%, rgba(192,57,43,0.06) 100%)',
                border: '0.5px solid rgba(192,57,43,0.3)',
                borderRadius: 3,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: '#C0392B',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(192,57,43,0.12) 0%, rgba(192,57,43,0.06) 100%)'; }}
            >
              <Play size={10} />
              START GUIDED TOUR
            </button>
          )}

          {/* Category legend */}
          <div style={{
            display: 'flex',
            gap: 10,
            padding: '4px 12px 6px',
            flexWrap: 'wrap',
          }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: cat.color,
                }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 8,
                  color: '#5A5850',
                  letterSpacing: '0.08em',
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
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                color: '#5A5850',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; }}
            >
              {showAll ? 'SHOW LESS ↑' : `SHOW ALL (${GETTING_STARTED_ITEMS.length}) ↓`}
            </button>
          )}

          {/* Footer actions */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '6px 12px 4px',
            justifyContent: 'space-between',
          }}>
            {tourComplete && (
              <button
                onClick={onStartTour}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  color: '#5A5850',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 4px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; }}
                title="Replay the guided tour"
              >
                <RotateCcw size={8} /> REPLAY TOUR
              </button>
            )}
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                color: '#5A5850',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 4px',
                marginLeft: 'auto',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; }}
              title="Hide this panel"
            >
              <X size={8} /> DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}