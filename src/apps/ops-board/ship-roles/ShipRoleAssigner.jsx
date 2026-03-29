/**
 * ShipRoleAssigner — lead-facing panel for assigning ship station roles.
 * Shows all confirmed crew with specialization-aware recommendations.
 * Props: { op, rsvps, members, rank, onUpdate }
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { showToast } from '@/components/NexusToast';
import { Anchor } from 'lucide-react';
import ShipRoleCard from './ShipRoleCard';
import { OPS_LEADER_RANKS } from '../rankPolicies';

export default function ShipRoleAssigner({ op, rsvps = [], members = [], rank, onUpdate }) {
  const canEdit = OPS_LEADER_RANKS.includes(rank);
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const [ships, setShips] = useState([]);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    base44.entities.OrgShip.list('name', 200).then(s => setShips((s || []).filter(sh => sh.status !== 'DESTROYED' && sh.status !== 'ARCHIVED')));
  }, []);

  const handleAssign = useCallback(async (rsvpId, shipRole, shipInfo) => {
    setSaving(rsvpId);
    const updates = { ship_role: shipRole };
    if (shipInfo !== undefined) {
      if (shipInfo) {
        updates.assigned_ship_id = shipInfo.id;
        updates.assigned_ship_name = shipInfo.name;
      } else {
        updates.assigned_ship_id = null;
        updates.assigned_ship_name = null;
      }
    }

    await base44.entities.OpRsvp.update(rsvpId, updates);

    // Log to session
    const rsvp = confirmed.find(r => r.id === rsvpId);
    if (rsvp && op) {
      const log = Array.isArray(op.session_log) ? op.session_log : [];
      const shipLabel = shipInfo?.name ? ` on ${shipInfo.name}` : '';
      const entry = {
        t: new Date().toISOString(),
        type: 'MANUAL',
        text: `Ship role: ${rsvp.callsign} → ${shipRole}${shipLabel}`,
      };
      await base44.entities.Op.update(op.id, { session_log: [...log, entry] });
    }

    setSaving(null);
    showToast('Ship role updated', 'success');
    onUpdate?.();
  }, [confirmed, op, onUpdate]);

  // Stats
  const assigned = confirmed.filter(r => r.ship_role && r.ship_role !== 'UNASSIGNED').length;

  if (!canEdit) {
    return null; // Non-leads see ShipRoleDisplay instead
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Anchor size={12} style={{ color: '#3498DB' }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
            color: '#E8E4DC', letterSpacing: '0.06em',
          }}>SHIP ROLE ASSIGNMENTS</span>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 2,
            background: assigned === confirmed.length && confirmed.length > 0 ? 'rgba(74,140,92,0.10)' : 'rgba(200,168,75,0.10)',
            border: `0.5px solid ${assigned === confirmed.length && confirmed.length > 0 ? 'rgba(74,140,92,0.3)' : 'rgba(200,168,75,0.3)'}`,
            color: assigned === confirmed.length && confirmed.length > 0 ? '#4A8C5C' : '#C8A84B',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
          }}>{assigned}/{confirmed.length}</span>
        </div>
      </div>

      {/* Hint */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
        lineHeight: 1.4, letterSpacing: '0.04em',
      }}>
        Assign crew to ship stations. Dotted outlines = recommended based on specialization.
      </div>

      {/* Crew cards */}
      {confirmed.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
          No confirmed crew to assign.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {confirmed.map(rsvp => (
            <ShipRoleCard
              key={rsvp.id}
              rsvp={rsvp}
              members={members}
              ships={ships}
              canEdit={canEdit}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}
    </div>
  );
}
