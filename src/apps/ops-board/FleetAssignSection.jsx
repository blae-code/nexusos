/**
 * FleetAssignSection — Inline fleet ship assignment for op creator role slots.
 * Shows available org ships, allows pre-assigning them to roles.
 * Props: { roleSlots, assignments, onChange }
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Ship, X, ChevronDown } from 'lucide-react';

function ShipPill({ ship, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 2,
      background: 'rgba(200,168,75,0.08)',
      border: '0.5px solid rgba(200,168,75,0.20)',
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C8A84B',
    }}>
      <Ship size={9} />
      {ship.name} — {ship.model}
      {onRemove && (
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#5A5850', padding: 0, display: 'flex',
        }}><X size={8} /></button>
      )}
    </span>
  );
}

export default function FleetAssignSection({ roleSlots = [], assignments = {}, onChange }) {
  const [ships, setShips] = useState([]);
  const [expandedRole, setExpandedRole] = useState(null);

  useEffect(() => {
    base44.entities.OrgShip.filter({ status: 'AVAILABLE' }).then(s => setShips(s || []));
  }, []);

  const assignedShipIds = new Set(
    Object.values(assignments).flat().map(a => a.id)
  );
  const availableShips = ships.filter(s => !assignedShipIds.has(s.id));

  const handleAssign = (roleName, ship) => {
    const current = assignments[roleName] || [];
    const next = { ...assignments, [roleName]: [...current, { id: ship.id, name: ship.name, model: ship.model }] };
    onChange(next);
    setExpandedRole(null);
  };

  const handleRemove = (roleName, shipId) => {
    const current = assignments[roleName] || [];
    const next = { ...assignments, [roleName]: current.filter(s => s.id !== shipId) };
    onChange(next);
  };

  if (ships.length === 0) {
    return (
      <div style={{
        padding: '10px 0',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
      }}>No available org ships to assign.</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
        color: '#5A5850', letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>PRE-ASSIGN FLEET SHIPS</div>

      {roleSlots.map((slot, i) => {
        const roleName = slot.name || `Role ${i + 1}`;
        const roleAssignments = assignments[roleName] || [];
        const isExpanded = expandedRole === roleName;

        return (
          <div key={i} style={{
            background: '#141410',
            border: '0.5px solid rgba(200,170,100,0.08)',
            borderRadius: 2, padding: '8px 12px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: roleAssignments.length > 0 ? 6 : 0,
            }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                color: '#E8E4DC', fontWeight: 500,
              }}>{roleName}</span>
              <button
                onClick={() => setExpandedRole(isExpanded ? null : roleName)}
                style={{
                  background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
                  borderRadius: 2, padding: '3px 8px', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                  color: '#5A5850', display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <Ship size={9} /> ASSIGN <ChevronDown size={8} style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 150ms',
                }} />
              </button>
            </div>

            {/* Assigned ships */}
            {roleAssignments.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: isExpanded ? 8 : 0 }}>
                {roleAssignments.map(s => (
                  <ShipPill key={s.id} ship={s} onRemove={() => handleRemove(roleName, s.id)} />
                ))}
              </div>
            )}

            {/* Ship picker dropdown */}
            {isExpanded && (
              <div style={{
                marginTop: 6, maxHeight: 160, overflowY: 'auto',
                background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.10)',
                borderRadius: 2, animation: 'nexus-fade-in 150ms ease-out both',
              }}>
                {availableShips.length === 0 ? (
                  <div style={{
                    padding: '12px', textAlign: 'center',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
                  }}>All ships assigned</div>
                ) : availableShips.map(ship => (
                  <div
                    key={ship.id}
                    onClick={() => handleAssign(roleName, ship)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', cursor: 'pointer',
                      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Ship size={10} style={{ color: '#C8A84B', flexShrink: 0 }} />
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                      color: '#E8E4DC', fontWeight: 500,
                    }}>{ship.name}</span>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                      color: '#5A5850',
                    }}>{ship.model}</span>
                    {ship.cargo_scu && (
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                        color: '#5A5850', marginLeft: 'auto',
                      }}>{ship.cargo_scu} SCU</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}