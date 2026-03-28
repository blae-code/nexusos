import React from 'react';
import PresenceDot from '@/components/PresenceDot';
import NexusToken from '@/core/design/NexusToken';
import { rankToken } from '@/core/data/tokenMap';
import { ChevronRight } from 'lucide-react';

const RANK_COLORS = {
  PIONEER: '#C8A84B', FOUNDER: '#E8A020', QUARTERMASTER: '#8E44AD', VOYAGER: '#3498DB',
  SCOUT: '#4A8C5C', VAGRANT: '#E8E4DC', AFFILIATE: '#9A9488',
};

const ACCESS_COLORS = {
  FULL: '#4A8C5C', STANDARD: '#9A9488', RESTRICTED: '#C8A84B', NONE: '#C0392B',
};

const SPEC_COLORS = {
  MINING: '#C8A84B', SALVAGE: '#9A9488', COMBAT: '#C0392B', CRAFTING: '#3498DB',
  HAULING: '#E8A020', MEDICAL: '#4A8C5C', EXPLORATION: '#8E44AD', RACING: '#E67E22',
  LEADERSHIP: '#C8A84B', UNASSIGNED: '#5A5850',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MemberRow({ member, blueprintCount, onSelect }) {
  const rank = member.nexus_rank || 'AFFILIATE';
  const spec = member.specialization || 'UNASSIGNED';
  const access = member.intel_access || 'STANDARD';

  return (
    <div
      onClick={() => onSelect(member)}
      style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 70px 30px',
        padding: '12px 14px', alignItems: 'center', cursor: 'pointer',
        borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,170,100,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Callsign + presence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PresenceDot lastSeenAt={member.last_seen_at} size={6} />
        <NexusToken src={rankToken(rank)} size={16} alt={rank} />
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#E8E4DC', letterSpacing: '0.04em' }}>
            {member.callsign}
          </div>
          {member.op_role && (
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#C8A84B', marginTop: 1 }}>{member.op_role}</div>
          )}
        </div>
      </div>

      {/* Rank */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
        color: RANK_COLORS[rank] || '#5A5850', letterSpacing: '0.08em',
      }}>{rank}</span>

      {/* Specialization */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color: SPEC_COLORS[spec] || '#5A5850',
        background: `${SPEC_COLORS[spec] || '#5A5850'}18`,
        border: `0.5px solid ${SPEC_COLORS[spec] || '#5A5850'}40`,
        borderRadius: 2, padding: '2px 6px', letterSpacing: '0.06em',
        justifySelf: 'start',
      }}>{spec}</span>

      {/* Intel access */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color: ACCESS_COLORS[access] || '#5A5850',
        background: `${ACCESS_COLORS[access] || '#5A5850'}18`,
        border: `0.5px solid ${ACCESS_COLORS[access] || '#5A5850'}40`,
        borderRadius: 2, padding: '2px 6px', letterSpacing: '0.06em',
        justifySelf: 'start',
      }}>{access}</span>

      {/* Blueprints */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
        color: blueprintCount > 0 ? '#3498DB' : '#5A5850',
        fontVariantNumeric: 'tabular-nums',
      }}>{blueprintCount > 0 ? `${blueprintCount} BP` : '—'}</span>

      {/* Last seen */}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        color: '#5A5850', fontVariantNumeric: 'tabular-nums',
      }}>{timeAgo(member.last_seen_at)}</span>

      <ChevronRight size={12} style={{ color: '#5A5850' }} />
    </div>
  );
}