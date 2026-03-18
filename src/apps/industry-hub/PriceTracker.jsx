import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { safeLocalStorage } from '@/core/data/safe-storage';
import { TrendingDown, TrendingUp, Plus, X } from 'lucide-react';
import PriceWatchlist from './PriceWatchlist';
import PriceChart from './PriceChart';
import StationPrices from './StationPrices';

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

  // Load top commodities
  useEffect(() => {
    const loadCommodities = async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('uexPriceSync', {
          action: 'commodities',
        });
        setCommodities(res.data?.commodities || []);
      } catch (error) {
        console.error('Failed to load commodities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommodities();
  }, []);

  // Load prices for selected commodity
  useEffect(() => {
    if (!selectedCommodity) {
      setPriceData(null);
      return;
    }

    const loadPrices = async () => {
      setLoadingPrices(true);
      try {
        const res = await base44.functions.invoke('uexPriceSync', {
          action: 'prices',
          commodity_id: selectedCommodity.id,
        });
        setPriceData(res.data);
      } catch (error) {
        console.error('Failed to load prices:', error);
      } finally {
        setLoadingPrices(false);
      }
    };

    loadPrices();
  }, [selectedCommodity]);

  const toggleWatchlist = useCallback((commodity) => {
    setWatchlist((current) => {
      const isWatched = current.some((c) => c.id === commodity.id);
      const next = isWatched
        ? current.filter((c) => c.id !== commodity.id)
        : [...current, commodity];
      safeLocalStorage.setItem('nexus-price-watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const isWatched = (commodity) =>
    watchlist.some((c) => c.id === commodity.id);

  return (
    <div className="nexus-page-enter flex flex-col h-full gap-4 p-4">
      {/* Watchlist */}
      {watchlist.length > 0 && (
        <PriceWatchlist
          watchlist={watchlist}
          onSelectCommodity={setSelectedCommodity}
          onRemove={toggleWatchlist}
        />
      )}

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Commodities list */}
        <div className="w-64 flex-shrink-0 border border-[rgba(200,170,100,0.12)] rounded-lg overflow-hidden flex flex-col bg-[var(--bg1)]">
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
              <div
                className="flex items-center justify-center h-full"
                style={{ color: 'var(--t2)' }}
              >
                <div className="nexus-loading-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : (
              commodities.map((commodity) => (
                <button
                  key={commodity.id}
                  onClick={() => setSelectedCommodity(commodity)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderBottom: '0.5px solid var(--b0)',
                    background:
                      selectedCommodity?.id === commodity.id
                        ? 'rgba(192,57,43,0.12)'
                        : 'transparent',
                    borderLeft:
                      selectedCommodity?.id === commodity.id
                        ? '2px solid #C0392B'
                        : 'none',
                    paddingLeft:
                      selectedCommodity?.id === commodity.id ? 10 : 12,
                    color: 'var(--t1)',
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCommodity?.id !== commodity.id) {
                      e.currentTarget.style.background =
                        'rgba(200,170,100,0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCommodity?.id !== commodity.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{commodity.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(commodity);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      color: isWatched(commodity)
                        ? 'var(--warn)'
                        : 'var(--t2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                    }}
                  >
                    {isWatched(commodity) ? (
                      <X size={12} />
                    ) : (
                      <Plus size={12} />
                    )}
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedCommodity ? (
            <>
              <div
                style={{
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 6,
                  padding: '12px 16px',
                }}
              >
                <div
                  style={{
                    color: 'var(--t0)',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {selectedCommodity.name}
                </div>
                {priceData?.stats && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 20,
                      fontSize: 11,
                      color: 'var(--t2)',
                      marginTop: 8,
                    }}
                  >
                    <span>
                      Avg:{' '}
                      <span style={{ color: 'var(--acc)' }}>
                        {Math.round(priceData.stats.average)} aUEC
                      </span>
                    </span>
                    <span>
                      Min:{' '}
                      <span style={{ color: 'var(--live)' }}>
                        {Math.round(priceData.stats.min)} aUEC
                      </span>
                    </span>
                    <span>
                      Max:{' '}
                      <span style={{ color: 'var(--warn)' }}>
                        {Math.round(priceData.stats.max)} aUEC
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Chart */}
              {loadingPrices ? (
                <div
                  className="flex items-center justify-center flex-1 rounded-lg border border-[rgba(200,170,100,0.12)]"
                  style={{ color: 'var(--t2)' }}
                >
                  <div className="nexus-loading-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : priceData ? (
                <>
                  <PriceChart priceData={priceData} />
                  <StationPrices priceData={priceData} />
                </>
              ) : (
                <div
                  className="flex items-center justify-center flex-1 rounded-lg border border-[rgba(200,170,100,0.12)]"
                  style={{ color: 'var(--t2)' }}
                >
                  No price data available
                </div>
              )}
            </>
          ) : (
            <div
              className="flex items-center justify-center flex-1"
              style={{ color: 'var(--t2)', textAlign: 'center' }}
            >
              Select a commodity to view prices
            </div>
          )}
        </div>
      </div>
    </div>
  );
}