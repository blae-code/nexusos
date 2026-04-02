import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { safeLocalStorage } from '@/core/data/safe-storage';
import { Plus, X } from 'lucide-react';
import PriceWatchlist from './PriceWatchlist';
import PriceChart from './PriceChart';
import StationPrices from './StationPrices';
import PriceAlertPanel from './PriceAlertPanel';

function commodityKey(commodity) {
  return String(commodity?.wiki_id || commodity?.id || commodity?.name || '');
}

function buildPriceStats(rows) {
  const values = rows.flatMap((row) => [Number(row.price_buy) || 0, Number(row.price_sell) || 0]).filter((value) => value > 0);
  return {
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    count: values.length,
  };
}

export default function PriceTracker() {
  const [commodities, setCommodities] = useState([]);
  const [watchlist, setWatchlist] = useState(() => {
    const stored = safeLocalStorage.getItem('nexus-price-watchlist');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    const loadCommodities = async () => {
      setLoading(true);
      try {
        const rows = await base44.entities.GameCacheCommodity.list('name', 500).catch(() => []);
        const ranked = [...(rows || [])].sort((a, b) =>
          Number(b.trade_volume_uex || 0) - Number(a.trade_volume_uex || 0) ||
          Number(b.margin_pct || 0) - Number(a.margin_pct || 0)
        );
        setCommodities(ranked);
      } catch (error) {
        console.error('Failed to load cached commodities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommodities();
  }, []);

  useEffect(() => {
    if (!selectedCommodity?.wiki_id) {
      setPriceData(null);
      return;
    }

    const loadPrices = async () => {
      setLoadingPrices(true);
      try {
        const rows = await base44.entities.CommodityStationPrice
          .filter({ commodity_wiki_id: String(selectedCommodity.wiki_id) }, '-price_sell', 300)
          .catch(() => []);

        const formattedRows = (rows || []).map((row) => ({
          ...row,
          station: row.station_name || row.terminal_name || 'Unknown',
        }));

        setPriceData({
          commodity_id: selectedCommodity.wiki_id,
          prices: formattedRows,
          stats: buildPriceStats(formattedRows),
        });
      } catch (error) {
        console.error('Failed to load cached station prices:', error);
        setPriceData(null);
      } finally {
        setLoadingPrices(false);
      }
    };

    loadPrices();
  }, [selectedCommodity]);

  const toggleWatchlist = useCallback((commodity) => {
    setWatchlist((current) => {
      const key = commodityKey(commodity);
      const isWatched = current.some((item) => commodityKey(item) === key);
      const next = isWatched
        ? current.filter((item) => commodityKey(item) !== key)
        : [...current, { id: commodity.id, wiki_id: commodity.wiki_id, name: commodity.name }];
      safeLocalStorage.setItem('nexus-price-watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const isWatched = (commodity) =>
    watchlist.some((item) => commodityKey(item) === commodityKey(commodity));

  const handleSelectCommodity = useCallback((commodity) => {
    const matched = commodities.find((item) =>
      commodityKey(item) === commodityKey(commodity) ||
      String(item.name || '').toLowerCase() === String(commodity.name || '').toLowerCase()
    );
    setSelectedCommodity(matched || commodity);
  }, [commodities]);

  return (
    <div className="nexus-page-enter flex flex-col h-full gap-4 p-4">
      {watchlist.length > 0 && (
        <PriceWatchlist
          watchlist={watchlist}
          onSelectCommodity={handleSelectCommodity}
          onRemove={toggleWatchlist}
        />
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-64 flex-shrink-0 border border-[rgba(200,170,100,0.12)] rounded overflow-hidden flex flex-col bg-[var(--bg1)]">
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '0.5px solid var(--b1)',
              color: 'var(--t2)',
              fontSize: 10,
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}
          >
            TOP COMMODITIES
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full" style={{ color: 'var(--t2)' }}>
                <div className="nexus-loading-dots"><span /><span /><span /></div>
              </div>
            ) : (
              commodities.map((commodity) => (
                <button
                  key={commodity.id}
                  onClick={() => handleSelectCommodity(commodity)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderBottom: '0.5px solid var(--b0)',
                    background: selectedCommodity?.id === commodity.id ? 'rgba(192,57,43,0.12)' : 'transparent',
                    borderLeft: selectedCommodity?.id === commodity.id ? '2px solid #C0392B' : 'none',
                    paddingLeft: selectedCommodity?.id === commodity.id ? 10 : 12,
                    color: 'var(--t1)',
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(event) => {
                    if (selectedCommodity?.id !== commodity.id) {
                      event.currentTarget.style.background = 'rgba(200,170,100,0.06)';
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (selectedCommodity?.id !== commodity.id) {
                      event.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{commodity.name}</span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWatchlist(commodity);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      color: isWatched(commodity) ? 'var(--warn)' : 'var(--t2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                    }}
                  >
                    {isWatched(commodity) ? <X size={12} /> : <Plus size={12} />}
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedCommodity ? (
            <>
              <div
                style={{
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  padding: '12px 16px',
                }}
              >
                <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {selectedCommodity.name}
                </div>
                {priceData?.stats && (
                  <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>
                    <span>Avg: <span style={{ color: 'var(--acc)' }}>{Math.round(priceData.stats.average)} aUEC</span></span>
                    <span>Min: <span style={{ color: 'var(--live)' }}>{Math.round(priceData.stats.min)} aUEC</span></span>
                    <span>Max: <span style={{ color: 'var(--warn)' }}>{Math.round(priceData.stats.max)} aUEC</span></span>
                  </div>
                )}
              </div>

              <PriceAlertPanel commodityName={selectedCommodity.name} />

              {loadingPrices ? (
                <div className="flex items-center justify-center flex-1 rounded border border-[rgba(200,170,100,0.12)]" style={{ color: 'var(--t2)' }}>
                  <div className="nexus-loading-dots"><span /><span /><span /></div>
                </div>
              ) : (
                <div className="flex gap-4 flex-1 min-h-0">
                  <PriceChart priceData={priceData} />
                  <div style={{ width: 320, flexShrink: 0 }}>
                    <StationPrices priceData={priceData} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 rounded border border-[rgba(200,170,100,0.12)]" style={{ color: 'var(--t2)', fontSize: 12 }}>
              Select a commodity to view cached station prices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
