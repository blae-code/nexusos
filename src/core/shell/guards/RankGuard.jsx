import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useSession } from '@/core/data/SessionContext';

export const RANKS = {
  AFFILIATE: 0,
  VAGRANT: 1,
  SCOUT: 2,
  VOYAGER: 3,
  FOUNDER: 4,
  PIONEER: 5,
};

function normalizeRank(rank) {
  const value = String(rank || 'AFFILIATE').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(RANKS, value) ? value : 'AFFILIATE';
}

function getResolvedRank(outletContext, user) {
  return normalizeRank(
    outletContext?.rank
      || user?.nexus_rank
      || user?.rank
      || 'AFFILIATE',
  );
}

export default function RankGuard({ requiredRank, isOpCreator = false, children }) {
  const outletContext = useOutletContext() || {};
  const { user } = useSession();

  const resolvedRequiredRank = normalizeRank(requiredRank);
  const resolvedUserRank = getResolvedRank(outletContext, user);
  const hasAccess = isOpCreator || RANKS[resolvedUserRank] >= RANKS[resolvedRequiredRank];

  if (hasAccess) {
    return children;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 40,
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(var(--warn-rgb), 0.12)',
          border: '0.5px solid rgba(var(--warn-rgb), 0.32)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--warn)',
          flexShrink: 0,
        }}
      >
        <ShieldAlert size={12} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--t1)', fontSize: 12, letterSpacing: '0.08em' }}>ACCESS RESTRICTED</div>
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.5 }}>
          This section requires {resolvedRequiredRank} rank or above.
        </div>
      </div>
    </div>
  );
}
