import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import OrgStockTab from '@/components/inventory/OrgStockTab';
import MarketPricesTab from '@/components/inventory/MarketPricesTab';
import RankingsTab from '@/components/inventory/RankingsTab';

const TABS = [
  { id: 'stock', label: 'ORG STOCK' },
  { id: 'prices', label: 'MARKET PRICES' },
  { id: 'rankings', label: 'CAX RANKINGS' },
];

export default function InventoryTracker() {
  const [activeTab, setActiveTab] = useState('stock');
  const [stockData, setStockData] = useState(null);
  const [averages, setAverages] = useState(null);
  const [commodities, setCommodities] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStock = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('uexInventory/entry', { action: 'org_stock' });
      setStockData(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load org stock');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAverages = useCallback(async () => {
    if (averages) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('uexInventory/entry', { action: 'averages' });
      setAverages(res.data?.averages || []);
    } catch (e) {
      setError(e.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  }, [averages]);

  const loadCommodities = useCallback(async () => {
    if (commodities) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('uexInventory/entry', { action: 'commodities' });
      setCommodities(res.data?.commodities || []);
    } catch (e) {
      setError(e.message || 'Failed to load commodities');
    } finally {
      setLoading(false);
    }
  }, [commodities]);

  useEffect(() => {
    if (activeTab === 'stock') loadStock();
    else if (activeTab === 'rankings') loadAverages();
    else if (activeTab === 'prices') loadCommodities();
  }, [activeTab, loadStock, loadAverages, loadCommodities]);

  return (
    <div className="nexus-page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header + Tabs */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 16px 0',
        borderBottom: '0.5px solid rgba(200,170,100,0.10)',
        background: 'linear-gradient(180deg, #0F0E0C 0%, #0A0908 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Inventory Tracker
          </span>
          <span style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>
            POWERED BY UEX CORP API
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '11px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--red)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--t0)' : 'var(--t2)',
                fontSize: 10,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                transition: 'color 120ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(192,57,43,0.08)',
          border: '0.5px solid rgba(192,57,43,0.3)',
          color: '#C0392B',
          fontSize: 11,
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Tab content */}
      <div className="nexus-fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'stock' && (
          <OrgStockTab data={stockData} loading={loading} onRefresh={loadStock} />
        )}
        {activeTab === 'prices' && (
          <MarketPricesTab commodities={commodities} loading={loading} />
        )}
        {activeTab === 'rankings' && (
          <RankingsTab averages={averages} loading={loading} />
        )}
      </div>
    </div>
  );
}