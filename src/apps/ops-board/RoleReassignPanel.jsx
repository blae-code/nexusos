/**
 * RoleReassignPanel — allows op leaders to reassign crew roles during a live op.
 * Props: { op, rsvps, rank, onUpdate }
 */
import React, { useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { ArrowRight, Check, X, RefreshCw } from 'lucide-react';

const LEADER_RANKS = ['SCOUT', 'VOYAGER', 'FOUNDER', 'PIONEER'];

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

function getRoleColor(roleName) {
  const lower = (roleName || '').toLowerCase();
  if (lower.includes('mining') || lower.includes('miner')) return '#7AAECC';
  if (lower.includes('escort') || lower.includes('combat') || lower.includes('fighter')) return '#C0392B';
  if (lower.includes('fabricator') || lower.includes('craft')) return '#D8BC70';
  if (lower.includes('scout') || lower.includes('recon')) return '#2edb7a';
  if (lower.includes('hauler') || lower.includes('cargo')) return '#C8A84B';
  if (lower.includes('salvage')) return '#C8A84B';
  if (lower.includes('medic') || lower.includes('medical')) return '#2edb7a';
  return '#9A9488';
}

export default function RoleReassignPanel({ op, rsvps = [], rank, onUpdate }) {
  const [editing, setEditing] = useState(null); // rsvp id being edited
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  const canEdit = LEADER_RANKS.includes(rank);
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const slots = normalizeRoleSlots(op?.role_slots);
  const roleNames = slots.map(s => s.name);

  const handleReassign = async (rsvpId, role) => {
    setSaving(true);
    try {
      await base44.entities.OpRsvp.update(rsvpId, { role });

      // Log the reassignment in session log
      const log = Array.isArray(op?.session_log) ? op.session_log : [];
      const rsvp = confirmed.find(r => r.id === rsvpId);
      const entry = {
        t: new Date().toISOString(),
        type: 'MANUAL',
        text: `Role reassigned: ${rsvp?.callsign || 'Member'} → ${role}`,
      };
      await base44.entities.Op.update(op.id, { session_log: [...log, entry] });

      setSuccess(rsvpId);
      setEditing(null);
      setNewRole('');
      onUpdate?.();
      setTimeout(() => setSuccess(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div style={{ color: '#5A5850', fontSize: 11, padding: '12px 0', textAlign: 'center' }}>
        Scout rank or above required to reassign roles.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        <RefreshCw size={9} style={{ marginRight: 4, verticalAlign: 'middle' }} />
        ROLE REASSIGNMENT
      </div>

      {confirmed.length === 0 ? (
        <div style={{ color: '#5A5850', fontSize: 11, padding: '8px 0' }}>No crew to reassign.</div>
      ) : (
        confirmed.map(rsvp => {
          const isEditing = editing === rsvp.id;
          const isSuccess = success === rsvp.id;
          const roleColor = getRoleColor(rsvp.role);

          return (
            <div key={rsvp.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 2,
              background: isEditing ? '#141410' : '#0F0F0D',
              border: `0.5px solid ${isEditing ? 'rgba(200,168,75,0.25)' : 'rgba(200,170,100,0.06)'}`,
              transition: 'all 150ms',
            }}>
              {/* Callsign */}
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
                color: '#E8E4DC', fontWeight: 500, minWidth: 80,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{rsvp.callsign || '—'}</span>

              {/* Current role */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                  color: roleColor, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{rsvp.role || 'NONE'}</span>
              </div>

              <div style={{ flex: 1 }} />

              {isSuccess ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} style={{ color: '#2edb7a' }} />
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                    color: '#2edb7a', letterSpacing: '0.08em',
                  }}>REASSIGNED</span>
                </div>
              ) : isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowRight size={10} style={{ color: '#C8A84B' }} />
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    style={{
                      padding: '4px 8px', fontSize: 10,
                      background: '#0A0908',
                      border: '0.5px solid rgba(200,170,100,0.15)',
                      borderRadius: 2, color: '#E8E4DC',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select role...</option>
                    {roleNames.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => newRole && handleReassign(rsvp.id, newRole)}
                    disabled={!newRole || saving}
                    style={{
                      background: newRole ? 'rgba(192,57,43,0.15)' : 'transparent',
                      border: `0.5px solid ${newRole ? 'rgba(192,57,43,0.4)' : 'rgba(200,170,100,0.10)'}`,
                      borderRadius: 2, padding: '3px 8px',
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                      color: newRole ? '#C0392B' : '#5A5850',
                      cursor: newRole && !saving ? 'pointer' : 'not-allowed',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {saving ? '...' : 'CONFIRM'}
                  </button>
                  <button
                    onClick={() => { setEditing(null); setNewRole(''); }}
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: '#5A5850', padding: 2,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(rsvp.id)}
                  style={{
                    background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
                    borderRadius: 2, padding: '3px 8px',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                    color: '#9A9488', cursor: 'pointer',
                    letterSpacing: '0.06em',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,168,75,0.3)'; e.currentTarget.style.color = '#C8A84B'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.10)'; e.currentTarget.style.color = '#9A9488'; }}
                >
                  REASSIGN
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}