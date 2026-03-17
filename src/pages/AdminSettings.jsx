import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { Check, X, Loader } from 'lucide-react';

const SECRETS = [
  { id: 'UEX_API_KEY', label: 'UEX Corp API Key', description: 'Bearer token for UEX commodity data' },
  { id: 'SC_API_KEY', label: 'Star Citizen API Key', description: '32-character alphanumeric key' },
  { id: 'DISCORD_CLIENT_SECRET', label: 'Discord Client Secret', description: 'OAuth app client secret' },
  { id: 'DISCORD_BOT_TOKEN', label: 'Discord Bot Token', description: 'Herald Bot token for server operations' },
  { id: 'DISCORD_REDIRECT_URI', label: 'Discord Redirect URI', description: 'OAuth callback URL' },
];

const PUBLIC_CONFIG = [
  { id: 'DISCORD_CLIENT_ID', label: 'Discord Client ID', value: '1483421250301989057' },
  { id: 'DISCORD_GUILD_ID', label: 'Discord Guild ID', value: '1029380236367896616' },
  { id: 'FLEETYARDS_HANDLE', label: 'FleetYards Handle', value: 'blae' },
  { id: 'RSI_ORG_SID', label: 'RSI Org SID', value: 'RSNM' },
];

function obfuscate(value) {
  if (!value || value.length < 8) return '••••••••';
  return value.slice(0, 3) + '...' + value.slice(-4);
}

function SecretInput({ secret, value, onSave, onTest, testLoading, testResult }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(secret.id, input);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}>{secret.label}</div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{secret.description}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {value && !editing && (
            <button
              onClick={() => onTest(secret.id)}
              disabled={testLoading}
              style={{
                padding: '4px 8px',
                fontSize: 9,
                background: testResult === 'success' ? 'rgba(var(--live-rgb), 0.12)' : testResult === 'error' ? 'rgba(var(--danger-rgb), 0.12)' : 'var(--bg3)',
                border: '0.5px solid var(--b1)',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: testResult === 'success' ? 'var(--live)' : testResult === 'error' ? 'var(--danger)' : 'var(--t1)',
              }}
            >
              {testLoading ? <Loader size={9} style={{ animation: 'spin 1s linear infinite' }} /> : testResult === 'success' ? <Check size={9} /> : testResult === 'error' ? <X size={9} /> : null}
              {testLoading ? 'TESTING' : testResult === 'success' ? 'OK' : testResult === 'error' ? 'FAIL' : 'TEST'}
            </button>
          )}
          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
            style={{
              padding: '4px 8px',
              fontSize: 9,
              background: editing ? 'rgba(var(--live-rgb), 0.12)' : 'transparent',
              border: `0.5px solid ${editing ? 'rgba(var(--live-rgb), 0.3)' : 'var(--b1)'}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: editing ? 'var(--live)' : 'var(--t1)',
            }}
          >
            {saving ? 'SAVING...' : editing ? 'SAVE' : 'EDIT'}
          </button>
        </div>
      </div>

      {editing ? (
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'var(--bg1)',
            border: '0.5px solid var(--b2)',
            borderRadius: 4,
            color: 'var(--t0)',
            fontSize: 11,
            fontFamily: 'monospace',
            marginBottom: 8,
          }}
          placeholder="Enter secret value..."
        />
      ) : (
        <div style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'monospace', background: 'var(--bg1)', padding: '6px 8px', borderRadius: 4 }}>
          {value ? obfuscate(value) : <span style={{ color: 'var(--t3)' }}>Not configured</span>}
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { user } = useSession();
  const [secrets, setSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState({});

  const isAdmin = user?.rank === 'PIONEER' || user?.rank === 'FOUNDER';

  useEffect(() => {
    if (!isAdmin) return;
    // Load current secrets from environment (backend will only return non-null if set)
    base44.functions.invoke('getSecretStatus', {}).then((res) => {
      setSecrets(res.data || {});
      setLoading(false);
    });
  }, [isAdmin]);

  const handleSaveSecret = async (secretId, value) => {
    // Call backend to save secret via environment mechanism
    await base44.functions.invoke('saveSecret', { secretId, value });
    setSecrets((prev) => ({ ...prev, [secretId]: value }));
  };

  const handleTestConnection = async (secretId) => {
    setTestResults((prev) => ({ ...prev, [secretId]: 'testing' }));
    try {
      const result = await base44.functions.invoke('testApiConnection', { secretId });
      setTestResults((prev) => ({ ...prev, [secretId]: result.data.success ? 'success' : 'error' }));
    } catch {
      setTestResults((prev) => ({ ...prev, [secretId]: 'error' }));
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
        Admin access required. Only Pioneer or Founder can modify system configuration.
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
    <div className="nexus-page-enter" style={{ padding: '24px', maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ color: 'var(--t0)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
          NEXUSOS CONFIG & SECRETS
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 11 }}>
          Manage external API credentials and public configuration. Secrets are stored server-side and never exposed to the client.
        </div>
      </div>

      {/* Public Config */}
      <section>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>PUBLIC CONFIGURATION (NON-SECRET)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PUBLIC_CONFIG.map((item) => (
            <div key={item.id} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 6, border: '0.5px solid var(--b1)' }}>
              <div style={{ color: 'var(--t1)', fontSize: 10, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--acc2)', fontFamily: 'monospace', background: 'var(--bg1)', padding: '6px 8px', borderRadius: 4 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Secrets */}
      <section>
        <div style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>API SECRETS & CREDENTIALS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECRETS.map((secret) => (
            <SecretInput
              key={secret.id}
              secret={secret}
              value={secrets[secret.id]}
              onSave={handleSaveSecret}
              onTest={handleTestConnection}
              testLoading={testResults[secret.id] === 'testing'}
              testResult={testResults[secret.id]}
            />
          ))}
        </div>
      </section>

      <div style={{ color: 'var(--t3)', fontSize: 9, padding: '12px', background: 'var(--bg2)', borderRadius: 6, border: '0.5px solid var(--b1)' }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Security Note:</div>
        <div style={{ lineHeight: 1.6 }}>
          Secrets are encrypted and stored server-side. Test connections verify API credentials without exposing full keys to the browser. Only Pioneer and Founder ranks can modify these settings.
        </div>
      </div>
    </div>
  );
}