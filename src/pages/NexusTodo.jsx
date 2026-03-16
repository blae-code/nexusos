import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  RefreshCw,
  ScanSearch,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { safeLocalStorage } from '@/lib/safe-storage';

const MANUAL_STORAGE_KEY = 'nexus_todo_checked';

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
        id: 'DISCORD_PUBLIC_KEY',
        label: 'Set DISCORD_PUBLIC_KEY for signed Discord interactions',
        detail: 'Discord Developer Portal → General Information. Required so Herald Bot can verify button and interaction requests from Discord.',
        priority: 'HIGH',
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
        id: 'NEXUSOS_PUBLIC_URL',
        label: 'Set NEXUSOS_PUBLIC_URL for Herald Bot embed assets',
        detail: 'Used by Herald Bot token thumbnails and deep links embedded in Discord posts.',
        priority: 'HIGH',
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
    category: 'Features — Remaining Integrations',
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
        label: 'Register Discord Interactions Endpoint URL for RSVP buttons',
        detail: 'The signed-request code path is implemented already. Remaining work is the Discord Developer Portal endpoint registration.',
        priority: 'HIGH',
      },
      {
        id: 'PATCH_WATCHER',
        label: 'Enable the scheduled patch watcher and digest cron',
        detail: 'rssCheck, patchDigest, and Herald Bot alerting are implemented. Remaining work is enabling the scheduled job in Base44.',
        priority: 'MEDIUM',
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

const STATUS_TAGS = {
  auto_ready: { label: 'AUTO', color: 'var(--live)', border: 'var(--live-b)', bg: 'var(--live-bg)' },
  auto_missing: { label: 'MISSING', color: 'var(--warn)', border: 'var(--warn-b)', bg: 'var(--warn-bg)' },
  manual_done: { label: 'MANUAL', color: 'var(--info)', border: 'var(--info-b)', bg: 'var(--info-bg)' },
  future: { label: 'FUTURE', color: 'var(--acc2)', border: 'var(--b2)', bg: 'var(--bg2)' },
  unverified: { label: 'CHECK', color: 'var(--t2)', border: 'var(--b1)', bg: 'var(--bg2)' },
};

function loadManualChecks() {
  try {
    return JSON.parse(safeLocalStorage.getItem(MANUAL_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function buildLocalAutoStatus() {
  return {
    VITE_BASE44_APP_ID: Boolean(appParams.appId && appParams.serverUrl && appParams.functionsVersion),
  };
}

function getItemState(itemId, manualChecked, autoChecked, autoDetails) {
  const auto = autoChecked[itemId];
  if (typeof auto === 'boolean') {
    return {
      checked: auto,
      source: auto ? 'auto_ready' : 'auto_missing',
      locked: true,
      detail: autoDetails[itemId] || '',
    };
  }

  return {
    checked: Boolean(manualChecked[itemId]),
    source: manualChecked[itemId] ? 'manual_done' : 'unverified',
    locked: false,
    detail: autoDetails[itemId] || '',
  };
}

function TodoItem({ item, state, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const priorityStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.LOW;
  const statusTag = STATUS_TAGS[item.priority === 'FUTURE' ? 'future' : state.source] || STATUS_TAGS.unverified;

  return (
    <div
      style={{
        background: state.checked ? 'transparent' : priorityStyle.bg,
        border: `0.5px solid ${state.checked ? 'var(--b0)' : priorityStyle.border}`,
        borderRadius: 6,
        overflow: 'hidden',
        opacity: state.checked ? 0.55 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{ padding: '9px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded((open) => !open)}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(item.id, state.locked);
          }}
          disabled={state.locked || item.priority === 'FUTURE'}
          style={{
            background: 'none',
            border: 'none',
            cursor: state.locked || item.priority === 'FUTURE' ? 'default' : 'pointer',
            padding: 0,
            flexShrink: 0,
            color: state.checked ? 'var(--live)' : state.locked ? 'var(--warn)' : 'var(--t2)',
            display: 'flex',
            opacity: state.locked || item.priority === 'FUTURE' ? 0.9 : 1,
          }}
        >
          {state.checked ? <CheckCircle size={15} /> : state.locked ? <AlertTriangle size={15} /> : <Circle size={15} />}
        </button>
        <span style={{ flex: 1, color: state.checked ? 'var(--t2)' : 'var(--t0)', fontSize: 12, textDecoration: state.checked ? 'line-through' : 'none' }}>
          {item.label}
        </span>
        <span className="nexus-tag" style={{ color: priorityStyle.color, borderColor: priorityStyle.border, background: 'transparent', fontSize: 9, flexShrink: 0 }}>
          {item.priority}
        </span>
        <span
          className="nexus-tag"
          style={{
            color: statusTag.color,
            borderColor: statusTag.border,
            background: statusTag.bg,
            fontSize: 9,
            flexShrink: 0,
          }}
        >
          {statusTag.label}
        </span>
        {expanded ? <ChevronDown size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: 'var(--t2)', flexShrink: 0 }} />}
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 10px 38px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6 }}>{item.detail}</div>
          {state.detail ? (
            <div
              style={{
                color: 'var(--t2)',
                fontSize: 10,
                lineHeight: 1.6,
                background: 'var(--bg3)',
                border: '0.5px solid var(--b1)',
                borderRadius: 4,
                padding: '7px 8px',
              }}
            >
              {state.detail}
            </div>
          ) : null}
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
  const [manualChecked, setManualChecked] = useState(loadManualChecks);
  const [remoteAutoChecked, setRemoteAutoChecked] = useState({});
  const [remoteAutoDetails, setRemoteAutoDetails] = useState({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState('');

  const autoChecked = useMemo(() => ({
    ...remoteAutoChecked,
    ...buildLocalAutoStatus(),
  }), [remoteAutoChecked]);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError('');

    try {
      const response = await base44.functions.invoke('setupStatus', {});
      const payload = response?.data || response || {};
      setRemoteAutoChecked(payload.items || {});
      setRemoteAutoDetails(payload.details || {});
      setLastCheckedAt(payload.checked_at || new Date().toISOString());
    } catch (error) {
      console.warn('[NexusTodo] setup status lookup failed:', error?.message || error);
      setStatusError('Automatic setup detection is unavailable in this runtime.');
      setRemoteAutoChecked({});
      setRemoteAutoDetails({});
      setLastCheckedAt('');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const toggle = useCallback((id, locked) => {
    if (locked) {
      return;
    }

    setManualChecked((previous) => {
      const next = { ...previous, [id]: !previous[id] };
      safeLocalStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const allItems = useMemo(() => TODOS.flatMap((category) => category.items), []);
  const itemStates = useMemo(() => {
    return allItems.reduce((acc, item) => {
      acc[item.id] = getItemState(item.id, manualChecked, autoChecked, remoteAutoDetails);
      return acc;
    }, {});
  }, [allItems, autoChecked, manualChecked, remoteAutoDetails]);

  const totalItems = allItems.length;
  const doneCount = allItems.filter((item) => itemStates[item.id]?.checked).length;
  const criticalLeft = allItems.filter((item) => item.priority === 'CRITICAL' && !itemStates[item.id]?.checked).length;
  const autoReadyCount = allItems.filter((item) => itemStates[item.id]?.source === 'auto_ready').length;
  const manualCount = allItems.filter((item) => itemStates[item.id]?.source === 'manual_done').length;

  return (
    <div className="flex flex-col h-full overflow-auto p-5 gap-5" style={{ maxWidth: 900 }}>
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
          NEXUSOS — SETUP TODO
        </div>
        <div className="flex items-center gap-4 flex-wrap" style={{ color: 'var(--t1)', fontSize: 12 }}>
          <span>{doneCount}/{totalItems} complete</span>
          <span>{autoReadyCount} auto-detected</span>
          <span>{manualCount} manual</span>
          {criticalLeft > 0 ? (
            <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={11} /> {criticalLeft} critical item{criticalLeft !== 1 ? 's' : ''} outstanding
            </span>
          ) : null}
          <button
            type="button"
            onClick={refreshStatus}
            className="nexus-btn"
            style={{ padding: '5px 10px', fontSize: 10, marginLeft: 'auto' }}
            disabled={loadingStatus}
          >
            <RefreshCw size={11} style={{ animation: loadingStatus ? 'spin 1s linear infinite' : 'none' }} />
            {loadingStatus ? 'CHECKING' : 'REFRESH STATUS'}
          </button>
        </div>
        <div className="nexus-bar-bg" style={{ marginTop: 10, height: 4 }}>
          <div className="nexus-bar-fill" style={{ width: `${(doneCount / totalItems) * 100}%`, background: criticalLeft > 0 ? 'var(--warn)' : 'var(--live)', height: 4 }} />
        </div>
        <div style={{ color: 'var(--t3)', fontSize: 10, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScanSearch size={11} />
          {lastCheckedAt ? `Automatic checks refreshed ${new Date(lastCheckedAt).toLocaleString()}` : 'Automatic checks use backend env status plus frontend app boot config.'}
        </div>
        {statusError ? (
          <div style={{ marginTop: 10, color: 'var(--warn)', fontSize: 11, background: 'var(--warn-bg)', border: '0.5px solid var(--warn-b)', borderRadius: 6, padding: '8px 10px' }}>
            {statusError}
          </div>
        ) : null}
      </div>

      {TODOS.map((category) => {
        const categoryDone = category.items.filter((item) => itemStates[item.id]?.checked).length;
        return (
          <div key={category.category}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: category.color, fontSize: 10, letterSpacing: '0.12em', fontWeight: 600 }}>{category.category.toUpperCase()}</span>
              <span style={{ color: 'var(--t2)', fontSize: 10 }}>{categoryDone}/{category.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {category.items.map((item) => (
                <TodoItem
                  key={item.id}
                  item={item}
                  state={itemStates[item.id]}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ color: 'var(--t3)', fontSize: 10, textAlign: 'center', paddingBottom: 20 }}>
        Auto-detected items are read-only · Manual checks stay in this browser for setup operators · Future work stays intentionally unchecked
      </div>
    </div>
  );
}
