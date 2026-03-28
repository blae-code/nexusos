import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Database, ExternalLink, Radar, Ship, Cpu } from 'lucide-react';
import { adminApi } from '@/core/data/admin-api';
import { showToast } from '@/components/NexusToast';

const OPS = [
  { action: 'sync_fleetyards_roster', label: 'FleetYards Roster', icon: Ship, detail: 'Refresh OrgShip records from the configured FleetYards org handle.' },
  { action: 'sync_uex_prices', label: 'UEX Prices', icon: Database, detail: 'Refresh GameCacheCommodity market data from UEX.' },
  { action: 'sync_game_data', label: 'Game Data Cache', icon: Database, detail: 'Refresh GameCacheVehicle and GameCacheItem caches.' },
  { action: 'refresh_patch_digest', label: 'Patch Feed Refresh', icon: Radar, detail: 'Poll the live patch feed and ingest a new digest if one exists.' },
  { action: 'run_patch_intelligence_self_test', label: 'Patch AI Self-Test', icon: Cpu, detail: 'Run the patch intelligence agent in non-mutating self-test mode.' },
];

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function SystemOperationsPanel() {
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);

  const loadLogs = useCallback(async () => {
    const response = await adminApi.getActionLog(20);
    if (response.ok) {
      const items = Array.isArray(response.records) ? response.records : [];
      setLogs(items.filter((record) => String(record.action_type || '').startsWith('RUN_ADMIN_OP')));
    }
  }, []);

  useEffect(() => {
    loadLogs().catch(() => {});
  }, [loadLogs]);

  const lastRunByAction = useMemo(() => {
    const map = new Map();
    logs.forEach((entry) => {
      if (!map.has(entry.record_id)) {
        map.set(entry.record_id, entry);
      }
    });
    return map;
  }, [logs]);

  const runOperation = useCallback(async (action) => {
    setBusyAction(action);
    try {
      const response = await adminApi.runOperation({ action, reason });
      setResults((current) => ({ ...current, [action]: response }));
      if (!response.ok) {
        throw new Error(response.error || 'admin_op_failed');
      }
      showToast(`${action.replace(/_/g, ' ')} completed`, 'success');
      await loadLogs();
    } catch (error) {
      showToast(`${action.replace(/_/g, ' ')} failed — ${error?.message || 'admin_op_failed'}`, 'error');
    } finally {
      setBusyAction('');
    }
  }, [loadLogs, reason]);

  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>System Operations</div>
          <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
            Manual syncs and health operations for the current v1 deployment surface.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/app/admin/data" className="nexus-btn" style={{ textDecoration: 'none' }}>
            <ExternalLink size={12} />
            Open Data Console
          </Link>
          <button type="button" className="nexus-btn" onClick={loadLogs}>
            <RefreshCw size={12} />
            Refresh Log
          </button>
        </div>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Audit Reason</span>
        <input className="nexus-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional note explaining why these jobs are being run" />
      </label>

      <div style={{ display: 'grid', gap: 8 }}>
        {OPS.map((operation) => {
          const Icon = operation.icon;
          const lastRun = lastRunByAction.get(operation.action);
          const latestResult = results[operation.action];
          return (
            <div key={operation.action} style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={13} style={{ color: '#C8A84B' }} />
                  <div>
                    <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{operation.label}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 10 }}>{operation.detail}</div>
                  </div>
                </div>
                <button type="button" className="nexus-btn primary" onClick={() => runOperation(operation.action)} disabled={Boolean(busyAction)}>
                  <RefreshCw size={12} style={{ animation: busyAction === operation.action ? 'spin 1s linear infinite' : 'none' }} />
                  {busyAction === operation.action ? 'Running...' : 'Run'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--t2)', fontSize: 10 }}>
                <span>Last audit entry: {lastRun ? formatTimestamp(lastRun.created_at) : 'never'}</span>
                {latestResult ? <span style={{ color: latestResult.ok ? '#27C96A' : '#E04848' }}>{latestResult.ok ? 'Last run succeeded' : `Last run failed: ${latestResult.error || 'unknown_error'}`}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
