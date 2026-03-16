import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Circle, ExternalLink } from 'lucide-react';

const TODOS = [
  {
    category: 'Discord OAuth + Herald Setup',
    color: 'var(--info)',
    items: [
      {
        id: 'HERALD_BOT_TOKEN',
        label: 'Set HERALD_BOT_TOKEN secret',
        detail: 'Discord Developer Portal → Bot → Reset Token, then store it in Base44 environment variables. Required for guild membership checks and Herald Bot notifications.',
        priority: 'CRITICAL',
        link: 'https://discord.com/developers/applications',
      },
      {
        id: 'REDSCAR_GUILD_ID',
        label: 'Set REDSCAR_GUILD_ID secret',
        detail: 'Enable Developer Mode in Discord, right-click the Redscar Nomads server, and copy the server ID.',
        priority: 'CRITICAL',
      },
      {
        id: 'DISCORD_CLIENT_ID',
        label: 'Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI',
        detail: 'Discord Developer Portal → OAuth2. The redirect URI must point to the deployed callback endpoint for NexusOS member login.',
        priority: 'CRITICAL',
        link: 'https://discord.com/developers/applications',
      },
      {
        id: 'SESSION_SIGNING_SECRET',
        label: 'Set SESSION_SIGNING_SECRET',
        detail: 'Add a long random secret in Base44 environment variables. This signs the NexusOS member session cookie and OAuth state cookie.',
        priority: 'CRITICAL',
      },
      {
        id: 'BOT_PERMISSIONS',
        label: 'Invite Herald Bot with message, thread, and event permissions',
        detail: 'Required permissions: Send Messages, Embed Links, Use External Emojis, Create Events, Manage Events, Create Public Threads.',
        priority: 'HIGH',
        link: 'https://discord.com/developers/applications',
      },
    ],
  },
  {
    category: 'Discord Channels — NexusOS Category',
    color: 'var(--warn)',
    items: [
      {
        id: 'CREATE_NEXUSOS_CATEGORY',
        label: 'Create | NexusOS | category in Discord',
        detail: 'Create a dedicated category for NexusOS channels. Make it visible to members and writable only by Herald Bot plus officers.',
        priority: 'CRITICAL',
      },
      {
        id: 'NEXUSOS_OPS_CHANNEL_ID',
        label: 'Create #nexusos-ops and set NEXUSOS_OPS_CHANNEL_ID',
        detail: 'Primary op announcements, RSVP notices, and access-routing copy live here.',
        priority: 'CRITICAL',
      },
      {
        id: 'NEXUSOS_OCR_CHANNEL_ID',
        label: 'Create #nexusos-ocr and set NEXUSOS_OCR_CHANNEL_ID',
        detail: 'Members drop screenshots here for OCR extraction and queue capture.',
        priority: 'HIGH',
      },
      {
        id: 'NEXUSOS_INTEL_CHANNEL_ID',
        label: 'Create #nexusos-intel and set NEXUSOS_INTEL_CHANNEL_ID',
        detail: 'Scout deposit reports and high-value pings are posted here.',
        priority: 'HIGH',
      },
      {
        id: 'NEXUSOS_LOG_CHANNEL_ID',
        label: 'Create #nexusos-log and set NEXUSOS_LOG_CHANNEL_ID',
        detail: 'System log for refinery ready alerts, wrap-up notices, and stock warnings.',
        priority: 'HIGH',
      },
    ],
  },
  {
    category: 'Base App Environment',
    color: 'var(--acc2)',
    items: [
      {
        id: 'APP_URL',
        label: 'Set APP_URL to the deployed NexusOS URL',
        detail: 'Used for OAuth redirects, secure session cookie redirects, and member launcher routing.',
        priority: 'CRITICAL',
      },
      {
        id: 'VITE_BASE44_APP_ID',
        label: 'Set frontend Base44 app variables',
        detail: 'Ensure the deployed frontend has VITE_BASE44_APP_ID, VITE_BASE44_APP_BASE_URL, and VITE_BASE44_FUNCTIONS_VERSION configured so the client boots cleanly.',
        priority: 'HIGH',
      },
      {
        id: 'SC_API_KEY',
        label: 'Set SC_API_KEY for verse status polling',
        detail: 'Register at starcitizen-api.com to improve verse status accuracy.',
        priority: 'LOW',
        link: 'https://starcitizen-api.com',
      },
    ],
  },
  {
    category: 'Existing Channel IDs — Env Vars',
    color: 'var(--t2)',
    items: [
      { id: 'ARMORY_CHANNEL_ID', label: 'Set ARMORY_CHANNEL_ID', detail: '| AUEC and Armory | → #ARMORY', priority: 'MEDIUM' },
      { id: 'COFFER_CHANNEL_ID', label: 'Set COFFER_CHANNEL_ID', detail: '| AUEC and Armory | → #COFFER', priority: 'MEDIUM' },
      { id: 'INVOICES_CHANNEL_ID', label: 'Set INVOICES_CHANNEL_ID', detail: '| AUEC and Armory | → #INVOICES', priority: 'MEDIUM' },
      { id: 'INDUSTRY_CHANNEL_ID', label: 'Set INDUSTRY_CHANNEL_ID', detail: '| Professions | → #INDUSTRY', priority: 'LOW' },
      { id: 'RANGERS_CHANNEL_ID', label: 'Set RANGERS_CHANNEL_ID', detail: '| Professions | → #RANGERS', priority: 'LOW' },
      { id: 'ANNOUNCEMENTS_CHANNEL_ID', label: 'Set ANNOUNCEMENTS_CHANNEL_ID', detail: 'Announcement channel where Herald Bot can post embeds.', priority: 'LOW' },
    ],
  },
  {
    category: 'Features — Still Future Work',
    color: 'var(--t2)',
    items: [
      {
        id: 'VOICE_SYNC',
        label: 'Voice state sync for live crew overlays',
        detail: 'Requires a persistent Discord gateway process. Serverless functions alone are not enough.',
        priority: 'FUTURE',
      },
      {
        id: 'OCR_DISCORD_WATCH',
        label: 'Watch #nexusos-ocr for image attachments automatically',
        detail: 'Needs message create handling or an interaction/webhook bridge.',
        priority: 'FUTURE',
      },
      {
        id: 'RSVP_INTERACTION',
        label: 'Discord button RSVP interactions',
        detail: 'Requires a registered Interactions Endpoint URL and signed request handling.',
        priority: 'FUTURE',
      },
      {
        id: 'PATCH_WATCHER',
        label: 'Automated patch-note watcher and digest generation',
        detail: 'Scheduled function to fetch RSI notes and publish summaries.',
        priority: 'FUTURE',
      },
    ],
  },
];

const PRIORITY_STYLES = {
  CRITICAL: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-b)' },
  HIGH: { color: 'var(--warn)', bg: 'var(--warn-bg)', border: 'var(--warn-b)' },
  MEDIUM: { color: 'var(--info)', bg: 'var(--info-bg)', border: 'var(--info-b)' },
  LOW: { color: 'var(--t2)', bg: 'transparent', border: 'var(--b1)' },
  FUTURE: { color: 'var(--acc2)', bg: 'transparent', border: 'var(--b2)' },
};

function TodoItem({ item, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const priorityStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.LOW;

  return (
    <div
      style={{
        background: checked ? 'transparent' : priorityStyle.bg,
        border: `0.5px solid ${checked ? 'var(--b0)' : priorityStyle.border}`,
        borderRadius: 6,
        overflow: 'hidden',
        opacity: checked ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{ padding: '9px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded((open) => !open)}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggle(item.id);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: checked ? 'var(--live)' : 'var(--t2)', display: 'flex' }}
        >
          {checked ? <CheckCircle size={15} /> : <Circle size={15} />}
        </button>
        <span style={{ flex: 1, color: checked ? 'var(--t2)' : 'var(--t0)', fontSize: 12, textDecoration: checked ? 'line-through' : 'none' }}>
          {item.label}
        </span>
        <span className="nexus-tag" style={{ color: priorityStyle.color, borderColor: priorityStyle.border, background: 'transparent', fontSize: 9, flexShrink: 0 }}>
          {item.priority}
        </span>
        {expanded ? <ChevronDown size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} />}
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 10px 38px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6 }}>{item.detail}</div>
          {item.link ? (
            <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--acc2)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Open resource <ExternalLink size={10} />
            </a>
          ) : null}
          <code style={{ color: 'var(--t2)', fontSize: 10, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 3, width: 'fit-content' }}>
            {item.id}
          </code>
        </div>
      )}
    </div>
  );
}

export default function NexusTodo() {
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexus_todo_checked') || '{}');
    } catch {
      return {};
    }
  });

  const toggle = (id) => {
    setChecked((previous) => {
      const next = { ...previous, [id]: !previous[id] };
      localStorage.setItem('nexus_todo_checked', JSON.stringify(next));
      return next;
    });
  };

  const totalItems = TODOS.flatMap((category) => category.items).length;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const criticalLeft = TODOS.flatMap((category) => category.items).filter((item) => item.priority === 'CRITICAL' && !checked[item.id]).length;

  return (
    <div className="flex flex-col h-full overflow-auto p-5 gap-5" style={{ maxWidth: 860 }}>
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
          NEXUSOS — SETUP TODO
        </div>
        <div className="flex items-center gap-4" style={{ color: 'var(--t1)', fontSize: 12 }}>
          <span>{doneCount}/{totalItems} complete</span>
          {criticalLeft > 0 ? (
            <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={11} /> {criticalLeft} critical item{criticalLeft !== 1 ? 's' : ''} outstanding
            </span>
          ) : null}
        </div>
        <div className="nexus-bar-bg" style={{ marginTop: 10, height: 4 }}>
          <div className="nexus-bar-fill" style={{ width: `${(doneCount / totalItems) * 100}%`, background: criticalLeft > 0 ? 'var(--warn)' : 'var(--live)', height: 4 }} />
        </div>
      </div>

      {TODOS.map((category) => {
        const categoryDone = category.items.filter((item) => checked[item.id]).length;
        return (
          <div key={category.category}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: category.color, fontSize: 10, letterSpacing: '0.12em', fontWeight: 600 }}>{category.category.toUpperCase()}</span>
              <span style={{ color: 'var(--t2)', fontSize: 10 }}>{categoryDone}/{category.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {category.items.map((item) => (
                <TodoItem key={item.id} item={item} checked={!!checked[item.id]} onToggle={toggle} />
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ color: 'var(--t3)', fontSize: 10, textAlign: 'center', paddingBottom: 20 }}>
        Check state is saved locally in this browser · This page is intended for setup owners and officers
      </div>
    </div>
  );
}
