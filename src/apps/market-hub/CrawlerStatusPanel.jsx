/**
 * CrawlerStatusPanel — Shows commodity sync status, cadence, and manual sync state.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/core/data/base44Client';
import { RefreshCw, Check, AlertTriangle, Clock, Wifi, Database } from 'lucide-react';
import { showToast } from '@/components/NexusToast';
import {
  AUTO_COMMODITY_WINDOW_MS,
  deriveSyncState,
  formatCountdown,
  loadSyncRecords,
  MANUAL_SYNC_COOLDOWN_MS,
  timeSince,
} from './syncMeta';

function toStatusTone(status) {
  if (status === 'RUNNING') return '#3498DB';
  if (status === 'SUCCESS') return '#4AE830';
  if (status === 'PARTIAL') return '#C8A84B';
  if (status === 'FAILED') return '#C0392B';
  return '#5A5850';
}

function buildSyncMessage(result) {
  if (!result) return '';
  if (result.status === 'skipped' && result.skip_reason === 'cooldown' && result.cooldown_until) {
    return `Manual sync available in ${formatCountdown(result.cooldown_until)}.`;
  }
  if (result.status === 'skipped' && result.skip_reason === 'running') {
    return 'A commodity sync is already running.';
  }
  if (result.status === 'completed') {
    return `Synced ${result.commodities_synced || 0} commodities, ${result.routes_synced || 0} routes, ${result.alerts_triggered || 0} alerts.`;
  }
  if (result.status === 'failed') {
    return result.errors?.[0] || 'Commodity sync failed.';
  }
  return '';
}

export default function CrawlerStatusPanel({ refreshKey = 0, onSynced }) {
  const [syncs, setSyncs] = useState([]);
  const [syncState, setSyncState] = useState({});
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadSyncs = useCallback(async () => {
    const records = await loadSyncRecords('COMMODITY_PRICES');
    setSyncs(records || []);
    setSyncState(deriveSyncState(records, {
      manualCooldownMs: MANUAL_SYNC_COOLDOWN_MS,
      autoWindowMs: AUTO_COMMODITY_WINDOW_MS,
    }));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSyncs();
  }, [loadSyncs, refreshKey]);

  const runSync = async () => {
    setRunning(true);
    try {
      const response = await base44.functions.invoke('uexSyncPrices', {});
      const result = response?.data || response;
      const syncMessage = buildSyncMessage(result);
      setMessage(syncMessage);

      if (result.status === 'completed') {
        showToast(syncMessage, result.errors?.length ? 'warning' : 'success');
        onSynced?.();
      } else if (result.status === 'skipped') {
        showToast(syncMessage, 'warning');
      } else {
        showToast(syncMessage || 'Commodity sync failed.', 'error');
      }
      await loadSyncs();
    } catch (error) {
      const errorMessage = error?.message || 'Commodity sync failed.';
      setMessage(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setRunning(false);
    }
  };

  const latest = syncState.running || syncState.latest;
  const statusTone = toStatusTone(latest?.status);
  const StatusIcon = latest?.status === 'RUNNING'
    ? RefreshCw
    : !latest
      ? Clock
      : latest.status === 'SUCCESS'
        ? Check
        : AlertTriangle;
  const manualLocked = Boolean(syncState.running) || Boolean(syncState.isCoolingDown);
  const autoWindowOpen = syncState.nextAutoEligibleAt
    ? Date.parse(syncState.nextAutoEligibleAt) <= Date.now()
    : true;

  return (
    <div style={{
      background: '#0F0F0D',
      border: '0.5px solid rgba(200,170,100,0.10)',
      borderLeft: `2px solid ${statusTone}`,
      borderRadius: 2,
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wifi size={12} style={{ color: statusTone }} />
          <StatusIcon size={12} style={{ color: statusTone, animation: latest?.status === 'RUNNING' ? 'spin 1s linear infinite' : 'none' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, color: '#E8E4DC', letterSpacing: '0.06em' }}>
            UEX MARKET SYNC
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 8,
            fontWeight: 600,
            color: statusTone,
            background: `${statusTone}15`,
            padding: '2px 6px',
            borderRadius: 2,
            border: `0.5px solid ${statusTone}30`,
            letterSpacing: '0.08em',
          }}>
            {latest ? latest.status : 'NO DATA'}
          </span>
        </div>

        <button
          onClick={runSync}
          disabled={running || manualLocked}
          style={{
            background: running || manualLocked ? '#141410' : 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
            border: running || manualLocked ? '0.5px solid rgba(200,170,100,0.12)' : '1px solid rgba(192,57,43,0.6)',
            borderRadius: 2,
            padding: '6px 14px',
            cursor: running || manualLocked ? 'not-allowed' : 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: running || manualLocked ? '#5A5850' : '#F0EDE5',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <RefreshCw size={10} style={{ animation: running || syncState.running ? 'spin 1s linear infinite' : 'none' }} />
          {running || syncState.running ? 'SYNCING...' : syncState.isCoolingDown ? 'COOLDOWN' : 'RUN SYNC NOW'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {loading ? (
          <span style={{ color: '#5A5850', fontSize: 10 }}>Loading...</span>
        ) : syncs.length === 0 ? (
          <span style={{ color: '#5A5850', fontSize: 10 }}>No sync history yet. Run a manual sync to populate the market cache.</span>
        ) : syncs.slice(0, 3).map((sync, index) => {
          const tone = toStatusTone(sync.status);
          return (
            <div
              key={sync.id || index}
              style={{
                flex: '1 1 160px',
                padding: '8px 10px',
                background: '#141410',
                borderRadius: 2,
                border: '0.5px solid rgba(200,170,100,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: tone }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: tone, fontWeight: 600 }}>{sync.status}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5A5850', marginLeft: 'auto' }}>
                  {timeSince(sync.synced_at)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Database size={8} style={{ color: '#5A5850' }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#9A9488' }}>
                  {sync.records_synced || 0} records · {sync.duration_ms || 0}ms
                </span>
              </div>
              {sync.error_message && (
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#C0392B', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sync.error_message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 8,
        color: '#5A5850',
        marginTop: 8,
        letterSpacing: '0.06em',
      }}>
        <span>AUTO-SYNC: Up to twice daily</span>
        <span>MANUAL: 30m cooldown per sync type</span>
        <span>{syncState.lastCompleted ? `LAST SUCCESS: ${timeSince(syncState.lastCompleted.synced_at)}` : 'LAST SUCCESS: never'}</span>
        <span>{autoWindowOpen ? 'NEXT AUTO WINDOW: ready' : `NEXT AUTO WINDOW: ${formatCountdown(syncState.nextAutoEligibleAt)}`}</span>
      </div>

      {message && (
        <div style={{ marginTop: 8, color: '#9A9488', fontSize: 10 }}>
          {message}
        </div>
      )}
    </div>
  );
}
