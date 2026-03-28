import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';
import { DollarSign, ScanLine } from 'lucide-react';
import CargoOcrScanner from '@/apps/industry-hub/cargo-ocr/CargoOcrScanner';
import CargoOcrReview from '@/apps/industry-hub/cargo-ocr/CargoOcrReview';

const COMMON_COMMODITIES = [
  'Aluminum', 'Hadanite', 'Medical Supplies', 'Industrial Materials',
  'Iso Metal', 'Titanium', 'Copper', 'Boron', 'Beryl', 'Tungsten',
  'Waste', 'Hydrogen Fuel', 'Quantum Matter', 'NexFiber'
];

const INITIAL_FORM_DATA = {
  commodity: '',
  transaction_type: 'OFFLOAD',
  quantity_scu: '',
  purchase_price_scu: '',
  sale_price_scu: '',
  origin_station: '',
  destination_station: '',
  notes: '',
};

/** @typedef {typeof INITIAL_FORM_DATA} CargoLogForm */

export default function CargoTracker() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const cargoLogEntity = /** @type {any} */ (base44.entities.CargoLog);
  const [activeTab, setActiveTab] = useState('log');
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [ocrResults, setOcrResults] = useState(null);
  const [ocrStation, setOcrStation] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ['cargo-logs'],
    queryFn: async () => {
      const result = await cargoLogEntity.list('-logged_at', 500);
      return Array.isArray(result) ? result : [];
    },
    refetchInterval: 30000,
  });

  const createMutation = useMutation(
    /** @type {import('@tanstack/react-query').UseMutationOptions<any, Error, CargoLogForm>} */ ({
    mutationFn: async (data) => {
      const quantity = parseFloat(data.quantity_scu);
      const purchasePrice = parseFloat(data.purchase_price_scu || '0');
      const salePrice = parseFloat(data.sale_price_scu || '0');
      const totalCost = Math.round(quantity * purchasePrice);
      const totalRevenue = Math.round(quantity * salePrice);
      const profitLoss = totalRevenue - totalCost;
      const marginPct = purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0;

      return cargoLogEntity.create({
        commodity: data.commodity,
        transaction_type: data.transaction_type,
        quantity_scu: quantity,
        purchase_price_scu: purchasePrice,
        sale_price_scu: salePrice,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        profit_loss: profitLoss,
        margin_pct: marginPct,
        origin_station: data.origin_station || null,
        destination_station: data.destination_station || null,
        logged_by_user_id: user?.id || null,
        logged_by_callsign: user?.callsign || 'UNKNOWN',
        notes: data.notes || null,
        logged_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo-logs'] });
      setFormData(INITIAL_FORM_DATA);
    },
  }));

  const safeLogs = Array.isArray(logs) ? logs : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.commodity || !formData.quantity_scu) return;
    createMutation.mutate(formData);
  };

  // Analytics
  const totalProfit = safeLogs.reduce((sum, log) => sum + (log.profit_loss || 0), 0);
  const totalRevenue = safeLogs.reduce((sum, log) => sum + (log.total_revenue || 0), 0);
  const avgMargin = safeLogs.length > 0
    ? safeLogs.reduce((sum, log) => sum + (log.margin_pct || 0), 0) / safeLogs.length
    : 0;

  const commodityBreakdown = safeLogs.reduce((acc, log) => {
    const key = log.commodity;
    if (!acc[key]) {
      acc[key] = { profit: 0, revenue: 0, volume: 0, count: 0 };
    }
    acc[key].profit += log.profit_loss || 0;
    acc[key].revenue += log.total_revenue || 0;
    acc[key].volume += log.quantity_scu || 0;
    acc[key].count += 1;
    return acc;
  }, {});

  const topCommodities = Object.entries(commodityBreakdown)
    .sort(([, a], [, b]) => b.profit - a.profit)
    .slice(0, 10);

  return (
    <div className="nexus-page-enter" style={{ padding: '32px', background: 'var(--bg0)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <DollarSign size={28} style={{ color: '#C8A84B' }} />
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>
              CARGO TRACKER
            </h1>
          </div>
          <p style={{ fontSize: 11, color: 'var(--t2)', letterSpacing: '0.08em', margin: 0 }}>
            Log and analyze trade routes • Track commodity profitability
          </p>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--b1)', marginBottom: 32, background: 'var(--bg1)' }}>
          {[
            { id: 'log', label: 'LOG CARGO' },
            { id: 'scan', label: 'SCAN TERMINAL', icon: true },
            { id: 'analytics', label: 'ANALYTICS' },
            { id: 'history', label: 'HISTORY' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== 'scan') { setOcrResults(null); setOcrStation(null); } }}
              style={{
                padding: '12px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #C8A84B' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--t0)' : 'var(--t2)',
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                transition: 'color 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {tab.icon && <ScanLine size={10} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* SCAN TERMINAL TAB */}
        {activeTab === 'scan' && (
          <div style={{ marginBottom: 40 }}>
            {!ocrResults ? (
              <CargoOcrScanner
                onResults={(commodities, station) => {
                  setOcrResults(commodities);
                  setOcrStation(station);
                }}
                onCancel={() => setActiveTab('log')}
              />
            ) : (
              <CargoOcrReview
                commodities={ocrResults}
                detectedStation={ocrStation}
                onSaved={() => {
                  setOcrResults(null);
                  setOcrStation(null);
                  queryClient.invalidateQueries({ queryKey: ['cargo-logs'] });
                  setActiveTab('history');
                }}
                onCancel={() => { setOcrResults(null); setOcrStation(null); }}
              />
            )}
          </div>
        )}

        {/* LOG CARGO TAB */}
        {activeTab === 'log' && (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
            {/* COMMODITY */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                COMMODITY
              </label>
              <input
                list="commodities"
                value={formData.commodity}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
                required
              />
              <datalist id="commodities">
                {COMMON_COMMODITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* TRANSACTION TYPE */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                TRANSACTION
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
              >
                <option value="LOAD">LOAD</option>
                <option value="OFFLOAD">OFFLOAD</option>
              </select>
            </div>

            {/* QUANTITY */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                QUANTITY (SCU)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.quantity_scu}
                onChange={(e) => setFormData({ ...formData, quantity_scu: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
                required
              />
            </div>

            {/* PURCHASE PRICE */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                PURCHASE PRICE (aUEC/SCU)
              </label>
              <input
                type="number"
                value={formData.purchase_price_scu}
                onChange={(e) => setFormData({ ...formData, purchase_price_scu: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* SALE PRICE */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                SALE PRICE (aUEC/SCU)
              </label>
              <input
                type="number"
                value={formData.sale_price_scu}
                onChange={(e) => setFormData({ ...formData, sale_price_scu: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* ORIGIN STATION */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                ORIGIN STATION
              </label>
              <input
                value={formData.origin_station}
                onChange={(e) => setFormData({ ...formData, origin_station: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
                placeholder="e.g. Port Olisar"
              />
            </div>

            {/* DESTINATION STATION */}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                DESTINATION STATION
              </label>
              <input
                value={formData.destination_station}
                onChange={(e) => setFormData({ ...formData, destination_station: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
                placeholder="e.g. Grim Hex"
              />
            </div>

            {/* NOTES */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--t2)', marginBottom: 6, letterSpacing: '0.08em' }}>
                NOTES
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 3,
                  color: 'var(--t0)',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  minHeight: 60,
                  resize: 'vertical',
                }}
                placeholder="Route conditions, market notes, etc."
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                gridColumn: '1 / -1',
                padding: '12px 16px',
                background: createMutation.isPending ? 'var(--bg3)' : '#C8A84B',
                border: 'none',
                borderRadius: 3,
                color: createMutation.isPending ? 'var(--t2)' : '#000',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {createMutation.isPending ? 'LOGGING...' : 'LOG CARGO'}
            </button>
          </form>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
            {/* TOTAL PROFIT */}
            <div style={{
              padding: 20,
              background: totalProfit >= 0 ? 'rgba(74,232,48,0.1)' : 'rgba(192,57,43,0.1)',
              border: `1px solid ${totalProfit >= 0 ? 'rgba(74,232,48,0.2)' : 'rgba(192,57,43,0.2)'}`,
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: totalProfit >= 0 ? '#4AE830' : '#C0392B', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
                NET PROFIT
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: totalProfit >= 0 ? '#4AE830' : '#C0392B' }}>
                {(totalProfit / 1000000).toFixed(2)}M
              </div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>aUEC across {safeLogs.length} trades</div>
            </div>

            {/* TOTAL REVENUE */}
            <div style={{
              padding: 20,
              background: 'rgba(200,168,75,0.1)',
              border: '1px solid rgba(200,168,75,0.2)',
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: '#C8A84B', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
                TOTAL REVENUE
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#C8A84B' }}>
                {(totalRevenue / 1000000).toFixed(2)}M
              </div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>aUEC from sales</div>
            </div>

            {/* AVG MARGIN */}
            <div style={{
              padding: 20,
              background: 'rgba(82,151,255,0.1)',
              border: '1px solid rgba(82,151,255,0.2)',
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: '#5297FF', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
                AVG MARGIN
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#5297FF' }}>
                {avgMargin.toFixed(1)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>profit per trade</div>
            </div>

            {/* TOTAL VOLUME */}
            <div style={{
              padding: 20,
              background: 'rgba(157,161,205,0.1)',
              border: '1px solid rgba(157,161,205,0.2)',
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: '#9DA1CD', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
                TOTAL VOLUME
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#9DA1CD' }}>
                {safeLogs.reduce((sum, log) => sum + (log.quantity_scu || 0), 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>SCU traded</div>
            </div>
          </div>
        )}

        {/* TOP COMMODITIES */}
        {activeTab === 'analytics' && topCommodities.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 16, letterSpacing: '0.08em' }}>
              TOP COMMODITIES BY PROFIT
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {topCommodities.map(([commodity, data]) => (
                <div key={commodity} style={{
                  padding: 12,
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 6,
                  display: 'grid',
                  gridTemplateColumns: '150px 1fr auto auto auto',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 11,
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--t0)' }}>{commodity}</div>
                  <div style={{
                    height: 6,
                    background: 'var(--bg2)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min((data.profit / topCommodities[0][1].profit) * 100, 100)}%`,
                      height: '100%',
                      background: data.profit > 0 ? '#4AE830' : '#C0392B',
                    }} />
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 100, color: '#C8A84B', fontWeight: 600 }}>
                    {(data.profit / 1000000).toFixed(2)}M aUEC
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 80, color: 'var(--t2)' }}>
                    {data.count} trades
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 80, color: 'var(--t2)' }}>
                    {data.volume.toLocaleString()} SCU
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {safeLogs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
                No cargo logs yet. Start tracking trades to see history.
              </div>
            ) : (
              safeLogs.slice(0, 50).map((log) => (
                <div key={log.id} style={{
                  padding: 14,
                  background: 'var(--bg1)',
                  border: '0.5px solid var(--b1)',
                  borderRadius: 6,
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto auto auto',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 10,
                }}>
                  <div style={{
                    padding: '2px 6px',
                    background: log.transaction_type === 'LOAD' ? 'rgba(82,151,255,0.15)' : 'rgba(74,232,48,0.15)',
                    color: log.transaction_type === 'LOAD' ? '#5297FF' : '#4AE830',
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: 9,
                  }}>
                    {log.transaction_type}
                  </div>
                  <div>
                    <div style={{ color: 'var(--t0)', fontWeight: 500 }}>{log.commodity}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                      {log.origin_station && log.destination_station
                        ? `${log.origin_station} → ${log.destination_station}`
                        : log.origin_station || log.destination_station || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--t2)' }}>
                    {log.quantity_scu.toLocaleString()} SCU
                  </div>
                  <div style={{
                    textAlign: 'right',
                    color: (log.profit_loss || 0) >= 0 ? '#4AE830' : '#C0392B',
                    fontWeight: 600,
                  }}>
                    {((log.profit_loss || 0) / 1000000).toFixed(2)}M
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--t2)' }}>
                    {log.margin_pct ? `${log.margin_pct.toFixed(1)}%` : '—'}
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--t3)', fontSize: 9 }}>
                    {new Date(log.logged_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}