/**
 * HelpButton — Floating help button (bottom-right) that opens a quick-help menu.
 * Provides page-specific contextual tips, tour replay, checklist access, and handbook link.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, HelpCircle, Info, ListChecks, Play, RotateCcw } from 'lucide-react';

const CONTEXT_HELP = {
  '/app/industry': {
    title: 'Industry Hub',
    tips: [
      'Use the top tab bar to move between the industry dashboard, ledger, blueprints, queue, refinery, and other specialist views.',
      'The Overview tab is the best command summary for active production, refinery timing, and requisition pressure.',
      'Materials is still the raw ledger, but Inventory is now the single command center for custody, org assets, shared gear, and craft readiness.',
      'Guide, Blueprints, Craft Queue, and Refinery remain the main production workflow tabs.',
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
      'Commodity prices sync from UEX up to twice daily, and manual refreshes are rate-limited',
      'Set price alerts to get notified on spikes, drops, or margin thresholds',
      'Check the Routes tab for profitable trade lanes rebuilt from cached station-price data',
      'Analytics tab shows trend charts, margin heatmaps, and volatility tables',
      'The Marketplace tab shows player listings with org-member detection',
      'Use the sync status panel to see cache history, running jobs, cooldowns, and next automatic window',
    ],
  },
  '/app/armory': {
    title: 'Armory',
    tips: [
      'Armory is now checkout-first: use Checkout for issuing shared gear and Activity for circulation history.',
      'The Stock tab is read-only and reflects the same shared gear data used by Industry inventory.',
      'Use Fleet for ship readiness, crew assignment, and loadout support.',
      'Edit shared gear, ship components, org assets, and custody from Industry → Inventory.',
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

function getIndustryInventoryHelp(searchParams) {
  const scope = searchParams.get('inventoryScope') === 'org' ? 'org' : 'me';
  const view = searchParams.get('inventoryView') || 'holdings';

  const baseTips = {
    holdings: [
      'Holdings is the personal custody surface: log materials manually, review OCR intake, and donate personal stock into org custody.',
      scope === 'org'
        ? 'With org scope enabled, holdings shifts to a custody-oriented view so you can see where stock currently lives.'
        : 'Use org scope when you want leadership-level visibility across the full custody network.',
    ],
    network: [
      'Network combines the org custody map, blueprint coverage, and crafter discovery in one place.',
      'Search the custody map first, then use blueprint coverage and crafter lookup to decide whether to requisition or coordinate directly.',
    ],
    assets: [
      'Assets keeps the org asset register and ship custody together so support gear and ship assignment stay in the same workflow.',
      'Use `MY CUSTODY` to focus on what is assigned to you, or `ORG NETWORK` to work the full register.',
    ],
    gear: [
      'Gear is the authoritative editor for shared gear and ship components.',
      'Armory reads the same stock here as a read-only checkout surface, so there is no second inventory manager anymore.',
    ],
    readiness: [
      'Readiness measures craftability against the active inventory basis and lets you send requisitions for missing materials.',
      'Lifecycle flow and low-stock alerts sit directly under the gap view so shortages can be diagnosed and escalated from one tab.',
    ],
  };

  return {
    title: 'Industry Inventory',
    tips: [
      'This is the single inventory command center for personal custody, org materials, org assets, shared gear, and craft readiness.',
      ...(baseTips[view] || baseTips.holdings),
    ],
  };
}

function getContextHelp(location) {
  const { pathname, search } = location;

  if (pathname === '/app/industry') {
    const searchParams = new URLSearchParams(search);
    if (searchParams.get('tab') === 'inventory') {
      return getIndustryInventoryHelp(searchParams);
    }
  }

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

  if (CONTEXT_HELP[pathname]) return CONTEXT_HELP[pathname];

  const prefix = Object.keys(CONTEXT_HELP)
    .filter((key) => pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  return prefix ? CONTEXT_HELP[prefix] : null;
}

export default function HelpButton({ onStartTour, onShowChecklist, tourComplete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const contextHelp = getContextHelp(location);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

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
      {menuOpen && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              padding: '14px 16px 10px',
              borderBottom: '0.5px solid rgba(200,170,100,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <HelpCircle size={14} style={{ color: '#C8A84B' }} />
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: '#C8A84B',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              HELP & TUTORIALS
            </span>
          </div>

          {contextHelp && (
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Info size={10} style={{ color: '#7AAECC' }} />
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#E8E4DC',
                    letterSpacing: '0.04em',
                  }}
                >
                  {contextHelp.title}
                </span>
              </div>
              {contextHelp.tips.map((tip, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#C8A84B', marginTop: 5, flexShrink: 0, opacity: 0.7 }} />
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 10,
                      color: '#9A9488',
                      lineHeight: 1.5,
                    }}
                  >
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!contextHelp && (
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.06)' }}>
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#5A5850',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Navigate to any module to see page-specific tips and guidance here.
              </p>
            </div>
          )}

          {[
            {
              icon: tourComplete ? RotateCcw : Play,
              label: tourComplete ? 'REPLAY GUIDED TOUR' : 'START GUIDED TOUR',
              desc: 'Step-by-step walkthrough of all modules',
              onClick: () => {
                setMenuOpen(false);
                onStartTour();
              },
              color: '#C0392B',
            },
            {
              icon: ListChecks,
              label: 'GETTING STARTED CHECKLIST',
              desc: 'Recommended first actions for new members',
              onClick: () => {
                setMenuOpen(false);
                onShowChecklist();
              },
              color: '#C8A84B',
            },
            {
              icon: BookOpen,
              label: 'OPEN HANDBOOK',
              desc: 'Org rules, rank structure, and procedures',
              onClick: () => {
                setMenuOpen(false);
                navigate('/app/handbook');
              },
              color: '#7AAECC',
            },
          ].map((action) => (
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
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(200,170,100,0.04)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'none';
              }}
            >
              <action.icon size={13} style={{ color: action.color, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    color: '#E8E4DC',
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                  }}
                >
                  {action.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 9,
                    color: '#5A5850',
                    marginTop: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {action.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

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
        onMouseEnter={(event) => {
          if (!menuOpen) {
            event.currentTarget.style.borderColor = 'rgba(200,170,100,0.4)';
            event.currentTarget.style.color = '#E8E4DC';
            event.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(event) => {
          if (!menuOpen) {
            event.currentTarget.style.borderColor = 'rgba(200,170,100,0.2)';
            event.currentTarget.style.color = '#9A9488';
            event.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <HelpCircle size={18} />
        {!tourComplete && !menuOpen && (
          <span
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              border: '1px solid rgba(192,57,43,0.3)',
              animation: 'ring 2.5s ease-out infinite',
            }}
          />
        )}
      </button>
    </div>
  );
}
