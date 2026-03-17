/**
 * KeyManagement — /app/admin/keys
 * Pioneer / Founder only.  Manage auth key issuance and revocation.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Copy, RefreshCw } from 'lucide-react';

const RANK_COLORS = {
  PIONEER:      'var(--warn)',
  FOUNDER:      'var(--acc2)',
  VOYAGER:      'var(--info)',
  SCOUT:        'var(--live)',
  VAGRANT:      'var(--t1)',
  AFFILIATE:    'var(--t2)',
  SYSTEM_ADMIN: 'var(--info)',
};

const ELEVATED_RANKS = ['PIONEER', 'FOUNDER', 'SYSTEM_ADMIN'];

function RankBadge({ rank }) {
  return (
    <span
      style={{
        fontSize: 8,
        letterSpacing: '0.1em',
        color: RANK_COLORS[rank] || 'var(--t2)',
        border: `0.5px solid ${RANK_COLORS[rank] || 'var(--b1)'}`,
        borderRadius: 3,
        padding: '1px 5px',
        background: 'transparent',
      }}
    >
      {rank || 'AFFILIATE'}
    </span>
  );
}

function StatusDot({ revoked, hasKey }) {
  const color = revoked ? 'var(--danger)' : hasKey ? 'var(--live)' : 'var(--t3)';
  const label = revoked ? 'REVOKED' : hasKey ? 'ACTIVE' : 'NO KEY';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 9, color, letterSpacing: '0.08em' }}>{label}</span>
    </div>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="nexus-btn"
      style={{ padding: '4px 10px', fontSize: 9 }}
      title="Copy key"
    >
      <Copy size={10} />
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

function NewKeyBanner({ rawKey, onDismiss }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'rgba(var(--live-rgb), 0.06)',
        border: '0.5px solid rgba(var(--live-rgb), 0.35)',
        borderRadius: 6,
        marginBottom: 16,
      }}
    >
      <div style={{ color: 'var(--live)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
        KEY GENERATED — DISPLAY ONCE
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <code
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: 'var(--t0)',
            background: 'var(--bg2)',
            border: '0.5px solid var(--b2)',
            borderRadius: 4,
            padding: '4px 10px',
            letterSpacing: '0.08em',
          }}
        >
          {rawKey}
        </code>
        <CopyButton value={rawKey} />
      </div>
      <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 8 }}>
        This key will not be shown again. Confirm it was delivered to the member, then dismiss.
      </div>
      <button
        onClick={onDismiss}
        style={{
          marginTop: 10,
          padding: '3px 10px',
          fontSize: 9,
          background: 'transparent',
          border: '0.5px solid var(--b2)',
          borderRadius: 4,
          color: 'var(--t2)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.08em',
        }}
      >
        DISMISS
      </button>
    </div>
  );
}

export default function KeyManagement() {
  const navigate = useNavigate();
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const rank = outletContext.rank;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | revoked | nokey
  const [pendingAction, setPendingAction] = useState(null); // { userId, action }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [newKeyResult, setNewKeyResult] = useState(null); // { raw_key, callsign }

  // Redirect non-elevated users
  useEffect(() => {
    if (rank && !ELEVATED_RANKS.includes(rank)) {
      navigate('/app/industry', { replace: true });
    }
  }, [rank, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setActionError('');
    try {
      const res = await base44.functions.invoke('keyManagement', { action: 'list' });
      setUsers(res?.users || []);
    } catch (err) {
      setActionError(`Load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const callsignOf = (user) => user.callsign || `UNKNOWN-${String(user.discord_id || user.id).slice(-4)}`;

  const handleAction = async (userId, action) => {
    setActionError('');
    setActionLoading(true);
    const user = users.find((u) => u.id === userId);
    try {
      const res = await base44.functions.invoke('keyManagement', { action, user_id: userId });
      if (res?.raw_key) {
        setNewKeyResult({ raw_key: res.raw_key, callsign: callsignOf(user) });
      }
      await load();
    } catch (err) {
      setActionError(`${action} failed: ${err.message}`);
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const filtered = users.filter((u) => {
    if (filter === 'active') return u.key_prefix && !u.key_revoked;
    if (filter === 'revoked') return u.key_revoked;
    if (filter === 'nokey') return !u.key_prefix;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '0.5px solid var(--b1)',
          background: 'var(--bg1)',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.15em', marginRight: 4 }}>
          KEY MANAGEMENT
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { id: 'all', label: 'ALL' },
            { id: 'active', label: 'ACTIVE' },
            { id: 'revoked', label: 'REVOKED' },
            { id: 'nokey', label: 'NO KEY' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 9,
                letterSpacing: '0.1em',
                background: filter === f.id ? 'var(--bg3)' : 'transparent',
                border: `0.5px solid ${filter === f.id ? 'var(--b2)' : 'transparent'}`,
                color: filter === f.id ? 'var(--t0)' : 'var(--t2)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={load}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex' }}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {newKeyResult && (
          <NewKeyBanner
            rawKey={newKeyResult.raw_key}
            onDismiss={() => setNewKeyResult(null)}
          />
        )}

        {actionError && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(var(--danger-rgb), 0.07)',
              border: '0.5px solid rgba(var(--danger-rgb), 0.3)',
              borderRadius: 5,
              color: 'var(--danger)',
              fontSize: 11,
              marginBottom: 12,
            }}
          >
            {actionError}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div className="nexus-loading-dots"><span /><span /><span /></div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--t2)', fontSize: 12, textAlign: 'center', padding: 40 }}>
            No members match this filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['CALLSIGN', 'RANK', 'KEY PREFIX', 'STATUS', 'ISSUED', 'ACTIONS'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      color: 'var(--t3)',
                      fontSize: 8,
                      letterSpacing: '0.12em',
                      padding: '0 8px 8px',
                      borderBottom: '0.5px solid var(--b1)',
                      fontWeight: 400,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isPending = pendingAction?.userId === user.id;
                const issuedDate = user.key_issued_at
                  ? new Date(user.key_issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                  : '—';

                return (
                  <tr key={user.id}>
                    <td style={{ padding: '8px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                      <span style={{ color: 'var(--t0)', fontSize: 11 }}>{callsignOf(user)}</span>
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                      <RankBadge rank={user.rank} />
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                      <span style={{ color: 'var(--t2)', fontSize: 10, fontFamily: 'monospace' }}>
                        {user.key_prefix ? `${user.key_prefix}-····-····` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                      <StatusDot revoked={user.key_revoked} hasKey={Boolean(user.key_prefix)} />
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                      <span style={{ color: 'var(--t3)', fontSize: 9 }}>{issuedDate}</span>
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '0.5px solid var(--b0)' }}>
                      {isPending ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--t2)', fontSize: 9 }}>
                            {pendingAction.action === 'revoke' ? 'Revoke key?' : 'Reissue key?'}
                          </span>
                          <button
                            onClick={() => handleAction(user.id, pendingAction.action)}
                            disabled={actionLoading}
                            className="nexus-btn danger-btn"
                            style={{ padding: '3px 8px', fontSize: 9 }}
                          >
                            {actionLoading ? '···' : 'CONFIRM'}
                          </button>
                          <button
                            onClick={() => setPendingAction(null)}
                            disabled={actionLoading}
                            className="nexus-btn"
                            style={{ padding: '3px 8px', fontSize: 9 }}
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!user.key_prefix && (
                            <button
                              onClick={() => handleAction(user.id, 'generate')}
                              disabled={actionLoading}
                              className="nexus-btn primary"
                              style={{ padding: '3px 8px', fontSize: 9 }}
                            >
                              GENERATE
                            </button>
                          )}
                          {user.key_prefix && !user.key_revoked && (
                            <>
                              <button
                                onClick={() => setPendingAction({ userId: user.id, action: 'reissue' })}
                                disabled={actionLoading}
                                className="nexus-btn"
                                style={{ padding: '3px 8px', fontSize: 9 }}
                              >
                                REISSUE
                              </button>
                              <button
                                onClick={() => setPendingAction({ userId: user.id, action: 'revoke' })}
                                disabled={actionLoading}
                                className="nexus-btn danger-btn"
                                style={{ padding: '3px 8px', fontSize: 9 }}
                              >
                                REVOKE
                              </button>
                            </>
                          )}
                          {user.key_revoked && (
                            <button
                              onClick={() => setPendingAction({ userId: user.id, action: 'reissue' })}
                              disabled={actionLoading}
                              className="nexus-btn"
                              style={{ padding: '3px 8px', fontSize: 9 }}
                            >
                              REISSUE
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
