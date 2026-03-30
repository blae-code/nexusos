import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, Bell, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import moment from 'moment';

const TYPE_COLORS = { ORE: '#C8A84B', AGRICULTURAL: '#5A5850', MEDICAL: '#4A8C5C', GAS: '#9A9488', MINERAL: '#C8A84B', SCRAP: '#5A5850' };

function fmt(v) { return v != null ? v.toLocaleString() : '—'; }

export default function PricesTab({ lastSync, onSynced }) {
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('margin');
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        base44.entities.GameCacheCommodity.list('-margin_pct', 500),
        base44.entities.PriceAlert.filter({ is_active: true }),
      ]);
      setCommodities(c || []);
      setAlerts(a || []);
    } catch {
      // load failed — empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('uexSyncPrices', {});
      await load();
      onSynced?.();
    } catch {
      // sync failed — panel stays visible
    } finally {
      setSyncing(false);
    }
  };

  const alertMap = useMemo(() => {
    const m = {};
    alerts.forEach(a => { m[(a.commodity_name || '').toLowerCase()] = true; });
    return m;
  }, [alerts]);

  const filtered = useMemo(() => {
    let list = [...commodities];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    if (systemFilter !== 'ALL') {
      list = list.filter(c =>
        (c.best_buy_system || '').toUpperCase().includes(systemFilter) ||
        (c.best_sell_system || '').toUpperCase().includes(systemFilter)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'margin') return (b.margin_pct || 0) - (a.margin_pct || 0);
      if (sortBy === 'sell') return (b.sell_price_uex || 0) - (a.sell_price_uex || 0);
      if (sortBy === 'buy') return (a.buy_price_uex || 0) - (b.buy_price_uex || 0);
      return 0;
    });
    return list;
  }, [commodities, search, systemFilter, sortBy]);

  const syncAge = lastSync?.synced_at ? moment(lastSync.synced_at).fromNow() : 'never';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div></div>;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
          fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase',
        }}>COMMODITY PRICES</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', letterSpacing: '0.08em' }}>
            Last sync: {syncAge}
          </span>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '6px 14px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2, color: syncing ? '#5A5850' : '#9A9488', cursor: syncing ? 'not-allowed' : 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><RefreshCw size={11} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'SYNCING...' : 'SYNC NOW'}</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: 9, color: '#5A5850' }} />
          <input type="text" placeholder="SEARCH COMMODITIES..." value={search} onChange={e => setSearch(e.target.value)} style={{
            width: '100%', padding: '8px 10px 8px 30px', background: '#141410',
            border: '0.5px solid rgba(200,170,100,0.12)', borderRadius: 2, color: '#E8E4DC',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.08em',
          }} />
        </div>
        {['ALL', 'STANTON', 'PYRO', 'NYX'].map(s => (
          <button key={s} onClick={() => setSystemFilter(s)} style={{
            padding: '6px 12px', background: systemFilter === s ? 'rgba(192,57,43,0.12)' : '#141410',
            border: `0.5px solid ${systemFilter === s ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
            borderRadius: 2, color: systemFilter === s ? '#E8E4DC' : '#5A5850', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: '0.12em',
          }}>{s}</button>
        ))}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          padding: '6px 10px', background: '#141410', border: '0.5px solid rgba(200,170,100,0.12)',
          borderRadius: 2, color: '#E8E4DC', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
        }}>
          <option value="margin">MARGIN %</option>
          <option value="sell">SELL PRICE</option>
          <option value="buy">BUY PRICE</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5850' }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            NO PRICE DATA — CLICK SYNC NOW
          </div>
        </div>
      ) : (
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr 1fr 1.2fr 0.8fr 0.5fr 40px',
            padding: '8px 14px', borderBottom: '0.5px solid rgba(200,170,100,0.10)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5A5850',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            <span>COMMODITY</span><span>TYPE</span><span>BEST BUY</span><span>TERMINAL</span>
            <span>BEST SELL</span><span>TERMINAL</span><span>MARGIN</span><span>TREND</span><span />
          </div>
          {filtered.map(c => {
            const margin = c.margin_pct || 0;
            const marginColor = margin > 30 ? '#4A8C5C' : margin > 10 ? '#C8A84B' : '#5A5850';
            const trend = c.price_trend || 'STABLE';
            const hasAlert = alertMap[(c.name || '').toLowerCase()];
            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr 1fr 1.2fr 0.8fr 0.5fr 40px',
                padding: '10px 14px', alignItems: 'center',
                borderBottom: '0.5px solid rgba(200,170,100,0.06)',
              }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#E8E4DC', letterSpacing: '0.04em' }}>
                  {c.name}
                </span>
                <span style={{
                  display: 'inline-block', padding: '1px 6px', borderRadius: 2, fontSize: 9,
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em',
                  background: (TYPE_COLORS[c.type?.toUpperCase()] || '#5A5850') + '18',
                  color: TYPE_COLORS[c.type?.toUpperCase()] || '#5A5850',
                }}>{c.type || '—'}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#C8A84B' }}>
                  {fmt(c.buy_price_uex)} <span style={{ fontSize: 9, color: '#5A5850' }}>aUEC</span>
                </span>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5A5850' }}>{c.best_buy_terminal || '—'}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#4A8C5C' }}>
                  {fmt(c.sell_price_uex)} <span style={{ fontSize: 9, color: '#5A5850' }}>aUEC</span>
                </span>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5A5850' }}>{c.best_sell_terminal || '—'}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: marginColor }}>
                  {margin.toFixed(1)}%
                </span>
                <span>
                  {trend === 'UP' && <TrendingUp size={13} style={{ color: '#4A8C5C' }} />}
                  {trend === 'DOWN' && <TrendingDown size={13} style={{ color: '#C0392B' }} />}
                  {trend === 'STABLE' && <Minus size={13} style={{ color: '#5A5850' }} />}
                </span>
                <span>
                  <Bell size={12} style={{ color: hasAlert ? '#C8A84B' : '#5A5850', cursor: 'pointer' }} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}