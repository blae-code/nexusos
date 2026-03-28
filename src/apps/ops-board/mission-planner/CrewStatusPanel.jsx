/**
 * CrewStatusPanel — visualize crew RSVP status from OpRsvp data
 */
import React from 'react';
import { Users, User, Ship, Shield, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ROLE_COLORS = {
  mining: 'var(--info)',
  escort: 'var(--danger)',
  combat: 'var(--danger)',
  fabricator: 'var(--acc2)',
  scout: 'var(--live)',
  support: 'var(--acc)',
  salvage: 'var(--warn)',
  hauler: 'var(--warn)',
  medic: 'var(--live)',
  medical: 'var(--live)',
  rescue: 'var(--live)',
  refinery: 'var(--info)',
};

function roleColor(role) {
  return ROLE_COLORS[(role || '').toLowerCase()] || 'var(--t3)';
}

function normalizeRoleSlots(slots) {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots;
  return Object.entries(slots).map(([name, value]) => ({
    name,
    capacity: typeof value === 'number' ? value : (value?.capacity || 1),
  }));
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg3)', border: '0.5px solid var(--b2)',
      borderRadius: 'var(--r-md)', padding: '6px 10px',
      fontSize: 10, color: 'var(--t0)',
    }}>
      {d.label}: {d.value}
    </div>
  );
}

function RoleFillBar({ roleName, filled, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0;
  const color = roleColor(roleName);
  const isFull = filled >= capacity;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: 'var(--t1)', minWidth: 60, textTransform: 'capitalize' }}>
        {roleName}
      </span>
      <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: isFull ? 'var(--live)' : color,
          transition: 'width 300ms ease',
        }} />
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right',
        color: isFull ? 'var(--live)' : 'var(--t1)',
      }}>
        {filled}/{capacity}
      </span>
    </div>
  );
}

function CrewCard({ rsvp }) {
  const color = roleColor(rsvp.role);
  return (
    <div style={{
      background: 'var(--bg2)', border: '0.5px solid var(--b0)',
      borderLeft: `2px solid ${color}`, borderRadius: 'var(--r-lg)',
      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <User size={10} style={{ color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rsvp.callsign || '—'}
        </span>
        {rsvp.status === 'CONFIRMED' && (
          <Shield size={9} style={{ color: 'var(--live)', flexShrink: 0 }} />
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 9, color: 'var(--t3)' }}>
        {rsvp.role && <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{rsvp.role}</span>}
        {rsvp.ship && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Ship size={8} /> {rsvp.ship}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CrewStatusPanel({ op, rsvps }) {
  const confirmed = rsvps.filter(r => r.status === 'CONFIRMED');
  const tentative = rsvps.filter(r => r.status === 'TENTATIVE');
  const declined = rsvps.filter(r => r.status === 'DECLINED');
  const slots = normalizeRoleSlots(op.role_slots);
  const totalCapacity = slots.reduce((s, r) => s + (r.capacity || 0), 0);

  // Role fill data
  const filledByRole = {};
  confirmed.forEach(r => {
    const role = (r.role || 'unassigned').toLowerCase();
    filledByRole[role] = (filledByRole[role] || 0) + 1;
  });

  // Pie chart data for status breakdown
  const statusData = [
    confirmed.length > 0 && { label: 'Confirmed', value: confirmed.length, color: 'var(--live)' },
    tentative.length > 0 && { label: 'Tentative', value: tentative.length, color: 'var(--warn)' },
    declined.length > 0 && { label: 'Declined', value: declined.length, color: 'var(--danger)' },
    (totalCapacity - confirmed.length - tentative.length) > 0 && {
      label: 'Open', value: Math.max(0, totalCapacity - confirmed.length - tentative.length), color: 'var(--b2)',
    },
  ].filter(Boolean);

  return (
    <div className="nexus-card" style={{ padding: 14 }}>
      <div className="nexus-section-header" style={{ marginBottom: 12 }}>
        <Users size={10} /> CREW STATUS
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ width: 90, height: 90, flexShrink: 0 }}>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={26} outerRadius={40} dataKey="value" stroke="none" paddingAngle={2}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} style={{ color: 'var(--t3)', opacity: 0.3 }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t0)', fontVariantNumeric: 'tabular-nums' }}>{confirmed.length}</div>
              <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em' }}>CONFIRMED</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--warn)', fontVariantNumeric: 'tabular-nums' }}>{tentative.length}</div>
              <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em' }}>TENTATIVE</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>{totalCapacity}</div>
              <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.1em' }}>CAPACITY</div>
            </div>
          </div>
          {confirmed.length < totalCapacity && totalCapacity > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--warn)' }}>
              <AlertTriangle size={10} />
              {totalCapacity - confirmed.length} slot{totalCapacity - confirmed.length !== 1 ? 's' : ''} still open
            </div>
          )}
        </div>
      </div>

      {/* Role fill bars */}
      {slots.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 8 }}>ROLE FILL STATUS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {slots.map(slot => (
              <RoleFillBar
                key={slot.name}
                roleName={slot.name}
                filled={filledByRole[(slot.name || '').toLowerCase()] || 0}
                capacity={slot.capacity || 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Crew cards */}
      {confirmed.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 8 }}>CREW ROSTER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {confirmed.map(r => <CrewCard key={r.id} rsvp={r} />)}
          </div>
        </div>
      )}

      {confirmed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--t3)', fontSize: 10 }}>
          No crew confirmed yet
        </div>
      )}
    </div>
  );
}