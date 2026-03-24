import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { Eye, EyeOff } from 'lucide-react';

const SECRETS = [
  { id: 'UEX_API_KEY', label: 'UEX API Key', envVar: 'UEX_API_KEY' },
  { id: 'SC_API_KEY', label: 'StarCitizen API Key', envVar: 'SC_API_KEY' },
];

const PUBLIC_CONFIG = [
  { id: 'AUTH_MODE', label: 'Auth Mode', value: 'Issued Key' },
  { id: 'INVITE_FLOW', label: 'Invite Flow', value: 'Pioneer Issued' },
  { id: 'FLEETYARDS_HANDLE', label: 'FleetYards Handle', value: 'blae' },
  { id: 'RSI_ORG_SID', label: 'RSI Org SID', value: 'RSNM' },
];

function obfuscate(value) {
  if (!value || value.length < 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-3);
}

function SecretInput({ secret, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(secret.id, input);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}>{secret.label}</div>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={saving}
          style={{
            padding: '4px 8px',
            fontSize: 9,
            background: editing ? 'rgba(var(--live-rgb), 0.12)' : 'transparent',
            border: `0.5px solid ${editing ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b1)'}`,
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: editing ? 'var(--live)' : 'var(--t1)',
          }}
        >
          {saving ? 'SAVING...' : editing ? 'SAVE' : 'EDIT'}
        </button>
      </div>

      {editing ? (
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 10px',
              background: 'var(--bg1)',
              border: '0.5px solid var(--b2)',
              borderRadius: 3,
              color: 'var(--t0)',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
            placeholder="Enter value..."
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--t2)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'monospace', background: 'var(--bg1)', padding: '6px 8px', borderRadius: 3 }}>
          {value ? obfuscate(value) : <span style={{ color: 'var(--t3)' }}>Not configured</span>}
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { isAdmin } = useSession();
  const [secrets, setSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    if (!isAdmin) return;
    // Load current secrets from environment (backend will only return non-null if set)
    base44.functions.invoke('getSecretStatus', {}).then((res) => {
      setSecrets(res.data || {});
      setLoading(false);
    });
  }, [isAdmin]);

  const handleSaveSecret = async (secretId, value) => {
    await base44.functions.invoke('saveSecret', { secretId, value });
    setSecrets((prev) => ({ ...prev, [secretId]: value }));
  };

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: '#08080A', gap: 16 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.12 }}>
          <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
          <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
          <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.6" />
          <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
        </svg>
        <div style={{ fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif", fontSize: 36, color: '#C0392B', textTransform: 'uppercase' }}>ACCESS DENIED</div>
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', letterSpacing: '0.22em', textTransform: 'uppercase' }}>PIONEER CLEARANCE REQUIRED</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, animation: 'pageEntrance 200ms ease-out' }}>
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ADMIN SETTINGS</div>
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Deployment Configuration</div>
      </div>

      {/* Secret Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SECRETS.map((secret) => (
          <SecretInput
            key={secret.id}
            secret={secret}
            value={secrets[secret.id]}
            onSave={handleSaveSecret}
          />
        ))}
      </div>

      {/* Public Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PUBLIC_CONFIG.map((item) => (
          <div key={item.id} style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
            <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--acc2)', fontFamily: 'monospace', background: 'var(--bg1)', padding: '6px 8px', borderRadius: 3 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Protected Deployment Secrets</div>
        <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6 }}>
          <div>`SESSION_SIGNING_SECRET`, `SYSTEM_ADMIN_BOOTSTRAP_SECRET`, and `APP_URL` remain deployment-managed and are not editable from NexusOS.</div>
        </div>
      </div>
    </div>
  );
}
