import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { RefreshCw, Flag, ArrowRight } from 'lucide-react';
import { deriveSyncState, loadSyncRecords, timeSince } from '../syncMeta';

const RISK_COLORS = { LOW: '#4A8C5C', MEDIUM: '#C8A84B', HIGH: '#C0392B' };

function fmt(value) {
  return value != null ? value.toLocaleString() : '—';
}

function buildSyncMessage(result) {
  if (!result) return '';
  if (result.status === 'completed') {
    return `Rebuilt ${result.routes_synced || 0} cached trade routes.`;
  }
  if (result.status === 'skipped' && result.skip_reason === 'running') {
    return 'A route rebuild is already running.';
  }
  return result.errors?.[0] || '';
}

export default function RoutesTab({ refreshKey = 0 }) {
  const { isAdmin } = useSession();
  const [routes, setRoutes] = useState([]);
  const [syncState, setSyncState] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routeRows, syncRows] = await Promise.all([
        base44.entities.TradeRoute.list('-route_score', 200),
        loadSyncRecords('TRADE_ROUTES'),
      ]);
      setRoutes(routeRows || []);
      setSyncState(deriveSyncState(syncRows, { manualCooldownMs: 0 }));
    } catch {
      setRoutes([]);
      setSyncState({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke('uexSyncRoutes', {});
      const result = response?.data || response;
      setSyncMessage(buildSyncMessage(result));
      await load();
    } catch (error) {
      setSyncMessage(error?.message || 'Route rebuild failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleFlag = async (id) => {
    await base44.entities.TradeRoute.update(id, { is_flagged: true, flagged_by: 'ADMIN' });
    setRoutes((current) => current.map((route) => (route.id === id ? { ...route, is_flagged: true } : route)));
  };

  const filtered = useMemo(() => {
    let list = [...routes];
    if (filter === 'STANTON') list = list.filter((route) => (route.origin_system || '').toUpperCase().includes('STANTON') && (route.destination_system || '').toUpperCase().includes('STANTON'));
    if (filter === 'CROSS') list = list.filter((route) => (route.origin_system || '').toUpperCase() !== (route.destination_system || '').toUpperCase());
    if (filter === 'HIGH_MARGIN') list = list.filter((route) => (route.margin_pct || 0) > 30);
    if (filter === 'FLAGGED') list = list.filter((route) => route.is_flagged);
    list.sort((a, b) => {
      if (a.is_flagged && !b.is_flagged) return -1;
      if (!a.is_flagged && b.is_flagged) return 1;
      return (b.route_score || 0) - (a.route_score || 0);
    });
    return list;
  }, [routes, filter]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          TRADE ROUTE INTELLIGENCE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', letterSpacing: '0.08em' }}>
            Last rebuild: {timeSince(syncState.lastCompleted?.synced_at)}
          </span>
          <button
            onClick={handleSync}
            disabled={syncing || syncState.running}
            style={{
              padding: '6px 14px',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: 2,
              color: syncing || syncState.running ? '#5A5850' : '#9A9488',
              cursor: syncing || syncState.running ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={11} className={syncing || syncState.running ? 'animate-spin' : ''} />
            {syncing || syncState.running ? 'REBUILDING...' : 'REBUILD ROUTES'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, color: '#5A5850', fontSize: 10 }}>
        <span>Routes are computed from cached station-price data, not a live UEX route poll.</span>
      </div>

      {syncMessage && (
        <div style={{ marginBottom: 12, color: '#9A9488', fontSize: 10 }}>
          {syncMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ k: 'ALL', l: 'ALL' }, { k: 'STANTON', l: 'STANTON ONLY' }, { k: 'CROSS', l: 'CROSS-SYSTEM' }, { k: 'HIGH_MARGIN', l: 'HIGH MARGIN' }, { k: 'FLAGGED', l: 'FLAGGED' }].map((item) => (
          <button
            key={item.k}
            onClick={() => setFilter(item.k)}
            style={{
              padding: '5px 12px',
              background: filter === item.k ? 'rgba(192,57,43,0.12)' : '#141410',
              border: `0.5px solid ${filter === item.k ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
              borderRadius: 2,
              color: filter === item.k ? '#E8E4DC' : '#5A5850',
              cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.12em',
            }}
          >
            {item.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5850', fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.22em' }}>
          NO ROUTES IN CACHE
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
          {filtered.map((route) => {
            const profitColor = (route.profit_per_scu || 0) > 500 ? '#4A8C5C' : (route.profit_per_scu || 0) > 100 ? '#C8A84B' : '#5A5850';
            return (
              <div
                key={route.id}
                style={{
                  background: '#0F0F0D',
                  borderLeft: `2px solid ${route.is_flagged ? '#C0392B' : 'rgba(200,170,100,0.10)'}`,
                  borderTop: '0.5px solid rgba(200,170,100,0.10)',
                  borderRight: '0.5px solid rgba(200,170,100,0.10)',
                  borderBottom: '0.5px solid rgba(200,170,100,0.10)',
                  borderRadius: 2,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#E8E4DC', letterSpacing: '0.04em', marginBottom: 6 }}>{route.commodity_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#9A9488' }}>
                  <span>{route.origin_terminal || '?'}</span>
                  <ArrowRight size={12} style={{ color: '#5A5850' }} />
                  <span>{route.destination_terminal || '?'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {route.origin_system && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(200,170,100,0.06)', color: '#9A9488' }}>{route.origin_system}</span>}
                  {route.destination_system && route.destination_system !== route.origin_system && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(200,170,100,0.06)', color: '#9A9488' }}>{route.destination_system}</span>}
                  <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", background: `${(RISK_COLORS[route.risk_level] || '#5A5850')}18`, color: RISK_COLORS[route.risk_level] || '#5A5850' }}>{route.risk_level || '?'}</span>
                  {route.jump_count > 0 && <span style={{ padding: '1px 6px', borderRadius: 2, fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", background: 'rgba(200,170,100,0.06)', color: '#5A5850' }}>{route.jump_count} jumps</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em' }}>BUY</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#C8A84B' }}>{fmt(route.buy_price)}</div></div>
                  <div><div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em' }}>SELL</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: '#4A8C5C' }}>{fmt(route.sell_price)}</div></div>
                  <div><div style={{ fontSize: 9, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.12em' }}>PROFIT/SCU</div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: profitColor }}>{fmt(route.profit_per_scu)}</div></div>
                </div>
                {route.investment_required > 0 && <div style={{ fontSize: 11, color: '#5A5850', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>MIN. {fmt(route.investment_required)} aUEC</div>}
                {isAdmin && !route.is_flagged && (
                  <button
                    onClick={() => handleFlag(route.id)}
                    style={{
                      marginTop: 6,
                      padding: '4px 10px',
                      background: '#141410',
                      border: '0.5px solid rgba(200,170,100,0.12)',
                      borderRadius: 2,
                      color: '#C8A84B',
                      fontSize: 10,
                      cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: '0.08em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Flag size={10} /> FLAG ROUTE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
