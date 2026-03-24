import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { authApi } from '@/core/data/auth-api';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';

const REQUIRED_SECRETS = [
  { id: 'UEX_API_KEY', label: 'UEX API Key' },
  { id: 'SC_API_KEY', label: 'StarCitizen API Key' },
  { id: 'SESSION_SIGNING_SECRET', label: 'Session Signing Secret' },
  { id: 'SYSTEM_ADMIN_BOOTSTRAP_SECRET', label: 'System Admin Bootstrap Secret' },
  { id: 'APP_URL', label: 'App URL' },
];

const PUBLIC_CONFIG = [
  { id: 'AUTH_MODE', label: 'Auth Mode', value: 'Issued Key' },
  { id: 'INVITE_FLOW', label: 'Invite Flow', value: 'Pioneer Issued' },
  { id: 'FLEETYARDS_HANDLE', label: 'FleetYards Handle', value: 'blae' },
  { id: 'RSI_ORG_SID', label: 'RSI Org SID', value: 'RSNM' },
];

function StatusChip({ ok, label }) {
  const color = ok ? '#27C96A' : '#E04848';
  const background = ok ? 'rgba(39,201,106,0.12)' : 'rgba(224,72,72,0.12)';
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 3, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', background, color }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function AdminSettings() {
  const { isAdmin } = useSession();
  const [secrets, setSecrets] = useState({});
  const [environment, setEnvironment] = useState(/** @type {{ app_url?: string | null }} */ ({}));
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState({});
  const [testingSecretId, setTestingSecretId] = useState('');
  const [authHealth, setAuthHealth] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;

    Promise.all([
      base44.functions.invoke('getSecretStatus', {}),
      authApi.getHealth(),
    ]).then(([secretRes, healthRes]) => {
      if (!active) return;
      const payload = secretRes?.data || secretRes || {};
      setSecrets(payload?.secrets || {});
      setEnvironment(payload?.environment || {});
      setAuthHealth(healthRes || null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setSecrets({});
      setEnvironment({});
      setAuthHealth(null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const runSecretTest = async (secretId) => {
    setTestingSecretId(secretId);
    try {
      const response = await base44.functions.invoke('testApiConnection', { secretId });
      const payload = response?.data || response || {};
      setTestResults((current) => ({ ...current, [secretId]: payload }));
    } catch (error) {
      setTestResults((current) => ({
        ...current,
        [secretId]: { success: false, error: error?.message || 'test_failed', timestamp: new Date().toISOString() },
      }));
    } finally {
      setTestingSecretId('');
    }
  };

  const configuredCount = useMemo(
    () => REQUIRED_SECRETS.filter((item) => secrets[item.id]?.configured).length,
    [secrets],
  );

  const appUrl = environment?.app_url || null;

  const launchReady = Boolean(
    authHealth?.ok
    && authHealth?.auth_mode === 'issued_key'
    && REQUIRED_SECRETS.every((item) => secrets[item.id]?.configured),
  );

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
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Deployment Readiness</div>
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}>Launch Readiness</div>
          <StatusChip ok={launchReady} label={launchReady ? 'Ready For Smoke' : 'Needs Attention'} />
        </div>
        <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>
          {configuredCount}/{REQUIRED_SECRETS.length} required deployment values detected. Auth runtime reports <strong style={{ color: 'var(--t1)' }}>{authHealth?.auth_mode || 'unknown'}</strong>.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 10px', background: 'var(--bg1)', borderRadius: 3, fontSize: 10, color: 'var(--t1)' }}>
            Remember Me: <strong style={{ color: authHealth?.remember_me_supported ? '#27C96A' : '#E04848' }}>{authHealth?.remember_me_supported ? 'SUPPORTED' : 'UNKNOWN'}</strong>
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--bg1)', borderRadius: 3, fontSize: 10, color: 'var(--t1)' }}>
            APP_URL: <strong style={{ color: appUrl ? 'var(--t0)' : '#E04848' }}>{appUrl || 'UNSET'}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REQUIRED_SECRETS.map((secret) => {
          const status = secrets[secret.id] || { configured: false, protected: false };
          const testResult = testResults[secret.id];
          const isTestable = secret.id === 'UEX_API_KEY' || secret.id === 'SC_API_KEY';

          return (
            <div key={secret.id} style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500 }}>{secret.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {status.protected ? <StatusChip ok label="Protected" /> : null}
                  <StatusChip ok={status.configured} label={status.configured ? 'Configured' : 'Missing'} />
                </div>
              </div>

              {isTestable ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                    {testResult
                      ? (
                        <span style={{ color: testResult.success ? '#27C96A' : '#E04848' }}>
                          {testResult.success ? 'Connection ok' : `Connection failed${testResult.error ? ` · ${testResult.error}` : ''}`}
                        </span>
                      )
                      : 'No connectivity test run yet.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => runSecretTest(secret.id)}
                    disabled={!status.configured || Boolean(testingSecretId)}
                    style={{
                      padding: '4px 10px',
                      background: 'transparent',
                      border: '0.5px solid var(--b1)',
                      borderRadius: 3,
                      color: status.configured ? 'var(--t1)' : 'var(--t3)',
                      cursor: !status.configured || testingSecretId ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 9,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={11} />
                    {testingSecretId === secret.id ? 'TESTING...' : 'TEST'}
                  </button>
                </div>
              ) : (
                <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                  Deployment-managed only. Configure in the hosting environment, not inside NexusOS.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
        <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Auth Runtime</div>
        {authHealth ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip ok={authHealth.ok} label={authHealth.ok ? 'Healthy' : 'Unhealthy'} />
              <div style={{ color: 'var(--t1)', fontSize: 11 }}>Mode: <strong style={{ color: 'var(--t0)' }}>{authHealth.auth_mode || 'unknown'}</strong></div>
            </div>
            {Array.isArray(authHealth.onboarding_steps) && authHealth.onboarding_steps.length > 0 ? (
              <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.7 }}>
                {authHealth.onboarding_steps.map((step, index) => (
                  <div key={step}>{index + 1}. {step}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E8A020', fontSize: 11 }}>
            <ShieldAlert size={14} />
            Unable to read auth runtime health.
          </div>
        )}
      </div>

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

      <div style={{ padding: '12px 14px', background: 'rgba(232,160,32,0.08)', border: '0.5px solid rgba(232,160,32,0.25)', borderRadius: 3, display: 'flex', gap: 10 }}>
        <AlertTriangle size={15} style={{ color: '#E8A020', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.6 }}>
          NexusOS no longer edits deployment secrets in-app. Use this page to verify readiness, then update secrets and automations directly in the deployment environment before publishing live.
        </div>
      </div>
    </div>
  );
}
