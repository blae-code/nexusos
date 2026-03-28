import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { RefreshCw, Flag, ArrowRight } from 'lucide-react';

const RISK_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B' };
function fmt(v) { return v != null ? v.toLocaleString() : '—'; }

export default function RoutesTab() {
  const { isAdmin } = useSession();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await base44.entities.TradeRoute.list('-route_score', 200);
    setRoutes(r || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    await base44.functions.invoke('uexSyncRoutes', {});
    await load();
    setSyncing(false);
  };

  const handleFlag = async (id) => {
    await base44.entities.TradeRoute.update(id, { is_flagged: true, flagged_by: 'ADMIN' });
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, is_flagged: true } : r));
  };

  const filtered = useMemo(() => {
    let list = [...routes];
    if (filter === 'STANTON') list = list.filter(r => (r.origin_system || '').toUpperCase().includes('STANTON') && (r.destination_system || '').toUpperCase().includes('STANTON'));
    if (filter === 'CROSS') list = list.filter(r => (r.origin_system || '').toUpperCase() !== (r.destination_system || '').toUpperCase());
    if (filter === 'HIGH_MARGIN') list = list.filter(r => (r.margin_pct || 0) > 30);
    if (filter === 'FLAGGED') list = list.filter(r => r.is_flagged);
    // Flagged routes first
    list.sort((a, b) => {
      if (a.is_flagged && !b.is_flagged) return -1;
      if (!a.is_flagged && b.is_flagged) return 1;
      return (b.route_score || 0) - (a.route_score || 0);
    });
    return list;
  }, [routes, filter]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div></div>;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>TRADE ROUTE INTELLIGENCE</div>
        <button onClick={handleSync} disabled={syncing} style={{
          padding: '6px 14px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
          borderRadius: 2, color: syncing ? '#5A5850' : '#9A9488', cursor: syncing ? 'not-allowed' : 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}><RefreshCw size={11} /> {syncing ? 'SYNCING...' : 'SYNC ROUTES'}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ k: 'ALL', l: 'ALL' }, { k: 'STANTON', l: 'STANTON ONLY' }, { k: 'CROSS', l: 'CROSS-SYSTEM' }, { k: 'HIGH_MARGIN', l: 'HIGH MARGIN' }, { k: 'FLAGGED', l: 'FLAGGED' }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: '5px 12px', background: filter === f.k ? 'rgba(192,57,43,0.12)' : '#141410',
            border: `0.5px solid ${filter === f.k ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
            borderRadius: 2, color: filter === f.k ? '#E8E4DC' : '#5A5850', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.12em',
          }}>{f.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5850', fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.22em' }}>
          NO ROUTES — SYNC TO FETCH FROM UEX
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
          {filtered.map(r => {
            const profitColor = (r.profit_per_scu || 0) > 500 ? '#4A8C5C' : (r.profit_per_scu || 0) > 100 ? '#C8A84B' : '#5A5850';
            return (
              <div key={r.id} style={{
                background: '#0F0F0D',
                borderLeft: `2px solid ${r.is_flagged ? '#C0392B' : 'rgba(200,170,100,0.10)'}`,
                borderTop: '0.5px solid rgba(200,170,100,0.10)',
                borderRight: '0.5px solid rgba(200,170,100,0.10)',
                borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                borderRadius: 2, padding: '14px 16px',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#E8E4DC', letterSpacing: '0.04em', marginBottom: 6 }}>{r.commodity_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#9A9488' }}>
                  <span>{r.origin_terminal || '?'}</span>
                  <ArrowRight size={12} style={{ color: '#5A5850' }} />
                  <span>{r.destination_terminal || '?'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {r.origin_system && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(200,170,100,0.06)', color: '#9A9488' }}>{r.origin_system}</span>}
                  {r.destination_system && r.destination_system !== r.origin_system && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(200,170,100,0.06)', color: '#9A9488' }}>{r.destination_system}</span>}
                  <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", background: (RISK_COLORS[r.risk_level] || '#5A5850') + '18', color: RISK_COLORS[r.risk_level] || '#5A5850' }}>{r.risk_level || '?'}</span>
                  {r.jump_count > 0 && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(200,170,100,0.06)', color: '#5A5850' }}>{r.jump_count} jumps</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em' }}>BUY</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#C8A84B' }}>{fmt(r.buy_price)}</div></div>
                  <div><div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em' }}>SELL</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#4A8C5C' }}>{fmt(r.sell_price)}</div></div>
                  <div><div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em' }}>PROFIT/SCU</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: profitColor }}>{fmt(r.profit_per_scu)}</div></div>
                </div>
                {r.investment_required > 0 && <div style={{ fontSize: 11, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>MIN. {fmt(r.investment_required)} aUEC</div>}
                {isAdmin && !r.is_flagged && (
                  <button onClick={() => handleFlag(r.id)} style={{
                    marginTop: 6, padding: '4px 10px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
                    borderRadius: 2, color: '#C8A84B', fontSize: 10, cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}><Flag size={10} /> FLAG ROUTE</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}