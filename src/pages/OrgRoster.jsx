import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Search } from 'lucide-react';

const RANK_ORDER = ['PIONEER','FOUNDER','VOYAGER','SCOUT','VAGRANT','AFFILIATE'];

function timeAgo(iso) {
  if (!iso) return '—';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MemberCard({ user }) {
  const rank = user.nexus_rank || 'AFFILIATE';
  const isAdmin = user.is_admin === true;
  const opRole = user.op_role || '';

  return (
    <div style={{
      background: '#0F0F0D',
      borderLeft: '2px solid #C0392B',
      borderTop: `0.5px solid ${isAdmin ? 'rgba(200,168,75,0.4)' : 'rgba(200,170,100,0.10)'}`,
      borderRight: `0.5px solid ${isAdmin ? 'rgba(200,168,75,0.4)' : 'rgba(200,170,100,0.10)'}`,
      borderBottom: `0.5px solid ${isAdmin ? 'rgba(200,168,75,0.4)' : 'rgba(200,170,100,0.10)'}`,
      borderRadius: 2, padding: 20,
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#E8E4DC', marginBottom: 4 }}>{user.callsign}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#C8A84B', textTransform: 'uppercase', marginBottom: 8 }}>{opRole || <span style={{ color: '#5A5850', fontStyle: 'italic' }}>UNASSIGNED</span>}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 10, color: '#5A5850' }}>Joined {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '—'}</span>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 400, fontSize: 10, color: '#5A5850' }}>Last seen {timeAgo(user.last_seen_at)}</span>
      </div>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 10, color: '#5A5850', background: 'rgba(90,88,80,0.15)', border: '0.5px solid rgba(90,88,80,0.25)', borderRadius: 2, padding: '2px 6px', textTransform: 'uppercase' }}>{rank}</span>
    </div>
  );
}

export default function OrgRoster() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('ALL');

  const load = useCallback(async () => {
    const data = await base44.entities.NexusUser.list('-joined_at', 200).catch(() => []);
    setUsers(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.NexusUser.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const filtered = users.filter(u => {
    if (rankFilter !== 'ALL' && (u.nexus_rank || 'AFFILIATE') !== rankFilter) return false;
    if (search && !u.callsign?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => RANK_ORDER.indexOf(a.nexus_rank || 'AFFILIATE') - RANK_ORDER.indexOf(b.nexus_rank || 'AFFILIATE'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 20, gap: 16, animation: 'pageEntrance 200ms ease-out' }}>
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ORG ROSTER</div>
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 4 }}>REDSCAR NOMADS · ACTIVE MEMBERS</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['ALL', ...RANK_ORDER].map(r => (
          <button key={r} onClick={() => setRankFilter(r)} style={{
            padding: '4px 10px', fontSize: 10, borderRadius: 2, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            background: rankFilter === r ? 'rgba(200,168,75,0.12)' : 'transparent',
            border: `0.5px solid ${rankFilter === r ? '#C8A84B' : 'rgba(200,170,100,0.10)'}`,
            color: rankFilter === r ? '#C8A84B' : '#5A5850', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>{r}</button>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5A5850' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH CALLSIGN..." style={{
          width: '100%', padding: '10px 14px 10px 32px', background: '#141410',
          border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, letterSpacing: '0.08em', outline: 'none',
        }} onFocus={e => { e.target.style.borderColor = '#C8A84B'; }} onBlur={e => { e.target.style.borderColor = 'rgba(200,170,100,0.12)'; }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {filtered.map(u => <MemberCard key={u.id} user={u} />)}
      </div>

      {filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
          <span style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em' }}>NO MEMBERS FOUND</span>
        </div>
      )}
    </div>
  );
}