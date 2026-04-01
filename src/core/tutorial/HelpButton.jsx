/**
 * HelpButton — Floating help button (bottom-right) that opens a quick-help menu.
 * Allows re-launching the tour, opening checklist, or viewing contextual help.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, Play, ListChecks, BookOpen, RotateCcw } from 'lucide-react';

const CONTEXT_HELP = {
  '/app/industry': {
    title: 'Industry Hub',
    tips: [
      'Use the tab bar to switch between 30+ industry views',
      'The Overview tab shows your production dashboard',
      'Log materials via the Materials tab or OCR scanner',
      'Check the Guide tab for the full crafting reference',
    ],
  },
  '/app/ops': {
    title: 'Ops Board',
    tips: [
      'Click "Create Op" to plan a new operation',
      'RSVP to upcoming ops with your role and ship',
      'Switch to Analytics view for performance data',
      'Completed ops can be found in the Epic Archive',
    ],
  },
  '/app/scout': {
    title: 'Scout Intel',
    tips: [
      'Click "+ Log Deposit" to report a new find',
      'Use the system map to see all known deposits',
      'Switch to Routes tab for mining circuit planning',
      'Quality 80%+ deposits trigger org notifications',
    ],
  },
  '/app/market': {
    title: 'Market Hub',
    tips: [
      'Prices sync from UEX every 15 minutes',
      'Set price alerts to get notified on spikes/drops',
      'Check Routes tab for profitable trade lanes',
      'Analytics tab shows trends and volatility data',
    ],
  },
  '/app/armory': {
    title: 'Armory',
    tips: [
      'Check out equipment for upcoming operations',
      'Fleet tab shows all org ships and their status',
      'Assets tab tracks org-owned non-ship equipment',
      'Inventory tab manages personal gear tracking',
    ],
  },
  '/app/settings': {
    title: 'Settings',
    tips: [
      'Change your callsign — it updates everywhere instantly',
      'Enable browser notifications for live op alerts',
      'Set your UEX API token for marketplace features',
      'Export your personal data as JSON anytime',
    ],
  },
  '/app/roster': {
    title: 'Org Roster',
    tips: [
      'Search and filter members by rank or specialization',
      'Click a member to view their profile details',
      'Member Management is available for leadership',
      'Debt Tracker shows outstanding balances',
    ],
  },
};

function getContextHelp(pathname) {
  // Try exact match first, then prefix match
  if (CONTEXT_HELP[pathname]) return CONTEXT_HELP[pathname];
  const prefix = Object.keys(CONTEXT_HELP).find(key => pathname.startsWith(key));
  return prefix ? CONTEXT_HELP[prefix] : null;
}

export default function HelpButton({ onStartTour, onShowChecklist, tourComplete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const contextHelp = getContextHelp(location.pathname);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setMenuOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9000,
      }}
    >
      {/* Menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          bottom: 48,
          right: 0,
          width: 260,
          background: '#0F0E0C',
          border: '0.5px solid rgba(200,170,100,0.18)',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'nexus-fade-in 150ms ease-out both',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px',
            borderBottom: '0.5px solid rgba(200,170,100,0.08)',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: '#C8A84B',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              HELP & TUTORIALS
            </div>
          </div>

          {/* Context help */}
          {contextHelp && (
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: '#E8E4DC',
                marginBottom: 8,
              }}>
                {contextHelp.title}
              </div>
              {contextHelp.tips.map((tip, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start',
                  marginBottom: 5,
                }}>
                  <div style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#C8A84B',
                    marginTop: 5,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    color: '#9A9488',
                    lineHeight: 1.4,
                  }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {[
            {
              icon: tourComplete ? RotateCcw : Play,
              label: tourComplete ? 'REPLAY GUIDED TOUR' : 'START GUIDED TOUR',
              onClick: () => { setMenuOpen(false); onStartTour(); },
              color: '#C0392B',
            },
            {
              icon: ListChecks,
              label: 'GETTING STARTED CHECKLIST',
              onClick: () => { setMenuOpen(false); onShowChecklist(); },
              color: '#C8A84B',
            },
            {
              icon: BookOpen,
              label: 'OPEN HANDBOOK',
              onClick: () => { setMenuOpen(false); navigate('/app/handbook'); },
              color: '#7AAECC',
            },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: '0.5px solid rgba(200,170,100,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <action.icon size={12} style={{ color: action.color, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                color: '#E8E4DC',
                letterSpacing: '0.08em',
              }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        title="Help & Tutorials"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: menuOpen
            ? 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)'
            : 'linear-gradient(135deg, #1C1A16 0%, #141210 100%)',
          border: menuOpen
            ? '1px solid rgba(192,57,43,0.5)'
            : '0.5px solid rgba(200,170,100,0.2)',
          color: menuOpen ? '#F0EDE5' : '#9A9488',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: menuOpen
            ? '0 4px 20px rgba(192,57,43,0.3)'
            : '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={e => {
          if (!menuOpen) {
            e.currentTarget.style.borderColor = 'rgba(200,170,100,0.4)';
            e.currentTarget.style.color = '#E8E4DC';
          }
        }}
        onMouseLeave={e => {
          if (!menuOpen) {
            e.currentTarget.style.borderColor = 'rgba(200,170,100,0.2)';
            e.currentTarget.style.color = '#9A9488';
          }
        }}
      >
        <HelpCircle size={18} />
      </button>
    </div>
  );
}