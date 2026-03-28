/**
 * ResourceReportPanel — Automated resource scanning + profit split report.
 * Rendered inside LiveOp for LIVE or COMPLETE ops.
 * Props: { op, rsvps, callsign, rank }
 */
import React, { useState, useCallback } from 'react';
import { base44 } from '@/core/data/base44Client';
import { Scan, TrendingUp, Gem, Users, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

function fmtAuec(n) {
  if (!n || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K`;
  return Math.round(abs).toLocaleString();
}

function qualityColor(q) {
  if (q >= 800) return '#4A8C5C';
  if (q >= 600) return '#C8A84B';
  if (q >= 400) return '#D89B50';
  return '#C0392B';
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{
      background: '#0C0C0A', border: `1px solid ${color}18`,
      borderLeft: `3px solid ${color}`, borderRadius: 3,
      padding: '10px 14px', flex: 1, minWidth: 110,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Icon size={10} style={{ color }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DepositRow({ deposit }) {
  const qColor = qualityColor(deposit.quality_score);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px 70px 80px',
      gap: 6, padding: '8px 12px', alignItems: 'center',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
      transition: 'background 150ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#141410'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#E8E4DC', fontWeight: 500 }}>{deposit.material}</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850' }}>{deposit.location}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: qColor }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: qColor, fontVariantNumeric: 'tabular-nums' }}>{deposit.quality_score}</span>
      </div>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488' }}>{deposit.yield_pct}%</span>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488' }}>{deposit.refined_scu} SCU</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
        color: deposit.tier === 'LEGENDARY' ? '#9B59B6' : deposit.tier === 'EPIC' ? '#C8A84B' : deposit.tier === 'RARE' ? '#7AAECC' : '#5A5850',
        letterSpacing: '0.06em',
      }}>{deposit.tier}</span>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#2edb7a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {fmtAuec(deposit.estimated_value_aUEC)}
      </span>
    </div>
  );
}

function CrewPayoutRow({ member }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px',
      borderBottom: '0.5px solid rgba(200,170,100,0.04)',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8A84B', flexShrink: 0 }} />
      <span style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#E8E4DC', fontWeight: 500 }}>{member.callsign}</span>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850' }}>{member.role}</span>
      {member.tax > 0 && (
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#C0392B' }}>-{fmtAuec(member.tax)} tax</span>
      )}
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#E8E4DC', fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
        {fmtAuec(member.net)} aUEC
      </span>
    </div>
  );
}

export default function ResourceReportPanel({ op, rsvps, callsign, rank }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [depositsOpen, setDepositsOpen] = useState(false);
  const [harvestedOpen, setHarvestedOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(true);

  const runScan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('opResourceReport', { op_id: op.id });
      setReport(res.data?.report || null);
      if (!res.data?.report) setError('No report data returned.');
    } catch (err) {
      setError(err?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [op?.id]);

  const SectionToggle = ({ label, count, open, onToggle }) => (
    <button type="button" onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
      padding: '10px 12px', background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.06)',
      borderRadius: 3, cursor: 'pointer', marginBottom: open ? 0 : 0,
    }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {label} {count != null && <span style={{ color: '#C8A84B' }}>({count})</span>}
      </span>
      {open ? <ChevronUp size={12} style={{ color: '#5A5850' }} /> : <ChevronDown size={12} style={{ color: '#5A5850' }} />}
    </button>
  );

  // Pre-scan state
  if (!report) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
          color: '#5A5850', letterSpacing: '0.18em', textTransform: 'uppercase',
          paddingBottom: 6, borderBottom: '0.5px solid rgba(200,170,100,0.06)',
        }}>RESOURCE INTELLIGENCE</div>

        <div style={{
          padding: '20px 16px', textAlign: 'center',
          background: '#0C0C0A', border: '1px solid rgba(200,170,100,0.06)',
          borderRadius: 3,
        }}>
          <Scan size={24} style={{ color: '#5A5850', marginBottom: 10 }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#9A9488', marginBottom: 4 }}>
            Scan active deposits in {op?.system || op?.system_name || 'this system'}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginBottom: 16 }}>
            Calculates yield potential, market valuation, and projected profit split for the crew.
          </div>
          <button type="button" onClick={runScan} disabled={loading} style={{
            background: loading ? '#1A1A18' : 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
            border: loading ? '1px solid #2A2A28' : '1px solid rgba(192,57,43,0.6)',
            borderRadius: 3, padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 12, color: '#F0EDE5', letterSpacing: '0.14em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(192,57,43,0.3)',
            transition: 'all 250ms',
          }}>
            {loading ? (
              <span className="nexus-loading-dots" style={{ color: '#F0EDE5' }}><span /><span /><span /></span>
            ) : (
              <><Scan size={13} /> RUN RESOURCE SCAN</>
            )}
          </button>
          {error && (
            <div style={{ marginTop: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#C0392B' }}>
              <AlertTriangle size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Report display
  const r = report;
  const basisLabel = r.profit_split.basis === 'HARVESTED' ? 'Based on harvested materials' : 'Projected from available deposits';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'nexus-fade-in 200ms ease-out both' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 8, borderBottom: '0.5px solid rgba(200,170,100,0.06)',
      }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, color: '#C0392B', letterSpacing: '0.20em', textTransform: 'uppercase' }}>
            RESOURCE INTELLIGENCE REPORT
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', marginTop: 2 }}>
            {r.system} · {new Date(r.generated_at).toLocaleString()} · by {r.generated_by}
          </div>
        </div>
        <button type="button" onClick={runScan} disabled={loading} style={{
          background: 'none', border: '0.5px solid rgba(200,170,100,0.10)',
          borderRadius: 2, padding: '5px 12px', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Scan size={10} /> RESCAN
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard label="Deposits" value={r.deposits.total_count} sub={`${r.deposits.t2_eligible_count} T2-eligible`} icon={Gem} color="#7AAECC" />
        <StatCard label="Potential Yield" value={`${fmtAuec(r.deposits.total_potential_scu)} SCU`} sub={`${fmtAuec(r.deposits.total_potential_value_aUEC)} aUEC`} icon={TrendingUp} color="#C8A84B" />
        <StatCard label="Harvested" value={`${fmtAuec(r.harvested.total_scu)} SCU`} sub={`${fmtAuec(r.harvested.total_value_aUEC)} aUEC`} icon={TrendingUp} color="#4A8C5C" />
        <StatCard label="Per Member" value={`${fmtAuec(r.profit_split.per_member_net)} aUEC`} sub={`${r.profit_split.crew_count} crew`} icon={Users} color="#E8E4DC" />
      </div>

      {/* Efficiency bar */}
      {r.summary.efficiency_pct > 0 && (
        <div style={{ padding: '8px 12px', background: '#0C0C0A', border: '0.5px solid rgba(200,170,100,0.06)', borderRadius: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', letterSpacing: '0.12em' }}>EXTRACTION EFFICIENCY</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, color: r.summary.efficiency_pct >= 50 ? '#4A8C5C' : '#C8A84B' }}>{r.summary.efficiency_pct}%</span>
          </div>
          <div style={{ height: 4, background: '#1A1A18', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.min(100, r.summary.efficiency_pct)}%`,
              background: r.summary.efficiency_pct >= 50 ? '#4A8C5C' : '#C8A84B',
              transition: 'width 600ms ease-out',
            }} />
          </div>
        </div>
      )}

      {/* Deposit details */}
      <SectionToggle label="DEPOSIT ANALYSIS" count={r.deposits.total_count} open={depositsOpen} onToggle={() => setDepositsOpen(!depositsOpen)} />
      {depositsOpen && (
        <div style={{ background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)', borderRadius: 3, overflow: 'hidden', animation: 'nexus-fade-in 150ms ease-out both' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px 70px 80px',
            gap: 6, padding: '6px 12px', background: '#141410',
            borderBottom: '0.5px solid rgba(200,170,100,0.08)',
          }}>
            {['MATERIAL', 'QUALITY', 'YIELD', 'OUTPUT', 'TIER', 'VALUE'].map(h => (
              <span key={h} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600, color: '#5A5850', letterSpacing: '0.15em' }}>{h}</span>
            ))}
          </div>
          {r.deposits.items.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#5A5850', fontSize: 11 }}>No active deposits in {r.system}.</div>
          ) : (
            r.deposits.items.map((d, i) => <DepositRow key={d.deposit_id || i} deposit={d} />)
          )}
        </div>
      )}

      {/* Harvested materials */}
      {r.harvested.items.length > 0 && (
        <>
          <SectionToggle label="HARVESTED MATERIALS" count={r.harvested.items.length} open={harvestedOpen} onToggle={() => setHarvestedOpen(!harvestedOpen)} />
          {harvestedOpen && (
            <div style={{ background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)', borderRadius: 3, overflow: 'hidden', animation: 'nexus-fade-in 150ms ease-out both' }}>
              {r.harvested.items.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  borderBottom: '0.5px solid rgba(200,170,100,0.04)',
                }}>
                  <span style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#E8E4DC' }}>{m.material}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#9A9488' }}>{m.quantity_scu} SCU</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850' }}>{m.logged_by}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: '#2edb7a', fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>
                    {fmtAuec(m.estimated_value_aUEC)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Profit split */}
      <SectionToggle label="PROFIT SPLIT PROJECTION" count={r.profit_split.crew_count + ' crew'} open={splitOpen} onToggle={() => setSplitOpen(!splitOpen)} />
      {splitOpen && (
        <div style={{ background: '#0F0F0D', border: '0.5px solid rgba(200,170,100,0.06)', borderRadius: 3, overflow: 'hidden', animation: 'nexus-fade-in 150ms ease-out both' }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(200,170,100,0.06)', display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.12em' }}>GROSS</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: '#2edb7a' }}>{fmtAuec(r.profit_split.gross_revenue)} aUEC</div>
            </div>
            {r.profit_split.org_cut_aUEC > 0 && (
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.12em' }}>ORG CUT ({r.profit_split.org_cut_pct}%)</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: '#C8A84B' }}>-{fmtAuec(r.profit_split.org_cut_aUEC)}</div>
              </div>
            )}
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', letterSpacing: '0.12em' }}>NET POOL</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: '#E8E4DC' }}>{fmtAuec(r.profit_split.net_pool)} aUEC</div>
            </div>
          </div>
          <div style={{ padding: '4px 12px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850', borderBottom: '0.5px solid rgba(200,170,100,0.04)' }}>
            {basisLabel} · Equal split{r.profit_split.include_tax ? ' · 0.5% transfer tax applied' : ''}
          </div>
          {r.profit_split.crew.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#5A5850' }}>No confirmed crew.</div>
          ) : (
            r.profit_split.crew.map((m, i) => <CrewPayoutRow key={i} member={m} />)
          )}
        </div>
      )}
    </div>
  );
}