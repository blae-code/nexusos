import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPinned, Radar, RefreshCw } from 'lucide-react';
import { adminApi } from '@/core/data/admin-api';
import { showToast } from '@/components/NexusToast';

function StatusChip({ ok, label }) {
  const color = ok ? '#27C96A' : '#E8A020';
  const background = ok ? 'rgba(39,201,106,0.12)' : 'rgba(232,160,32,0.12)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color, background }}>
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {label}
    </span>
  );
}

function formatTimestamp(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function ReferenceAuditPanel({ autoRun = true }) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const runAudit = useCallback(async () => {
    setRunning(true);
    setError('');
    try {
      const response = await adminApi.referenceAudit();
      if (!response.ok) {
        throw new Error(response.error || 'reference_audit_failed');
      }
      setResult(response);
      showToast(response.summary?.staleDatasets === 0 ? 'Reference audit refreshed' : 'Reference audit found stale datasets', response.summary?.staleDatasets === 0 ? 'success' : 'warning');
    } catch (nextError) {
      const message = nextError?.message || 'reference_audit_failed';
      setError(message);
      showToast(`Reference audit failed — ${message}`, 'error');
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (autoRun) {
      runAudit();
    }
  }, [autoRun, runAudit]);

  const datasets = Array.isArray(result?.datasets) ? result.datasets : [];
  const fields = Array.isArray(result?.fields) ? result.fields : [];

  const outstandingFields = useMemo(
    () => fields.filter((field) => field.status !== 'migrated' || Number(field.legacyCount || 0) > 0),
    [fields],
  );

  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPinned size={14} style={{ color: '#C8A84B' }} />
            Star Citizen Reference Audit
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, marginTop: 4 }}>
            Patch-aware completeness and freshness for live caches, curated registries, and migrated smart fields.
          </div>
        </div>

        <button type="button" className="nexus-btn" onClick={runAudit} disabled={running}>
          <RefreshCw size={12} style={{ animation: running ? 'spin 1s linear infinite' : 'none' }} />
          {running ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div style={{ padding: '10px 12px', background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.25)', borderRadius: 3, color: '#E04848', fontSize: 10 }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip ok={result.registryPatch === result.livePatch} label={`registry ${result.registryPatch || 'unknown'}`} />
            <StatusChip ok={result.summary?.staleDatasets === 0} label={`${result.summary?.staleDatasets || 0} stale datasets`} />
            <StatusChip ok={result.summary?.deprecatedValues === 0} label={`${result.summary?.deprecatedValues || 0} deprecated values`} />
            <StatusChip ok={result.summary?.remainingHardcoded === 0} label={`${result.summary?.remainingHardcoded || 0} remaining hardcoded`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live Patch</div>
              <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{result.livePatch || 'Unknown'}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Registry Patch</div>
              <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{result.registryPatch || 'Unknown'}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Migrated Fields</div>
              <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{result.summary?.migratedFields || 0}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3 }}>
              <div style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Planned Backlog</div>
              <div style={{ color: 'var(--t0)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{result.summary?.plannedFields || 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radar size={12} style={{ color: '#7AAECC' }} />
              Dataset Freshness
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {datasets.map((dataset) => (
                <div key={dataset.datasetId} style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3, borderLeft: `2px solid ${dataset.stale ? '#E8A020' : '#27C96A'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{dataset.datasetId}</div>
                      <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>{dataset.count} records · last sync {formatTimestamp(dataset.syncedAt)}</div>
                    </div>
                    <StatusChip ok={!dataset.stale} label={dataset.stale ? 'stale' : 'fresh'} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Field Audit</div>
            {outstandingFields.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {outstandingFields.map((field) => (
                  <div key={field.fieldId} style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3, borderLeft: `2px solid ${field.status === 'migrated' ? '#E8A020' : '#7AAECC'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{field.fieldId}</div>
                        <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
                          {field.surface} · {field.domain} · {field.searchable ? 'searchable' : 'direct select'} · {field.sourceKind}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <StatusChip ok={field.status === 'migrated'} label={field.status} />
                        <StatusChip ok={Number(field.legacyCount || 0) === 0} label={`${field.legacyCount || 0} legacy`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#27C96A', fontSize: 10 }}>
                <CheckCircle2 size={13} />
                No current reference drift or remaining hardcoded phase-one fields.
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
          Run the reference audit to inspect live cache freshness, registry drift, and remaining Star Citizen field backlog.
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
