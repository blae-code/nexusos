/**
 * RequisitionCommandRow — Single row in the Ops Command approval queue.
 * Shows request info, actions (approve/deny/review/tag), and assignment controls.
 */
import React, { useState } from 'react';
import { Check, X, Eye, Ship, Target, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

const TYPE_COLORS = {
  ITEM: '#7AAECC', MATERIAL: '#4A8C5C', CREDIT: '#C8A84B',
  BLUEPRINT: '#D8BC70', SHIP_LOAN: '#2edb7a',
};
const PRIORITY_COLORS = { LOW: '#5A5850', NORMAL: '#9A9488', HIGH: '#C8A84B', URGENT: '#C0392B' };
const STATUS_COLORS = {
  OPEN: '#C8A84B', UNDER_REVIEW: '#7AAECC', APPROVED: '#2edb7a',
  DENIED: '#C0392B', FULFILLED: '#4A8C5C', CANCELLED: '#5A5850',
};

export default function RequisitionCommandRow({ req, ships, ops, callsign, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [shipId, setShipId] = useState(req.assigned_ship_id || '');
  const [opId, setOpId] = useState(req.assigned_op_id || '');
  const [cmdPriority, setCmdPriority] = useState(req.command_priority || 0);
  const [busy, setBusy] = useState(false);

  const typeColor = TYPE_COLORS[req.request_type] || '#5A5850';
  const prioColor = PRIORITY_COLORS[req.priority] || '#9A9488';
  const statusColor = STATUS_COLORS[req.status] || '#5A5850';

  const act = async (action, extra = {}) => {
    setBusy(true);
    await onAction(req, action, { review_notes: notes || undefined, ...extra });
    setBusy(false);
  };

  const handleTag = async () => {
    const ship = ships.find(s => s.id === shipId);
    const op = ops.find(o => o.id === opId);
    await act('tag', {
      assigned_ship_id: shipId || undefined,
      assigned_ship_name: ship?.name || undefined,
      assigned_op_id: opId || undefined,
      assigned_op_name: op?.name || undefined,
      command_priority: cmdPriority,
    });
  };

  const isActionable = ['OPEN', 'UNDER_REVIEW'].includes(req.status);
  const canFulfill = req.status === 'APPROVED';

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: `2px solid ${req.priority === 'URGENT' ? '#C0392B' : req.command_priority > 0 ? '#C8A84B' : 'rgba(200,170,100,0.10)'}`,
      borderTop: '0.5px solid rgba(200,170,100,0.08)',
      borderRight: '0.5px solid rgba(200,170,100,0.08)',
      borderBottom: '0.5px solid rgba(200,170,100,0.08)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Main row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Priority dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: prioColor, flexShrink: 0 }} />

        {/* Type badge */}
        <span style={{
          fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
          color: typeColor, background: `${typeColor}15`, border: `0.5px solid ${typeColor}40`,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', flexShrink: 0,
        }}>{req.request_type}</span>

        {/* Name + requester */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600,
            color: '#E8E4DC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{req.item_name || req.material_name || req.purpose?.substring(0, 40) || 'Unnamed'}</div>
          <div style={{ fontSize: 9, color: '#5A5850', marginTop: 1 }}>
            {req.requested_by_callsign}
            {req.quantity_scu ? ` · ${req.quantity_scu} SCU` : req.quantity > 1 ? ` · ×${req.quantity}` : ''}
            {req.amount_aUEC ? ` · ${req.amount_aUEC.toLocaleString()} aUEC` : ''}
            {req.source_blueprint_name ? ` · for ${req.source_blueprint_name}` : ''}
          </div>
        </div>

        {/* Tags */}
        {req.assigned_ship_name && (
          <span style={{
            fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
            color: '#3498DB', background: 'rgba(52,152,219,0.10)', border: '0.5px solid rgba(52,152,219,0.25)',
            fontFamily: "'Barlow Condensed', sans-serif", display: 'flex', alignItems: 'center', gap: 3,
          }}><Ship size={8} />{req.assigned_ship_name}</span>
        )}
        {req.assigned_op_name && (
          <span style={{
            fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
            color: '#8E44AD', background: 'rgba(142,68,173,0.10)', border: '0.5px solid rgba(142,68,173,0.25)',
            fontFamily: "'Barlow Condensed', sans-serif", display: 'flex', alignItems: 'center', gap: 3,
          }}><Target size={8} />{req.assigned_op_name}</span>
        )}

        {/* Command priority */}
        {req.command_priority > 0 && (
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 2,
            color: '#C8A84B', background: 'rgba(200,168,75,0.10)', border: '0.5px solid rgba(200,168,75,0.25)',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>P{req.command_priority}</span>
        )}

        {/* Status */}
        <span style={{
          fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 2,
          color: statusColor, background: `${statusColor}15`,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', flexShrink: 0,
        }}>{req.status}</span>

        {/* Quick actions */}
        {isActionable && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => act('approve')} disabled={busy} title="Approve" style={{
              background: 'rgba(46,219,122,0.08)', border: '0.5px solid rgba(46,219,122,0.25)',
              borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#2edb7a',
            }}><Check size={11} /></button>
            <button onClick={() => act('deny')} disabled={busy} title="Deny" style={{
              background: 'rgba(192,57,43,0.08)', border: '0.5px solid rgba(192,57,43,0.25)',
              borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#C0392B',
            }}><X size={11} /></button>
            {req.status === 'OPEN' && (
              <button onClick={() => act('review')} disabled={busy} title="Mark Under Review" style={{
                background: 'rgba(122,174,204,0.08)', border: '0.5px solid rgba(122,174,204,0.25)',
                borderRadius: 2, padding: '4px 6px', cursor: 'pointer', color: '#7AAECC',
              }}><Eye size={11} /></button>
            )}
          </div>
        )}
        {canFulfill && (
          <button onClick={(e) => { e.stopPropagation(); act('fulfill'); }} disabled={busy} style={{
            background: 'rgba(74,140,92,0.08)', border: '0.5px solid rgba(74,140,92,0.25)',
            borderRadius: 2, padding: '4px 8px', cursor: 'pointer', color: '#4A8C5C',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, display: 'flex', alignItems: 'center', gap: 3,
          }}>FULFILL</button>
        )}

        {expanded ? <ChevronUp size={12} style={{ color: '#5A5850' }} /> : <ChevronDown size={12} style={{ color: '#5A5850' }} />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '12px 14px', borderTop: '0.5px solid rgba(200,170,100,0.08)',
          background: '#141410', display: 'flex', flexDirection: 'column', gap: 10,
          animation: 'nexus-fade-in 120ms ease-out both',
        }} onClick={e => e.stopPropagation()}>
          {/* Purpose */}
          <div>
            <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>PURPOSE</div>
            <div style={{ fontSize: 11, color: '#E8E4DC', lineHeight: 1.5 }}>{req.purpose || '—'}</div>
          </div>

          {/* Review notes */}
          {req.review_notes && (
            <div>
              <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>
                REVIEW NOTES — {req.reviewed_by}
              </div>
              <div style={{ fontSize: 11, color: '#C8A84B', lineHeight: 1.5 }}>{req.review_notes}</div>
            </div>
          )}

          {/* Tag controls */}
          {(isActionable || canFulfill) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>ASSIGN SHIP</div>
                <select value={shipId} onChange={e => setShipId(e.target.value)} style={{
                  padding: '5px 8px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.12)',
                  borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, minWidth: 140,
                }}>
                  <option value="">None</option>
                  {ships.map(s => <option key={s.id} value={s.id}>{s.name} ({s.model})</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>ASSIGN MISSION</div>
                <select value={opId} onChange={e => setOpId(e.target.value)} style={{
                  padding: '5px 8px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.12)',
                  borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, minWidth: 140,
                }}>
                  <option value="">None</option>
                  {ops.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>CMD PRIORITY</div>
                <input type="number" min={0} max={99} value={cmdPriority} onChange={e => setCmdPriority(parseInt(e.target.value) || 0)} style={{
                  width: 50, padding: '5px 8px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.12)',
                  borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                }} />
              </div>
              <button onClick={handleTag} disabled={busy} style={{
                padding: '5px 12px', borderRadius: 2, cursor: 'pointer',
                background: '#141410', border: '0.5px solid rgba(200,170,100,0.15)',
                color: '#C8A84B', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                fontWeight: 600, letterSpacing: '0.08em',
              }}>SAVE TAGS</button>
            </div>
          )}

          {/* Notes input */}
          {isActionable && (
            <div>
              <div style={{ fontSize: 9, color: '#5A5850', letterSpacing: '0.1em', marginBottom: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>ADD NOTES</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Review notes..."
                  style={{
                    flex: 1, padding: '5px 8px', background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.12)',
                    borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  }} />
                <button onClick={() => act('approve')} disabled={busy} style={{
                  padding: '5px 10px', borderRadius: 2, background: 'rgba(46,219,122,0.08)',
                  border: '0.5px solid rgba(46,219,122,0.25)', color: '#2edb7a', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, display: 'flex', alignItems: 'center', gap: 3,
                }}><Check size={9} /> APPROVE</button>
                <button onClick={() => act('deny')} disabled={busy} style={{
                  padding: '5px 10px', borderRadius: 2, background: 'rgba(192,57,43,0.08)',
                  border: '0.5px solid rgba(192,57,43,0.25)', color: '#C0392B', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, display: 'flex', alignItems: 'center', gap: 3,
                }}><X size={9} /> DENY</button>
              </div>
            </div>
          )}

          {/* Meta */}
          <div style={{ fontSize: 9, color: '#5A5850', display: 'flex', gap: 12 }}>
            {req.requested_at && <span>Requested: {new Date(req.requested_at).toLocaleString()}</span>}
            {req.reviewed_at && <span>Reviewed: {new Date(req.reviewed_at).toLocaleString()} by {req.reviewed_by}</span>}
            {req.fulfilled_at && <span>Fulfilled: {new Date(req.fulfilled_at).toLocaleString()} by {req.fulfilled_by}</span>}
          </div>
        </div>
      )}
    </div>
  );
}