/**
 * IndustryTabBar — overflow-aware tab bar with "MORE ▾" dropdown.
 * Shows first N tabs inline, remainder in a dropdown.
 */
import React, { useEffect, useRef, useState } from 'react';

const MAX_VISIBLE = 8;

export default function IndustryTabBar({ tabs, activeTab, onTabChange }) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const visibleTabs = tabs.slice(0, MAX_VISIBLE);
  const overflowTabs = tabs.slice(MAX_VISIBLE);
  const activeOverflow = overflowTabs.find(t => t.id === activeTab);

  useEffect(() => {
    if (!dropOpen) return;
    const close = (e) => { if (!dropRef.current?.contains(e.target)) setDropOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [dropOpen]);

  const tabStyle = (isActive) => ({
    padding: '11px 12px', background: 'transparent', border: 'none',
    borderBottom: isActive ? '2px solid #C0392B' : '2px solid transparent',
    color: isActive ? '#E8E4DC' : '#5A5850',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.10em',
    cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
    textTransform: 'uppercase', transition: 'color 120ms',
    whiteSpace: 'nowrap', flexShrink: 0,
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      overflowX: 'auto', overflowY: 'hidden',
      scrollbarWidth: 'none', msOverflowStyle: 'none',
      padding: '0 16px',
      maskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
    }}>
      {visibleTabs.map(item => (
        <button
          key={item.id} type="button"
          onClick={() => { onTabChange(item.id); setDropOpen(false); }}
          style={tabStyle(activeTab === item.id && !activeOverflow)}
          onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.color = '#9A9488'; }}
          onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.color = '#5A5850'; }}
        >{item.label}</button>
      ))}

      {overflowTabs.length > 0 && (
        <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setDropOpen(o => !o)}
            style={{
              ...tabStyle(Boolean(activeOverflow)),
              color: activeOverflow ? '#C8A84B' : '#C8A84B',
              borderBottom: activeOverflow ? '2px solid #C0392B' : '2px solid transparent',
            }}
          >
            {activeOverflow ? `${activeOverflow.label} ▾` : 'MORE ▾'}
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 60,
              minWidth: 160, background: '#0F0F0D',
              border: '0.5px solid rgba(200,170,100,0.15)',
              borderRadius: 2, overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              {overflowTabs.map(item => (
                <button
                  key={item.id} type="button"
                  onClick={() => { onTabChange(item.id); setDropOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 16px', border: 'none',
                    background: activeTab === item.id ? '#1A1A16' : 'transparent',
                    color: activeTab === item.id ? '#E8E4DC' : '#9A9488',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 500, fontSize: 12,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; e.currentTarget.style.color = '#E8E4DC'; }}
                  onMouseLeave={e => { if (activeTab !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9A9488'; }}}
                >{item.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}