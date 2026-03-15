import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Eye, EyeOff, RefreshCw, XCircle, Key } from 'lucide-react';

const RANK_COLORS = {
  PIONEER: '#c8a84b', FOUNDER: '#9b6fd6', VOYAGER: '#4a8fd0',
  SCOUT: '#27c96a', VAGRANT: '#8890a8', AFFILIATE: '#4a5068',
};

function MaskKey(prefix) {
  return `${prefix}-XXXX-XXXX`;
}

function KeyRow({ user, onRevoke, onReissue }) {
  const [showKey, setShowKey] = useState(false);
  const rankColor = RANK_COLORS[user.nexus_rank] || 'var(--t2)';

  return (
    <tr style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '9px 14px', color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{user.callsign}</td>
      <td style={{ padding: '9px 14px' }}>
        <span style={{ color: rankColor, fontSize: 10, letterSpacing: '0.08em' }}>{user.nexus_rank}</span>
      </td>
      <td style={{ padding: '9px 14px' }}>
        <div className="flex items-center gap-2" style={{ fontFamily: 'monospace' }}>
          <span style={{ color: user.key_revoked ? 'var(--t3)' : 'var(--t1)', fontSize: 11 }}>
            {user.key_prefix ? `${user.key_prefix}-XXXX-XXXX` : '—'}
          </span>
        </div>
      </td>
      <td style={{ padding: '9px 14px' }}>
        {user.key_revoked ? (
          <span className="nexus-tag" style={{ color: 'var(--danger)', borderColor: 'rgba(224,72,72,0.3)', background: 'rgba(224,72,72,0.06)' }}>REVOKED</span>
        ) : (
          <span className="nexus-tag" style={{ color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)', background: 'rgba(39,201,106,0.08)' }}>ACTIVE</span>
        )}
      </td>
      <td style={{ padding: '9px 14px', color: 'var(--t2)', fontSize: 11 }}>
        {user.key_issued_at ? new Date(user.key_issued_at).toLocaleDateString() : '—'}
      </td>
      <td style={{ padding: '9px 14px' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReissue(user)}
            className="nexus-btn"
            style={{ padding: '3px 8px', fontSize: 10 }}
          >
            <RefreshCw size={10}/> REISSUE
          </button>
          {!user.key_revoked && (
            <button
              onClick={() => onRevoke(user)}
              className="nexus-btn danger"
              style={{ padding: '3px 8px', fontSize: 10 }}
            >
              <XCircle size={10}/> REVOKE
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function GenerateKeyModal({ onClose, onGenerate }) {
  const [form, setForm] = useState({
    callsign: '',
    nexus_rank: 'VAGRANT',
    discord_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.callsign.trim()) { setError('Callsign required'); return; }
    setLoading(true);
    setError('');
    try {
      await onGenerate(form);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to generate key');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,8,11,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="nexus-card"
        style={{ width: 400, padding: '24px', borderColor: 'var(--b2)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Key size={16} style={{ color: 'var(--acc2)' }} />
            <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>GENERATE AUTH KEY</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 18 }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.3)', borderRadius: 5, padding: '8px 12px', color: 'var(--danger)', fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>CALLSIGN</label>
            <input className="nexus-input" value={form.callsign} onChange={e => set('callsign', e.target.value.toUpperCase())} placeholder="NOMAD-01" style={{ textTransform: 'uppercase' }} />
          </div>
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>STARTING RANK</label>
            <select className="nexus-input" value={form.nexus_rank} onChange={e => set('nexus_rank', e.target.value)} style={{ cursor: 'pointer' }}>
              {['PIONEER','FOUNDER','VOYAGER','SCOUT','VAGRANT','AFFILIATE'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>DISCORD ID (for key delivery)</label>
            <input className="nexus-input" type="number" value={form.discord_id} onChange={e => set('discord_id', e.target.value)} placeholder="Discord user ID (18 digits)" />
          </div>
          <div style={{ background: 'rgba(74,143,208,0.06)', border: '0.5px solid rgba(74,143,208,0.2)', borderRadius: 5, padding: '8px 12px', fontSize: 11, color: 'var(--t1)', marginTop: 4 }}>
            Key will be generated in format <span style={{ color: 'var(--t0)', fontWeight: 600 }}>RSN-XXXX-XXXX-XXXX</span> and delivered via Herald Bot DM.
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', padding: '9px 0' }}>CANCEL</button>
          <button onClick={handleSubmit} disabled={loading} className="nexus-btn primary" style={{ flex: 2, justifyContent: 'center', padding: '9px 0' }}>
            {loading ? 'GENERATING...' : 'GENERATE & DELIVER →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KeyManagement() {
  const { rank } = useOutletContext() || {};
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const canAccess = ['PIONEER', 'FOUNDER'].includes(rank);

  useEffect(() => {
    if (!canAccess) return;
    load();
  }, []);

  const load = async () => {
    const data = await base44.entities.NexusUser.list('-joined_at', 200);
    setUsers(data || []);
  };

  const handleGenerate = async (form) => {
    await base44.functions.invoke('generateAuthKey', {
      callsign: form.callsign,
      nexus_rank: form.nexus_rank,
      discord_id: form.discord_id || null,
    });
    load();
  };

  const handleRevoke = async (user) => {
    if (!window.confirm(`Revoke key for ${user.callsign}? This invalidates their session immediately.`)) return;
    await base44.entities.NexusUser.update(user.id, { key_revoked: true });
    load();
  };

  const handleReissue = async (user) => {
    if (!window.confirm(`Reissue key for ${user.callsign}? Old key will be immediately invalidated.`)) return;
    await base44.functions.invoke('generateAuthKey', {
      callsign: user.callsign,
      nexus_rank: user.nexus_rank,
      discord_id: user.discord_id || null,
      existing_user_id: user.id,
    });
    load();
  };

  const filtered = users.filter(u =>
    filter === 'ALL' || (filter === 'ACTIVE' && !u.key_revoked) || (filter === 'REVOKED' && u.key_revoked)
  );

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--t2)', fontSize: 13 }}>
        Pioneer+ rank required for key management
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}
      >
        <div className="flex items-center gap-3">
          <Key size={16} style={{ color: 'var(--acc2)' }} />
          <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em' }}>KEY MANAGEMENT</span>
          <div className="flex gap-1">
            {['ALL', 'ACTIVE', 'REVOKED'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className="nexus-btn" style={{ padding: '3px 10px', fontSize: 10, background: filter === f ? 'var(--bg4)' : 'var(--bg2)', borderColor: filter === f ? 'var(--b3)' : 'var(--b1)' }}>{f}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="nexus-btn primary" style={{ padding: '6px 14px', fontSize: 11 }}>
          <Plus size={12}/> GENERATE KEY
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['CALLSIGN', 'RANK', 'AUTH KEY', 'STATUS', 'ISSUED', 'ACTIONS'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <KeyRow key={u.id} user={u} onRevoke={handleRevoke} onReissue={handleReissue} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                    No users match the current filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <GenerateKeyModal onClose={() => setShowModal(false)} onGenerate={handleGenerate} />}
    </div>
  );
}