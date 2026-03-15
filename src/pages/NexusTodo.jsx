import React, { useState } from 'react';
import { CheckCircle, Circle, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

const TODOS = [
  {
    category: 'Discord Bot — Herald Setup',
    color: 'var(--info)',
    items: [
      {
        id: 'HERALD_BOT_TOKEN',
        label: 'Set HERALD_BOT_TOKEN secret',
        detail: 'Discord Developer Portal → Your Application → Bot → Reset Token. Then set in Base44 dashboard → Code → Environment Variables.',
        priority: 'CRITICAL',
        link: 'https://discord.com/developers/applications',
      },
      {
        id: 'REDSCAR_GUILD_ID',
        label: 'Set REDSCAR_GUILD_ID secret',
        detail: 'Enable Developer Mode in Discord → right-click Redscar Nomads server icon → Copy Server ID.',
        priority: 'CRITICAL',
      },
      {
        id: 'DISCORD_CLIENT_ID',
        label: 'Set DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET',
        detail: 'Discord Developer Portal → Your Application → OAuth2. Needed for future Discord OAuth login flow.',
        priority: 'HIGH',
        link: 'https://discord.com/developers/applications',
      },
      {
        id: 'BOT_PERMISSIONS',
        label: 'Invite Herald Bot to Redscar server with correct permissions',
        detail: 'Required permissions: Send Messages, Embed Links, Use External Emojis, Create Events, Manage Events, Create Public Threads. Use OAuth2 URL generator in Dev Portal.',
        priority: 'CRITICAL',
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
        label: 'Create | NexusOS | category in Discord server',
        detail: 'Create a new category called "| NexusOS |" in the Redscar Nomads Discord server. Set permissions: visible to all members, writable only by Herald Bot + Officers.',
        priority: 'CRITICAL',
      },
      {
        id: 'NEXUSOS_OPS_CHANNEL_ID',
        label: 'Create #nexusos-ops channel → set NEXUSOS_OPS_CHANNEL_ID secret',
        detail: 'Text channel under | NexusOS | category. Primary op announcements, RSVP buttons, live pings. Right-click channel → Copy Channel ID.',
        priority: 'CRITICAL',
      },
      {
        id: 'NEXUSOS_OCR_CHANNEL_ID',
        label: 'Create #nexusos-ocr channel → set NEXUSOS_OCR_CHANNEL_ID secret',
        detail: 'Members drop screenshots here for OCR extraction. Herald Bot watches for image attachments and routes them to ocrExtract.',
        priority: 'HIGH',
      },
      {
        id: 'NEXUSOS_INTEL_CHANNEL_ID',
        label: 'Create #nexusos-intel channel → set NEXUSOS_INTEL_CHANNEL_ID secret',
        detail: 'Scout deposit reports and high-value deposit @here pings.',
        priority: 'HIGH',
      },
      {
        id: 'NEXUSOS_LOG_CHANNEL_ID',
        label: 'Create #nexusos-log channel → set NEXUSOS_LOG_CHANNEL_ID secret',
        detail: 'Audit log: key issuances/revocations, craft completions, refinery ready alerts.',
        priority: 'HIGH',
      },
    ],
  },
  {
    category: 'Existing Channel IDs — Env Vars',
    color: 'var(--warn)',
    items: [
      { id: 'ARMORY_CHANNEL_ID',       label: 'Set ARMORY_CHANNEL_ID',        detail: '| AUEC and Armory | category → #ARMORY channel.', priority: 'HIGH' },
      { id: 'COFFER_CHANNEL_ID',        label: 'Set COFFER_CHANNEL_ID',         detail: '| AUEC and Armory | category → #COFFER channel.', priority: 'HIGH' },
      { id: 'INVOICES_CHANNEL_ID',      label: 'Set INVOICES_CHANNEL_ID',       detail: '| AUEC and Armory | category → #INVOICES channel.', priority: 'HIGH' },
      { id: 'INDUSTRY_CHANNEL_ID',      label: 'Set INDUSTRY_CHANNEL_ID',       detail: '| Professions | category → #INDUSTRY channel.', priority: 'MEDIUM' },
      { id: 'RANGERS_CHANNEL_ID',       label: 'Set RANGERS_CHANNEL_ID',        detail: '| Professions | category → #RANGERS channel.', priority: 'MEDIUM' },
      { id: 'ANNOUNCEMENTS_CHANNEL_ID', label: 'Set ANNOUNCEMENTS_CHANNEL_ID',  detail: 'Announcement-type channel. Herald Bot needs explicit Send Messages permission here.', priority: 'MEDIUM' },
      { id: 'PTU_CHANNEL_ID',           label: 'Set PTU_CHANNEL_ID',            detail: '| Star Citizen | category → #PTU-CHAT channel.', priority: 'LOW' },
      { id: 'BONFIRE_CHANNEL_ID',       label: 'Set BONFIRE_CHANNEL_ID',        detail: '| Redscar | category → #BONFIRE-CHAT-🔥 channel.', priority: 'LOW' },
      { id: 'REDSCAR_ONLY_CHANNEL_ID',  label: 'Set REDSCAR_ONLY_CHANNEL_ID',   detail: '| Redscar | category → #REDSCAR-ONLY-🚩 channel. Used for new member welcomes.', priority: 'MEDIUM' },
    ],
  },
  {
    category: 'Voice Channel IDs — Env Vars',
    color: 'var(--t2)',
    items: [
      { id: 'VOICE_INDUSTRY_ID',  label: 'Set VOICE_INDUSTRY_ID',  detail: '| Focused Voice | → Industry Bonfire voice channel.', priority: 'LOW' },
      { id: 'VOICE_RANGERS_ID',   label: 'Set VOICE_RANGERS_ID',   detail: '| Focused Voice | → Rangers Bonfire voice channel.', priority: 'LOW' },
      { id: 'VOICE_EMERGENCY_ID', label: 'Set VOICE_EMERGENCY_ID', detail: '| Emergency Comms | → "! Responding" voice channel.', priority: 'LOW' },
      { id: 'VOICE_CASUAL_ID',    label: 'Set VOICE_CASUAL_ID',    detail: '| Casual Voice | → Redscar Only voice channel.', priority: 'LOW' },
    ],
  },
  {
    category: 'External API Keys',
    color: 'var(--acc2)',
    items: [
      {
        id: 'SC_API_KEY',
        label: 'Set SC_API_KEY for verse status polling',
        detail: 'Register at starcitizen-api.com to get a free API key. Used by verseStatus function to check if the verse is online.',
        priority: 'LOW',
        link: 'https://starcitizen-api.com',
      },
      {
        id: 'APP_URL',
        label: 'Set APP_URL to the deployed NexusOS URL',
        detail: 'e.g. https://nexusos.base44.app — included in auth key DM deliveries so members know where to log in.',
        priority: 'MEDIUM',
      },
    ],
  },
  {
    category: 'Features — Not Yet Implemented',
    color: 'var(--t2)',
    items: [
      {
        id: 'VOICE_SYNC',
        label: 'Voice state sync (Op Board live crew)',
        detail: 'Discord Gateway websocket connection to track who is in voice channels and mirror to NexusOS Op Board in real-time. Requires a persistent bot process (not serverless).',
        priority: 'FUTURE',
      },
      {
        id: 'OCR_DISCORD_WATCH',
        label: 'Herald Bot watching #nexusos-ocr for image attachments',
        detail: 'Requires Discord interaction webhook or bot message_create event listener routing to ocrExtract function.',
        priority: 'FUTURE',
      },
      {
        id: 'RSVP_INTERACTION',
        label: 'Discord button RSVP interactions → NexusOS',
        detail: 'When members click RSVP buttons in #nexusos-ops, Discord sends an interaction POST to a webhook URL. Need to register an Interactions Endpoint URL and handle it.',
        priority: 'FUTURE',
      },
      {
        id: 'MARKETPLACE',
        label: 'NexusOS Marketplace module + #BAZAAR channel integration',
        detail: 'Future module: org P2P trade listings, synced to a #BAZAAR Discord channel. BAZZAR_CHANNEL_ID placeholder already in heraldBot config.',
        priority: 'FUTURE',
      },
      {
        id: 'PATCH_WATCHER',
        label: 'Automated RSI patch note watcher + digest generator',
        detail: 'Scheduled function to scrape RSI Comm-Link for new patches, run through Claude for industry summary, post to Discord. Currently manual only.',
        priority: 'FUTURE',
      },
      {
        id: 'DISCORD_OAUTH_LOGIN',
        label: 'Discord OAuth login flow (replace auth key gate)',
        detail: 'Long-term: replace RSN key authentication with Discord OAuth2 so members log in with their Discord account directly. Requires DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET.',
        priority: 'FUTURE',
      },
    ],
  },
];

const PRIORITY_STYLES = {
  CRITICAL: { color: 'var(--danger)', bg: 'rgba(224,72,72,0.08)', border: 'rgba(224,72,72,0.25)' },
  HIGH:     { color: 'var(--warn)',   bg: 'rgba(232,160,32,0.08)', border: 'rgba(232,160,32,0.25)' },
  MEDIUM:   { color: 'var(--info)',   bg: 'rgba(74,143,208,0.08)', border: 'rgba(74,143,208,0.25)' },
  LOW:      { color: 'var(--t2)',     bg: 'transparent',           border: 'var(--b1)' },
  FUTURE:   { color: 'var(--acc2)',   bg: 'transparent',           border: 'var(--b2)' },
};

function TodoItem({ item, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const ps = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.LOW;

  return (
    <div
      style={{
        background: checked ? 'transparent' : ps.bg,
        border: `0.5px solid ${checked ? 'var(--b0)' : ps.border}`,
        borderRadius: 6,
        overflow: 'hidden',
        opacity: checked ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{ padding: '9px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggle(item.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: checked ? 'var(--live)' : 'var(--t2)', display: 'flex' }}
        >
          {checked ? <CheckCircle size={15} /> : <Circle size={15} />}
        </button>
        <span style={{ flex: 1, color: checked ? 'var(--t2)' : 'var(--t0)', fontSize: 12, textDecoration: checked ? 'line-through' : 'none' }}>
          {item.label}
        </span>
        <span
          className="nexus-tag"
          style={{ color: ps.color, borderColor: ps.border, background: 'transparent', fontSize: 9, flexShrink: 0 }}
        >
          {item.priority}
        </span>
        {expanded ? <ChevronDown size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} />}
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 10px 38px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6 }}>{item.detail}</div>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--acc2)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Open resource <ExternalLink size={10} />
            </a>
          )}
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
    try { return JSON.parse(localStorage.getItem('nexus_todo_checked') || '{}'); } catch { return {}; }
  });

  const toggle = (id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('nexus_todo_checked', JSON.stringify(next));
      return next;
    });
  };

  const totalItems = TODOS.flatMap(c => c.items).length;
  const doneCount  = Object.values(checked).filter(Boolean).length;
  const criticalLeft = TODOS.flatMap(c => c.items).filter(i => i.priority === 'CRITICAL' && !checked[i.id]).length;

  return (
    <div className="flex flex-col h-full overflow-auto p-5 gap-5" style={{ maxWidth: 860 }}>
      {/* Header */}
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
          NEXUSOS — SETUP TODO
        </div>
        <div className="flex items-center gap-4" style={{ color: 'var(--t1)', fontSize: 12 }}>
          <span>{doneCount}/{totalItems} complete</span>
          {criticalLeft > 0 && (
            <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={11} /> {criticalLeft} critical item{criticalLeft !== 1 ? 's' : ''} outstanding
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="nexus-bar" style={{ marginTop: 10 }}>
          <div className="nexus-bar-fill" style={{ width: `${(doneCount / totalItems) * 100}%`, background: criticalLeft > 0 ? 'var(--warn)' : 'var(--live)', height: 4 }} />
        </div>
      </div>

      {TODOS.map(cat => {
        const catDone = cat.items.filter(i => checked[i.id]).length;
        return (
          <div key={cat.category}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: cat.color, fontSize: 10, letterSpacing: '0.12em', fontWeight: 600 }}>{cat.category.toUpperCase()}</span>
              <span style={{ color: 'var(--t2)', fontSize: 10 }}>{catDone}/{cat.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cat.items.map(item => (
                <TodoItem key={item.id} item={item} checked={!!checked[item.id]} onToggle={toggle} />
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ color: 'var(--t3)', fontSize: 10, textAlign: 'center', paddingBottom: 20 }}>
        Check state is saved locally in this browser · This page is only visible to PIONEER+ rank
      </div>
    </div>
  );
}