import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { LogOut, Monitor, Columns, Bell, Key } from 'lucide-react';

const RANK_COLORS = {
  PIONEER: '#c8a84b', FOUNDER: '#9b6fd6', VOYAGER: '#4a8fd0',
  SCOUT: '#27c96a', VAGRANT: '#8890a8', AFFILIATE: '#4a5068',
};

function Section({ title, children }) {
  return (
    <div className="nexus-card" style={{ padding: '16px' }}>
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
        {description && <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{description}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function NexusSettings() {
  const { rank, callsign } = useOutletContext() || {};
  const navigate = useNavigate();
  const rankColor = RANK_COLORS[rank] || 'var(--t2)';
  const discordId = localStorage.getItem('nexus_discord_id') || '—';

  const [defaultLayout, setDefaultLayout] = useState(localStorage.getItem('nexus_layout') || 'alt-tab');
  const [notifications, setNotifications] = useState({ ops: true, rescue: true, scout: false });

  const toggleNotif = (k) => setNotifications(n => ({ ...n, [k]: !n[k] }));

  const saveLayout = (val) => {
    setDefaultLayout(val);
    localStorage.setItem('nexus_layout', val);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_session');
    localStorage.removeItem('nexus_discord_id');
    localStorage.removeItem('nexus_callsign');
    localStorage.removeItem('nexus_rank');
    navigate('/gate');
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto h-full" style={{ maxWidth: 600 }}>
      {/* Identity */}
      <Section title="IDENTITY">
        <div className="flex items-center gap-3" style={{ padding: '8px 12px', background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: rankColor }} />
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{callsign || '—'}</div>
            <div style={{ color: rankColor, fontSize: 10, letterSpacing: '0.08em' }}>{rank || '—'}</div>
          </div>
        </div>
        <Row label="Discord ID" description="Your linked Discord account">
          <span style={{ color: 'var(--t1)', fontSize: 11, fontFamily: 'monospace' }}>{discordId}</span>
        </Row>
      </Section>

      {/* Layout */}
      <Section title="DISPLAY">
        <Row label="Default Layout Mode" description="Preferred window mode on launch">
          <div className="flex gap-2">
            <button onClick={() => saveLayout('alt-tab')} className="nexus-btn" style={{ padding: '5px 10px', fontSize: 10, background: defaultLayout === 'alt-tab' ? 'var(--bg4)' : 'var(--bg2)', borderColor: defaultLayout === 'alt-tab' ? 'var(--b3)' : 'var(--b1)' }}>
              <Monitor size={11}/> ALT-TAB
            </button>
            <button onClick={() => saveLayout('2nd-monitor')} className="nexus-btn" style={{ padding: '5px 10px', fontSize: 10, background: defaultLayout === '2nd-monitor' ? 'var(--bg4)' : 'var(--bg2)', borderColor: defaultLayout === '2nd-monitor' ? 'var(--b3)' : 'var(--b1)' }}>
              <Columns size={11}/> 2ND MON
            </button>
          </div>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="NOTIFICATIONS">
        {[
          { key: 'ops', label: 'Op Announcements', description: 'New ops published & live alerts' },
          { key: 'rescue', label: 'Distress Calls', description: 'MAYDAY broadcasts from org members' },
          { key: 'scout', label: 'Scout Deposits', description: 'High-value deposits reported' },
        ].map(n => (
          <Row key={n.key} label={n.label} description={n.description}>
            <button
              onClick={() => toggleNotif(n.key)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: notifications[n.key] ? 'var(--live)' : 'var(--bg4)',
                border: `0.5px solid ${notifications[n.key] ? 'var(--live)' : 'var(--b3)'}`,
                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: 'var(--bg0)',
                position: 'absolute', top: 2, left: notifications[n.key] ? 18 : 2, transition: 'left 0.2s',
              }} />
            </button>
          </Row>
        ))}
      </Section>

      {/* Admin */}
      {['PIONEER','FOUNDER'].includes(rank) && (
        <Section title="ADMINISTRATION">
          <Row label="Key Management" description="Issue and revoke member auth keys">
            <button onClick={() => navigate('/app/admin/keys')} className="nexus-btn" style={{ padding: '5px 12px', fontSize: 11 }}>
              <Key size={11}/> OPEN
            </button>
          </Row>
        </Section>
      )}

      {/* Sign out */}
      <Section title="SESSION">
        <Row label="Sign Out" description="Clear session and return to Access Gate">
          <button onClick={handleLogout} className="nexus-btn danger" style={{ padding: '5px 12px', fontSize: 11 }}>
            <LogOut size={11}/> SIGN OUT
          </button>
        </Row>
      </Section>
    </div>
  );
}