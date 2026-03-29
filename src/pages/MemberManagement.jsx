import React, { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { listMemberDirectory } from '@/core/data/member-directory';
import { useVisiblePolling } from '@/core/hooks/useVisiblePolling';
import { RefreshCw, Users } from 'lucide-react';
import MemberKpiBar from '@/components/member-mgmt/MemberKpiBar';
import MemberFilters from '@/components/member-mgmt/MemberFilters';
import MemberRow from '@/components/member-mgmt/MemberRow';
import MemberDetailPanel from '@/components/member-mgmt/MemberDetailPanel';
import BlueprintContributionsSummary from '@/components/member-mgmt/BlueprintContributionsSummary';

const RANK_ORDER = ['PIONEER', 'FOUNDER', 'QUARTERMASTER', 'VOYAGER', 'SCOUT', 'VAGRANT', 'AFFILIATE'];

export default function MemberManagement() {
  const outletContext = /** @type {any} */ (useOutletContext() || {});
  const isAdmin = outletContext.isAdmin;

  const [members, setMembers] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [specFilter, setSpecFilter] = useState('ALL');
  const [accessFilter, setAccessFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    const [m, bp] = await Promise.all([
      listMemberDirectory({ sort: '-joined_at', limit: 500 }).catch(() => []),
      base44.entities.Blueprint.list('-created_date', 500).catch(() => []),
    ]);
    setMembers(m || []);
    setBlueprints(bp || []);
    setLoading(false);
  }, []);

  useVisiblePolling(load, 60000);

  // Blueprint count per callsign
  const bpCountMap = useMemo(() => {
    const map = {};
    for (const bp of (blueprints || [])) {
      const cs = (bp.owned_by_callsign || '').toUpperCase();
      if (!cs) continue;
      map[cs] = (map[cs] || 0) + 1;
    }
    return map;
  }, [blueprints]);

  // Blueprints for selected member
  const selectedBps = useMemo(() => {
    if (!selected) return [];
    const cs = (selected.callsign || '').toUpperCase();
    return (blueprints || []).filter(bp => (bp.owned_by_callsign || '').toUpperCase() === cs);
  }, [selected, blueprints]);

  // Filtered + sorted members
  const filtered = useMemo(() => {
    return members.filter(m => {
      if (rankFilter !== 'ALL' && (m.nexus_rank || 'AFFILIATE') !== rankFilter) return false;
      if (specFilter !== 'ALL' && (m.specialization || 'UNASSIGNED') !== specFilter) return false;
      if (accessFilter !== 'ALL' && (m.intel_access || 'STANDARD') !== accessFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [m.callsign, m.op_role, m.specialization].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) =>
      RANK_ORDER.indexOf(a.nexus_rank || 'AFFILIATE') - RANK_ORDER.indexOf(b.nexus_rank || 'AFFILIATE')
    );
  }, [members, rankFilter, specFilter, accessFilter, search]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="nexus-loading-dots" style={{ color: '#9A9488' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 16px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: '#0A0908', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} style={{ color: '#C0392B' }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 'clamp(14px, 3vw, 18px)', color: '#E8E4DC', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>MEMBER MANAGEMENT</span>
              </div>
              <div style={{
                fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 4,
              }}>ROLES · EXPERTISE · INTEL ACCESS</div>
            </div>
            <button onClick={load} style={{
              padding: '8px 14px', background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2,
              color: '#5A5850', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
            }}><RefreshCw size={11} /> REFRESH</button>
          </div>

          <MemberKpiBar members={members} blueprints={blueprints} />

          <div style={{ marginTop: 14 }}>
            <MemberFilters
              search={search} onSearch={setSearch}
              rankFilter={rankFilter} onRankFilter={setRankFilter}
              specFilter={specFilter} onSpecFilter={setSpecFilter}
              accessFilter={accessFilter} onAccessFilter={setAccessFilter}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 24px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Blueprint contributions summary */}
          <div style={{ marginBottom: 16 }}>
            <BlueprintContributionsSummary members={members} blueprints={blueprints} />
          </div>

          {/* Member table */}
          <div style={{
            background: '#0F0F0D', borderLeft: '2px solid #C0392B',
            border: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 70px 30px',
              padding: '8px 14px', background: '#141410',
              borderBottom: '0.5px solid rgba(200,170,100,0.10)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9,
              color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              <span>MEMBER</span><span>RANK</span><span>SPEC</span>
              <span>ACCESS</span><span>BLUEPRINTS</span><span>ACTIVITY</span><span />
            </div>

            {filtered.map(m => (
              <MemberRow
                key={m.id}
                member={m}
                blueprintCount={bpCountMap[(m.callsign || '').toUpperCase()] || 0}
                onSelect={setSelected}
              />
            ))}

            {filtered.length === 0 && (
              <div style={{
                padding: '60px 20px', textAlign: 'center',
                fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
                fontSize: 11, color: '#5A5850', textTransform: 'uppercase', letterSpacing: '0.22em',
              }}>NO MEMBERS MATCH FILTERS</div>
            )}

            <div style={{
              padding: '8px 14px', borderTop: '0.5px solid rgba(200,170,100,0.06)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850',
            }}>
              Showing {filtered.length} of {members.length}
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <MemberDetailPanel
          member={selected}
          memberBlueprints={selectedBps}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
