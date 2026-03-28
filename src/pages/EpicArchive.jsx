import React, { useState, useEffect } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Search, Trophy, Clock, Users, TrendingUp, BookOpen } from 'lucide-react';
import AARTimelineCard from '@/apps/ops-board/AARTimelineCard';
import { ArchiveTimeline } from '@/core/design/Illustrations';

const TABS = ['OPS', 'AAR TIMELINE', 'LEADERBOARDS', 'PATCH HISTORY'];

function OpArchiveCard({ op }) {
  const duration = op.started_at && op.ended_at
    ? Math.round((new Date(op.ended_at).getTime() - new Date(op.started_at).getTime()) / 60000)
    : null;

  return (
    <div className="nexus-card" style={{ padding: '14px 16px' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>{op.name}</div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
            {new Date(op.scheduled_at || op.created_date).toLocaleDateString()} · {op.system}{op.location ? ` · ${op.location}` : ''}
          </div>
        </div>
        <span className="nexus-tag" style={{ color: 'var(--acc2)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>{op.type?.replace(/_/g, ' ')}</span>
      </div>

      <div className="flex items-center gap-4" style={{ color: 'var(--t1)', fontSize: 11, marginBottom: 10 }}>
        {duration && <span className="flex items-center gap-1"><Clock size={10}/> {duration}m</span>}
        <span className="flex items-center gap-1"><Users size={10}/> {op._crew_count || '?'} crew</span>
      </div>

      {op.wrap_up_report && (
        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, padding: '10px 12px' }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 6 }}>WRAP-UP REPORT</div>
          <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden' }}>
            {op.wrap_up_report}
          </div>
        </div>
      )}

      {op.session_log && op.session_log.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}>SESSION LOG — {op.session_log.length} ENTRIES</div>
          <div style={{ maxHeight: 80, overflow: 'hidden', position: 'relative' }}>
            {op.session_log.slice(0, 4).map((entry, i) => (
              <div key={i} className="flex gap-3" style={{ padding: '2px 0', borderBottom: '0.5px solid var(--b0)' }}>
                <span style={{ color: 'var(--t2)', fontSize: 10, flexShrink: 0 }}>
                  {entry.t ? new Date(entry.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <span style={{ color: 'var(--acc2)', fontSize: 10, flexShrink: 0 }}>{entry.author}</span>
                <span style={{ color: 'var(--t1)', fontSize: 11 }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ rank, callsign, value, label, color }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--b0)' }}>
      <div style={{ width: 24, textAlign: 'center', color: rank <= 3 ? 'var(--warn)' : 'var(--t2)', fontSize: rank <= 3 ? 13 : 11, fontWeight: 700 }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
      </div>
      <span style={{ flex: 1, color: 'var(--t0)', fontSize: 12 }}>{callsign}</span>
      <span style={{ color: color || 'var(--live)', fontSize: 12, fontWeight: 600 }}>{value}</span>
      <span style={{ color: 'var(--t2)', fontSize: 10 }}>{label}</span>
    </div>
  );
}

export default function EpicArchive() {
  const [tab, setTab] = useState('OPS');
  const [ops, setOps] = useState([]);
  const [patches, setPatches] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [craftQueue, setCraftQueue] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPatch, setSelectedPatch] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Op.filter({ status: 'COMPLETE' }, '-ended_at', 30),
      base44.entities.PatchDigest.list('-published_at', 20),
      base44.entities.ScoutDeposit.list('-reported_at', 200),
      base44.entities.CraftQueue.list('-created_date', 200),
    ]).then(([o, p, deps, queue]) => {
      setOps(o || []);
      setPatches(p || []);
      setDeposits(deps || []);
      setCraftQueue(queue || []);
      setSelectedPatch((current) => current || p?.[0] || null);
    });
  }, []);

  const filteredOps = ops.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.system?.toLowerCase().includes(search.toLowerCase())
  );

  const scoutLeaders = Object.values(
    deposits.reduce((acc, deposit) => {
      const callsign = deposit.reported_by_callsign || deposit.reported_by || 'UNKNOWN';
      if (!acc[callsign]) {
        acc[callsign] = { callsign, value: 0, label: 'reports' };
      }
      acc[callsign].value += 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.value - a.value || a.callsign.localeCompare(b.callsign))
    .slice(0, 5);

  const craftLeaders = Object.values(
    craftQueue
      .filter((item) => item.status === 'COMPLETE')
      .reduce((acc, item) => {
        const callsign = item.claimed_by_callsign || item.requested_by_callsign || 'UNKNOWN';
        if (!acc[callsign]) {
          acc[callsign] = { callsign, value: 0, label: 'items', color: 'var(--info)' };
        }
        acc[callsign].value += Number(item.quantity || 1);
        return acc;
      }, {}),
  )
    .sort((a, b) => b.value - a.value || a.callsign.localeCompare(b.callsign))
    .slice(0, 5);

  return (
    <div className="nexus-page-enter flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--b1)', background: 'var(--bg1)' }}
      >
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--t0)' : '2px solid transparent',
              color: tab === t ? 'var(--t0)' : 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <ArchiveTimeline size={40} opacity={0.12} />
      </div>

      <div className="flex-1 overflow-auto nexus-fade-in">
        {tab === 'OPS' && (
          <div className="p-4 flex flex-col gap-4">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
              <input className="nexus-input" placeholder="Search ops..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>

            <div style={{ color: 'var(--t1)', fontSize: 11 }}>{filteredOps.length} completed ops</div>

            {filteredOps.map(op => <OpArchiveCard key={op.id} op={op} />)}

            {filteredOps.length === 0 && (
              <div className="flex flex-col items-center" style={{ padding: 40, color: 'var(--t2)', fontSize: 13 }}>
                <BookOpen size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
                <span>No completed ops yet. The archive will fill as ops are completed.</span>
              </div>
            )}
          </div>
        )}

        {tab === 'AAR TIMELINE' && (
          <div className="p-4 flex flex-col gap-4">
            <div style={{ color: 'var(--t2)', fontSize: 11 }}>{filteredOps.filter(o => o.wrap_up_data || o.wrap_up_report).length} ops with after-action data</div>
            {filteredOps.filter(o => o.wrap_up_data || o.wrap_up_report).map(op => <AARTimelineCard key={op.id} op={op} />)}
            {filteredOps.filter(o => o.wrap_up_data || o.wrap_up_report).length === 0 && (
              <div className="flex flex-col items-center" style={{ padding: 40, color: 'var(--t2)', fontSize: 13 }}>
                <BookOpen size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
                <span>No after-action reports yet. Complete ops with wrap-up data to see them here.</span>
              </div>
            )}
          </div>
        )}

        {tab === 'LEADERBOARDS' && (
          <div className="p-4 flex gap-4">
            <div className="nexus-card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trophy size={13} style={{ color: 'var(--warn)' }} />
                <span style={{ color: 'var(--t1)', fontSize: 11, letterSpacing: '0.08em' }}>TOP SCOUTS</span>
              </div>
              {scoutLeaders.map((s, i) => <LeaderboardRow key={i} rank={i + 1} {...s} />)}
              {scoutLeaders.length === 0 && <div style={{ padding: 20, color: 'var(--t2)', fontSize: 12, textAlign: 'center' }}>No data yet</div>}
            </div>

            <div className="nexus-card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={13} style={{ color: 'var(--info)' }} />
                <span style={{ color: 'var(--t1)', fontSize: 11, letterSpacing: '0.08em' }}>TOP FABRICATORS</span>
              </div>
              {craftLeaders.map((s, i) => <LeaderboardRow key={i} rank={i + 1} {...s} />)}
              {craftLeaders.length === 0 && <div style={{ padding: 20, color: 'var(--t2)', fontSize: 12, textAlign: 'center' }}>No completed craft data yet</div>}
            </div>
          </div>
        )}

        {tab === 'PATCH HISTORY' && (
          <div className="p-4 flex gap-4">
            {/* Patch list */}
            <div className="flex flex-col gap-2" style={{ width: 240, flexShrink: 0 }}>
              {patches.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatch(p)}
                  className="nexus-card"
                  style={{ padding: '10px 12px', cursor: 'pointer', borderColor: selectedPatch?.id === p.id ? 'var(--acc)' : 'var(--b1)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
                >
                  <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>v{p.patch_version}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
                    {p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}
                  </div>
                </div>
              ))}
              {patches.length === 0 && <div style={{ color: 'var(--t2)', fontSize: 12, padding: 16, textAlign: 'center' }}>No patch digests yet</div>}
            </div>

            {/* Patch detail */}
            {selectedPatch ? (
              <div className="flex flex-col gap-4 flex-1 min-w-0">
                <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 700 }}>
                  Star Citizen v{selectedPatch.patch_version} — Industry Changes
                </div>
                {selectedPatch.industry_summary && (
                  <div className="nexus-card" style={{ padding: '14px' }}>
                    <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 8 }}>INDUSTRY SUMMARY</div>
                    <div style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {selectedPatch.industry_summary}
                    </div>
                  </div>
                )}
                {selectedPatch.changes_json && selectedPatch.changes_json.length > 0 && (
                  <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b1)' }}>
                      <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>CHANGE LOG</span>
                    </div>
                    {selectedPatch.changes_json.map((c, i) => (
                      <div key={i} style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--b0)', display: 'flex', gap: 10 }}>
                        <span className="nexus-tag" style={{ color: c.severity === 'high' ? 'var(--danger)' : c.severity === 'medium' ? 'var(--warn)' : 'var(--info)', borderColor: 'transparent', background: 'transparent', flexShrink: 0 }}>
                          {c.category?.toUpperCase()}
                        </span>
                        <span style={{ color: 'var(--t1)', fontSize: 11 }}>{c.change_summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--t2)', fontSize: 13 }}>
                Select a patch to view industry changes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}