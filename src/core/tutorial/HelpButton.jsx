/**
 * HelpButton — Floating help button (bottom-right) that opens a quick-help menu.
 * Provides page-specific contextual tips, tour replay, checklist access, and handbook link.
 * Covers all major routes including sub-pages.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, Play, ListChecks, BookOpen, RotateCcw, Info } from 'lucide-react';

const CONTEXT_HELP = {
  '/app/industry': {
    title: 'Industry Hub',
    tips: [
      'Use the tab bar at the top to switch between 30+ industry views',
      'The Overview tab shows a production dashboard with KPIs and alerts',
      'Log materials via the Materials tab — supports manual entry and OCR scanning',
      'Check the Guide tab for the full crafting reference with recipes and quality data',
      'Use the Craft Queue tab to track active fabrication jobs in real-time',
      'The Refinery tab shows active batches with countdown timers and yield estimates',
    ],
  },
  '/app/ops': {
    title: 'Ops Board',
    tips: [
      'Click "Create Op" in the sidebar to plan a new operation with phases and roles',
      'RSVP to upcoming ops with your preferred role, ship, and cargo capacity',
      'Switch to Analytics view (top-right) for historical performance data',
      'Completed ops are auto-archived — find them in the Epic Archive',
      'During a live op, the command center provides crew tracking and event logging',
    ],
  },
  '/app/ops/timeline': {
    title: 'Ops Timeline',
    tips: [
      'View upcoming operations on a visual multi-day calendar',
      'Click any op block to open the RSVP panel',
      'Export your schedule to an external calendar via the ICS download button',
      'Ship availability tracking shows which org vessels are free per time slot',
    ],
  },
  '/app/ops/planner': {
    title: 'Mission Planner',
    tips: [
      'Build detailed mission plans with objectives and phase breakdowns',
      'Assign crew roles and define readiness requirements before going live',
      'Use this for strategic planning before creating the actual op',
    ],
  },
  '/app/ops/new': {
    title: 'Create Operation',
    tips: [
      'The wizard walks you through type selection, crew setup, timeline, and review',
      'Add phases to break your op into distinct stages (e.g., Assembly → Mining → Hauling)',
      'Set role slots so crew can RSVP for specific positions',
      'Review everything before publishing — draft ops are only visible to you',
    ],
  },
  '/app/ops/rescue': {
    title: 'Rescue Board',
    tips: [
      'Issue a MAYDAY to alert org members of a distress situation',
      'Include your location and situation details for faster response',
      'Active calls trigger browser notifications for members with alerts enabled',
    ],
  },
  '/app/ops/archive': {
    title: 'Epic Archive',
    tips: [
      'Browse completed operations with AAR (After Action Report) summaries',
      'View leaderboards for top scouts, fabricators, and op participants',
      'Search and filter by op type, date range, or keywords',
    ],
  },
  '/app/scout': {
    title: 'Scout Intel',
    tips: [
      'Click "+ Log Deposit" to report a new find with location and quality data',
      'Use the interactive system map to see all known deposits color-coded by quality',
      'Switch to the Routes tab for the mining circuit planner — optimize multi-stop runs',
      'The Live Map tab shows a real-time spatial overview with toggleable layers',
      'Deposits with 80%+ quality automatically notify org members',
      'Use the Risk Overlay button to see hazard zones and threat assessments',
    ],
  },
  '/app/market': {
    title: 'Market Hub',
    tips: [
      'Commodity prices sync from UEX automatically every 15 minutes',
      'Set price alerts to get notified on spikes, drops, or margin thresholds',
      'Check the Routes tab for profitable trade lanes ranked by profit/SCU',
      'Analytics tab shows trend charts, margin heatmaps, and volatility tables',
      'The Marketplace tab shows player listings with org-member detection',
      'Use the Crawler Status panel to see sync history and trigger manual updates',
    ],
  },
  '/app/armory': {
    title: 'Armory',
    tips: [
      'Check out equipment for upcoming operations — tracked by serial number',
      'View your checkout history and return pending items',
      'Fleet tab shows all org ships and their readiness status',
      'Assets tab tracks org-owned non-ship equipment with conditions and locations',
      'Inventory tab manages personal gear with OCR-based scanning',
    ],
  },
  '/app/armory/fleet': {
    title: 'Fleet Hub',
    tips: [
      'View all org ships with model, cargo capacity, and operational status',
      'Ship readiness scores show combat, mining, hauling, and other capabilities',
      'Loadout configurations sync from FleetYards when connected',
      'Crew Assignment tab lets leadership assign pilots and gunners to specific ships',
    ],
  },
  '/app/armory/assets': {
    title: 'Asset Manager',
    tips: [
      'Track org-owned equipment with serial tags, condition, and assigned member',
      'Filter by type: ships, vehicles, weapons, armor, components, and more',
      'Register new assets with acquisition source and estimated value',
      'Audit trail shows ownership history and last verification date',
    ],
  },
  '/app/armory/inventory': {
    title: 'Inventory Manager',
    tips: [
      'Track personal gear and org-assigned equipment',
      'OCR scanning lets you photograph your inventory for quick data entry',
      'Search and filter items by category, condition, or location',
    ],
  },
  '/app/settings': {
    title: 'Settings',
    tips: [
      'Change your callsign — it updates everywhere instantly across the platform',
      'Enable browser notifications for live op alerts, deposits, and distress calls',
      'Set your UEX API token and handle for marketplace features',
      'Export your personal data as a JSON file anytime from the Data section',
      'Alt-Tab mode works best for single monitor; 2nd Monitor for dual-display setups',
      'Replay the guided tour or reset your Getting Started checklist from here',
    ],
  },
  '/app/roster': {
    title: 'Org Roster',
    tips: [
      'Search and filter members by rank, specialization, or intel access level',
      'Click any member card to view their detailed profile',
      'Member Management (leadership only) allows rank adjustments and role assignments',
      'Debt Tracker shows outstanding aUEC balances between members',
    ],
  },
  '/app/roster/manage': {
    title: 'Member Management',
    tips: [
      'Adjust member ranks, specializations, and intel access levels',
      'View blueprint contribution summaries per member',
      'Filter the directory by rank, role, or access level for bulk review',
    ],
  },
  '/app/roster/debts': {
    title: 'Debt Tracker',
    tips: [
      'Track outstanding aUEC balances between org members',
      'Issue debt records with clear purpose descriptions',
      'Members can upload payment proof for OCR verification',
    ],
  },
  '/app/handbook': {
    title: 'Org Handbook',
    tips: [
      'Read the Redscar Nomads\' organizational rules and procedures',
      'Reference the rank structure and promotion criteria',
      'Review operational protocols and communication standards',
    ],
  },
  '/app/training': {
    title: 'Training Hub',
    tips: [
      'Access skill development resources and training materials',
      'Review role-specific guides for mining, salvage, combat, and more',
      'Track your progression through training modules',
    ],
  },
  '/app/admin/keys': {
    title: 'Key Management',
    tips: [
      'Generate and manage auth keys for org members',
      'Revoke compromised keys to immediately block access',
      'View key issuance history and active key status',
    ],
  },
  '/app/admin/data': {
    title: 'Data Console',
    tips: [
      'View and manage raw entity data for debugging',
      'Export bulk data for analysis or backup purposes',
      'Monitor data integrity across entities',
    ],
  },
  '/app/admin/settings': {
    title: 'Admin Settings',
    tips: [
      'Configure platform-wide settings and feature flags',
      'Manage Discord integration parameters',
      'Review system health and integration status',
    ],
  },
};

function getContextHelp(pathname) {
  // Exact match first
  if (CONTEXT_HELP[pathname]) return CONTEXT_HELP[pathname];
  // For live op detail pages like /app/ops/some-id
  if (/^\/app\/ops\/[^/]+$/.test(pathname) && pathname !== '/app/ops/new' && pathname !== '/app/ops/rescue' && pathname !== '/app/ops/timeline' && pathname !== '/app/ops/planner' && pathname !== '/app/ops/archive') {
    return {
      title: 'Live Op Command',
      tips: [
        'Phase Tracker shows current op progress — leadership can advance phases',
        'Crew & RSVP panel shows who\'s joined and their assigned roles',
        'Event Log tracks everything that happens in real-time',
        'Mission Control provides quick-action buttons for common commands',
        'Switch layout modes via the topbar for Alt-Tab vs. 2nd Monitor views',
      ],
    };
  }
  // Prefix match
  const prefix = Object.keys(CONTEXT_HELP)
    .filter(key => pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]; // longest prefix wins
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
          bottom: 50,
          right: 0,
          width: 280,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #121110 0%, #0F0E0C 100%)',
          border: '0.5px solid rgba(200,170,100,0.18)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          animation: 'nexus-fade-in 150ms ease-out both',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '0.5px solid rgba(200,170,100,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <HelpCircle size={14} style={{ color: '#C8A84B' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: '#C8A84B',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              HELP & TUTORIALS
            </span>
          </div>

          {/* Context help */}
          {contextHelp && (
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}>
                <Info size={10} style={{ color: '#7AAECC' }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#E8E4DC',
                  letterSpacing: '0.04em',
                }}>
                  {contextHelp.title}
                </span>
              </div>
              {contextHelp.tips.map((tip, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  marginBottom: 6,
                }}>
                  <div style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#C8A84B',
                    marginTop: 5,
                    flexShrink: 0,
                    opacity: 0.7,
                  }} />
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    color: '#9A9488',
                    lineHeight: 1.5,
                  }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* No context help fallback */}
          {!contextHelp && (
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                color: '#5A5850',
                lineHeight: 1.5,
                margin: 0,
              }}>
                Navigate to any module to see page-specific tips and guidance here.
              </p>
            </div>
          )}

          {/* Actions */}
          {[
            {
              icon: tourComplete ? RotateCcw : Play,
              label: tourComplete ? 'REPLAY GUIDED TOUR' : 'START GUIDED TOUR',
              desc: 'Step-by-step walkthrough of all modules',
              onClick: () => { setMenuOpen(false); onStartTour(); },
              color: '#C0392B',
            },
            {
              icon: ListChecks,
              label: 'GETTING STARTED CHECKLIST',
              desc: 'Recommended first actions for new members',
              onClick: () => { setMenuOpen(false); onShowChecklist(); },
              color: '#C8A84B',
            },
            {
              icon: BookOpen,
              label: 'OPEN HANDBOOK',
              desc: 'Org rules, rank structure, and procedures',
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
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 16px',
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
              <action.icon size={13} style={{ color: action.color, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#E8E4DC',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}>
                  {action.label}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  color: '#5A5850',
                  marginTop: 2,
                  lineHeight: 1.3,
                }}>
                  {action.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        title="Help & Tutorials"
        style={{
          width: 42,
          height: 42,
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
            ? '0 6px 24px rgba(192,57,43,0.35)'
            : '0 4px 16px rgba(0,0,0,0.5)',
          transition: 'all 200ms ease',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!menuOpen) {
            e.currentTarget.style.borderColor = 'rgba(200,170,100,0.4)';
            e.currentTarget.style.color = '#E8E4DC';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={e => {
          if (!menuOpen) {
            e.currentTarget.style.borderColor = 'rgba(200,170,100,0.2)';
            e.currentTarget.style.color = '#9A9488';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <HelpCircle size={18} />
        {/* Subtle pulse ring for new users */}
        {!tourComplete && !menuOpen && (
          <span style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '50%',
            border: '1px solid rgba(192,57,43,0.3)',
            animation: 'ring 2.5s ease-out infinite',
          }} />
        )}
      </button>
    </div>
  );
}