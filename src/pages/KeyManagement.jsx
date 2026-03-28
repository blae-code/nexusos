import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Copy, RefreshCw, Shield } from 'lucide-react';
import { authApi } from '@/core/data/auth-api';
import { useSession } from '@/core/data/SessionContext';
import InviteMessageBuilder from '@/components/InviteMessageBuilder';
import { showToast } from '@/components/NexusToast';

const RANK_OPTIONS = ['PIONEER', 'FOUNDER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE'];
const SYSTEM_ADMIN_LOGIN = 'system-admin';
const SYSTEM_ADMIN_CALLSIGN = 'SYSTEM-ADMIN';

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function userStatus(user) {
  if (user.key_revoked) return 'REVOKED';
  if (user.joined_at) return 'REGISTERED';
  return 'INVITED';
}

function GeneratedKeyPanel({ generatedKey, copied, onCopy }) {
  if (!generatedKey) return null;

  return (
    <div style={{
      marginTop: 16,
      padding: '16px 20px',
      background: '#08080A',
      border: '1px solid rgba(200,168,75,0.3)',
      borderRadius: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={12} style={{ color: '#C0392B' }} />
        <span style={{ color: '#C0392B', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Store This Auth Key Now — It Cannot Be Recovered Later
        </span>
      </div>
      <div style={{ color: '#9A9488', fontSize: 10, marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>
        {generatedKey.contextLabel}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <code style={{
          flex: 1,
          color: '#C8A84B',
          fontSize: 16,
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '0.08em',
          wordBreak: 'break-all',
        }}>
          {generatedKey.key}
        </code>
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '0.5px solid rgba(200,168,75,0.3)',
            borderRadius: 2,
            color: copied ? '#4AE830' : '#C8A84B',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Copy size={11} />
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
    </div>
  );
}

export default function KeyManagement() {
  const { isAdmin, user } = useSession();
  const issuerCallsign = user?.callsign || 'SYSTEM-ADMIN';
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [rank, setRank] = useState('SCOUT');
  const [rankDrafts, setRankDrafts] = useState({});
  const [workingUserId, setWorkingUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [systemAdminRecoveryToken, setSystemAdminRecoveryToken] = useState('');
  const [showSystemAdminRecovery, setShowSystemAdminRecovery] = useState(false);
  const [systemAdminRecoveryEnabled, setSystemAdminRecoveryEnabled] = useState(false);
  const [systemAdminMessage, setSystemAdminMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listManagedUsers();
      const nextUsers = Array.isArray(res?.users) ? res.users : [];
      setUsers(nextUsers);
      setRankDrafts(Object.fromEntries(nextUsers.map((managedUser) => [managedUser.id, managedUser.nexus_rank || 'AFFILIATE'])));
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load issued keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const handleCopy = () => {
    if (!generatedKey?.key) return;
    navigator.clipboard.writeText(generatedKey.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleIssue = async () => {
    if (!username.trim()) return;
    setSubmitting(true);
    setWorkingUserId('issue');
    setError('');
    setSystemAdminMessage('');
    setGeneratedKey(null);

    try {
      const res = await authApi.issueAuthKey({
        username: username.trim(),
        nexusRank: rank,
      });

      if (res?.error === 'username_taken') {
        setError('That username is already issued.');
      } else if (res?.error === 'callsign_taken') {
        setError('That initial callsign is already in use.');
      } else if (res?.error) {
        setError(res.error);
      } else if (res?.key) {
        setGeneratedKey({
          key: res.key,
          contextLabel: `Issue For ${username.trim().toUpperCase()} · ${rank}`,
        });
        setUsername('');
        showToast('AUTH KEY ISSUED', 'success');
        await loadUsers();
      } else {
        setError('Issuance failed.');
      }
    } catch (err) {
      setError(err?.message || 'Issuance failed.');
      showToast('KEY ISSUANCE FAILED', 'error');
    } finally {
      setSubmitting(false);
      setWorkingUserId('');
    }
  };

  const handleRegenerate = async (managedUser) => {
    setSubmitting(true);
    setWorkingUserId(managedUser.id);
    setError('');
    setSystemAdminMessage('');
    setGeneratedKey(null);

    try {
      const res = await authApi.regenerateAuthKey({ userId: managedUser.id });
      if (res?.error) {
        setError(res.error);
      } else if (res?.key) {
        setGeneratedKey({
          key: res.key,
          contextLabel: `Regenerated For ${managedUser.username.toUpperCase()} · ${managedUser.nexus_rank}`,
        });
        await loadUsers();
      } else {
        setError('Regeneration failed.');
      }
    } catch (err) {
      setError(err?.message || 'Regeneration failed.');
    } finally {
      setSubmitting(false);
      setWorkingUserId('');
    }
  };

  const handleRevoke = async (managedUser) => {
    setSubmitting(true);
    setWorkingUserId(managedUser.id);
    setError('');
    setSystemAdminMessage('');

    try {
      const res = await authApi.revokeAuthKey({ userId: managedUser.id });
      if (res?.error) {
        setError(res.error);
      } else {
        setRevokeConfirm(null);
        await loadUsers();
      }
    } catch (err) {
      setError(err?.message || 'Revocation failed.');
    } finally {
      setSubmitting(false);
      setWorkingUserId('');
    }
  };

  const handleUpdateRank = async (managedUser) => {
    const nextRank = String(rankDrafts[managedUser.id] || managedUser.nexus_rank || '').trim().toUpperCase();
    if (!nextRank || nextRank === managedUser.nexus_rank) return;

    setSubmitting(true);
    setWorkingUserId(`rank-${managedUser.id}`);
    setError('');
    setSystemAdminMessage('');

    try {
      const res = await authApi.updateManagedUserRank({ userId: managedUser.id, nexusRank: nextRank });
      if (res?.error) {
        setError(res.error);
      } else {
        await loadUsers();
      }
    } catch (err) {
      setError(err?.message || 'Rank update failed.');
    } finally {
      setSubmitting(false);
      setWorkingUserId('');
    }
  };

  const STATUS_COLOR = {
    INVITED: '#4AE830',
    REGISTERED: '#C8A84B',
    REVOKED: '#C0392B',
  };

  const systemAdminUser = users.find((managedUser) =>
    String(managedUser?.username || '').trim().toLowerCase() === SYSTEM_ADMIN_LOGIN
    || String(managedUser?.callsign || '').trim().toUpperCase() === SYSTEM_ADMIN_CALLSIGN,
  );

  const handleSystemAdminBootstrap = async ({ recovery = false } = {}) => {
    setSubmitting(true);
    setWorkingUserId(recovery ? 'system-admin-recovery' : 'system-admin-bootstrap');
    setError('');
    setSystemAdminMessage('');
    setGeneratedKey(null);

    try {
      const res = await authApi.bootstrapSystemAdmin({
        recoveryToken: recovery ? systemAdminRecoveryToken.trim() : undefined,
      });

      if (res?.error === 'already_bootstrapped') {
        setSystemAdminRecoveryEnabled(Boolean(res.recovery_enabled));
        setSystemAdminMessage('System Admin already exists. Use the row action below, or use emergency recovery if the bootstrap secret is configured.');
        await loadUsers();
      } else if (res?.error === 'invalid_recovery_token') {
        setSystemAdminRecoveryEnabled(true);
        setSystemAdminMessage(res.message || 'Recovery token rejected.');
      } else if (res?.error) {
        setSystemAdminMessage(res.message || res.error);
      } else if (res?.key) {
        setSystemAdminRecoveryEnabled(Boolean(res.recovery_enabled));
        setGeneratedKey({
          key: res.key,
          contextLabel: `${res.recovered ? 'Recovered' : 'Bootstrapped'} For ${SYSTEM_ADMIN_LOGIN.toUpperCase()} · PIONEER`,
        });
        setSystemAdminMessage(res.recovered
          ? 'System Admin key regenerated through bootstrap recovery.'
          : 'System Admin account created or repaired successfully.');
        setSystemAdminRecoveryToken('');
        await loadUsers();
      } else {
        setSystemAdminMessage('System Admin bootstrap failed.');
      }
    } catch (err) {
      setSystemAdminMessage(err?.message || 'System Admin bootstrap failed.');
    } finally {
      setSubmitting(false);
      setWorkingUserId('');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', background: '#0A0908',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
          color: '#C8A84B', letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          Access Denied — Pioneer Clearance Required
        </span>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: 18,
        color: '#E8E4DC',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Shield size={18} style={{ color: '#C0392B' }} />
        Key Management
      </div>

      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          color: '#C8A84B',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 10,
          fontWeight: 600,
        }}>
          Issue New Invite
        </div>

        <div style={{ color: '#9A9488', fontSize: 11, lineHeight: 1.6, marginBottom: 16 }}>
          Issue a username, initial callsign, rank, and non-expiring auth key. The initial username and callsign are identical. The auth key can be revoked or regenerated later by a Pioneer, but it cannot be recovered.
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.1em', display: 'block', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Username / Initial Callsign
            </label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nomad username"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.10)',
                borderRadius: 2,
                color: '#E8E4DC',
                fontSize: 12,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <label style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.1em', display: 'block', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Rank
            </label>
            <select
              value={rank}
              onChange={(event) => setRank(event.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.10)',
                borderRadius: 2,
                color: '#E8E4DC',
                fontSize: 12,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.08em',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {RANK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <button
            type="button"
            onClick={handleIssue}
            disabled={submitting || !username.trim()}
            style={{
              padding: '10px 20px',
              background: submitting && workingUserId === 'issue' ? '#5A2620' : '#C0392B',
              border: '1px solid rgba(192,57,43,0.6)',
              borderRadius: 2,
              color: '#F0EDE5',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: submitting ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {submitting && workingUserId === 'issue' ? 'Issuing…' : 'Issue Auth Key'}
          </button>
        </div>

        {error ? (
          <div style={{ marginTop: 12, color: '#C8A84B', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
            {error}
          </div>
        ) : null}

        <GeneratedKeyPanel generatedKey={generatedKey} copied={copied} onCopy={handleCopy} />
        
        {generatedKey?.key && (
          <InviteMessageBuilder
            username={generatedKey.contextLabel?.match(/For (\S+)/)?.[1] || ''}
            rank={generatedKey.contextLabel?.match(/· (\S+)/)?.[1] || rank}
            authKey={generatedKey.key}
            appUrl={appUrl}
          />
        )}
      </div>

      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          color: '#C8A84B',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 10,
          fontWeight: 600,
        }}>
          System Admin Recovery
        </div>

        <div style={{ color: '#9A9488', fontSize: 11, lineHeight: 1.6, marginBottom: 16 }}>
          Creates or repairs the fixed Base44 development administrator account: username <strong style={{ color: '#E8E4DC' }}>{SYSTEM_ADMIN_LOGIN}</strong>, callsign <strong style={{ color: '#E8E4DC' }}>{SYSTEM_ADMIN_CALLSIGN}</strong>, rank <strong style={{ color: '#E8E4DC' }}>PIONEER</strong>. Use this if the record is missing, malformed, or needs a guarded recovery from the bootstrap secret.
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <label style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.1em', display: 'block', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Current Record
            </label>
            <div style={{
              minHeight: 39,
              padding: '10px 12px',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2,
              color: '#E8E4DC',
              fontSize: 12,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
            }}>
              {systemAdminUser
                ? `${systemAdminUser.username} · ${systemAdminUser.nexus_rank} · ${userStatus(systemAdminUser)}`
                : 'No System Admin record detected'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSystemAdminBootstrap()}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              background: submitting && workingUserId === 'system-admin-bootstrap' ? '#5A2620' : '#C0392B',
              border: '1px solid rgba(192,57,43,0.6)',
              borderRadius: 2,
              color: '#F0EDE5',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: submitting ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {submitting && workingUserId === 'system-admin-bootstrap' ? 'Repairing…' : 'Bootstrap / Repair'}
          </button>

          {systemAdminUser ? (
            <button
              type="button"
              onClick={() => handleRegenerate(systemAdminUser)}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '0.5px solid rgba(200,168,75,0.3)',
                borderRadius: 2,
                color: '#C8A84B',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: submitting ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {submitting && workingUserId === systemAdminUser.id ? 'Regenerating…' : 'Regenerate Key'}
            </button>
          ) : null}
        </div>

        {systemAdminRecoveryEnabled ? (
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowSystemAdminRecovery((current) => !current)}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: '0.5px solid rgba(200,168,75,0.25)',
                borderRadius: 2,
                color: '#C8A84B',
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {showSystemAdminRecovery ? 'Hide Emergency Recovery' : 'Emergency Recovery'}
            </button>

            {showSystemAdminRecovery ? (
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <label style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.1em', display: 'block', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    SYSTEM_ADMIN_BOOTSTRAP_SECRET
                  </label>
                  <input
                    value={systemAdminRecoveryToken}
                    onChange={(event) => setSystemAdminRecoveryToken(event.target.value)}
                    placeholder="Recovery token"
                    type="password"
                    autoComplete="off"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#141410',
                      border: '0.5px solid rgba(200,170,100,0.10)',
                      borderRadius: 2,
                      color: '#E8E4DC',
                      fontSize: 12,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: '0.08em',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSystemAdminBootstrap({ recovery: true })}
                  disabled={submitting || !systemAdminRecoveryToken.trim()}
                  style={{
                    padding: '10px 20px',
                    background: submitting && workingUserId === 'system-admin-recovery' ? '#5A2620' : '#C0392B',
                    border: '1px solid rgba(192,57,43,0.6)',
                    borderRadius: 2,
                    color: '#F0EDE5',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: submitting ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: !systemAdminRecoveryToken.trim() ? 0.6 : 1,
                  }}
                >
                  {submitting && workingUserId === 'system-admin-recovery' ? 'Recovering…' : 'Recover Via Secret'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {systemAdminMessage ? (
          <div style={{ marginTop: 12, color: '#C8A84B', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
            {systemAdminMessage}
          </div>
        ) : null}
      </div>

      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 20px',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          color: '#C8A84B',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 600,
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>Issued Users ({users.length})</span>
          <span style={{ color: '#9A9488', letterSpacing: '0.1em' }}>Issuer: {issuerCallsign}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#141410' }}>
              {['USERNAME', 'CALLSIGN', 'RANK', 'KEY PREFIX', 'ISSUED', 'LAST SEEN', 'STATUS', ''].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    color: '#C8A84B',
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9A9488', fontSize: 11 }}>Loading…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9A9488', fontSize: 11 }}>No invites issued yet.</td>
              </tr>
            ) : users.map((managedUser, index) => {
              const status = userStatus(managedUser);
              const isConfirming = revokeConfirm === managedUser.id;
              return (
                <tr
                  key={managedUser.id}
                  style={{
                    borderBottom: '0.5px solid rgba(200,170,100,0.06)',
                    background: index % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 16px', color: '#E8E4DC', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, letterSpacing: '0.06em' }}>
                    {managedUser.username}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
                    {managedUser.callsign}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <select
                      value={rankDrafts[managedUser.id] || managedUser.nexus_rank}
                      onChange={(event) => setRankDrafts((current) => ({
                        ...current,
                        [managedUser.id]: event.target.value,
                      }))}
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        background: '#141410',
                        border: '0.5px solid rgba(200,170,100,0.10)',
                        borderRadius: 2,
                        color: '#E8E4DC',
                        fontSize: 10,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: '0.08em',
                        outline: 'none',
                        cursor: submitting ? 'wait' : 'pointer',
                      }}
                    >
                      {RANK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: 'monospace' }}>
                    {managedUser.key_prefix || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {managedUser.key_issued_by || '—'} · {relativeTime(managedUser.key_issued_at)}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {relativeTime(managedUser.last_seen_at)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 2,
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: '0.06em',
                      color: STATUS_COLOR[status],
                      background: `${STATUS_COLOR[status]}18`,
                    }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {rankDrafts[managedUser.id] && rankDrafts[managedUser.id] !== managedUser.nexus_rank ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateRank(managedUser)}
                          disabled={submitting}
                          style={{
                            padding: '3px 10px',
                            fontSize: 9,
                            borderRadius: 2,
                            cursor: 'pointer',
                            background: 'transparent',
                            border: '0.5px solid rgba(74,201,106,0.3)',
                            color: '#27C96A',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {submitting && workingUserId === `rank-${managedUser.id}` ? 'SAVING' : 'SAVE RANK'}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleRegenerate(managedUser)}
                        disabled={submitting}
                        style={{
                          padding: '3px 10px',
                          fontSize: 9,
                          borderRadius: 2,
                          cursor: 'pointer',
                          background: 'transparent',
                          border: '0.5px solid rgba(200,168,75,0.3)',
                          color: '#C8A84B',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {submitting && workingUserId === managedUser.id ? <RefreshCw size={10} /> : 'REGENERATE'}
                      </button>

                      {managedUser.key_revoked ? null : isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRevoke(managedUser)}
                            disabled={submitting}
                            style={{
                              padding: '3px 10px',
                              fontSize: 9,
                              borderRadius: 2,
                              cursor: 'pointer',
                              background: 'rgba(192,57,43,0.15)',
                              border: '0.5px solid #C0392B',
                              color: '#C0392B',
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 600,
                            }}
                          >
                            CONFIRM
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevokeConfirm(null)}
                            style={{
                              padding: '3px 10px',
                              fontSize: 9,
                              borderRadius: 2,
                              cursor: 'pointer',
                              background: 'transparent',
                              border: '0.5px solid rgba(200,170,100,0.10)',
                              color: '#9A9488',
                              fontFamily: "'Barlow Condensed', sans-serif",
                            }}
                          >
                            CANCEL
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRevokeConfirm(managedUser.id)}
                          style={{
                            padding: '3px 10px',
                            fontSize: 9,
                            borderRadius: 2,
                            cursor: 'pointer',
                            background: 'transparent',
                            border: '0.5px solid rgba(192,57,43,0.3)',
                            color: '#C0392B',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                          }}
                        >
                          REVOKE
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}