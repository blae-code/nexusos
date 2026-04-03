/**
 * IndustryTabBar — sectioned tab bar for Industry workflows.
 * Keeps the top-level nav compact by exposing one section at a time.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

const MAX_VISIBLE = 7;
const DEFAULT_SECTION = 'production';
const SECTION_LABELS = {
  production: 'PRODUCTION',
  market: 'MARKET',
  logistics: 'LOGISTICS',
};

function sectionStyle(isActive) {
  return {
    padding: '5px 10px',
    borderRadius: 2,
    border: `0.5px solid ${isActive ? 'rgba(192,57,43,0.35)' : 'rgba(200,170,100,0.10)'}`,
    background: isActive ? 'rgba(192,57,43,0.12)' : 'rgba(20,20,16,0.65)',
    color: isActive ? '#E8E4DC' : '#8E887D',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif",
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
}

function tabStyle(isActive) {
  return {
    padding: '11px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid #C0392B' : '2px solid transparent',
    color: isActive ? '#E8E4DC' : '#5A5850',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.10em',
    cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif",
    textTransform: 'uppercase',
    transition: 'color 120ms',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
}

export default function IndustryTabBar({ tabs, activeTab, onTabChange }) {
  const dropRef = useRef(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(DEFAULT_SECTION);

  const activeTabItem = tabs.find((item) => item.id === activeTab) || tabs[0] || null;
  const sections = useMemo(() => {
    const seen = new Set();
    return tabs
      .map((item) => item.section || DEFAULT_SECTION)
      .filter((section) => {
        if (seen.has(section)) return false;
        seen.add(section);
        return true;
      });
  }, [tabs]);

  useEffect(() => {
    setCurrentSection(activeTabItem?.section || DEFAULT_SECTION);
  }, [activeTabItem?.section]);

  useEffect(() => {
    if (!dropOpen) return;
    const close = (event) => {
      if (!dropRef.current?.contains(event.target)) setDropOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [dropOpen]);

  const sectionTabs = tabs.filter((item) => (item.section || DEFAULT_SECTION) === currentSection);
  const visibleTabs = sectionTabs.slice(0, MAX_VISIBLE);
  const overflowTabs = sectionTabs.slice(MAX_VISIBLE);
  const activeOverflow = overflowTabs.find((item) => item.id === activeTab);

  const handleSectionChange = (section) => {
    setCurrentSection(section);
    setDropOpen(false);
    if (activeTabItem?.section === section) return;
    const nextTab = tabs.find((item) => (item.section || DEFAULT_SECTION) === section);
    if (nextTab) onTabChange(nextTab.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px 0',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => handleSectionChange(section)}
            style={sectionStyle(currentSection === section)}
          >
            {SECTION_LABELS[section] || String(section).toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        padding: '0 16px',
        maskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
      }}>
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { onTabChange(item.id); setDropOpen(false); }}
            style={tabStyle(activeTab === item.id && !activeOverflow)}
            onMouseEnter={(event) => {
              if (activeTab !== item.id) event.currentTarget.style.color = '#9A9488';
            }}
            onMouseLeave={(event) => {
              if (activeTab !== item.id) event.currentTarget.style.color = '#5A5850';
            }}
          >
            {item.label}
          </button>
        ))}

        {overflowTabs.length > 0 && (
          <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setDropOpen((open) => !open)}
              style={{
                ...tabStyle(Boolean(activeOverflow)),
                color: '#C8A84B',
                borderBottom: activeOverflow ? '2px solid #C0392B' : '2px solid transparent',
              }}
            >
              {activeOverflow ? `${activeOverflow.label} ▾` : 'MORE ▾'}
            </button>

            {dropOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 60,
                minWidth: 170,
                background: '#0F0F0D',
                border: '0.5px solid rgba(200,170,100,0.15)',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}>
                {overflowTabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { onTabChange(item.id); setDropOpen(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      border: 'none',
                      background: activeTab === item.id ? '#1A1A16' : 'transparent',
                      color: activeTab === item.id ? '#E8E4DC' : '#9A9488',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 500,
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = '#1A1A16';
                      event.currentTarget.style.color = '#E8E4DC';
                    }}
                    onMouseLeave={(event) => {
                      if (activeTab !== item.id) {
                        event.currentTarget.style.background = 'transparent';
                        event.currentTarget.style.color = '#9A9488';
                      }
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <style>{`::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </div>
  );
}
