/**
 * MemberPerformanceTab — Aggregated per-member stats for the Org Roster.
 * Shows ops participated, earnings, materials logged, crafts, scout deposits.
 * Props: { users }
 */
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Trophy, Crosshair, Package, Radar, Wrench, DollarSign } from 'lucide-react';

function fmtVal(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const CATEGORIES = [
  { id: 'ops', label: 'OPS', icon: Crosshair, color: '#C0392B' },
  { id: 'earnings', label: 'EARNINGS', icon: DollarSign, color: '#2edb7a' },
  { id: 'materials', label: 'MATERIALS', icon: Package, color: '#C8A84B' },
  { id: 'crafts', label: 'CRAFTS', icon: Wrench, color: '#7AAECC' },
  { id: 'deposits', label: 'DEPOSITS', icon: Radar, color: '#D8BC70' },
];

export default function MemberPerformanceTab({ users = [] }) {
  const [rsvps, setRsvps] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [cofferLogs, setCofferLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('ops');

  useEffect(() => {
    Promise.all([
      base44.entities.OpRsvp.filter({ status: 'CONFIRMED' }),
      base44.entities.Material.list('-logged_at', 500),
      base44.entities.CraftQueue.filter({ status: 'COMPLETE' }),
      base44.entities.ScoutDeposit.list('-reported_at', 500),
      base44.entities.CofferLog.list('-logged_at', 500),
    ]).then(([r, m, c, d, co]) => {
      setRsvps(r || []);
      setMaterials(m || []);
      setCraftQueue(c || []);
      setDeposits(d || []);
      setCofferLogs(co || []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const map = {};
    users.forEach(u => {
      map[u.callsign] = {
        callsign: u.callsign,
        rank: u.nexus_rank || 'AFFILIATE',
        ops: 0, earnings: 0, materials: 0, crafts: 0, deposits: 0,
      };
    });

    rsvps.forEach(r => {
      const cs = r.callsign;
      if (cs && map[cs]) map[cs].ops++;
    });

    materials.forEach(m => {
      const cs = m.logged_by_callsign;
      if (cs && map[cs]) map[cs].materials += (m.quantity_scu || 0);
    });

    craftQueue.forEach(c => {
      const cs = c.claimed_by_callsign || c.requested_by_callsign;
      if (cs && map[cs]) map[cs].crafts += (c.quantity || 1);
    });

    deposits.forEach(d => {
      const cs = d.reported_by_callsign;
      if (cs && map[cs]) map[cs].deposits++;
    });

    cofferLogs.forEach(cl => {
      const cs = cl.logged_by_callsign;
      if (cs && map[cs] && cl.entry_type === 'OP_SPLIT') {
        map[cs].earnings += (cl.amount_aUEC || 0);
      }
    });

    return Object.values(map)
      .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
      .filter(s => s.ops > 0 || s.materials > 0 || s.crafts > 0 || s.deposits > 0 || s.earnings > 0);
  }, [users, rsvps, materials, craftQueue, deposits, cofferLogs, sortBy]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSortBy(cat.id)}
            style={{
              padding: '5px 10px', fontSize: 9, borderRadius: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              background: sortBy === cat.id ? `${cat.color}18` : 'transparent',
              border: `0.5px solid ${sortBy === cat.id ? cat.color : 'rgba(200,170,100,0.10)'}`,
              color: sortBy === cat.id ? cat.color : '#5A5850',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <cat.icon size={9} /> {cat.label}
          </button>
        ))}
      </div>

      {/* Leaderboard table */}
      <div style={{
        background: '#0F0F0D',
        borderLeft: '2px solid #C0392B',
        borderTop: '0.5px solid rgba(200,170,100,0.10)',
        borderRight: '0.5px solid rgba(200,170,100,0.10)',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 70px 80px 80px 70px 70px',
          gap: 6, padding: '8px 12px', background: '#141410',
          borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        }}>
          {['#', 'MEMBER', 'OPS', 'EARNINGS', 'MATERIALS', 'CRAFTS', 'DEPOSITS'].map(h => (
            <span key={h} style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500,
              fontSize: 9, color: '#5A5850', letterSpacing: '0.15em',
            }}>{h}</span>
          ))}
        </div>

        {stats.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>
            No member activity recorded yet.
          </div>
        ) : stats.map((m, i) => (
          <div
            key={m.callsign}
            style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 70px 80px 80px 70px 70px',
              gap: 6, padding: '10px 12px', alignItems: 'center',
              borderBottom: '0.5px solid rgba(200,170,100,0.04)',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1A1A16'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: i < 3 ? '#C8A84B' : '#5A5850', fontWeight: i < 3 ? 700 : 400,
              textAlign: 'center',
            }}>
              {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
            </span>
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                color: '#E8E4DC', fontWeight: 600,
              }}>{m.callsign}</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
                color: '#5A5850', textTransform: 'uppercase',
              }}>{m.rank}</div>
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: sortBy === 'ops' ? '#C0392B' : '#9A9488',
              fontWeight: sortBy === 'ops' ? 700 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}>{m.ops}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: sortBy === 'earnings' ? '#2edb7a' : '#9A9488',
              fontWeight: sortBy === 'earnings' ? 700 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}>{fmtVal(m.earnings)}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: sortBy === 'materials' ? '#C8A84B' : '#9A9488',
              fontWeight: sortBy === 'materials' ? 700 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}>{m.materials.toFixed(1)}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: sortBy === 'crafts' ? '#7AAECC' : '#9A9488',
              fontWeight: sortBy === 'crafts' ? 700 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}>{m.crafts}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: sortBy === 'deposits' ? '#D8BC70' : '#9A9488',
              fontWeight: sortBy === 'deposits' ? 700 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}>{m.deposits}</span>
          </div>
        ))}
      </div>
    </div>
  );
}