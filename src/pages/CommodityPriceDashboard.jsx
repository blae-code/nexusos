import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

function PriceCard({ commodity, prices }) {
  if (!prices || prices.length === 0) return null;

  const sortedByPrice = [...prices].sort((a, b) => (a.buy_price || 0) - (b.buy_price || 0));
  const cheapest = sortedByPrice[0];
  const mostExpensive = sortedByPrice[sortedByPrice.length - 1];
  const profitMargin = mostExpensive?.sell_price && cheapest?.buy_price
    ? Math.round(((mostExpensive.sell_price - cheapest.buy_price) / cheapest.buy_price) * 100)
    : 0;

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>
            {commodity}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
            {prices.length} locations tracked
          </div>
        </div>
        {profitMargin > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={14} style={{ color: 'var(--live)' }} />
            <span style={{ color: 'var(--live)', fontSize: 12, fontWeight: 600 }}>
              +{profitMargin}%
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
        <div style={{ background: 'var(--bg2)', padding: '8px 10px', borderRadius: 4 }}>
          <div style={{ color: 'var(--t2)', marginBottom: 4 }}>Buy Low</div>
          <div style={{ color: 'var(--t0)', fontWeight: 600 }}>{cheapest?.location || '—'}</div>
          <div style={{ color: 'var(--acc2)', fontFamily: 'monospace', marginTop: 2 }}>
            {cheapest?.buy_price?.toLocaleString() || 'N/A'} aUEC
          </div>
        </div>
        <div style={{ background: 'var(--bg2)', padding: '8px 10px', borderRadius: 4 }}>
          <div style={{ color: 'var(--t2)', marginBottom: 4 }}>Sell High</div>
          <div style={{ color: 'var(--t0)', fontWeight: 600 }}>{mostExpensive?.location || '—'}</div>
          <div style={{ color: 'var(--live)', fontFamily: 'monospace', marginTop: 2 }}>
            {mostExpensive?.sell_price?.toLocaleString() || 'N/A'} aUEC
          </div>
        </div>
      </div>

      {cheapest && mostExpensive && (
        <div style={{ paddingTop: 8, borderTop: '0.5px solid var(--b0)' }}>
          <div style={{ color: 'var(--t2)', fontSize: 9, marginBottom: 4 }}>Route</div>
          <div style={{ color: 'var(--t1)', fontSize: 10, fontFamily: 'monospace' }}>
            {cheapest.location} → {mostExpensive.location}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommodityPriceDashboard() {
  const [commodities, setCommodities] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState('');

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('fetchUexPrices', {});
      const { data, fetchedAt } = response.data || {};

      if (!data) {
        setError('No data returned from UEX API');
        setLoading(false);
        return;
      }

      // Group prices by commodity
      const grouped = {};
      if (Array.isArray(data)) {
        data.forEach((item) => {
          const commodity = item.commodity || item.name;
          if (!grouped[commodity]) {
            grouped[commodity] = [];
          }
          grouped[commodity].push({
            location: item.location || item.station_name || 'Unknown',
            buy_price: item.buy_price || item.price,
            sell_price: item.sell_price || item.price,
          });
        });
      }

      setCommodities(grouped);
      setLastFetch(fetchedAt);
    } catch (err) {
      setError(err?.message || 'Failed to fetch prices');
      console.error('[CommodityPriceDashboard] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const sortedCommodities = Object.entries(commodities)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12);

  return (
    <div className="nexus-page-enter" style={{ padding: '20px 24px', overflow: 'auto', minHeight: '100%' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', letterSpacing: '0.06em', marginBottom: 8 }}>
            COMMODITY PRICES
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 12, marginBottom: 12 }}>
            Live UEX trade data — find the best profit margins across systems
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={fetchPrices}
              disabled={loading}
              style={{
                padding: '8px 14px',
                background: 'var(--bg3)',
                border: '0.5px solid var(--b2)',
                borderRadius: 4,
                color: 'var(--t1)',
                fontSize: 10,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'FETCHING...' : 'REFRESH'}
            </button>

            {lastFetch && (
              <div style={{ color: 'var(--t3)', fontSize: 10 }}>
                Updated {new Date(lastFetch).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '0.5px solid var(--danger-b)',
              borderRadius: 6,
              padding: '10px 14px',
              color: 'var(--danger)',
              fontSize: 11,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* Grid */}
        {sortedCommodities.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}
          >
            {sortedCommodities.map(([commodity, prices]) => (
              <PriceCard key={commodity} commodity={commodity} prices={prices} />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--t2)',
              fontSize: 12,
            }}
          >
            {loading ? 'Loading commodity data...' : 'No data available. Configure UEX_API_KEY to fetch prices.'}
          </div>
        )}
      </div>
    </div>
  );
}