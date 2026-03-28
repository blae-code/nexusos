/**
 * ShipRoleAssigner — leads assign confirmed crew to ship roles.
 * Groups by assigned ship, shows specialization + rank to aid decisions.
 */
import React, { useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Anchor, Check, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';

const LEADER_RANKS = ['SCOUT', 'VOYAGER', 'QUARTERMASTER', 'FOUNDER', 'PIONEER'];
const SHIP_ROLES = ['PILOT', 'GUNNER', 'ENGINEER', 'MEDIC', 'NAVIGATOR', 'LOADMASTER'];

const ROLE_COLORS = {
  PILOT: '#3498DB', GUNNER: '#C0392B', ENGINEER: '#C8A84B',
  MEDIC: '#4A8C5C', NAVIGATOR: '#8E44AD', LOADMASTER: '#E67E22', UNASSIGNED: '#5A5850',
};

const RANK_ORDER = { PIONEER: 1, FOUNDER: 2, QUARTERMASTER: 3, VOYAGER: 4, SCOUT: 5, VAGRANT: 6, AFFILIATE: 7 };

const SPEC_MATCH = {
  PILOT: ['EXPLORATION', 'HAULING', 'RACING'],
  GUNNER: ['COMBAT'],
  ENGINEER: ['CRAFTING', 'MINING'],
  MEDIC: ['MEDICAL'],
  NAVIGATOR: ['EXPLORATION'],
  LOADMASTER: ['HAULING', 'SALVAGE'],
};

function specScore(member, shipRole) {
  const matches = SPEC_MATCH[shipRole] || [];
  return matches.includes(member?.specialization) ? 2 : 0;
}

export default function ShipRoleAssigner({ op, rsvps, members, rank, callsign, onUpdate }) {
  const canEdit = LEADER_RANKS.includes(rank);
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const confirmed = useMemo(() =>
    (rsvps || []).filter(r => r.status === 'CONFIRMED'),
    [rsvps]
  );

  // Available ships from RSVP ship names + org ships
  const shipNames = useMemo(() => {
    const set = new Set();
    confirmed.forEach(r => { if (r.ship) set.add(r.ship); if (r.assigned_ship_name) set.add(r.assigned_ship_name); });
    // Fallback: "Unassigned Ship"
    return [...set].sort();
  }, [confirmed]);

  // Group crew by assigned ship
  const grouped = useMemo(() => {
    const groups = {};
    confirmed.forEach(r => {
      const ship = r.assigned_ship_name || 'UNASSIGNED';
      if (!groups[ship]) groups[ship] = [];
      groups[ship].push(r);
    });
    // Sort each group by rank
    Object.values(groups).forEach(arr => arr.sort((a, b) =>
      (RANK_ORDER[a.rank] || 99) - (RANK_ORDER[b.rank] || 99)
    ));
    return groups;
  }, [confirmed]);

  const memberMap = useMemo(() => {
    const m = {};
    (members || []).forEach(mem => { m[(mem.callsign || '').toUpperCase()] = mem; });
    return m;
  }, [members]);

  const handleAssign = async (rsvpId, shipRole, shipName) => {
    setSaving(rsvpId);
    const updates = {};
    if (shipRole !== undefined) updates.ship_role = shipRole;
    if (shipName !== undefined) updates.assigned_ship_name = shipName || null;
    updates.assigned_by = callsign;
    await base44.entities.OpRsvp.update(rsvpId, updates);

    // Log to session
    const rsvp = confirmed.find(r => r.id === rsvpId);
    const log = Array.isArray(op?.session_log) ? op.session_log : [];
    const entry = {
      t: new Date().toISOString(),
      type: 'MANUAL',
      text: `Ship role assigned: ${rsvp?.callsign || 'Member'} → ${shipRole || 'UNASSIGNED'}${shipName ? ` on ${shipName}` : ''}`,
    };
    await base44.entities.Op.update(op.id, { session_log: [...log, entry] });

    setSaving(null);
    showToast(`${rsvp?.callsign} assigned`, 'success');
    onUpdate?.();
  };

  if (!canEdit) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', gap: 6, color: '#E8E4DC',
      }}>
        <Anchor size={12} style={{ color: '#3498DB' }} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>SHIP ROLE ASSIGNMENTS</span>
        <span style={{ fontSize: 9, color: '#5A5850' }}>({confirmed.length} crew)</span>
        <div style={{ flex: 1 }} />
        {expanded ? <ChevronUp size={12} style={{ color: '#5A5850' }} /> : <ChevronDown size={12} style={{ color: '#5A5850' }} />}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, animation: 'nexus-fade-in 120ms ease-out both' }}>
          {confirmed.length === 0 ? (
            <div style={{ padding: '12px 0', fontSize: 10, color: '#5A5850', textAlign: 'center' }}>No crew to assign.</div>
          ) : (
            confirmed.map(rsvp => {
              const mem = memberMap[(rsvp.callsign || '').toUpperCase()];
              const currentRole = rsvp.ship_role || 'UNASSIGNED';
              const roleColor = ROLE_COLORS[currentRole] || '#5A5850';
              const isSaving = saving === rsvp.id;
              const score = mem ? specScore(mem, currentRole) : 0;

              return (
                <div key={rsvp.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 2,
                  background: '#0F0F0D',
                  border: `0.5px solid ${currentRole !== 'UNASSIGNED' ? `${roleColor}33` : 'rgba(200,170,100,0.06)'}`,
                  borderLeft: `2px solid ${roleColor}`,
                  opacity: isSaving ? 0.6 : 1,
                }}>
                  {/* Callsign + meta */}
                  <div style={{ minWidth: 90 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#E8E4DC', fontWeight: 600 }}>
                      {rsvp.callsign || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      {rsvp.rank && (
                        <span style={{ fontSize: 8, color: '#C8A84B', fontWeight: 600 }}>{rsvp.rank}</span>
                      )}
                      {mem?.specialization && mem.specialization !== 'UNASSIGNED' && (
                        <span style={{ fontSize: 8, color: '#5A5850' }}>{mem.specialization}</span>
                      )}
                      {score > 0 && (
                        <span style={{ fontSize: 7, color: '#4A8C5C', fontWeight: 700 }}>★ MATCH</span>
                      )}
                    </div>
                  </div>

                  {/* Op role */}
                  <span style={{ fontSize: 9, color: '#5A5850', minWidth: 50 }}>{rsvp.role || '—'}</span>

                  <div style={{ flex: 1 }} />

                  {/* Ship select */}
                  <select
                    value={rsvp.assigned_ship_name || ''}
                    onChange={e => handleAssign(rsvp.id, undefined, e.target.value)}
                    disabled={isSaving}
                    style={{
                      padding: '4px 6px', fontSize: 9, background: '#141410',
                      border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
                      color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif",
                      cursor: 'pointer', maxWidth: 110,
                    }}
                  >
                    <option value="">No ship</option>
                    {shipNames.map(s => <option key={s} value={s}>{s}</option>)}
                    {rsvp.ship && !shipNames.includes(rsvp.ship) && (
                      <option value={rsvp.ship}>{rsvp.ship}</option>
                    )}
                  </select>

                  {/* Ship role select */}
                  <select
                    value={currentRole}
                    onChange={e => handleAssign(rsvp.id, e.target.value, undefined)}
                    disabled={isSaving}
                    style={{
                      padding: '4px 8px', fontSize: 9, background: `${roleColor}12`,
                      border: `0.5px solid ${roleColor}44`, borderRadius: 2,
                      color: roleColor, fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, cursor: 'pointer', minWidth: 90,
                    }}
                  >
                    <option value="UNASSIGNED">UNASSIGNED</option>
                    {SHIP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}