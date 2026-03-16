import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Users } from 'lucide-react';

const RANK_COLORS = {
  PIONEER: 'var(--warn)',
  FOUNDER: 'var(--acc2)',
  VOYAGER: 'var(--info)',
  SCOUT: 'var(--live)',
  VAGRANT: 'var(--t1)',
  AFFILIATE: 'var(--t2)',
};

const RANK_ORDER = ['PIONEER','FOUNDER','VOYAGER','SCOUT','VAGRANT','AFFILIATE'];

function MemberCard({ user }) {
  const rankColor = RANK_COLORS[user.nexus_rank] || 'var(--t2)';
  const timeAgo = (iso) => {
    if (!iso) return '—';
    const h = Math.floor((Date.now() - new Date(iso)) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="nexus-card" style={{ padding: '12px 14px' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: rankColor, flexShrink: 0 }} />
          <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{user.callsign}</span>
        </div>
        <span style={{ color: rankColor, fontSize: 9, letterSpacing: '0.1em' }}>{user.nexus_rank}</span>
      </div>
      <div className="flex items-center justify-between" style={{ color: 'var(--t2)', fontSize: 10 }}>
        <span>Joined {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '—'}</span>
        <span>Last seen {timeAgo(user.last_seen_at)}</span>
      </div>
      {user.discord_roles && user.discord_roles.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
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

  useEffect(() => {
    base44.entities.NexusUser.list('-joined_at', 200).then(d => setUsers(d || []));
  }, []);

  const filtered = users.filter(u => {
    if (rankFilter !== 'ALL' && u.nexus_rank !== rankFilter) return false;
    if (search && !u.callsign?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => RANK_ORDER.indexOf(a.nexus_rank) - RANK_ORDER.indexOf(b.nexus_rank));

  const byCounts = RANK_ORDER.reduce((acc, r) => {
    acc[r] = users.filter(u => u.nexus_rank === r).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="flex items-center gap-3">
        <Users size={16} style={{ color: 'var(--acc2)' }} />
        <span style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600 }}>ORG ROSTER</span>
        <span style={{ color: 'var(--t2)', fontSize: 11 }}>{users.length} members</span>
      </div>

      {/* Rank breakdown */}
      <div className="flex gap-2 flex-wrap">
        {RANK_ORDER.map(r => (
          <button
            key={r}
            onClick={() => setRankFilter(rankFilter === r ? 'ALL' : r)}
            className="nexus-btn"
            style={{ padding: '4px 10px', fontSize: 10, background: rankFilter === r ? 'var(--bg4)' : 'var(--bg2)', borderColor: rankFilter === r ? RANK_COLORS[r] : 'var(--b1)', color: rankFilter === r ? RANK_COLORS[r] : 'var(--t2)' }}
          >
            {r} <span style={{ color: 'var(--t2)', marginLeft: 4 }}>{byCounts[r] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
        <input className="nexus-input" placeholder="Search callsign..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {filtered.map(u => <MemberCard key={u.id} user={u} />)}
      </div>

      {filtered.length === 0 && (
        <div style={{ color: 'var(--t2)', fontSize: 13, textAlign: 'center', padding: 40 }}>No members match your search</div>
      )}
    </div>
  );
}
