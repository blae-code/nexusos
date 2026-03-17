import React, { useEffect, useState } from 'react';
import { Bell, Columns, LogOut, Monitor, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { useNotificationPreferences } from '@/lib/notification-preferences';
import { useSession } from '@/lib/SessionContext';

const RANK_COLORS = {
  PIONEER: 'var(--warn)',
  FOUNDER: 'var(--acc2)',
  VOYAGER: 'var(--info)',
  SCOUT: 'var(--live)',
  VAGRANT: 'var(--t1)',
  AFFILIATE: 'var(--t2)',
  SYSTEM_ADMIN: 'var(--info)',
};

function Section({ title, children }) {
  return (
    <div className="nexus-card" style={{ padding: 16 }}>
      <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 14 }}>{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 12 }}>{label}</div>
        {description ? <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{description}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function normalizeCallsign(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function NexusSettings() {
  const { user, source, logout, patchUser } = useSession();
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const layoutMode = outletContext.layoutMode;
  const setLayoutMode = outletContext.setLayoutMode;
  const isAdmin = source === 'admin';
  const {
    preferences: notifications,
    permission: notificationPermission,
    browserSupported,
    setPreference,
    requestPermission,
  } = useNotificationPreferences();
  const [draftCallsign, setDraftCallsign] = useState(isAdmin ? '' : (user?.callsign || ''));
  const [savingCallsign, setSavingCallsign] = useState(false);
  const [callsignSaved, setCallsignSaved] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    setDraftCallsign(isAdmin ? '' : (user?.callsign || ''));
  }, [user?.callsign, isAdmin]);

  const rankColor = RANK_COLORS[isAdmin ? 'SYSTEM_ADMIN' : (user?.rank || 'AFFILIATE')];
  const canEditCallsign = !isAdmin && Boolean(user?.id);

  const toggleNotif = (key) => setPreference(key, (current) => !current);

  const enableBrowserAlerts = async () => {
    setRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setRequestingPermission(false);
    }
  };

  const saveCallsign = async () => {
    const nextCallsign = normalizeCallsign(draftCallsign);
    if (!nextCallsign || !user?.id || !canEditCallsign) return;

    setSavingCallsign(true);
    try {
      await base44.entities.NexusUser.update(user.id, { callsign: nextCallsign });
      patchUser({ callsign: nextCallsign });
      setDraftCallsign(nextCallsign);
      setCallsignSaved(true);
      window.setTimeout(() => setCallsignSaved(false), 1600);
    } finally {
      setSavingCallsign(false);
    }
  };

  return (
    <div className="nexus-page-enter flex flex-col gap-4 p-4 overflow-auto h-full" style={{ maxWidth: 680 }}>
      <Section title="IDENTITY">
        <div
          className="flex items-center gap-3"
          style={{ padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 6 }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: rankColor }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>
              {isAdmin ? 'System Administrator' : (user?.callsign || '—')}
            </div>
            <div style={{ color: rankColor, fontSize: 10, letterSpacing: '0.08em' }}>
              {isAdmin ? 'SUDO' : (user?.rank || '—')}
            </div>
          </div>
        </div>



        {!isAdmin && (
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 12, marginBottom: 8 }}>Callsign</div>
            <div className="flex items-center gap-2">
              <input
                className="nexus-input"
                value={draftCallsign}
                onChange={(event) => setDraftCallsign(event.target.value)}
                disabled={!canEditCallsign || savingCallsign}
                placeholder="NOMAD-01"
                style={{ textTransform: 'uppercase' }}
              />
              <button
                onClick={saveCallsign}
                disabled={!canEditCallsign || savingCallsign || normalizeCallsign(draftCallsign) === (user?.callsign || '')}
                className="nexus-btn primary"
                style={{ padding: '6px 12px', fontSize: 10 }}
              >
                <Save size={11} />
                {savingCallsign ? 'SAVING' : callsignSaved ? 'SAVED' : 'SAVE'}
              </button>
            </div>
            <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 6 }}>
              First login seeds this from your Discord server nickname. After that, NexusOS keeps the saved callsign.
            </div>
          </div>
        )}
      </Section>

      <Section title="DISPLAY">
        <Row label="Default Layout Mode" description="Shared across the shell and live op command center">
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutMode?.('ALT-TAB')}
              className="nexus-btn"
              style={{ padding: '5px 10px', fontSize: 10, background: layoutMode === 'ALT-TAB' ? 'var(--bg4)' : 'var(--bg2)', borderColor: layoutMode === 'ALT-TAB' ? 'var(--b3)' : 'var(--b1)' }}
            >
              <Monitor size={11} />
              ALT-TAB
            </button>
            <button
              onClick={() => setLayoutMode?.('2ND MONITOR')}
              className="nexus-btn"
              style={{ padding: '5px 10px', fontSize: 10, background: layoutMode === '2ND MONITOR' ? 'var(--bg4)' : 'var(--bg2)', borderColor: layoutMode === '2ND MONITOR' ? 'var(--b3)' : 'var(--b1)' }}
            >
              <Columns size={11} />
              2ND MONITOR
            </button>
          </div>
        </Row>
      </Section>

      <Section title="NOTIFICATIONS">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 10px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
            borderRadius: 6,
          }}
        >
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 12 }}>Browser Alerts</div>
            <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
              {!browserSupported
                ? 'This runtime does not expose the browser Notification API.'
                : notificationPermission === 'granted'
                  ? 'Allowed — NexusOS can raise alerts when the app is in the background.'
                  : notificationPermission === 'denied'
                    ? 'Blocked in this browser. Re-enable notifications in browser site settings.'
                    : 'Optional — enable browser permission to receive background alerts.'}
            </div>
          </div>
          {browserSupported && notificationPermission !== 'granted' ? (
            <button
              type="button"
              onClick={enableBrowserAlerts}
              disabled={requestingPermission}
              className="nexus-btn"
              style={{ padding: '5px 12px', fontSize: 10 }}
            >
              <Bell size={11} />
              {requestingPermission ? 'REQUESTING' : 'ENABLE'}
            </button>
          ) : null}
        </div>

        {[
          { key: 'ops', label: 'Op Announcements', description: 'New live ops and command alerts' },
          { key: 'rescue', label: 'Distress Calls', description: 'Local rescue-board MAYDAY activity and active-call badges' },
          { key: 'scout', label: 'Scout Deposits', description: 'High-value deposit reports when the app is backgrounded' },
        ].map((item) => (
          <Row key={item.key} label={item.label} description={item.description}>
            <button
              onClick={() => toggleNotif(item.key)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: notifications[item.key] ? 'var(--live)' : 'var(--bg4)',
                border: `0.5px solid ${notifications[item.key] ? 'var(--live)' : 'var(--b3)'}`,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: 'var(--bg0)',
                  position: 'absolute',
                  top: 2,
                  left: notifications[item.key] ? 18 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </Row>
        ))}
      </Section>

      <Section title="SESSION">
        <Row label="Sign Out" description="Clear your current session and return to the Access Gate">
          <button onClick={() => logout('/')} className="nexus-btn danger-btn" style={{ padding: '5px 12px', fontSize: 11 }}>
            <LogOut size={11} />
            SIGN OUT
          </button>
        </Row>
      </Section>
    </div>
  );
}