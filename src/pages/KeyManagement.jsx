import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Copy, Shield, AlertTriangle } from 'lucide-react';

const RANK_OPTIONS = ['FOUNDER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE'];

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function userStatus(u) {
  if (u.key_revoked) return 'REVOKED';
  if (u.joined_at) return 'REGISTERED';
  return 'ACTIVE';
}

export default function KeyManagement() {
  const ctx = useOutletContext() || {};
  const myCallsign = ctx.callsign || 'UNKNOWN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callsign, setCallsign] = useState('');
  const [rank, setRank] = useState('SCOUT');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState(null);

  const loadUsers = useCallback(async () => {
    const data = await base44.entities.NexusUser.list('-created_date', 200);
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleGenerate = async () => {
    if (!callsign.trim()) return;
    setGenerating(true);
    setGenError('');
    setGeneratedKey(null);

    try {
      const res = await base44.functions.invoke('generateKey', {
        callsign: callsign.trim(),
        nexus_rank: rank,
        issued_by_callsign: myCallsign,
      });

      if (res.data?.error === 'callsign_taken') {
        setGenError('That callsign is already taken.');
      } else if (res.data?.error) {
        setGenError(res.data.error);
      } else if (res.data?.key) {
        setGeneratedKey(res.data.key);
        setCallsign('');
        loadUsers();
      }
    } catch (err) {
      setGenError(err?.response?.data?.error || 'Generation failed');
    }

    setGenerating(false);
  };

  const handleRevoke = async (userId) => {
    setRevoking(userId);
    await base44.entities.NexusUser.update(userId, {
      key_revoked: true,
      session_invalidated_at: new Date().toISOString(),
    });
    setRevokeConfirm(null);
    setRevoking(null);
    loadUsers();
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const STATUS_COLOR = {
    ACTIVE: '#4AE830',
    REGISTERED: '#C8A84B',
    REVOKED: '#C0392B',
  };

  return (
    <div className="nexus-page-enter" style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18,
        color: '#E8E4DC', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Shield size={18} style={{ color: '#C0392B' }} />
        KEY MANAGEMENT
      </div>

      {/* Key Generator Panel */}
      <div style={{
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8A84B',
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600,
        }}>
          GENERATE NEW KEY
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.1em', display: 'block', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>CALLSIGN</label>
            <input
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              placeholder="New member callsign"
              style={{
                width: '100%', padding: '10px 12px', background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
                color: '#E8E4DC', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.08em', textTransform: 'uppercase', outline: 'none',
              }}
            />
          </div>

          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 9, color: '#9A9488', letterSpacing: '0.1em', display: 'block', marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>RANK</label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#141410',
                border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
                color: '#E8E4DC', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.08em', outline: 'none', cursor: 'pointer',
              }}
            >
              {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !callsign.trim()}
            style={{
              padding: '10px 20px', background: generating ? '#5A2620' : '#C0392B',
              border: '1px solid rgba(192,57,43,0.6)', borderRadius: 2,
              color: '#F0EDE5', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: generating ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {generating ? 'GENERATING...' : 'GENERATE KEY'}
          </button>
        </div>

        {genError && (
          <div style={{ marginTop: 12, color: '#C8A84B', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
            {genError}
          </div>
        )}

        {/* Generated Key Display */}
        {generatedKey && (
          <div style={{
            marginTop: 16, padding: '16px 20px', background: '#08080A',
            border: '1px solid rgba(200,168,75,0.3)', borderRadius: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={12} style={{ color: '#C0392B' }} />
              <span style={{ color: '#C0392B', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                STORE THIS KEY — IT CANNOT BE RECOVERED
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code style={{
                flex: 1, color: '#C8A84B', fontSize: 16, fontFamily: 'monospace', fontWeight: 700,
                letterSpacing: '0.08em', wordBreak: 'break-all',
              }}>
                {generatedKey}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  padding: '6px 12px', background: 'transparent',
                  border: '0.5px solid rgba(200,168,75,0.3)', borderRadius: 2,
                  color: copied ? '#4AE830' : '#C8A84B', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Copy size={11} />
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Keys Table */}
      <div style={{
        background: '#0F0F0D', borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 20px',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#C8A84B',
          letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          ALL KEYS ({users.length})
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#141410' }}>
              {['CALLSIGN', 'RANK', 'KEY PREFIX', 'ISSUED BY', 'ISSUED AT', 'STATUS', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left', color: '#C8A84B',
                  fontSize: 9, letterSpacing: '0.12em', fontWeight: 600,
                  fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase',
                  borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9A9488', fontSize: 11 }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9A9488', fontSize: 11 }}>No keys issued yet.</td></tr>
            ) : users.map((u, i) => {
              const status = userStatus(u);
              const isConfirming = revokeConfirm === u.id;
              return (
                <tr key={u.id} style={{
                  borderBottom: '0.5px solid rgba(200,170,100,0.06)',
                  background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}>
                  <td style={{ padding: '10px 16px', color: '#E8E4DC', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, letterSpacing: '0.06em' }}>
                    {u.callsign}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {u.nexus_rank}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: 'monospace' }}>
                    {u.key_prefix || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {u.key_issued_by || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9A9488', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {u.key_issued_at ? relativeTime(u.key_issued_at) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 2, fontSize: 9, fontWeight: 700,
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
                      color: STATUS_COLOR[status], background: `${STATUS_COLOR[status]}18`,
                    }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {status !== 'REVOKED' && (
                      isConfirming ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleRevoke(u.id)}
                            disabled={revoking === u.id}
                            style={{
                              padding: '3px 10px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                              background: 'rgba(192,57,43,0.15)', border: '0.5px solid #C0392B',
                              color: '#C0392B', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                            }}
                          >
                            {revoking === u.id ? '...' : 'CONFIRM'}
                          </button>
                          <button
                            onClick={() => setRevokeConfirm(null)}
                            style={{
                              padding: '3px 10px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                              background: 'transparent', border: '0.5px solid rgba(200,170,100,0.10)',
                              color: '#9A9488', fontFamily: "'Barlow Condensed', sans-serif",
                            }}
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevokeConfirm(u.id)}
                          style={{
                            padding: '3px 10px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
                            background: 'transparent', border: '0.5px solid rgba(192,57,43,0.3)',
                            color: '#C0392B', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                            letterSpacing: '0.06em',
                          }}
                        >
                          REVOKE
                        </button>
                      )
                    )}
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