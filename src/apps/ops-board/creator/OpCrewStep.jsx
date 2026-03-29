/**
 * OpCrewStep — Visual crew station editor with capacity rings and fleet assignment.
 */
import React from 'react';
import FleetAssignSection from '../FleetAssignSection';

function getRoleAccent(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('mining') || n.includes('miner')) return '#7AAECC';
  if (n.includes('escort') || n.includes('combat') || n.includes('gunner')) return '#C0392B';
  if (n.includes('fabricat') || n.includes('craft')) return '#D8BC70';
  if (n.includes('scout') || n.includes('recon')) return '#4A8C5C';
  if (n.includes('haul') || n.includes('cargo') || n.includes('transport')) return '#C8A84B';
  if (n.includes('medic') || n.includes('rescue')) return '#2edb7a';
  if (n.includes('command') || n.includes('lead')) return '#9B59B6';
  if (n.includes('refinery') || n.includes('salvage')) return '#D89B50';
  return '#5A5850';
}

function CapacityRing({ count, accent }) {
  const segments = Math.min(count, 10);
  const radius = 14;
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * radius;
  const gap = 4;
  const segmentLength = (circumference - gap * segments) / segments;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      {Array.from({ length: segments }).map((_, i) => {
        const offset = i * (segmentLength + gap);
        return (
          <circle key={i} cx="18" cy="18" r={radius}
            fill="none" stroke={accent} strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round" opacity={0.7}
            style={{ transition: 'all 300ms' }}
          />
        );
      })}
      <text x="18" y="19" textAnchor="middle" dominantBaseline="middle"
        fill={accent} fontSize="11" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700">
        {count}
      </text>
    </svg>
  );
}

function RoleCard({ slot, index, onRename, onAdjust, onRemove, total }) {
  const accent = getRoleAccent(slot.name);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: `linear-gradient(135deg, ${accent}08 0%, #0C0C0A 100%)`,
      border: `1px solid ${accent}22`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 3,
      opacity: 0,
      animation: `nexus-fade-in 200ms ease-out both ${index * 60}ms`,
      transition: 'all 200ms',
    }}>
      <CapacityRing count={slot.capacity} accent={accent} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          className="nexus-input"
          value={slot.name}
          onChange={e => onRename(e.target.value)}
          placeholder="Role name e.g. Mining Lead"
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid rgba(200,170,100,0.08)',
            borderRadius: 0, padding: '4px 0',
            color: '#E8E4DC',
          }}
        />
      </div>

      {/* Capacity controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button type="button" onClick={() => onAdjust(-1)} style={{
          width: 26, height: 26, borderRadius: 3, cursor: 'pointer',
          background: '#141410', border: '0.5px solid rgba(200,170,100,0.10)',
          color: '#9A9488', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, transition: 'all 150ms',
        }}>−</button>
        <span style={{ color: '#E8E4DC', fontSize: 12, minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {slot.capacity}
        </span>
        <button type="button" onClick={() => onAdjust(1)} style={{
          width: 26, height: 26, borderRadius: 3, cursor: 'pointer',
          background: '#141410', border: '0.5px solid rgba(200,170,100,0.10)',
          color: '#9A9488', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, transition: 'all 150ms',
        }}>+</button>
      </div>

      <button type="button" onClick={onRemove} disabled={total <= 1} style={{
        width: 26, height: 26, borderRadius: 3, cursor: total > 1 ? 'pointer' : 'not-allowed',
        background: 'none', border: '0.5px solid rgba(200,170,100,0.06)',
        color: '#5A5850', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, opacity: total <= 1 ? 0.3 : 1,
        transition: 'all 150ms',
      }}>×</button>
    </div>
  );
}

export default function OpCrewStep({ roleSlots, onRoleSlotsChange, fleetAssignments, onFleetChange, validationErrors }) {
  const adjust = (i, delta) => {
    const next = [...roleSlots];
    next[i] = { ...next[i], capacity: Math.max(1, Math.min(10, (next[i].capacity || 1) + delta)) };
    onRoleSlotsChange(next);
  };
  const rename = (i, name) => {
    const next = [...roleSlots];
    next[i] = { ...next[i], name };
    onRoleSlotsChange(next);
  };
  const remove = (i) => onRoleSlotsChange(roleSlots.filter((_, idx) => idx !== i));
  const add = () => onRoleSlotsChange([...roleSlots, { name: '', capacity: 1 }]);

  const totalCrew = roleSlots.reduce((sum, s) => sum + (s.capacity || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.06)',
        borderRadius: 3,
      }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          CREW STATIONS
        </span>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#C8A84B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {roleSlots.length} ROLES · {totalCrew} SLOTS
        </span>
      </div>

      {/* Role cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {roleSlots.map((slot, i) => (
          <RoleCard
            key={i} slot={slot} index={i}
            onRename={(name) => rename(i, name)}
            onAdjust={(delta) => adjust(i, delta)}
            onRemove={() => remove(i)}
            total={roleSlots.length}
          />
        ))}
      </div>

      {validationErrors.roleSlots && (
        <div style={{ fontSize: 9, color: '#C8A84B', animation: 'nexus-fade-in 150ms ease-out both' }}>
          {validationErrors.roleSlots}
        </div>
      )}

      <button type="button" onClick={add} style={{
        width: '100%', padding: '12px 0',
        background: 'transparent', cursor: 'pointer',
        border: '1px dashed rgba(200,170,100,0.12)',
        borderRadius: 3,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
        fontSize: 11, color: '#5A5850', letterSpacing: '0.12em',
        textTransform: 'uppercase',
        transition: 'border-color 200ms, color 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.30)'; e.currentTarget.style.color = '#9A9488'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)'; e.currentTarget.style.color = '#5A5850'; }}
      >+ ADD CREW STATION</button>

      {/* Fleet Assignment */}
      <div style={{ marginTop: 8, padding: '16px 0', borderTop: '0.5px solid rgba(200,170,100,0.06)' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
          FLEET ASSIGNMENT
        </div>
        <FleetAssignSection roleSlots={roleSlots} assignments={fleetAssignments} onChange={onFleetChange} />
      </div>
    </div>
  );
}