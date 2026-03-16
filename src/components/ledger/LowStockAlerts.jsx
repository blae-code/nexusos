import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Send } from 'lucide-react';

const DEFAULT_THRESHOLDS = [
  { material: 'Taranite',      min_scu: 20, min_quality: 80, critical: true },
  { material: 'Bexalite',      min_scu: 10, min_quality: 80, critical: true },
  { material: 'Laranite',      min_scu: 15, min_quality: 80, critical: true },
  { material: 'Quantainium',   min_scu: 5,  min_quality: 80, critical: true },
  { material: 'Agricium',      min_scu: 20, min_quality: 60, critical: false },
  { material: 'Titanium',      min_scu: 25, min_quality: 60, critical: false },
  { material: 'Copper',        min_scu: 20, min_quality: 60, critical: false },
  { material: 'Diamond',       min_scu: 10, min_quality: 80, critical: false },
];

const STORAGE_KEY = 'nexus_stock_thresholds';

function loadThresholds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_THRESHOLDS;
  } catch { return DEFAULT_THRESHOLDS; }
}

function saveThresholds(t) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
    </div>
  );
}

function AlertCard({ threshold, currentMat, onSendAlert, sending }) {
  const current_scu     = currentMat ? (currentMat.quantity_scu || 0) : 0;
  const current_quality = currentMat ? (currentMat.quality_pct || 0) : 0;
  const has_material    = !!currentMat;

  const scuShortfall  = Math.max(0, threshold.min_scu - current_scu);
  const qualityOk     = current_quality >= threshold.min_quality;
  const scuOk         = current_scu >= threshold.min_scu;

  const status = !has_material ? 'MISSING'
    : (!scuOk && !qualityOk) ? 'CRITICAL'
    : !scuOk ? 'LOW'
    : !qualityOk ? 'QUALITY'
    : 'OK';

  if (status === 'OK') return null;

  const statusStyle = {
    MISSING:  { color: 'var(--danger)', border: 'rgba(224,72,72,0.3)',  bg: 'rgba(224,72,72,0.06)',  label: 'MISSING' },
    CRITICAL: { color: 'var(--danger)', border: 'rgba(224,72,72,0.3)',  bg: 'rgba(224,72,72,0.06)',  label: 'CRITICAL' },
    LOW:      { color: 'var(--warn)',   border: 'rgba(232,160,32,0.3)', bg: 'rgba(232,160,32,0.06)', label: 'LOW STOCK' },
    QUALITY:  { color: 'var(--info)',   border: 'rgba(74,143,208,0.3)', bg: 'rgba(74,143,208,0.06)', label: 'BELOW T2' },
  }[status];

  return (
    <div style={{
      background: statusStyle.bg,
      border: `0.5px solid ${statusStyle.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <AlertTriangle size={13} style={{ color: statusStyle.color, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ color: 'var(--t0)', fontSize: 12 }}>{threshold.material}</span>
          {threshold.critical && (
            <span className="nexus-tag" style={{ color: statusStyle.color, borderColor: statusStyle.border, background: 'transparent', fontSize: 9 }}>
              CRITICAL
            </span>
          )}
          <span className="nexus-tag" style={{ color: statusStyle.color, borderColor: 'transparent', background: 'transparent', fontSize: 9 }}>
            {statusStyle.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>
            HAVE: <span style={{ color: scuOk ? 'var(--live)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>{current_scu.toFixed(1)} SCU</span>
            {' / '}NEED: <span style={{ color: 'var(--t1)' }}>{threshold.min_scu} SCU</span>
          </span>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>
            QUALITY: <span style={{ color: qualityOk ? 'var(--live)' : 'var(--warn)', fontVariantNumeric: 'tabular-nums' }}>{current_quality.toFixed(0)}%</span>
            {' / '}MIN: <span style={{ color: 'var(--t1)' }}>{threshold.min_quality}%</span>
          </span>
          {scuShortfall > 0 && (
            <span style={{ color: 'var(--t2)', fontSize: 10 }}>
              SHORTFALL: <span style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>{scuShortfall.toFixed(1)} SCU</span>
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onSendAlert(threshold, { current_scu, current_quality, status })}
        disabled={sending}
        className="nexus-btn"
        style={{
          padding: '4px 10px',
          fontSize: 10,
          color: 'var(--info)',
          borderColor: 'rgba(74,143,208,0.3)',
          background: 'rgba(74,143,208,0.05)',
          flexShrink: 0,
          opacity: sending ? 0.5 : 1,
        }}
      >
        <Send size={10} /> {sending ? 'SENDING...' : 'ALERT'}
      </button>
    </div>
  );
}

function ThresholdEditor({ thresholds, onSave }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(thresholds)));
  const [newRow, setNewRow] = useState({ material: '', min_scu: 10, min_quality: 80, critical: false });

  const update = (i, field, val) => {
    const next = [...local];
    next[i] = { ...next[i], [field]: val };
    setLocal(next);
  };

  const remove = (i) => setLocal(l => l.filter((_, idx) => idx !== i));

  const add = () => {
    if (!newRow.material.trim()) return;
    setLocal(l => [...l, { ...newRow, material: newRow.material.trim() }]);
    setNewRow({ material: '', min_scu: 10, min_quality: 80, critical: false });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['MATERIAL', 'MIN SCU', 'MIN QUALITY %', 'CRITICAL', ''].map(h => (
                <th key={h} style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', fontWeight: 500, borderBottom: '0.5px solid var(--b1)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {local.map((t, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid var(--b0)' }}>
                <td style={{ padding: '5px 12px' }}>
                  <input className="nexus-input" value={t.material} onChange={e => update(i, 'material', e.target.value)} style={{ padding: '3px 8px', fontSize: 11 }} />
                </td>
                <td style={{ padding: '5px 12px' }}>
                  <input className="nexus-input" type="number" value={t.min_scu} onChange={e => update(i, 'min_scu', parseFloat(e.target.value) || 0)} style={{ padding: '3px 8px', fontSize: 11, width: 70 }} />
                </td>
                <td style={{ padding: '5px 12px' }}>
                  <input className="nexus-input" type="number" value={t.min_quality} onChange={e => update(i, 'min_quality', parseFloat(e.target.value) || 0)} style={{ padding: '3px 8px', fontSize: 11, width: 70 }} />
                </td>
                <td style={{ padding: '5px 12px' }}>
                  <button onClick={() => update(i, 'critical', !t.critical)} style={{
                    width: 32, height: 18, borderRadius: 9,
                    background: t.critical ? 'rgba(224,72,72,0.3)' : 'var(--bg3)',
                    border: `0.5px solid ${t.critical ? 'var(--danger)' : 'var(--b2)'}`,
                    cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.critical ? 'var(--danger)' : 'var(--t3)', position: 'absolute', top: 2, left: t.critical ? 16 : 2, transition: 'left 0.2s' }} />
                  </button>
                </td>
                <td style={{ padding: '5px 12px' }}>
                  <button onClick={() => remove(i)} className="nexus-btn danger" style={{ padding: '2px 7px', fontSize: 9 }}>✕</button>
                </td>
              </tr>
            ))}
            {/* New row */}
            <tr style={{ background: 'var(--bg2)' }}>
              <td style={{ padding: '5px 12px' }}>
                <input className="nexus-input" value={newRow.material} onChange={e => setNewRow(r => ({ ...r, material: e.target.value }))} placeholder="Material name" style={{ padding: '3px 8px', fontSize: 11 }} />
              </td>
              <td style={{ padding: '5px 12px' }}>
                <input className="nexus-input" type="number" value={newRow.min_scu} onChange={e => setNewRow(r => ({ ...r, min_scu: parseFloat(e.target.value) || 0 }))} style={{ padding: '3px 8px', fontSize: 11, width: 70 }} />
              </td>
              <td style={{ padding: '5px 12px' }}>
                <input className="nexus-input" type="number" value={newRow.min_quality} onChange={e => setNewRow(r => ({ ...r, min_quality: parseFloat(e.target.value) || 0 }))} style={{ padding: '3px 8px', fontSize: 11, width: 70 }} />
              </td>
              <td style={{ padding: '5px 12px' }}>
                <button onClick={() => setNewRow(r => ({ ...r, critical: !r.critical }))} style={{
                  width: 32, height: 18, borderRadius: 9,
                  background: newRow.critical ? 'rgba(224,72,72,0.3)' : 'var(--bg3)',
                  border: `0.5px solid ${newRow.critical ? 'var(--danger)' : 'var(--b2)'}`,
                  cursor: 'pointer', position: 'relative',
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: newRow.critical ? 'var(--danger)' : 'var(--t3)', position: 'absolute', top: 2, left: newRow.critical ? 16 : 2 }} />
                </button>
              </td>
              <td style={{ padding: '5px 12px' }}>
                <button onClick={add} className="nexus-btn" style={{ padding: '2px 7px', fontSize: 9, color: 'var(--live)', borderColor: 'rgba(39,201,106,0.3)' }}>+ ADD</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button onClick={() => onSave(local)} className="nexus-btn primary" style={{ alignSelf: 'flex-end', padding: '6px 16px', fontSize: 11 }}>
        SAVE THRESHOLDS
      </button>
    </div>
  );
}

export default function LowStockAlerts({ materials, callsign = 'SYSTEM' }) {
  const [thresholds, setThresholds]       = useState(loadThresholds);
  const [showEditor, setShowEditor]       = useState(false);
  const [sendingId, setSendingId]         = useState(null);
  const [lastSent, setLastSent]           = useState({});
  const [alertLog, setAlertLog]           = useState([]);

  // Build material lookup (by name, case-insensitive, highest SCU entry wins)
  const matByName = useMemo(() => {
    const map = {};
    materials.filter(m => !m.is_archived).forEach(m => {
      const key = m.material_name?.toLowerCase();
      if (!key) return;
      if (!map[key] || (m.quantity_scu || 0) > (map[key].quantity_scu || 0)) {
        map[key] = m;
      }
    });
    return map;
  }, [materials]);

  const activeAlerts = useMemo(() => {
    return thresholds.filter(t => {
      const mat = matByName[t.material.toLowerCase()];
      if (!mat) return true; // missing = alert
      const scuOk = (mat.quantity_scu || 0) >= t.min_scu;
      const qualOk = (mat.quality_pct || 0) >= t.min_quality;
      return !scuOk || !qualOk;
    });
  }, [thresholds, matByName]);

  const criticalCount = activeAlerts.filter(t => t.critical).length;

  const handleSaveThresholds = (t) => {
    setThresholds(t);
    saveThresholds(t);
    setShowEditor(false);
  };

  const handleSendAlert = async (threshold, stockData) => {
    setSendingId(threshold.material);
    try {
      await base44.functions.invoke('heraldBot', {
        action: 'lowStockAlert',
        payload: {
          material:       threshold.material,
          current_scu:    stockData.current_scu,
          min_scu:        threshold.min_scu,
          current_quality: stockData.current_quality,
          min_quality:    threshold.min_quality,
          status:         stockData.status,
          critical:       threshold.critical,
          callsign: callsign || 'SYSTEM',
        },
      });
      setLastSent(prev => ({ ...prev, [threshold.material]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
      setAlertLog(prev => [{ material: threshold.material, status: stockData.status, time: new Date().toISOString(), callsign: callsign || 'SYSTEM' }, ...prev.slice(0, 19)]);
    } catch (e) {
      console.warn('[LowStockAlerts] heraldBot alert failed:', e.message);
    }
    setSendingId(null);
  };

  const handleSendAll = async () => {
    for (const t of activeAlerts) {
      const mat = matByName[t.material.toLowerCase()];
      await handleSendAlert(t, {
        current_scu: mat ? (mat.quantity_scu || 0) : 0,
        current_quality: mat ? (mat.quality_pct || 0) : 0,
        status: !mat ? 'MISSING' : (mat.quantity_scu || 0) < t.min_scu ? 'LOW' : 'QUALITY',
      });
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          {activeAlerts.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="pulse-live" style={{ background: criticalCount > 0 ? 'var(--danger)' : 'var(--warn)' }} />
              <span style={{ color: criticalCount > 0 ? 'var(--danger)' : 'var(--warn)', fontSize: 12 }}>
                {activeAlerts.length} stock alert{activeAlerts.length !== 1 ? 's' : ''}{criticalCount > 0 ? ` — ${criticalCount} CRITICAL` : ''}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)' }} />
              <span style={{ color: 'var(--live)', fontSize: 12 }}>All stock levels nominal</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {activeAlerts.length > 1 && (
            <button onClick={handleSendAll} className="nexus-btn" style={{ padding: '5px 12px', fontSize: 10, color: 'var(--info)', borderColor: 'rgba(74,143,208,0.3)' }}>
              <Send size={10} /> ALERT ALL
            </button>
          )}
          <button onClick={() => setShowEditor(e => !e)} className="nexus-btn" style={{ padding: '5px 12px', fontSize: 10 }}>
            {showEditor ? 'HIDE EDITOR' : 'EDIT THRESHOLDS'}
          </button>
        </div>
      </div>

      {/* Threshold editor */}
      {showEditor && (
        <div>
          <SectionHeader label="THRESHOLD CONFIGURATION" />
          <ThresholdEditor thresholds={thresholds} onSave={handleSaveThresholds} />
        </div>
      )}

      {/* Active alerts */}
      <div>
        <SectionHeader label={`ACTIVE ALERTS (${activeAlerts.length})`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activeAlerts.map(t => (
            <AlertCard
              key={t.material}
              threshold={t}
              currentMat={matByName[t.material.toLowerCase()]}
              onSendAlert={handleSendAlert}
              sending={sendingId === t.material}
            />
          ))}
          {activeAlerts.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--t2)', fontSize: 12, background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
              No active alerts. All monitored materials are above threshold.
            </div>
          )}
        </div>
      </div>

      {/* All monitored */}
      <div>
        <SectionHeader label="ALL MONITORED MATERIALS" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
          {thresholds.map(t => {
            const mat = matByName[t.material.toLowerCase()];
            const scu = mat ? (mat.quantity_scu || 0) : 0;
            const quality = mat ? (mat.quality_pct || 0) : 0;
            const ok = mat && scu >= t.min_scu && quality >= t.min_quality;
            const when = lastSent[t.material];
            return (
              <div key={t.material} style={{
                background: 'var(--bg1)', border: `0.5px solid ${ok ? 'var(--b1)' : 'rgba(232,160,32,0.2)'}`, borderRadius: 6, padding: '8px 10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--t0)', fontSize: 11 }}>{t.material}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? 'var(--live)' : 'var(--warn)', marginTop: 2 }} />
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                  {scu.toFixed(1)} / {t.min_scu} SCU · {quality.toFixed(0)}% / {t.min_quality}%
                </div>
                {when && <div style={{ color: 'var(--t3)', fontSize: 9, marginTop: 3 }}>alerted {when}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert log */}
      {alertLog.length > 0 && (
        <div>
          <SectionHeader label="ALERT DISPATCH LOG" />
          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
            {alertLog.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 12px', borderBottom: '0.5px solid var(--b0)', alignItems: 'center' }}>
                <span style={{ color: 'var(--t2)', fontSize: 10, flexShrink: 0 }}>{new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ color: 'var(--t0)', fontSize: 11, flex: 1 }}>{e.material}</span>
                <span className="nexus-tag" style={{ color: 'var(--warn)', borderColor: 'transparent', background: 'transparent', fontSize: 9 }}>{e.status}</span>
                <span style={{ color: 'var(--t2)', fontSize: 10 }}>{e.callsign}</span>
                <Send size={10} style={{ color: 'var(--info)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
