/**
 * ThreatPanel — active threat list + report dialog.
 * Props: { op, callsign, onUpdate }
 *
 * Threats are session_log entries with type='THREAT'.
 * A threat is "resolved" when a THREAT_RESOLVED entry exists with the
 * same threat_id. Active = no matching resolved entry.
 * Report dialog: position:absolute overlay (same scoped pattern).
 * heraldBot 'threatAlert' fires on submit, wrapped in .catch().
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { AlertTriangle, Plus, X } from 'lucide-react';
import NexusToken from '@/core/design/NexusToken';
import { threatToken } from '@/core/data/tokenMap';

// ─── Severity config ──────────────────────────────────────────────────────────

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

// ─── Overlay ─────────────────────────────────────────────────────────────────
// position:absolute — container must be position:relative overflow:hidden

function Overlay({ onDismiss, children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(var(--bg0-rgb), 0.86)', zIndex: 50,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      {children}
    </div>
  );
}

// ─── Report threat dialog ─────────────────────────────────────────────────────

function ReportDialog({ onClose, onSubmit }) {
  const [form, setForm] = useState({ description: '', severity: 'HIGH', location: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
    onClose();
  };

  const LABEL = { color: 'var(--t2)', fontSize: 10, letterSpacing: '0.1em', display: 'block', marginBottom: 5 };

  return (
    <Overlay onDismiss={onClose}>
      <div className="nexus-fade-in" style={{
        width: 400, background: 'var(--bg2)', border: '0.5px solid var(--b2)',
        borderRadius: 3, padding: 22,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertTriangle size={14} /> REPORT THREAT
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LABEL}>DESCRIPTION *</label>
            <textarea
              className="nexus-input"
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the threat..."
              style={{ width: '100%', resize: 'none', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>SEVERITY</label>
              <select
                className="nexus-input"
                value={form.severity}
                onChange={e => set('severity', e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="HIGH">HIGH</option>
                <option value="MED">MED</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>LOCATION</label>
              <input
                className="nexus-input"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Grid ref or system"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} className="nexus-btn" style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: 11 }}>
            CANCEL
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.description.trim()}
            className="nexus-btn"
            style={{
              flex: 2, justifyContent: 'center', padding: '8px 0', fontSize: 11,
              background: 'rgba(var(--danger-rgb), 0.08)', borderColor: 'rgba(var(--danger-rgb), 0.3)',
              color: 'var(--danger)', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'REPORTING...' : 'REPORT THREAT →'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── ThreatPanel ──────────────────────────────────────────────────────────────

export default function ThreatPanel({ op, callsign, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);

  const log      = Array.isArray(op.session_log) ? op.session_log : [];
  const resolved = new Set(log.filter(e => e.type === 'THREAT_RESOLVED').map(e => e.threat_id));
  const threats  = log.filter(e => e.type === 'THREAT' && !resolved.has(e.id));

  const appendLog = async (entry) => {
    const newLog = [...log, entry];
    await base44.entities.Op.update(op.id, { session_log: newLog });
    onUpdate?.(newLog);
  };

  const handleSubmit = async ({ description, severity, location }) => {
    const id    = `threat_${Date.now()}`;
    const entry = {
      id,
      t:          new Date().toISOString(),
      type:       'THREAT',
      author:     callsign,
      text:       `[${severity}] ${description}${location ? ` — ${location}` : ''}`,
      severity,
      location,
      threat_id:  id,
    };
    await appendLog(entry);

    // heraldBot — non-fatal
    base44.functions.invoke('heraldBot', {
      action:  'threatAlert',
      payload: { op_id: op.id, op_name: op.name, description, severity, location },
    }).catch(e => console.warn('[ThreatPanel] heraldBot failed:', e.message));
  };

  const handleResolve = async (threatId) => {
    const entry = {
      t:          new Date().toISOString(),
      type:       'THREAT_RESOLVED',
      author:     callsign,
      text:       'Threat resolved',
      threat_id:  threatId,
    };
    await appendLog(entry);
  };

  return (
    // position:relative so dialog overlay is scoped here
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>THREATS</span>
          {threats.length > 0 && (
            <span style={{
              fontSize: 9, background: 'rgba(var(--danger-rgb), 0.15)',
              border: '0.5px solid rgba(var(--danger-rgb), 0.3)',
              color: 'var(--danger)', borderRadius: 3, padding: '0 5px', fontWeight: 700,
            }}>
              {threats.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowDialog(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '0.5px solid var(--b2)',
            borderRadius: 3, cursor: 'pointer', color: 'var(--t2)',
            fontSize: 9, letterSpacing: '0.07em', padding: '3px 8px',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={9} /> REPORT
        </button>
      </div>

      {/* Threat list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {threats.length === 0 ? (
          <div style={{ color: 'var(--t3)', fontSize: 11, padding: '8px 0' }}>No active threats</div>
        ) : (
          threats.map((t, i) => (
            <div key={t.id || i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '7px 10px', borderRadius: 3,
              background: 'var(--bg2)', border: '0.5px solid var(--b1)',
            }}>
              <NexusToken
                src={threatToken(t.severity || 'LOW')}
                size={28}
                alt={t.severity || 'LOW'}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--t0)', fontSize: 11, lineHeight: 1.4 }}>{t.text}</div>
                <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 2 }}>
                  {t.author} · {relativeTime(t.t)}
                </div>
              </div>
              <button
                onClick={() => handleResolve(t.id || t.threat_id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--t2)', fontSize: 9, fontFamily: 'inherit',
                  letterSpacing: '0.06em', padding: '2px 4px', flexShrink: 0,
                }}
              >
                RESOLVE
              </button>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <ReportDialog
          onClose={() => setShowDialog(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}