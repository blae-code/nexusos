/**
 * SupplyChainCards — ExtractionCard, HaulerCard, RefineryCard, FabCard,
 * AddJobForm, StageColumn, FlowArrow, SectionHeader sub-components for SupplyChainView.
 */
import React, { useState } from 'react';

// ─── Stage colours ────────────────────────────────────────────────────────────
export const STAGE_COLOR   = { extraction: 'var(--warn)', transit: 'var(--info)', refinery: 'var(--acc2)', fabrication: 'var(--live)' };
export const TRANSIT_COLOR = { IN_TRANSIT: 'var(--info)', DOCKED: 'var(--live)', UNLOADING: 'var(--warn)', IDLE: 'var(--t2)' };
export const TRANSIT_BG    = { IN_TRANSIT: 'rgba(74,143,208,0.08)', DOCKED: 'rgba(39,201,106,0.07)', UNLOADING: 'rgba(232,160,32,0.07)', IDLE: 'transparent' };

export function SectionHeader({ label, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
      {right && <span style={{ color: 'var(--t2)', fontSize: 9, flexShrink: 0 }}>{right}</span>}
    </div>
  );
}

// ─── Flow connector arrow ─────────────────────────────────────────────────────
export function FlowArrow({ active }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
      <div style={{ width: 24, height: '0.5px', background: active ? 'var(--b3)' : 'var(--b1)' }} />
      <div style={{
        width: 0, height: 0,
        borderTop: '4px solid transparent',
        borderBottom: '4px solid transparent',
        borderLeft: `5px solid ${active ? 'var(--b3)' : 'var(--b1)'}`,
        marginLeft: 2,
        marginTop: -4,
      }} />
    </div>
  );
}

// ─── Stage column ─────────────────────────────────────────────────────────────
export function StageColumn({ label, color, children, width = 200 }) {
  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px',
        background: 'var(--bg2)',
        border: `0.5px solid var(--b1)`,
        borderTop: `1.5px solid ${color}`,
        borderRadius: '0 0 5px 5px',
        marginBottom: 4,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
        <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Extraction job card ──────────────────────────────────────────────────────
export function ExtractionCard({ job, haulers, onAssign, canEdit }) {
  const [open, setOpen] = useState(false);
  const assigned = haulers.filter(h => h.assigned_job === job.id);
  const assignedScu = assigned.reduce((s, h) => s + (h.cargo_scu_available || 0), 0);
  const covered = job.scu_estimate > 0 && assignedScu >= job.scu_estimate;

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => canEdit && setOpen(o => !o)}
        style={{ padding: '7px 10px', cursor: canEdit ? 'pointer' : 'default' }}
        onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = 'var(--bg2)'; }}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{job.material}</span>
          {job.scu_estimate > 0 && (
            <span style={{ color: covered ? 'var(--live)' : 'var(--warn)', fontSize: 9, flexShrink: 0 }}>
              {assignedScu}/{job.scu_estimate} SCU
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {job.location && <span style={{ color: 'var(--t2)', fontSize: 9 }}>{job.location}</span>}
          {job.quality_pct > 0 && (
            <span style={{ color: job.quality_pct >= 80 ? 'var(--live)' : 'var(--warn)', fontSize: 9 }}>{job.quality_pct}% qual</span>
          )}
          {job.extractor && <span style={{ color: 'var(--acc2)', fontSize: 9 }}>{job.extractor}</span>}
        </div>
        {assigned.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            {assigned.map(h => (
              <span key={h.id} className="nexus-tag" style={{ color: 'var(--info)', borderColor: 'rgba(74,143,208,0.25)', background: 'rgba(74,143,208,0.07)', fontSize: 9 }}>
                {h.callsign}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Assign hauler panel */}
      {open && canEdit && (
        <div style={{ padding: '6px 10px 8px', borderTop: '0.5px solid var(--b1)', background: 'var(--bg2)' }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 5 }}>ASSIGN HAULER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {haulers.filter(h => h.ship_class === 'HAULER' || h.role === 'hauler' || h.role === 'logistics').map(h => {
              const isAssigned = h.assigned_job === job.id;
              return (
                <button
                  key={h.id}
                  onClick={() => onAssign(h.id, isAssigned ? null : job.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                    background: isAssigned ? 'rgba(74,143,208,0.12)' : 'var(--bg1)',
                    border: `0.5px solid ${isAssigned ? 'rgba(74,143,208,0.3)' : 'var(--b1)'}`,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: isAssigned ? 'var(--info)' : 'var(--t1)', fontSize: 10 }}>{h.callsign}</span>
                  <span style={{ color: 'var(--t2)', fontSize: 9 }}>{h.cargo_scu_available || 0} SCU · {h.ship || h.ship_class}</span>
                </button>
              );
            })}
            {haulers.filter(h => h.ship_class === 'HAULER' || h.role === 'hauler' || h.role === 'logistics').length === 0 && (
              <span style={{ color: 'var(--t2)', fontSize: 10 }}>No haulers confirmed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hauler transit card ──────────────────────────────────────────────────────
export function HaulerCard({ hauler, onStatusChange, canEdit }) {
  const ts = hauler.transit_status || 'IDLE';
  const color = TRANSIT_COLOR[ts];
  const bg    = TRANSIT_BG[ts];
  const STATUSES = ['IDLE', 'IN_TRANSIT', 'DOCKED', 'UNLOADING'];

  return (
    <div style={{ background: bg, border: `0.5px solid ${color}33`, borderRadius: 6, padding: '7px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
        <span style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 500 }}>{hauler.callsign}</span>
        <span className="nexus-tag" style={{ color, borderColor: `${color}44`, background: 'transparent', fontSize: 9 }}>{ts.replace('_', ' ')}</span>
      </div>
      <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: canEdit ? 6 : 0 }}>
        {hauler.ship || hauler.ship_class} · {hauler.cargo_scu_available || 0} SCU
        {hauler.assigned_job_label && <span style={{ color: 'var(--acc2)', marginLeft: 6 }}>→ {hauler.assigned_job_label}</span>}
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 3 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(hauler.id, s)}
              style={{
                flex: 1, padding: '2px 0', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: ts === s ? `${TRANSIT_COLOR[s]}22` : 'var(--bg2)',
                border: `0.5px solid ${ts === s ? TRANSIT_COLOR[s] : 'var(--b1)'}`,
                color: ts === s ? TRANSIT_COLOR[s] : 'var(--t2)',
              }}
            >
              {s === 'IN_TRANSIT' ? 'TRANSIT' : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Refinery slot card ────────────────────────────────────────────────────────
export function RefineryCard({ order }) {
  const isReady = order.status === 'READY';
  const isActive = order.status === 'ACTIVE';
  const color = isReady ? 'var(--live)' : isActive ? 'var(--acc2)' : 'var(--t2)';

  function timeLeft(isoStr) {
    if (!isoStr) return null;
    const diff = new Date(isoStr).getTime() - Date.now();
    if (diff <= 0) return 'READY';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  const tl = order.completes_at ? timeLeft(order.completes_at) : null;

  return (
    <div style={{
      background: isReady ? 'rgba(39,201,106,0.06)' : 'var(--bg1)',
      border: `0.5px solid ${isReady ? 'rgba(39,201,106,0.25)' : 'var(--b1)'}`,
      borderRadius: 6, padding: '7px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{order.material_name}</span>
        {isReady
          ? <span style={{ color: 'var(--live)', fontSize: 9, fontWeight: 500 }}>READY</span>
          : tl && <span style={{ color: 'var(--info)', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{tl}</span>
        }
      </div>
      <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 3 }}>
        {order.quantity_scu} SCU
        {order.method && ` · ${order.method}`}
        {order.station && ` · ${order.station}`}
        {order.submitted_by_callsign && ` · ${order.submitted_by_callsign}`}
      </div>
    </div>
  );
}

// ─── Craft queue card ─────────────────────────────────────────────────────────
export function FabCard({ item }) {
  const statusColor = { OPEN: 'var(--info)', CLAIMED: 'var(--warn)', IN_PROGRESS: 'var(--live)', COMPLETE: 'var(--t2)' };
  const color = statusColor[item.status] || 'var(--t2)';
  return (
    <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: '7px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ color: 'var(--t0)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.blueprint_name}</span>
        <span className="nexus-tag" style={{ color, borderColor: 'transparent', background: 'transparent', fontSize: 9 }}>{item.status}</span>
      </div>
      {(item.requested_by_callsign || item.claimed_by_callsign) && (
        <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 3 }}>
          {item.requested_by_callsign && `req: ${item.requested_by_callsign}`}
          {item.claimed_by_callsign && ` · ${item.claimed_by_callsign}`}
        </div>
      )}
    </div>
  );
}

// ─── Add extraction job form ───────────────────────────────────────────────────
export function AddJobForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ material: '', location: '', quality_pct: 0, scu_estimate: 0, extractor: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b2)', borderRadius: 6, padding: 10, marginBottom: 6 }}>
      <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 8 }}>NEW EXTRACTION JOB</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <input className="nexus-input" style={{ fontSize: 11, padding: '4px 8px' }} placeholder="Material (e.g. Quantainium)" value={form.material} onChange={e => set('material', e.target.value)} />
        <input className="nexus-input" style={{ fontSize: 11, padding: '4px 8px' }} placeholder="Location (e.g. Nyx Belt Alpha)" value={form.location} onChange={e => set('location', e.target.value)} />
        <div style={{ display: 'flex', gap: 5 }}>
          <input className="nexus-input" type="number" min={0} max={100} style={{ flex: 1, fontSize: 11, padding: '4px 8px' }} placeholder="Quality %" value={form.quality_pct || ''} onChange={e => set('quality_pct', +e.target.value)} />
          <input className="nexus-input" type="number" min={0} style={{ flex: 1, fontSize: 11, padding: '4px 8px' }} placeholder="SCU est." value={form.scu_estimate || ''} onChange={e => set('scu_estimate', +e.target.value)} />
        </div>
        <input className="nexus-input" style={{ fontSize: 11, padding: '4px 8px' }} placeholder="Extractor callsign (optional)" value={form.extractor} onChange={e => set('extractor', e.target.value)} />
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button onClick={() => onAdd(form)} disabled={!form.material} className="nexus-btn live-btn" style={{ flex: 1, justifyContent: 'center', padding: '4px 0', fontSize: 10, opacity: form.material ? 1 : 0.4 }}>ADD JOB</button>
          <button onClick={onClose} className="nexus-btn" style={{ padding: '4px 10px', fontSize: 10 }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
