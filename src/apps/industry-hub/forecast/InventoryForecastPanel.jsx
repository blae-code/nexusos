/**
 * InventoryForecastPanel — Predictive inventory dashboard.
 * Calls the inventoryForecaster backend to compute burn rates, stockout
 * projections, and auto-requisition triggers, then renders the results.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, Zap, Eye, FileText } from 'lucide-react';
import { showToast } from '@/components/NexusToast';
import ForecastKpiBar from './ForecastKpiBar';
import ForecastTable from './ForecastTable';

const FILTER_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function InventoryForecastPanel() {
  const [summary, setSummary] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [lastRun, setLastRun] = useState(null);

  const runForecast = useCallback(async (dryRun = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('inventoryForecaster', { dry_run: dryRun });
      const data = res.data || res;
      setSummary(data.summary || null);
      setForecasts(data.forecasts || []);
      setLastRun(new Date().toISOString());
      if (!dryRun && data.summary?.requisitions_created > 0) {
        showToast(`${data.summary.requisitions_created} auto-requisitions created`, 'success');
      } else if (!dryRun) {
        showToast('Forecast complete — no requisitions needed', 'info');
      }
    } catch (err) {
      console.error('[InventoryForecastPanel]', err);
      setError(err.message || 'Forecast failed');
      showToast('Forecast failed — check console', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount (dry run — preview only)
  useEffect(() => {
    runForecast(true);
  }, [runForecast]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px', animation: 'pageEntrance 200ms ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{
            fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif",
            fontSize: 11, color: 'var(--warn)', letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>
            PREDICTIVE INVENTORY FORECAST
          </div>
          <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
            Analyzes production velocity, pending demand, and incoming supply to project stockouts.
            {lastRun && (
              <span style={{ marginLeft: 8, color: 'var(--t2)' }}>
                Last run: {new Date(lastRun).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => runForecast(true)}
            disabled={loading}
            className="nexus-btn"
            style={{ padding: '6px 12px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Eye size={11} />
            {loading ? 'ANALYZING...' : 'PREVIEW'}
          </button>
          <button
            onClick={() => runForecast(false)}
            disabled={loading}
            className="nexus-btn primary"
            style={{ padding: '6px 12px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Zap size={11} />
            {loading ? 'RUNNING...' : 'RUN & CREATE REQS'}
          </button>
          <button
            onClick={() => runForecast(true)}
            disabled={loading}
            className="nexus-btn"
            style={{ padding: '6px 10px', fontSize: 10 }}
            title="Refresh forecast"
          >
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 3,
          background: 'var(--danger-bg)', border: '0.5px solid var(--danger-b)',
          color: 'var(--danger)', fontSize: 11,
        }}>
          {error}
        </div>
      )}

      {/* KPI Bar */}
      <ForecastKpiBar summary={summary} />

      {/* Burn rate summary */}
      {summary && (
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
          padding: '8px 14px',
          background: 'var(--bg1)', border: '0.5px solid var(--b0)', borderRadius: 'var(--r-lg)',
          fontSize: 10, color: 'var(--t2)',
        }}>
          <span>Daily burn: <strong style={{ color: 'var(--warn)' }}>{summary.total_daily_burn_scu} SCU/day</strong></span>
          <span>Pending demand: <strong style={{ color: 'var(--info)' }}>{summary.total_pending_demand_scu} SCU</strong></span>
          <span>Incoming: <strong style={{ color: 'var(--live)' }}>{summary.total_incoming_supply_scu} SCU</strong></span>
          <span>Lookback: {summary.lookback_days}d | Buffer: {summary.threshold_days}d</span>
          {summary.requisitions_created > 0 && (
            <span style={{ color: 'var(--warn)' }}>
              <FileText size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {summary.requisitions_created} auto-requisitions created
            </span>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4 }}>
        {FILTER_OPTIONS.map(f => {
          const count = f === 'ALL' ? forecasts.length : forecasts.filter(fc => fc.stockout_risk === f).length;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="nexus-btn"
              style={{
                padding: '4px 10px', fontSize: 9,
                background: active ? 'var(--bg4)' : 'var(--bg2)',
                borderColor: active ? 'var(--b3)' : 'var(--b1)',
                color: active ? 'var(--t0)' : 'var(--t2)',
              }}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Forecast table */}
      {loading && forecasts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
        </div>
      ) : (
        <ForecastTable forecasts={forecasts} filter={filter} />
      )}
    </div>
  );
}