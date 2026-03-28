import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { authApi } from '@/core/data/auth-api';
import { showToast } from '@/components/NexusToast';

function AuditChip({ ok, label }) {
  const color = ok ? '#27C96A' : '#E04848';
  const background = ok ? 'rgba(39,201,106,0.12)' : 'rgba(224,72,72,0.12)';
  const Icon = ok ? CheckCircle2 : XCircle;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 3, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', background, color }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function severityColor(severity) {
  if (severity === 'critical') return '#E04848';
  if (severity === 'warn') return '#E8A020';
  return '#9DA1CD';
}

function runtimeModeConfig(runtimeMode) {
  if (runtimeMode === 'shared_entity' || runtimeMode === 'live_write') {
    return { color: '#27C96A', background: 'rgba(39,201,106,0.12)', label: runtimeMode.replace('_', ' ') };
  }
  if (runtimeMode === 'read_only' || runtimeMode === 'local_cache') {
    return { color: '#E8A020', background: 'rgba(232,160,32,0.12)', label: runtimeMode.replace('_', ' ') };
  }
  return null;
}

function dataConsolePath(entity, id = '') {
  const params = new URLSearchParams();
  if (entity) params.set('entity', entity);
  if (id) params.set('record', id);
  const suffix = params.toString();
  return suffix ? `/app/admin/data?${suffix}` : '/app/admin/data';
}

export default function ReadinessAuditPanel({ autoRun = false, compact = false, title = 'Production Readiness' }) {
  const [result, setResult] = useState(null);
  const [runningAction, setRunningAction] = useState('');
  const [error, setError] = useState('');

  const runAudit = useCallback(async (action = 'full_audit') => {
    setRunningAction(action);
    setError('');
    try {
      const response = await authApi.runProdReadiness(action);
      setResult(response || null);
      if (response?.ok) {
        showToast(`${action.replace(/_/g, ' ')} passed`, 'success');
      } else {
        showToast(`${action.replace(/_/g, ' ')} needs attention`, 'warning');
      }
    } catch (nextError) {
      const message = nextError?.message || 'prod_readiness_failed';
      setError(message);
      showToast(`Readiness audit failed — ${message}`, 'error');
    } finally {
      setRunningAction('');
    }
  }, []);

  useEffect(() => {
    if (autoRun) {
      runAudit('full_audit');
    }
  }, [autoRun, runAudit]);

  const checks = Array.isArray(result?.checks) ? result.checks : [];
  const failures = Array.isArray(result?.failures) ? result.failures : [];
  const flaggedRecords = Array.isArray(result?.flagged_records) ? result.flagged_records : [];
  const cleanup = result?.cleanup || null;
  const adminChecks = checks.filter((check) => check?.meta?.area === 'admin_control_plane');
  const generalChecks = checks.filter((check) => check?.meta?.area !== 'admin_control_plane');
  const adminFailures = failures.filter((failure) => failure?.meta?.area === 'admin_control_plane');
  const generalFailures = failures.filter((failure) => failure?.meta?.area !== 'admin_control_plane');

  const summary = useMemo(() => {
    const passed = checks.filter((check) => check.ok).length;
    const failed = checks.length - passed;
    return {
      passed,
      failed,
      total: checks.length,
    };
  }, [checks]);

  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--t0)', fontSize: compact ? 12 : 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} style={{ color: result?.ok ? '#27C96A' : '#C8A84B' }} />
            {title}
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, marginTop: 4 }}>
            Entity coverage, live integrations, sample-data detection, and cleanup status for the current production scope.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['full_audit', 'RUN FULL'],
            ['entity_audit', 'ENTITIES'],
            ['integration_audit', 'INTEGRATIONS'],
            ['sample_data_audit', 'SAMPLE DATA'],
          ].map(([action, label]) => (
            <button
              key={action}
              type="button"
              onClick={() => runAudit(action)}
              disabled={Boolean(runningAction)}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '0.5px solid var(--b1)',
                borderRadius: 3,
                color: runningAction === action ? 'var(--t3)' : 'var(--t1)',
                cursor: runningAction ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                fontSize: 9,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RefreshCw size={11} style={{ animation: runningAction === action ? 'spin 1s linear infinite' : 'none' }} />
              {runningAction === action ? 'RUNNING...' : label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '10px 12px', background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.25)', borderRadius: 3, color: '#E04848', fontSize: 10 }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <AuditChip ok={result.ok === true} label={result.ok ? 'Pass' : 'Fail'} />
            <AuditChip ok={summary.failed === 0} label={`${summary.passed}/${summary.total || 0} checks`} />
            <AuditChip ok={failures.length === 0} label={`${failures.length} failures`} />
            <AuditChip ok={flaggedRecords.length === 0} label={`${flaggedRecords.length} sample flags`} />
            {cleanup ? <AuditChip ok={cleanup.ok === true} label={`cleanup ${cleanup.ok ? 'ok' : 'failed'}`} /> : null}
          </div>

          {adminFailures.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Admin Control Plane</div>
              {adminFailures.map((failure, index) => (
                <div key={`${failure.id}-${index}`} style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3, borderLeft: `2px solid ${severityColor(failure.severity)}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: severityColor(failure.severity), fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{failure.severity || 'warn'}</span>
                    <span style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 600 }}>{failure.id}</span>
                  </div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{failure.detail}</div>
                  {failure?.meta?.entity ? (
                    <div style={{ marginTop: 8 }}>
                      <Link to={dataConsolePath(failure.meta.entity)} className="nexus-btn" style={{ textDecoration: 'none' }}>Open {failure.meta.entity}</Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {generalFailures.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Failures</div>
              {generalFailures.map((failure, index) => (
                <div key={`${failure.id}-${index}`} style={{ padding: '10px 12px', background: 'var(--bg1)', borderRadius: 3, borderLeft: `2px solid ${severityColor(failure.severity)}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: severityColor(failure.severity), fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{failure.severity || 'warn'}</span>
                    <span style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 600 }}>{failure.id}</span>
                  </div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>{failure.detail}</div>
                  {failure?.meta?.entity ? (
                    <div style={{ marginTop: 8 }}>
                      <Link to={dataConsolePath(failure.meta.entity)} className="nexus-btn" style={{ textDecoration: 'none' }}>Open {failure.meta.entity}</Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : checks.length > 0 && adminFailures.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#27C96A', fontSize: 10 }}>
              <CheckCircle2 size={13} />
              No current readiness failures.
            </div>
          ) : null}

          {!compact && adminChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Admin Control Plane Checks</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {adminChecks.map((check) => (
                  <div key={check.id} style={{ padding: '8px 10px', background: 'var(--bg1)', borderRadius: 3, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {check.ok ? <CheckCircle2 size={12} style={{ color: '#27C96A', flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={12} style={{ color: severityColor(check.severity), flexShrink: 0, marginTop: 2 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 600 }}>{check.label}</div>
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, marginTop: 2 }}>{check.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!compact && generalChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Checks</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {generalChecks.map((check) => (
                  <div key={check.id} style={{ padding: '8px 10px', background: 'var(--bg1)', borderRadius: 3, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {check.ok ? (
                      <CheckCircle2 size={12} style={{ color: '#27C96A', flexShrink: 0, marginTop: 2 }} />
                    ) : (
                      <AlertTriangle size={12} style={{ color: severityColor(check.severity), flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 600 }}>{check.label}</div>
                        {runtimeModeConfig(check?.meta?.runtime_mode) ? (
                          <span
                            style={{
                              color: runtimeModeConfig(check.meta.runtime_mode).color,
                              background: runtimeModeConfig(check.meta.runtime_mode).background,
                              fontSize: 9,
                              padding: '2px 6px',
                              borderRadius: 999,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {runtimeModeConfig(check.meta.runtime_mode).label}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6, marginTop: 2 }}>{check.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {flaggedRecords.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Flagged Records</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {flaggedRecords.slice(0, compact ? 6 : 20).map((record, index) => (
                  <div key={`${record.entity}-${record.id}-${record.field}-${index}`} style={{ padding: '8px 10px', background: 'rgba(232,160,32,0.08)', border: '0.5px solid rgba(232,160,32,0.2)', borderRadius: 3 }}>
                    <div style={{ color: 'var(--t0)', fontSize: 10, fontWeight: 600 }}>
                      {record.entity} · {record.id || 'unknown'}
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 2 }}>
                      {record.field}: {record.value}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Link to={dataConsolePath(record.entity, record.id)} className="nexus-btn" style={{ textDecoration: 'none' }}>
                        Open In Data Console
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {cleanup ? (
            <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
              Cleanup removed {Array.isArray(cleanup.cleaned) ? cleanup.cleaned.length : 0} temporary record{Array.isArray(cleanup.cleaned) && cleanup.cleaned.length === 1 ? '' : 's'}.
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
          Run the audit to verify entity coverage, live integrations, and sample-data cleanliness before a production proof pass.
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
