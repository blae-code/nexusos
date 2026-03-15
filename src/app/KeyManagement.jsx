import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Plus, Eye, EyeOff, RefreshCw, XCircle, Key,
  Copy, Check, AlertTriangle, X, Shield,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────

const RANK_COLOR = {
  PIONEER:   '#c8a84b',
  FOUNDER:   '#9b6fd6',
  VOYAGER:   '#4a8fd0',
  SCOUT:     '#27c96a',
  VAGRANT:   '#8890a8',
  AFFILIATE: '#4a5068',
};

function relativeDate(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 2)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function maskKey(prefix) {
  return prefix ? `${prefix}-••••-••••` : 'RSN-????-••••-••••';
}

// ─── Dialog overlay — absolute, scoped to content area ───
// No position:fixed. The root container is position:relative,
// so this overlay covers only the KeyManagement content pane,
// leaving the shell sidebar and topbar untouched.
function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(7,8,11,0.86)',
        zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget && onDismiss) onDismiss(); }}
    >
      {children}
    </div>
  );
}

// Dialog card — bg2, b2 border, 10px radius (per spec)
function DialogCard({ children, width = 420 }) {
  return (
    <div
      className="nexus-fade-in"
      style={{
        width,
        background: 'var(--bg2)',
        border: '0.5px solid var(--b2)',
        borderRadius: 10,
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

// ─── Shared label style ───────────────────────────────────
const L = {
  color: 'var(--t2)', fontSize: 10,
  letterSpacing: '0.1em', display: 'block', marginBottom: 5,
};

// ─── Copy button ──────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  return (
    <button
      onClick={copy}
      className="nexus-btn"
      style={{ padding: '4px 10px', fontSize: 10, flexShrink: 0 }}
    >
      {copied
        ? <><Check size={11} style={{ color: 'var(--live)' }} /> COPIED</>
        : <><Copy size={11} /> COPY</>}
    </button>
  );
}

// ─── One-time key reveal box ──────────────────────────────
function KeyOnceBox({ generatedKey }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          background: 'rgba(39,201,106,0.05)',
          border: '0.5px solid rgba(39,201,106,0.22)',
          borderRadius: 6,
          padding: '12px 14px',
        }}
      >
        <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', marginBottom: 8 }}>
          GENERATED KEY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span
            style={{
              fontFamily: 'monospace', fontSize: 14, fontWeight: 600,
              letterSpacing: '0.14em', color: 'var(--t0)', wordBreak: 'break-all',
            }}
          >
            {generatedKey}
          </span>
          <CopyBtn text={generatedKey} />
        </div>
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 10, padding: '7px 10px',
          background: 'rgba(232,160,32,0.07)',
          border: '0.5px solid rgba(232,160,32,0.25)',
          borderRadius: 5,
          color: 'var(--warn)', fontSize: 11,
        }}
      >
        <AlertTriangle size={11} style={{ flexShrink: 0 }} />
        This key will not be shown again. Copy it before closing.
      </div>
    </div>
  );
}

// ─── Dialog header row ────────────────────────────────────
function DialogHeader({ icon, title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>
          {title}
        </span>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', padding: 2 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Inline error banner ──────────────────────────────────
function ErrBanner({ msg, danger }) {
  const c = danger ? '#e04848' : '#e8a020';
  const bg = danger ? 'rgba(224,72,72,0.07)' : 'rgba(232,160,32,0.07)';
  const bd = danger ? 'rgba(224,72,72,0.3)' : 'rgba(232,160,32,0.3)';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px', marginBottom: 14,
        background: bg, border: `0.5px solid ${bd}`,
        borderRadius: 5, color: c, fontSize: 11,
      }}
    >
      <AlertTriangle size={11} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

// ─── Generate Key dialog ──────────────────────────────────
const STARTING_RANKS = ['VOYAGER', 'SCOUT', 'VAGRANT'];

function GenerateKeyDialog({ onClose }) {
  const [form, setForm]           = useState({ callsign: '', nexus_rank: 'VOYAGER', discord_id: '' });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.callsign.trim()) { setError('CALLSIGN REQUIRED'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/key-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'generate',
          callsign: form.callsign.trim().toUpperCase(),
          nexus_rank: form.nexus_rank,
          discord_id: form.discord_id.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'KEY GENERATION FAILED');
      setGeneratedKey(data.auth_key);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onDismiss={!generatedKey ? onClose : undefined}>
      <DialogCard width={440}>
        <DialogHeader
          icon={<Key size={14} style={{ color: 'var(--acc2)' }} />}
          title={generatedKey ? 'KEY GENERATED' : 'GENERATE AUTH KEY'}
          onClose={onClose}
        />

        {generatedKey ? (
          <>
            <div style={{ color: 'var(--t1)', fontSize: 12 }}>
              Key issued for{' '}
              <span style={{ color: 'var(--t0)', fontWeight: 600 }}>{form.callsign}</span>
              {form.discord_id && (
                <span style={{ color: 'var(--t2)' }}> · Herald Bot DM queued</span>
              )}
            </div>
            <KeyOnceBox generatedKey={generatedKey} />
            <button
              onClick={onClose}
              className="nexus-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '9px 0', fontSize: 11, marginTop: 18 }}
            >
              CLOSE
            </button>
          </>
        ) : (
          <>
            {error && <ErrBanner msg={error} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={L}>CALLSIGN</label>
                <input
                  className="nexus-input"
                  placeholder="NOMAD-01"
                  value={form.callsign}
                  onChange={e => set('callsign', e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase())}
                  autoComplete="off"
                  spellCheck="false"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
              </div>

              <div>
                <label style={L}>STARTING RANK</label>
                <select
                  className="nexus-input"
                  value={form.nexus_rank}
                  onChange={e => set('nexus_rank', e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {STARTING_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={L}>
                  DISCORD ID{' '}
                  <span style={{ color: 'var(--t3)', fontWeight: 400 }}>
                    (optional — enables Herald Bot DM)
                  </span>
                </label>
                <input
                  className="nexus-input"
                  placeholder="000000000000000000"
                  value={form.discord_id}
                  onChange={e => set('discord_id', e.target.value.replace(/\D/g, ''))}
                  maxLength={20}
                  autoComplete="off"
                />
              </div>

              <div
                style={{
                  background: 'rgba(90,96,128,0.06)',
                  border: '0.5px solid var(--b2)',
                  borderRadius: 5, padding: '8px 12px',
                  fontSize: 11, color: 'var(--t2)',
                }}
              >
                Format:{' '}
                <span style={{ color: 'var(--t0)', fontWeight: 600 }}>RSN-XXXX-XXXX-XXXX</span>
                {' · '}bcrypt stored · key visible once at generation
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button
                onClick={onClose}
                className="nexus-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '9px 0', fontSize: 11 }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="nexus-btn primary"
                style={{ flex: 2, justifyContent: 'center', padding: '9px 0', fontSize: 11, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'GENERATING...' : 'GENERATE & DELIVER →'}
              </button>
            </div>
          </>
        )}
      </DialogCard>
    </Overlay>
  );
}

// ─── Reissue dialog ───────────────────────────────────────
function ReissueDialog({ user, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [newKey, setNewKey]   = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/key-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'reissue',
          callsign: user.callsign,
          discord_id: user.discord_id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'REISSUE FAILED');
      setNewKey(data.auth_key);
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onDismiss={!newKey ? onClose : undefined}>
      <DialogCard width={400}>
        <DialogHeader
          icon={<RefreshCw size={14} style={{ color: 'var(--acc2)' }} />}
          title={newKey ? 'KEY REISSUED' : 'REISSUE KEY'}
          onClose={onClose}
        />

        {newKey ? (
          <>
            <div style={{ color: 'var(--t1)', fontSize: 12 }}>
              New key issued for{' '}
              <span style={{ color: 'var(--t0)', fontWeight: 600 }}>{user.callsign}</span>.
              Old key invalidated.
            </div>
            <KeyOnceBox generatedKey={newKey} />
            <button
              onClick={onClose}
              className="nexus-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '9px 0', fontSize: 11, marginTop: 18 }}
            >
              CLOSE
            </button>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>
              Reissue key for{' '}
              <span style={{ color: 'var(--t0)', fontWeight: 600 }}>{user.callsign}</span>?
              <br />
              <span style={{ color: 'var(--warn)', fontSize: 11 }}>
                Old key dies immediately. Active sessions are invalidated.
              </span>
            </div>

            {error && <ErrBanner msg={error} />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                className="nexus-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '9px 0', fontSize: 11 }}
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="nexus-btn primary"
                style={{ flex: 2, justifyContent: 'center', padding: '9px 0', fontSize: 11, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'REISSUING...' : 'CONFIRM REISSUE →'}
              </button>
            </div>
          </>
        )}
      </DialogCard>
    </Overlay>
  );
}

// ─── Revoke dialog ────────────────────────────────────────
function RevokeDialog({ user, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await base44.entities.NexusUser.update(user.id, { key_revoked: true });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message || 'REVOKE FAILED');
      setLoading(false);
    }
  };

  return (
    <Overlay onDismiss={onClose}>
      <DialogCard width={380}>
        <DialogHeader
          icon={<XCircle size={14} style={{ color: 'var(--danger)' }} />}
          title="REVOKE ACCESS"
          onClose={onClose}
        />

        <div style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>
          Revoke access for{' '}
          <span style={{ color: 'var(--t0)', fontWeight: 600 }}>{user.callsign}</span>?
          <br />
          <span style={{ color: 'var(--danger)', fontSize: 11 }}>
            They will be locked out immediately. Use Reissue to restore access.
          </span>
        </div>

        {error && <ErrBanner msg={error} danger />}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            className="nexus-btn"
            style={{ flex: 1, justifyContent: 'center', padding: '9px 0', fontSize: 11 }}
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '9px 0', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
              borderRadius: 5, cursor: loading ? 'default' : 'pointer',
              background: '#1a0808', border: '0.5px solid #3a1414',
              color: 'var(--danger)', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'REVOKING...' : 'REVOKE ACCESS'}
          </button>
        </div>
      </DialogCard>
    </Overlay>
  );
}

// ─── Table row ────────────────────────────────────────────
function KeyRow({ user, revealId, onRevealStart, onRevealEnd, onReissue, onRevoke }) {
  const isRevealing = revealId === user.id;
  const rankColor   = RANK_COLOR[user.nexus_rank] || 'var(--t2)';
  const canReveal   = Boolean(user._plainKey);
  const displayKey  = isRevealing && canReveal ? user._plainKey : maskKey(user.key_prefix);

  return (
    <tr
      style={{ borderBottom: '0.5px solid var(--b0)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Callsign */}
      <td style={TD}>
        <span style={{ color: 'var(--t0)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}>
          {user.callsign}
        </span>
      </td>

      {/* Discord handle */}
      <td style={TD}>
        <span style={{ color: 'var(--t2)', fontSize: 11 }}>
          {user.discord_handle
            ? user.discord_handle
            : user.discord_id
              ? `···${String(user.discord_id).slice(-4)}`
              : '—'}
        </span>
      </td>

      {/* Rank pill */}
      <td style={TD}>
        <span
          style={{
            display: 'inline-block',
            background: 'var(--bg3)',
            border: '0.5px solid var(--b2)',
            borderRadius: 4,
            padding: '1px 7px',
            color: rankColor,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          }}
        >
          {user.nexus_rank || '—'}
        </span>
      </td>

      {/* Auth key + reveal toggle (hold-to-show) */}
      <td style={TD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'monospace', fontSize: 11,
              letterSpacing: '0.12em',
              color: user.key_revoked ? 'var(--t3)' : 'var(--t1)',
              background: 'var(--bg2)',
              border: '0.5px solid var(--b1)',
              borderRadius: 4, padding: '2px 8px',
              userSelect: isRevealing ? 'text' : 'none',
            }}
          >
            {displayKey}
          </span>
          <button
            style={{
              background: 'none', border: 'none', padding: 2, display: 'flex',
              color: canReveal ? 'var(--t1)' : 'var(--t3)',
              cursor: canReveal ? 'pointer' : 'default',
            }}
            onPointerDown={() => canReveal && onRevealStart(user.id)}
            onPointerUp={onRevealEnd}
            onPointerLeave={onRevealEnd}
            title={canReveal ? 'Hold to reveal' : 'Key only visible at generation'}
          >
            {isRevealing ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </td>

      {/* Status dot — 6px, green/red */}
      <td style={TD}>
        <div
          title={user.key_revoked ? 'Revoked' : 'Active'}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: user.key_revoked ? '#e04848' : '#27c96a',
            boxShadow: user.key_revoked ? 'none' : '0 0 5px rgba(39,201,106,0.45)',
          }}
        />
      </td>

      {/* Issued date — relative */}
      <td style={TD}>
        <span style={{ color: 'var(--t2)', fontSize: 11 }}>
          {relativeDate(user.key_issued_at)}
        </span>
      </td>

      {/* Actions */}
      <td style={TD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Reissue — ghost style */}
          <button
            onClick={() => onReissue(user)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', fontSize: 10, borderRadius: 5,
              background: 'var(--bg2)', border: '0.5px solid var(--b2)',
              color: 'var(--t1)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            <RefreshCw size={10} /> REISSUE
          </button>
          {/* Revoke — danger style, only when active */}
          {!user.key_revoked && (
            <button
              onClick={() => onRevoke(user)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', fontSize: 10, borderRadius: 5,
                background: '#1a0808', border: '0.5px solid #3a1414',
                color: 'var(--danger)', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              <XCircle size={10} /> REVOKE
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Filter chip ──────────────────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px', fontSize: 10, letterSpacing: '0.08em',
        borderRadius: 5, border: `0.5px solid ${active ? 'var(--b3)' : 'var(--b1)'}`,
        background: active ? 'var(--bg4)' : 'var(--bg2)',
        color: active ? 'var(--t0)' : 'var(--t2)',
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────
const FILTERS = ['ALL', 'ACTIVE', 'REVOKED'];
const COLS    = ['CALLSIGN', 'DISCORD', 'RANK', 'AUTH KEY', 'STATUS', 'ISSUED', 'ACTIONS'];
const TD      = { padding: '9px 14px' };

export default function KeyManagement() {
  const { rank }  = useOutletContext() || {};
  const navigate  = useNavigate();

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('ALL');
  const [revealId, setRevealId]       = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [reissueTarget, setReissueTarget] = useState(null);
  const [revokeTarget, setRevokeTarget]   = useState(null);

  // ── Pioneer+ gate — redirect if insufficient rank ───────
  const allowed = ['PIONEER', 'FOUNDER'].includes(rank);
  useEffect(() => {
    if (rank && !allowed) navigate('/app', { replace: true });
  }, [rank, allowed, navigate]);

  // ── Data load ───────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.NexusUser.list('-key_issued_at', 500);
      setUsers(data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  // ── Derived state ───────────────────────────────────────
  const filtered = users.filter(u => {
    if (filter === 'ACTIVE')  return !u.key_revoked;
    if (filter === 'REVOKED') return !!u.key_revoked;
    return true;
  });
  const activeCount  = users.filter(u => !u.key_revoked).length;
  const revokedCount = users.length - activeCount;

  // Hold-to-reveal handlers
  const startReveal = (id) => setRevealId(id);
  const endReveal   = ()   => setRevealId(null);

  // After any mutation, reload
  const afterMutation = () => load();

  // Still waiting for auth context
  if (!rank) return null;

  return (
    // position:relative so Overlay children (position:absolute) are scoped here
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg0)', position: 'relative', overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, padding: '10px 20px',
          borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: 'var(--acc2)' }} />
            <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>
              KEY MANAGEMENT
            </span>
            <span style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.08em' }}>PIONEER+</span>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map(f => (
              <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowGenerate(true)}
          className="nexus-btn primary"
          style={{ padding: '6px 14px', fontSize: 11, letterSpacing: '0.06em' }}
        >
          <Plus size={12} /> GENERATE KEY
        </button>
      </div>

      {/* ── Table area ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {loading ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 120, color: 'var(--t2)', fontSize: 12, gap: 10,
            }}
          >
            <div
              style={{
                width: 18, height: 18,
                border: '1.5px solid var(--b3)', borderTopColor: 'var(--acc2)',
                borderRadius: '50%', animation: 'km-spin 0.8s linear infinite',
              }}
            />
            LOADING KEYS...
            <style>{`@keyframes km-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div
            className="nexus-card"
            style={{ padding: 0, overflow: 'hidden', borderColor: 'var(--b1)' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '0.5px solid var(--b1)' }}>
                  {COLS.map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 14px', textAlign: 'left',
                        color: 'var(--t2)', fontSize: 10,
                        letterSpacing: '0.1em', fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <KeyRow
                    key={u.id}
                    user={u}
                    revealId={revealId}
                    onRevealStart={startReveal}
                    onRevealEnd={endReveal}
                    onReissue={setReissueTarget}
                    onRevoke={setRevokeTarget}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLS.length}
                      style={{
                        padding: 40, textAlign: 'center',
                        color: 'var(--t2)', fontSize: 12, letterSpacing: '0.06em',
                      }}
                    >
                      No keys match this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer count bar */}
            {users.length > 0 && (
              <div
                style={{
                  padding: '6px 14px',
                  borderTop: '0.5px solid var(--b0)',
                  background: 'var(--bg1)',
                  color: 'var(--t2)', fontSize: 10, letterSpacing: '0.06em',
                  display: 'flex', gap: 16,
                }}
              >
                <span>{filtered.length} shown</span>
                <span style={{ color: 'var(--live)' }}>{activeCount} active</span>
                <span style={{ color: revokedCount > 0 ? 'var(--danger)' : 'var(--t3)' }}>{revokedCount} revoked</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dialogs — rendered inside this container, not fixed ── */}
      {showGenerate && (
        <GenerateKeyDialog onClose={() => { setShowGenerate(false); load(); }} />
      )}
      {reissueTarget && (
        <ReissueDialog
          user={reissueTarget}
          onClose={() => setReissueTarget(null)}
          onSuccess={afterMutation}
        />
      )}
      {revokeTarget && (
        <RevokeDialog
          user={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onSuccess={afterMutation}
        />
      )}
    </div>
  );
}
