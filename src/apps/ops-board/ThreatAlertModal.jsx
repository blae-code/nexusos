/**
 * ThreatAlertModal — quick threat alert dialog for Op Leaders
 * Broadcasts an in-app threat alert and logs to session_log.
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { sendNexusNotification } from '@/core/data/nexus-notify';

const THREAT_TYPES = ['PIRATE', 'GRIEFER', 'SERVER_ISSUES', 'SHIP_DOWN', 'MEDICAL', 'CARGO_LOSS', 'OTHER'];

export default function ThreatAlertModal({ op, callsign, onClose, onPosted }) {
  const [threatType, setThreatType] = useState('PIRATE');
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!description.trim()) return;
    setPosting(true);

    await sendNexusNotification({
      type: 'OP_THREAT',
      title: 'Threat Alert',
      body: `${op.name}: [${threatType}] ${description.trim()}${op.system ? ` · ${op.system}` : ''}`,
      severity: ['PIRATE', 'GRIEFER', 'SHIP_DOWN', 'MEDICAL', 'CARGO_LOSS'].includes(threatType) ? 'CRITICAL' : 'WARN',
      target_user_id: null,
      source_module: 'OPS',
      source_id: op.id,
    });

    // Log to session
    const entry = {
      type: 'threat',
      t: new Date().toISOString(),
      author: callsign,
      text: `⚠ ${threatType}: ${description.trim()}`,
    };
    const updated = [...(op.session_log || []), entry];
    await base44.entities.Op.update(op.id, { session_log: updated });

    setPosting(false);
    onPosted && onPosted({ ...op, session_log: updated });
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(var(--bg0-rgb), 0.82)',
    }}>
      <div className="nexus-fade-in" style={{
        width: 400,
        background: 'var(--bg2)',
        border: '0.5px solid var(--danger-b)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '0.5px solid var(--b1)',
          background: 'var(--danger-bg)',
        }}>
          <span style={{ color: 'var(--danger)', fontSize: 11, letterSpacing: '0.1em', fontWeight: 500 }}>
            ⚠ THREAT ALERT
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 14, padding: 2 }}>×</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>THREAT TYPE</label>
            <select
              className="nexus-input"
              value={threatType}
              onChange={e => setThreatType(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {THREAT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
            <textarea
              className="nexus-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What happened? Location, ship type, crew status..."
              style={{ resize: 'none', height: 72 }}
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '0.5px solid var(--b1)' }}>
          <button onClick={onClose} className="nexus-btn" style={{ padding: '7px 16px', fontSize: 10 }}>CANCEL</button>
          <button
            onClick={handlePost}
            disabled={posting || !description.trim()}
            className="nexus-btn danger-btn"
            style={{ flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 10, opacity: posting ? 0.6 : 1 }}
          >
            {posting ? 'POSTING...' : 'SEND ALERT'}
          </button>
        </div>
      </div>
    </div>
  );
}
