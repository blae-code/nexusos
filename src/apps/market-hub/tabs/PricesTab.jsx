import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, Bell, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import {
  AUTO_COMMODITY_WINDOW_MS,
  deriveSyncState,
  formatCountdown,
  loadSyncRecords,
  MANUAL_SYNC_COOLDOWN_MS,
  timeSince,
} from '../syncMeta';

const TYPE_COLORS = { ORE: '#C8A84B', AGRICULTURAL: '#5A5850', MEDICAL: '#4A8C5C', GAS: '#9A9488', MINERAL: '#C8A84B', SCRAP: '#5A5850' };

function fmt(value) {
  return value != null ? value.toLocaleString() : '—';
}

function buildSyncMessage(result) {
  if (!result) return '';
  if (result.status === 'completed') {
    return `Cache refreshed ${result.commodities_synced || 0} commodities and ${result.station_prices_synced || 0} station rows.`;
  }
  if (result.status === 'skipped' && result.skip_reason === 'cooldown' && result.cooldown_until) {
    return `Manual sync available in ${formatCountdown(result.cooldown_until)}.`;
  }
  if (result.status === 'skipped' && result.skip_reason === 'running') {
    return 'A commodity sync is already running.';
  }
  return result.errors?.[0] || '';
}

export default function PricesTab({ refreshKey = 0, onSynced }) {
  const [commodities, setCommodities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [syncState, setSyncState] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [search, setSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('margin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [commodityRows, alertRows, syncRows] = await Promise.all([
        base44.entities.GameCacheCommodity.list('-margin_pct', 500),
        base44.entities.PriceAlert.filter({ is_active: true }),
        loadSyncRecords('COMMODITY_PRICES'),
      ]);
      setCommodities(commodityRows || []);
      setAlerts(alertRows || []);
      setSyncState(deriveSyncState(syncRows, {
        manualCooldownMs: MANUAL_SYNC_COOLDOWN_MS,
        autoWindowMs: AUTO_COMMODITY_WINDOW_MS,
      }));
    } catch {
      setCommodities([]);
      setAlerts([]);
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
      const response = await base44.functions.invoke('uexSyncPrices', {});
      const result = response?.data || response;
      setSyncMessage(buildSyncMessage(result));
      await load();
      if (result.status === 'completed') onSynced?.();
    } catch (error) {
      setSyncMessage(error?.message || 'Commodity sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const alertMap = useMemo(() => {
    const map = {};
    alerts.forEach((alert) => {
      map[(alert.commodity_name || '').toLowerCase()] = true;
    });
    return map;
  }, [alerts]);

  const filtered = useMemo(() => {
    let list = [...commodities];
    if (search) {
      const query = search.toLowerCase();
      list = list.filter((commodity) => (commodity.name || '').toLowerCase().includes(query));
    }
    if (systemFilter !== 'ALL') {
      list = list.filter((commodity) =>
        (commodity.best_buy_system || '').toUpperCase().includes(systemFilter) ||
        (commodity.best_sell_system || '').toUpperCase().includes(systemFilter)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'margin') return (b.margin_pct || 0) - (a.margin_pct || 0);
      if (sortBy === 'sell') return (b.sell_price_uex || 0) - (a.sell_price_uex || 0);
      if (sortBy === 'buy') return (a.buy_price_uex || 0) - (b.buy_price_uex || 0);
      if (sortBy === 'volume') return (b.trade_volume_uex || 0) - (a.trade_volume_uex || 0);
      return 0;
    });
    return list;
  }, [commodities, search, systemFilter, sortBy]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="nexus-loading-dots" style={{ color: '#C8A84B' }}><span /><span /><span /></div>
      </div>
    );
  }

  const buttonLocked = syncing || syncState.running || syncState.isCoolingDown;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif",
          fontSize: 10,
          color: '#C8A84B',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
        }}>COMMODITY PRICES</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5A5850', letterSpacing: '0.08em' }}>
            Last sync: {timeSince(syncState.lastCompleted?.synced_at)}
          </span>
          <button
            onClick={handleSync}
            disabled={buttonLocked}
            style={{
              padding: '6px 14px',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: 2,
              color: buttonLocked ? '#5A5850' : '#9A9488',
              cursor: buttonLocked ? 'not-allowed' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={11} className={syncing || syncState.running ? 'animate-spin' : ''} />
            {syncing || syncState.running ? 'SYNCING...' : syncState.isCoolingDown ? 'COOLDOWN' : 'SYNC NOW'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, color: '#5A5850', fontSize: 10 }}>
        <span>{syncState.lastAuto ? `Last auto sync ${timeSince(syncState.lastAuto.synced_at)}` : 'No completed auto sync yet'}</span>
        <span>{syncState.nextAutoEligibleAt ? `Next auto window ${Date.parse(syncState.nextAutoEligibleAt) <= Date.now() ? 'ready' : formatCountdown(syncState.nextAutoEligibleAt)}` : 'Next auto window ready'}</span>
        {syncState.isCoolingDown && <span>Manual refresh available in {formatCountdown(syncState.cooldownUntil)}</span>}
      </div>

      {syncMessage && (
        <div style={{ marginBottom: 12, color: '#9A9488', fontSize: 10 }}>
          {syncMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: 9, color: '#5A5850' }} />
          <input
            type="text"
            placeholder="SEARCH COMMODITIES..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 30px',
              background: '#141410',
              border: '0.5px solid rgba(200,170,100,0.12)',
              borderRadius: 2,
              color: '#E8E4DC',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              letterSpacing: '0.08em',
            }}
          />
        </div>
        {['ALL', 'STANTON', 'PYRO', 'NYX'].map((system) => (
          <button
            key={system}
            onClick={() => setSystemFilter(system)}
            style={{
              padding: '6px 12px',
              background: systemFilter === system ? 'rgba(192,57,43,0.12)' : '#141410',
              border: `0.5px solid ${systemFilter === system ? '#C0392B' : 'rgba(200,170,100,0.12)'}`,
              borderRadius: 2,
              color: systemFilter === system ? '#E8E4DC' : '#5A5850',
              cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              letterSpacing: '0.12em',
            }}
          >
            {system}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          style={{
            padding: '6px 10px',
            background: '#141410',
            border: '0.5px solid rgba(200,170,100,0.12)',
            borderRadius: 2,
            color: '#E8E4DC',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
          }}
        >
          <option value="margin">MARGIN %</option>
          <option value="sell">SELL PRICE</option>
          <option value="buy">BUY PRICE</option>
          <option value="volume">TRADE VOLUME</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5850' }}>
          <div style={{ fontFamily: "'Earth Orbiter','Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            NO PRICE DATA IN CACHE
          </div>
        </div>
      ) : (
        <div style={{ background: '#0F0F0D', borderLeft: '2px solid #C0392B', borderTop: '0.5px solid rgba(200,170,100,0.10)', borderRight: '0.5px solid rgba(200,170,100,0.10)', borderBottom: '0.5px solid rgba(200,170,100,0.10)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr 1fr 1.2fr 0.8fr 0.7fr 0.5fr 40px',
            padding: '8px 14px',
            borderBottom: '0.5px solid rgba(200,170,100,0.10)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9,
            color: '#5A5850',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            <span>COMMODITY</span><span>TYPE</span><span>BEST BUY</span><span>TERMINAL</span>
            <span>BEST SELL</span><span>TERMINAL</span><span>MARGIN</span><span>VOLUME</span><span>TREND</span><span />
          </div>
          {filtered.map((commodity) => {
            const margin = commodity.margin_pct || 0;
            const marginColor = margin > 30 ? '#4A8C5C' : margin > 10 ? '#C8A84B' : '#5A5850';
            const trend = commodity.price_trend || 'STABLE';
            const hasAlert = alertMap[(commodity.name || '').toLowerCase()];
            return (
              <div
                key={commodity.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr 1fr 1.2fr 0.8fr 0.7fr 0.5fr 40px',
                  padding: '10px 14px',
                  alignItems: 'center',
                  borderBottom: '0.5px solid rgba(200,170,100,0.06)',
                }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#E8E4DC', letterSpacing: '0.04em' }}>
                  {commodity.name}
                </span>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  borderRadius: 2,
                  fontSize: 9,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: '0.08em',
                  background: `${(TYPE_COLORS[commodity.type?.toUpperCase()] || '#5A5850')}18`,
                  color: TYPE_COLORS[commodity.type?.toUpperCase()] || '#5A5850',
                }}>
                  {commodity.type || '—'}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#C8A84B' }}>
                  {fmt(commodity.buy_price_uex)} <span style={{ fontSize: 9, color: '#5A5850' }}>aUEC</span>
                </span>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5A5850' }}>{commodity.best_buy_terminal || '—'}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: '#4A8C5C' }}>
                  {fmt(commodity.sell_price_uex)} <span style={{ fontSize: 9, color: '#5A5850' }}>aUEC</span>
                </span>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5A5850' }}>{commodity.best_sell_terminal || '—'}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: marginColor }}>
                  {margin.toFixed(1)}%
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#9A9488' }}>
                  {fmt(commodity.trade_volume_uex || 0)}
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
