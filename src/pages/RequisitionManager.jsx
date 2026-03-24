/**
 * RequisitionManager — full request/approval workflow for items, credits, blueprints, ship loans.
 * Accessible from Industry Hub as a tab.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { Plus, Check, X, Clock, Package, CreditCard, FileText, Ship, Filter } from 'lucide-react';
import EmptyState from '@/core/design/EmptyState';

const LEADER_RANKS = ['PIONEER', 'FOUNDER', 'VOYAGER'];

const TYPE_CONFIG = {
  ITEM:       { icon: Package, color: '#7AAECC', label: 'ITEM' },
  CREDIT:     { icon: CreditCard, color: '#C8A84B', label: 'CREDIT' },
  BLUEPRINT:  { icon: FileText, color: '#D8BC70', label: 'BLUEPRINT' },
  SHIP_LOAN:  { icon: Ship, color: '#2edb7a', label: 'SHIP LOAN' },
};

const STATUS_CONFIG = {
  OPEN:         { color: '#C8A84B', bg: 'rgba(200,168,75,0.10)' },
  UNDER_REVIEW: { color: '#7AAECC', bg: 'rgba(122,174,204,0.10)' },
  APPROVED:     { color: '#2edb7a', bg: 'rgba(46,219,122,0.10)' },
  DENIED:       { color: '#C0392B', bg: 'rgba(192,57,43,0.10)' },
  FULFILLED:    { color: '#4A8C5C', bg: 'rgba(74,140,92,0.10)' },
  CANCELLED:    { color: '#5A5850', bg: 'rgba(90,88,80,0.10)' },
};

const PRIORITY_CONFIG = {
  LOW:    { color: '#5A5850' },
  NORMAL: { color: '#9A9488' },
  HIGH:   { color: '#C8A84B' },
  URGENT: { color: '#C0392B' },
};

function NewRequestForm({ callsign, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    request_type: 'ITEM', item_name: '', quantity: 1,
    amount_aUEC: '', purpose: '', priority: 'NORMAL',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.purpose.trim()) return;
    setSaving(true);
    await onSubmit({
      ...form,
      requested_by_callsign: callsign,
      quantity: parseInt(form.quantity) || 1,
      amount_aUEC: form.request_type === 'CREDIT' ? (parseInt(form.amount_aUEC) || 0) : undefined,
      requested_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  const LABEL = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.15)',
      borderLeft: '2px solid #C0392B',
      borderRadius: 2, padding: 18,
      animation: 'nexus-fade-in 150ms ease-out both',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
        color: '#E8E4DC', fontWeight: 600, marginBottom: 14,
        letterSpacing: '0.06em',
      }}>NEW REQUISITION</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>REQUEST TYPE</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} onClick={() => set('request_type', key)} style={{
                    flex: 1, padding: '6px 8px', borderRadius: 2,
                    background: form.request_type === key ? `${cfg.color}15` : '#141410',
                    border: `0.5px solid ${form.request_type === key ? `${cfg.color}44` : 'rgba(200,170,100,0.08)'}`,
                    color: form.request_type === key ? cfg.color : '#5A5850',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    justifyContent: 'center', textTransform: 'uppercase', letterSpacing: '0.06em',
                    transition: 'all 150ms',
                  }}>
                    <Icon size={10} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <span style={LABEL}>ITEM NAME</span>
            <input className="nexus-input" value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="e.g. Hadron Quantum Drive" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          {form.request_type === 'CREDIT' ? (
            <div style={{ flex: 1 }}>
              <span style={LABEL}>AMOUNT (aUEC)</span>
              <input className="nexus-input" type="number" value={form.amount_aUEC} onChange={e => set('amount_aUEC', e.target.value)} placeholder="0" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <span style={LABEL}>QUANTITY</span>
              <input className="nexus-input" type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          )}
        </div>

        <div>
          <span style={LABEL}>PURPOSE / JUSTIFICATION *</span>
          <textarea className="nexus-input nexus-input" rows={2} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Why is this needed?" style={{ width: '100%', boxSizing: 'border-box', resize: 'none', minHeight: 60 }} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <span style={LABEL}>PRIORITY</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                <button key={p} onClick={() => set('priority', p)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 2,
                  background: form.priority === p ? `${PRIORITY_CONFIG[p].color}15` : '#141410',
                  border: `0.5px solid ${form.priority === p ? `${PRIORITY_CONFIG[p].color}44` : 'rgba(200,170,100,0.08)'}`,
                  color: form.priority === p ? PRIORITY_CONFIG[p].color : '#5A5850',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                  cursor: 'pointer', letterSpacing: '0.08em',
                  transition: 'all 150ms',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCancel} style={{
              background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2, padding: '8px 14px',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#9A9488', cursor: 'pointer',
            }}>CANCEL</button>
            <button onClick={handleSubmit} disabled={!form.purpose.trim() || saving} style={{
              background: 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
              border: '1px solid rgba(192,57,43,0.6)',
              borderRadius: 2, padding: '8px 16px',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
              color: '#F0EDE5', fontWeight: 600, letterSpacing: '0.12em',
              cursor: saving || !form.purpose.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !form.purpose.trim() ? 0.5 : 1,
            }}>{saving ? 'SUBMITTING...' : 'SUBMIT REQUEST →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequisitionRow({ req, canApprove, callsign, onAction }) {
  const [acting, setActing] = useState(false);
  const typeCfg = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.ITEM;
  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.OPEN;
  const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.NORMAL;
  const Icon = typeCfg.icon;

  const handleAction = async (action) => {
    setActing(true);
    await onAction(req, action);
    setActing(false);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'background 150ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Type icon */}
      <div style={{
        width: 28, height: 28, borderRadius: 2,
        background: `${typeCfg.color}12`,
        border: `0.5px solid ${typeCfg.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={13} style={{ color: typeCfg.color }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
            color: '#E8E4DC', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{req.item_name || req.purpose?.substring(0, 40) || 'Unnamed'}</span>
          {req.priority === 'URGENT' && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8,
              color: '#C0392B', background: 'rgba(192,57,43,0.10)',
              border: '0.5px solid rgba(192,57,43,0.25)',
              padding: '1px 5px', borderRadius: 2, letterSpacing: '0.1em',
            }}>URGENT</span>
          )}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          color: '#5A5850',
        }}>
          {req.requested_by_callsign} · {req.quantity > 1 ? `×${req.quantity} · ` : ''}{req.amount_aUEC ? `${req.amount_aUEC.toLocaleString()} aUEC · ` : ''}
          {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : ''}
        </div>
      </div>

      {/* Priority dot */}
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: priorityCfg.color, flexShrink: 0 }} />

      {/* Status pill */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: statusCfg.color, background: statusCfg.bg,
        padding: '2px 8px', borderRadius: 2,
        letterSpacing: '0.08em', fontWeight: 600, flexShrink: 0,
      }}>{req.status}</span>

      {/* Actions */}
      {canApprove && req.status === 'OPEN' && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => handleAction('approve')} disabled={acting} style={{
            background: 'rgba(46,219,122,0.08)', border: '0.5px solid rgba(46,219,122,0.25)',
            borderRadius: 2, padding: '4px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#2edb7a',
          }}>
            <Check size={10} /> APPROVE
          </button>
          <button onClick={() => handleAction('deny')} disabled={acting} style={{
            background: 'rgba(192,57,43,0.08)', border: '0.5px solid rgba(192,57,43,0.25)',
            borderRadius: 2, padding: '4px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#C0392B',
          }}>
            <X size={10} /> DENY
          </button>
        </div>
      )}
      {canApprove && req.status === 'APPROVED' && (
        <button onClick={() => handleAction('fulfill')} disabled={acting} style={{
          background: 'rgba(74,140,92,0.08)', border: '0.5px solid rgba(74,140,92,0.25)',
          borderRadius: 2, padding: '4px 8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#4A8C5C',
        }}>
          <Package size={10} /> FULFILL
        </button>
      )}
    </div>
  );
}

export default function RequisitionManager() {
  const { user } = useSession();
  const callsign = user?.callsign || 'UNKNOWN';
  const rank = user?.nexus_rank || user?.rank || 'VAGRANT';
  const canApprove = LEADER_RANKS.includes(rank);

  const [reqs, setReqs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.Requisition.list('-requested_at', 100);
    setReqs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Requisition.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === 'active') return reqs.filter(r => ['OPEN', 'UNDER_REVIEW', 'APPROVED'].includes(r.status));
    if (statusFilter === 'closed') return reqs.filter(r => ['FULFILLED', 'DENIED', 'CANCELLED'].includes(r.status));
    return reqs;
  }, [reqs, statusFilter]);

  const handleSubmit = async (form) => {
    await base44.entities.Requisition.create(form);
    setShowForm(false);
  };

  const handleAction = async (req, action) => {
    const updates = {};
    if (action === 'approve') {
      updates.status = 'APPROVED';
      updates.reviewed_by = callsign;
      updates.reviewed_at = new Date().toISOString();
    } else if (action === 'deny') {
      updates.status = 'DENIED';
      updates.reviewed_by = callsign;
      updates.reviewed_at = new Date().toISOString();
    } else if (action === 'fulfill') {
      updates.status = 'FULFILLED';
      updates.fulfilled_by = callsign;
      updates.fulfilled_at = new Date().toISOString();
    }
    await base44.entities.Requisition.update(req.id, updates);
  };

  const openCount = reqs.filter(r => r.status === 'OPEN').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {openCount > 0 && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              background: 'rgba(200,168,75,0.10)', border: '0.5px solid rgba(200,168,75,0.25)',
              color: '#C8A84B', padding: '2px 8px', borderRadius: 2,
              fontWeight: 600, letterSpacing: '0.1em',
            }}>{openCount} OPEN</span>
          )}
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { id: 'active', label: 'ACTIVE' },
              { id: 'closed', label: 'CLOSED' },
              { id: 'all', label: 'ALL' },
            ].map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                padding: '5px 12px', border: 'none', cursor: 'pointer',
                borderBottom: statusFilter === f.id ? '2px solid #C0392B' : '2px solid transparent',
                background: 'transparent',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: statusFilter === f.id ? '#E8E4DC' : '#5A5850',
              }}>{f.label}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: showForm ? 'rgba(192,57,43,0.10)' : '#C0392B',
          border: showForm ? '0.5px solid rgba(192,57,43,0.3)' : 'none',
          borderRadius: 2, padding: '7px 14px',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
          color: showForm ? '#C0392B' : '#F0EDE5', fontWeight: 600,
          cursor: 'pointer', letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 150ms',
        }}>
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'CANCEL' : 'NEW REQUEST'}
        </button>
      </div>

      {/* Form */}
      {showForm && <NewRequestForm callsign={callsign} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {/* List */}
      <div style={{
        background: '#0F0F0D',
        border: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No requisitions" detail="Submit a request for items, credits, blueprints, or ship loans." />
        ) : (
          filtered.map(req => (
            <RequisitionRow key={req.id} req={req} canApprove={canApprove} callsign={callsign} onAction={handleAction} />
          ))
        )}
      </div>
    </div>
  );
}