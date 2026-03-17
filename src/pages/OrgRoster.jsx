import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Users } from 'lucide-react';
import NexusToken from '@/components/ui/NexusToken';
import { rankToken, opTypeToken } from '@/lib/tokenMap';

const RANK_ORDER = ['PIONEER','FOUNDER','VOYAGER','SCOUT','VAGRANT','AFFILIATE'];

function timeAgo(iso) {
  if (!iso) return '—';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MemberCard({ user, activeOpType }) {
  const rank = user.nexus_rank || user.rank || 'AFFILIATE';
  const isRecent = user.last_seen_at && (Date.now() - new Date(user.last_seen_at).getTime()) < 3600000;

  return (
    <div className="nexus-card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <NexusToken
            src={rankToken(rank)}
            size={16}
            alt={rank}
            title={`Rank: ${rank}`}
          />
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{user.callsign}</span>
          {isRecent && (
            <span
              title="Online recently (< 1h)"
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', flexShrink: 0, display: 'inline-block' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {activeOpType && (
            <NexusToken
              src={opTypeToken(activeOpType)}
              size={14}
              pulse="live"
              alt={`In op: ${activeOpType}`}
              title={`Currently in a live ${activeOpType} op`}
            />
          )}
          <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>{rank}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--t2)', fontSize: 10 }}>
        <span title={user.joined_at ? new Date(user.joined_at).toISOString() : undefined}>
          Joined {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '—'}
        </span>
        <span title={user.last_seen_at || undefined}>
          {isRecent ? <span style={{ color: 'var(--live)' }}>ONLINE NOW</span> : `Last seen ${timeAgo(user.last_seen_at)}`}
        </span>
      </div>
      {user.discord_roles && user.discord_roles.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {user.discord_roles.slice(0, 4).map((r, i) => (
            <span key={i} className="nexus-tag" style={{ color: 'var(--t2)', borderColor: 'var(--b1)', background: 'transparent', fontSize: 9 }}>{r}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgRoster() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('ALL');
  // Map of discord_id -> op type for members in live ops
  const [inOpMap, setInOpMap] = useState({});

  const load = useCallback(async () => {
    const usersData = await base44.entities.NexusUser.list('-joined_at', 200).catch(() => []);
    setUsers(usersData || []);
  }, []);

  // Load op-based presence: find live ops, get their RSVPs, build discord_id -> op type map
  const loadPresence = useCallback(async () => {
    try {
      const liveOps = await base44.entities.Op.filter({ status: 'LIVE' });
      if (!Array.isArray(liveOps) || liveOps.length === 0) {
        setInOpMap({});
        return;
      }
      const rsvpArrays = await Promise.all(
        liveOps.map(op => base44.entities.OpRsvp.filter({ op_id: op.id }).catch(() => []))
      );
      const map = {};
      liveOps.forEach((op, idx) => {
        (rsvpArrays[idx] || []).forEach(rsvp => {
          if (rsvp.discord_id && rsvp.status === 'CONFIRMED') {
            map[String(rsvp.discord_id)] = op.type || 'MINING';
          }
        });
      });
      setInOpMap(map);
    } catch {
      // presence load failed — no op indicators shown
    }
  }, []);

  useEffect(() => {
    load();
    loadPresence();
  }, [load, loadPresence]);

  useEffect(() => {
    const unsubscribe = base44.entities.NexusUser.subscribe(() => { load(); });
    return () => unsubscribe();
  }, [load]);

  useEffect(() => {
    const unsubscribe = base44.entities.Op.subscribe(() => { loadPresence(); });
    return () => unsubscribe();
  }, [loadPresence]);

  const filtered = users.filter(u => {
    const rank = u.nexus_rank || u.rank;
    if (rankFilter !== 'ALL' && rank !== rankFilter) return false;
    if (search && !u.callsign?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const ra = a.nexus_rank || a.rank || 'AFFILIATE';
    const rb = b.nexus_rank || b.rank || 'AFFILIATE';
    return RANK_ORDER.indexOf(ra) - RANK_ORDER.indexOf(rb);
  });

  const byCounts = RANK_ORDER.reduce((acc, r) => {
    acc[r] = users.filter(u => (u.nexus_rank || u.rank) === r).length;
    return acc;
  }, {});

  const RANK_COLORS = {
    PIONEER: 'var(--warn)', FOUNDER: 'var(--acc2)', VOYAGER: 'var(--info)',
    SCOUT: 'var(--live)', VAGRANT: 'var(--t1)', AFFILIATE: 'var(--t2)',
  };

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 16, gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Users size={16} style={{ color: 'var(--acc2)' }} />
        <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>ORG ROSTER</span>
        <span style={{ color: 'var(--t2)', fontSize: 11 }}>{users.length} members</span>
        {Object.keys(inOpMap).length > 0 && (
          <span
            title={`${Object.keys(inOpMap).length} member(s) currently in a live op`}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--live)', letterSpacing: '0.08em' }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)', animation: 'pulse-dot 2.5s ease-in-out infinite', display: 'inline-block' }} />
            {Object.keys(inOpMap).length} IN-OP
          </span>
        )}
      </div>

      {/* Rank filter strip */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {RANK_ORDER.map(r => (
          <button
            key={r}
            onClick={() => setRankFilter(rankFilter === r ? 'ALL' : r)}
            className="nexus-btn"
            title={`Filter by ${r} rank (${byCounts[r] || 0} members)`}
            style={{
              padding: '4px 10px', fontSize: 10,
              background: rankFilter === r ? 'var(--bg4)' : 'var(--bg2)',
              borderColor: rankFilter === r ? (RANK_COLORS[r] || 'var(--b2)') : 'var(--b1)',
              color: rankFilter === r ? (RANK_COLORS[r] || 'var(--t0)') : 'var(--t2)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <NexusToken src={rankToken(r)} size={12} alt={r} />
            {r} <span style={{ color: 'var(--t2)', marginLeft: 2 }}>{byCounts[r] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
        <input
          className="nexus-input"
          placeholder="Search callsign..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32 }}
        />
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {filtered.map(u => (
          <MemberCard
            key={u.id}
            user={u}
            activeOpType={inOpMap[String(u.discord_id)] || null}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          No members match your search
        </div>
      )}
    </div>
  );
}