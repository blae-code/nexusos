import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/core/data/auth-api';

function messageForResult(result) {
  switch (result?.error) {
    case 'invalid_recovery_token':
      return 'Recovery secret rejected. Check the exact SYSTEM_ADMIN_BOOTSTRAP_SECRET value and try again.';
    case 'session_secret_missing':
      return 'The auth runtime is missing SESSION_SIGNING_SECRET. System admin recovery cannot complete until deployment secrets are fixed.';
    case 'bootstrap_locked':
      return result?.recovery_enabled
        ? 'Emergency recovery is enabled. Enter the SYSTEM_ADMIN_BOOTSTRAP_SECRET below to regenerate the current system-admin key.'
        : 'Emergency recovery is disabled for this deployment. A currently signed-in Pioneer must repair system-admin from Key Management.';
    case 'already_bootstrapped':
      return 'System admin already exists. Recovery is only needed if the current key is lost or rejected.';
    case 'login_failed':
      return 'Recovery request failed unexpectedly. Try again in a moment.';
    default:
      return result?.message || result?.error || '';
  }
}

export default function Setup() {
  const [recoveryToken, setRecoveryToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(/** @type {null | { tone: 'info' | 'error' | 'success', text: string }} */ (null));
  const [health, setHealth] = useState(/** @type {null | { ok?: boolean, auth_mode?: string, remember_me_supported?: boolean }} */ (null));
  const [recoveryEnabled, setRecoveryEnabled] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapStatus() {
      try {
        const [healthRes, bootstrapRes] = await Promise.all([
          authApi.getHealth(),
          authApi.bootstrapSystemAdmin(),
        ]);

        if (cancelled) return;

        setHealth(healthRes || { ok: false });
        setRecoveryEnabled(Boolean(bootstrapRes?.recovery_enabled));
        if (bootstrapRes?.error) {
          setStatus({
            tone: bootstrapRes.error === 'bootstrap_locked' ? 'info' : 'error',
            text: messageForResult(bootstrapRes),
          });
        }
      } catch {
        if (cancelled) return;
        setHealth({ ok: false });
        setStatus({
          tone: 'error',
          text: 'Unable to check system-admin recovery status. The site may be unreachable from this device.',
        });
      }
    }

    bootstrapStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusColors = useMemo(() => ({
    info: { fg: '#C8A84B', border: 'rgba(200,168,75,0.24)', bg: 'rgba(200,168,75,0.08)' },
    error: { fg: '#C0392B', border: 'rgba(192,57,43,0.24)', bg: 'rgba(192,57,43,0.08)' },
    success: { fg: '#4A8C5C', border: 'rgba(74,140,92,0.26)', bg: 'rgba(74,140,92,0.10)' },
  }), []);

  const handleRecover = async (event) => {
    event.preventDefault();
    if (!recoveryToken.trim() || submitting) return;

    setSubmitting(true);
    setGenerated(null);
    setCopied(false);
    setStatus(null);

    try {
      const result = await authApi.bootstrapSystemAdmin({ recoveryToken: recoveryToken.trim() });
      setRecoveryEnabled(Boolean(result?.recovery_enabled) || recoveryEnabled);

      if (result?.key) {
        setGenerated({
          username: result.username || 'system-admin',
          callsign: result.callsign || 'SYSTEM-ADMIN',
          key: result.key,
        });
        setRecoveryToken('');
        setStatus({
          tone: 'success',
          text: 'System-admin key regenerated. Use the new issued key at the Access Gate immediately. The previous key is no longer valid.',
        });
      } else {
        setStatus({
          tone: result?.error === 'invalid_recovery_token' ? 'error' : 'info',
          text: messageForResult(result),
        });
      }
    } catch {
      setStatus({
        tone: 'error',
        text: 'Recovery request failed before the server returned a result. Check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!generated?.key) return;
    await navigator.clipboard.writeText(generated.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const tone = status?.tone ? statusColors[status.tone] : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0908 0%, #12090D 100%)',
      color: '#E8E4DC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      boxSizing: 'border-box',
      fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
    }}>
      <div style={{
        width: 'min(620px, 100%)',
        background: 'rgba(15, 15, 13, 0.96)',
        borderLeft: '2px solid #C0392B',
        borderTop: '1px solid rgba(232, 228, 220, 0.08)',
        borderRight: '1px solid rgba(232, 228, 220, 0.04)',
        borderBottom: '1px solid rgba(232, 228, 220, 0.04)',
        padding: '40px 36px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          fontFamily: "'Beyond Mars', 'Barlow Condensed', sans-serif",
          fontSize: 38,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          System Admin Recovery
        </div>
        <div style={{
          fontSize: 12,
          color: '#C8A84B',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          Emergency Key Regeneration
        </div>

        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: 14,
          color: '#9A9488',
          lineHeight: 1.8,
          marginBottom: 18,
        }}>
          This screen is for the fixed <strong style={{ color: '#E8E4DC' }}>system-admin</strong> account only.
          It uses the deployment&apos;s <strong style={{ color: '#E8E4DC' }}>SYSTEM_ADMIN_BOOTSTRAP_SECRET</strong> to
          regenerate a fresh issued auth key when the current one is lost or rejected.
        </div>

        <div style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 18,
          color: '#9A9488',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          <span>Auth Runtime: <strong style={{ color: health?.ok ? '#4A8C5C' : '#C0392B' }}>{health?.ok ? 'Online' : 'Offline'}</strong></span>
          <span>Mode: <strong style={{ color: '#E8E4DC' }}>{health?.auth_mode || 'unknown'}</strong></span>
          <span>Recovery: <strong style={{ color: recoveryEnabled ? '#4A8C5C' : '#C0392B' }}>{recoveryEnabled ? 'Enabled' : 'Disabled'}</strong></span>
        </div>

        {status && tone ? (
          <div style={{
            marginBottom: 18,
            padding: '12px 14px',
            background: tone.bg,
            border: `0.5px solid ${tone.border}`,
            color: tone.fg,
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            {status.text}
          </div>
        ) : null}

        <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{
            fontSize: 10,
            color: '#C8A84B',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            SYSTEM_ADMIN_BOOTSTRAP_SECRET
          </label>
          <input
            type="password"
            autoComplete="off"
            value={recoveryToken}
            onChange={(event) => setRecoveryToken(event.target.value)}
            placeholder="Enter recovery secret"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: '2px',
              color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '13px',
              letterSpacing: '0.08em',
              padding: '12px 14px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={submitting || !recoveryToken.trim() || !recoveryEnabled}
            style={{
              width: '100%',
              background: submitting ? '#7B2218' : '#C0392B',
              color: '#E8E4DC',
              border: 'none',
              borderRadius: '2px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '13px 20px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: (!recoveryToken.trim() || !recoveryEnabled) ? 0.55 : 1,
            }}
          >
            {submitting ? 'Recovering...' : 'Recover System Admin'}
          </button>
        </form>

        {generated ? (
          <div style={{
            marginTop: 18,
            padding: '16px 18px',
            background: '#08080A',
            border: '1px solid rgba(200,168,75,0.28)',
          }}>
            <div style={{
              color: '#C0392B',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Previous System-Admin Key Invalidated
            </div>
            <div style={{ color: '#9A9488', fontSize: 12, marginBottom: 12, lineHeight: 1.7 }}>
              Username: <strong style={{ color: '#E8E4DC' }}>{generated.username}</strong><br />
              Callsign: <strong style={{ color: '#E8E4DC' }}>{generated.callsign}</strong>
            </div>
            <code style={{
              display: 'block',
              color: '#C8A84B',
              fontSize: 16,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '0.08em',
              wordBreak: 'break-all',
              marginBottom: 12,
            }}>
              {generated.key}
            </code>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '0.5px solid rgba(200,168,75,0.3)',
                  color: copied ? '#4A8C5C' : '#C8A84B',
                  cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {copied ? 'Copied' : 'Copy Key'}
              </button>
              <Link
                to="/gate"
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '0.5px solid rgba(200,170,100,0.10)',
                  color: '#E8E4DC',
                  textDecoration: 'none',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Return To Access Gate
              </Link>
            </div>
          </div>
        ) : null}

        <div style={{
          marginTop: 20,
          color: '#6F6A61',
          fontSize: 11,
          lineHeight: 1.7,
        }}>
          Use this only for the fixed deployment admin account. Regular member keys must still be issued, revoked, or regenerated by a signed-in Pioneer from Key Management.
        </div>
      </div>
    </div>
  );
}
