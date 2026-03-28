import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Edit3, RefreshCw, Search, Trash2, ArchiveRestore, Ban, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '@/core/data/SessionContext';
import { adminApi } from '@/core/data/admin-api';
import { entitySchemas } from '@/core/data/entities';
import { showToast } from '@/components/NexusToast';

function textValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 120);
  return String(value);
}

function formatTimestamp(value) {
  const text = textValue(value);
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString();
}

function AccessDenied() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: '#08080A', gap: 16 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.12 }}>
        <circle cx="22" cy="22" r="20" stroke="#E8E4DC" strokeWidth="0.6" />
        <circle cx="22" cy="22" r="14" stroke="#C0392B" strokeWidth="0.6" />
        <circle cx="22" cy="22" r="7" fill="#C0392B" opacity="0.6" />
        <circle cx="22" cy="22" r="3" fill="#E8E4DC" />
      </svg>
      <div style={{ fontFamily: "'Beyond Mars','Barlow Condensed',sans-serif", fontSize: 36, color: '#C0392B', textTransform: 'uppercase' }}>ACCESS DENIED</div>
      <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 11, color: '#5A5850', letterSpacing: '0.22em', textTransform: 'uppercase' }}>PIONEER CLEARANCE REQUIRED</div>
    </div>
  );
}

function toSchemaInputValue(field, value) {
  if (value == null) return '';
  if (field?.type === 'boolean') return value ? 'true' : 'false';
  if (field?.type === 'array' || field?.type === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function parseSchemaValue(field, rawValue) {
  if (field?.type === 'number') {
    if (rawValue === '') return null;
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) throw new Error('invalid_number');
    return numeric;
  }
  if (field?.type === 'boolean') {
    if (rawValue === '') return null;
    return rawValue === 'true';
  }
  if (field?.type === 'array' || field?.type === 'object') {
    if (!textValue(rawValue)) return field.type === 'array' ? [] : {};
    return JSON.parse(rawValue);
  }
  if (field?.type === 'datetime') {
    return textValue(rawValue) || null;
  }
  return rawValue;
}

function buildSchemaPatch(schema, originalRecord, values) {
  if (!schema?.fields) return {};
  const patch = {};

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (!(fieldName in values)) return;
    const parsed = parseSchemaValue(field, values[fieldName]);
    const previous = originalRecord?.[fieldName] ?? null;
    if (JSON.stringify(parsed) !== JSON.stringify(previous)) {
      patch[fieldName] = parsed;
    }
  });

  return patch;
}

function renderFieldEditor(fieldName, field, value, onChange) {
  if (Array.isArray(field?.enum) && field.enum.length > 0) {
    return (
      <select className="nexus-input" value={value} onChange={(event) => onChange(fieldName, event.target.value)}>
        <option value="">—</option>
        {field.enum.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  if (field?.type === 'boolean') {
    return (
      <select className="nexus-input" value={value} onChange={(event) => onChange(fieldName, event.target.value)}>
        <option value="">—</option>
        <option value="true">TRUE</option>
        <option value="false">FALSE</option>
      </select>
    );
  }

  if (field?.type === 'array' || field?.type === 'object') {
    return <textarea className="nexus-input" value={value} onChange={(event) => onChange(fieldName, event.target.value)} style={{ minHeight: 88, resize: 'vertical', fontFamily: 'monospace' }} />;
  }

  if (field?.type === 'datetime') {
    return <input className="nexus-input" value={value} onChange={(event) => onChange(fieldName, event.target.value)} placeholder="2026-03-28T19:00:00.000Z" />;
  }

  if (field?.type === 'number') {
    return <input className="nexus-input" type="number" value={value} onChange={(event) => onChange(fieldName, event.target.value)} />;
  }

  const isLong = fieldName.includes('description') || fieldName.includes('notes') || fieldName.includes('manifest');
  if (isLong) {
    return <textarea className="nexus-input" value={value} onChange={(event) => onChange(fieldName, event.target.value)} style={{ minHeight: 72, resize: 'vertical' }} />;
  }

  return <input className="nexus-input" value={value} onChange={(event) => onChange(fieldName, event.target.value)} />;
}

export default function AdminDataConsole() {
  const { isAdmin } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entities, setEntities] = useState([]);
  const [records, setRecords] = useState([]);
  const [actionLog, setActionLog] = useState([]);
  const [entityMeta, setEntityMeta] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [idLookup, setIdLookup] = useState(searchParams.get('id') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [recentWindow, setRecentWindow] = useState(searchParams.get('recent') || 'all');
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page')) || 1));
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [formValues, setFormValues] = useState({});
  const [jsonPatch, setJsonPatch] = useState('{}');
  const [reason, setReason] = useState('');
  const [total, setTotal] = useState(0);

  const selectedEntity = searchParams.get('entity') || '';
  const selectedRecordId = searchParams.get('record') || '';
  const schema = selectedEntity ? entitySchemas[selectedEntity] || null : null;

  const updateSearchParams = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value == null || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadEntities = useCallback(async () => {
    const response = await adminApi.listEntities();
    if (!response.ok) throw new Error(response.error || 'entity_list_failed');
    const items = Array.isArray(response.entities) ? response.entities : [];
    setEntities(items);

    const currentEntity = searchParams.get('entity');
    if (!currentEntity && items[0]?.id) {
      updateSearchParams({ entity: items[0].id });
    }
  }, [searchParams, updateSearchParams]);

  const loadActionLog = useCallback(async () => {
    const response = await adminApi.getActionLog(16);
    if (response.ok) {
      setActionLog(Array.isArray(response.records) ? response.records : []);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    const entity = searchParams.get('entity');
    if (!entity) return;

    setLoading(true);
    setError('');
    try {
      const response = await adminApi.listRecords({
        entity,
        query,
        id: idLookup,
        sort,
        limit: 25,
        page,
        recentWindow,
      });

      if (!response.ok) throw new Error(response.error || 'record_list_failed');
      setEntityMeta(response.entity || null);
      setRecords(Array.isArray(response.records) ? response.records : []);
      setTotal(Number(response.total) || 0);
    } catch (nextError) {
      setEntityMeta(null);
      setRecords([]);
      setTotal(0);
      setError(nextError?.message || 'record_list_failed');
    } finally {
      setLoading(false);
    }
  }, [idLookup, page, query, recentWindow, searchParams, sort]);

  const loadRecordDetail = useCallback(async (entity, id) => {
    if (!entity || !id) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await adminApi.getRecord({ entity, id });
      if (!response.ok) throw new Error(response.error || 'record_fetch_failed');
      setSelectedRecord(response.record || null);
      setSelectedLabel(response.label || '');
      setJsonPatch('{}');
      setReason('');

      if (entitySchemas[entity]?.fields && response.record) {
        const nextValues = {};
        Object.entries(entitySchemas[entity].fields).forEach(([fieldName, field]) => {
          nextValues[fieldName] = toSchemaInputValue(field, response.record[fieldName]);
        });
        setFormValues(nextValues);
      } else {
        setFormValues({});
      }
    } catch (nextError) {
      setSelectedRecord(null);
      setSelectedLabel('');
      setDetailError(nextError?.message || 'record_fetch_failed');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([loadEntities(), loadActionLog()]).catch((nextError) => {
      setError(nextError?.message || 'admin_boot_failed');
    });
  }, [isAdmin, loadActionLog, loadEntities]);

  useEffect(() => {
    if (!isAdmin || !selectedEntity) return;
    loadRecords();
  }, [isAdmin, selectedEntity, loadRecords]);

  useEffect(() => {
    if (!isAdmin || !selectedEntity || !selectedRecordId) {
      setSelectedRecord(null);
      setSelectedLabel('');
      return;
    }
    loadRecordDetail(selectedEntity, selectedRecordId);
  }, [isAdmin, loadRecordDetail, selectedEntity, selectedRecordId]);

  const pageCount = Math.max(1, Math.ceil(total / 25));
  const visibleSummaryFields = entityMeta?.summary_fields || [];
  const selectedCapabilities = entityMeta?.capabilities || {};
  const detailRows = useMemo(() => (selectedRecord ? Object.entries(selectedRecord).sort(([left], [right]) => left.localeCompare(right)) : []), [selectedRecord]);

  const submitUpdate = useCallback(async () => {
    if (!selectedEntity || !selectedRecordId || !selectedRecord) return;
    setBusyAction('update');
    try {
      const schemaPatch = schema ? buildSchemaPatch(schema, selectedRecord, formValues) : {};
      const rawPatch = textValue(jsonPatch) ? JSON.parse(jsonPatch) : {};
      const patch = { ...schemaPatch, ...(rawPatch || {}) };
      if (Object.keys(patch).length === 0) {
        showToast('No changes to save', 'warning');
        return;
      }

      const response = await adminApi.updateRecord({ entity: selectedEntity, id: selectedRecordId, patch, reason });
      if (!response.ok) throw new Error(response.error || 'record_update_failed');
      showToast('Record updated', 'success');
      await Promise.all([loadRecords(), loadRecordDetail(selectedEntity, selectedRecordId), loadActionLog()]);
    } catch (nextError) {
      showToast(`Update failed — ${nextError?.message || 'record_update_failed'}`, 'error');
    } finally {
      setBusyAction('');
    }
  }, [formValues, jsonPatch, loadActionLog, loadRecordDetail, loadRecords, reason, schema, selectedEntity, selectedRecord, selectedRecordId]);

  const runDestructive = useCallback(async (action) => {
    if (!selectedEntity || !selectedRecordId) return;
    if (!textValue(reason)) {
      showToast('Reason is required for this action', 'warning');
      return;
    }
    if (action === 'delete' && !window.confirm(`Delete ${selectedEntity}/${selectedRecordId}? This cannot be undone.`)) {
      return;
    }

    setBusyAction(action);
    try {
      const payload = { entity: selectedEntity, id: selectedRecordId, reason };
      const response = action === 'deactivate'
        ? await adminApi.deactivateRecord(payload)
        : action === 'restore'
          ? await adminApi.restoreRecord(payload)
          : await adminApi.deleteRecord(payload);
      if (!response.ok) throw new Error(response.error || `${action}_failed`);
      showToast(`${action.toUpperCase()} complete`, 'success');

      if (action === 'delete') {
        updateSearchParams({ record: null });
        setSelectedRecord(null);
        setSelectedLabel('');
      } else {
        await loadRecordDetail(selectedEntity, selectedRecordId);
      }
      await Promise.all([loadRecords(), loadActionLog()]);
    } catch (nextError) {
      showToast(`${action.toUpperCase()} failed — ${nextError?.message || `${action}_failed`}`, 'error');
    } finally {
      setBusyAction('');
    }
  }, [loadActionLog, loadRecordDetail, loadRecords, reason, selectedEntity, selectedRecordId, updateSearchParams]);

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1440, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: '#E8E4DC', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ADMIN DATA CONSOLE</div>
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", fontSize: 10, color: '#C8A84B', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Entity Repair + Audit Trail</div>
      </div>

      <div className="nexus-card" style={{ padding: 14, display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) repeat(4, minmax(0, 1fr))', gap: 10, alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entity</span>
          <select className="nexus-input" value={selectedEntity} onChange={(event) => { setPage(1); updateSearchParams({ entity: event.target.value, record: null }); }}>
            {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.label} ({entity.id})</option>)}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Search</span>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--t3)' }} />
            <input className="nexus-input" style={{ paddingLeft: 28 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="callsign, title, notes..." />
          </div>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ID Lookup</span>
          <input className="nexus-input" value={idLookup} onChange={(event) => setIdLookup(event.target.value)} placeholder="Exact record id" />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sort</span>
          <select className="nexus-input" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="">Default</option>
            {['-updated_date', '-updated_at', '-created_date', '-created_at', '-logged_at', '-reported_at', '-requested_at', 'status', 'title', 'name'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Changes</span>
          <select className="nexus-input" value={recentWindow} onChange={(event) => setRecentWindow(event.target.value)}>
            <option value="all">All</option>
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
          </select>
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="nexus-btn primary" onClick={() => { setPage(1); updateSearchParams({ query, id: idLookup, sort, recent: recentWindow, page: 1 }); loadRecords(); }} disabled={loading}>
            <RefreshCw size={12} />
            {loading ? 'Loading...' : 'Run Query'}
          </button>
          <button type="button" className="nexus-btn" onClick={() => { setQuery(''); setIdLookup(''); setSort(''); setRecentWindow('all'); setPage(1); updateSearchParams({ query: null, id: null, sort: null, recent: null, page: null, record: null }); }}>
            Reset Filters
          </button>
          {entityMeta ? <div style={{ color: 'var(--t2)', fontSize: 10 }}>{entityMeta.category} · {entityMeta.capabilities?.edit ? 'editable' : 'read only'}</div> : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)', gap: 16, alignItems: 'start' }}>
        <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={14} style={{ color: '#C8A84B' }} />
              <div>
                <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{entityMeta?.label || 'Records'}</div>
                <div style={{ color: 'var(--t2)', fontSize: 10 }}>{total} record{total === 1 ? '' : 's'} matched</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" className="nexus-btn" onClick={() => { const next = Math.max(1, page - 1); setPage(next); updateSearchParams({ page: next }); }} disabled={page <= 1 || loading}><ChevronLeft size={12} /></button>
              <div style={{ color: 'var(--t1)', fontSize: 10, minWidth: 72, textAlign: 'center' }}>Page {page}/{pageCount}</div>
              <button type="button" className="nexus-btn" onClick={() => { const next = Math.min(pageCount, page + 1); setPage(next); updateSearchParams({ page: next }); }} disabled={page >= pageCount || loading}><ChevronRight size={12} /></button>
            </div>
          </div>

          {error ? <div style={{ margin: 14, padding: 12, borderRadius: 3, background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.24)', color: '#E04848', fontSize: 11 }}>{error}</div> : null}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 10 }}>ID</th>
                  {visibleSummaryFields.map((field) => (
                    <th key={field} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 10 }}>{field}</th>
                  ))}
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--t2)', fontSize: 10 }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => {
                  const active = item.id === selectedRecordId;
                  return (
                    <tr key={item.id} onClick={() => updateSearchParams({ record: item.id })} style={{ cursor: 'pointer', background: active ? 'rgba(192,57,43,0.1)' : 'transparent', borderTop: '0.5px solid var(--b0)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--t1)', fontFamily: 'monospace', fontSize: 10 }}>{item.id}</td>
                      {visibleSummaryFields.map((field) => (
                        <td key={field} style={{ padding: '10px 12px', color: 'var(--t0)', fontSize: 11 }}>{formatValue(item.summary?.[field])}</td>
                      ))}
                      <td style={{ padding: '10px 12px', color: 'var(--t2)', fontSize: 10 }}>{formatTimestamp(item.timestamps?.updated)}</td>
                    </tr>
                  );
                })}
                {!loading && records.length === 0 ? (
                  <tr>
                    <td colSpan={visibleSummaryFields.length + 2} style={{ padding: '18px 12px', color: 'var(--t2)', fontSize: 11 }}>No records matched the current filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="nexus-card" style={{ padding: 14, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{selectedLabel || 'Record Detail'}</div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>{selectedEntity || 'Select an entity'}{selectedRecordId ? ` · ${selectedRecordId}` : ''}</div>
            </div>
            {selectedRecordId ? (
              <button type="button" className="nexus-btn" onClick={() => loadRecordDetail(selectedEntity, selectedRecordId)} disabled={detailLoading}>
                <RefreshCw size={12} />
                Refresh
              </button>
            ) : null}
          </div>

          {detailError ? <div style={{ padding: 10, borderRadius: 3, background: 'rgba(224,72,72,0.08)', border: '0.5px solid rgba(224,72,72,0.24)', color: '#E04848', fontSize: 11 }}>{detailError}</div> : null}
          {!selectedRecord && !detailLoading ? <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.6 }}>Select a record to inspect fields, apply schema-aware edits, or run safe admin actions.</div> : null}
          {detailLoading ? <div style={{ color: 'var(--t2)', fontSize: 11 }}>Loading record...</div> : null}

          {selectedRecord ? (
            <>
              <div style={{ padding: 10, borderRadius: 3, background: 'var(--bg2)', display: 'grid', gap: 6 }}>
                <div style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capabilities</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedCapabilities.edit ? <span className="nexus-badge">Edit</span> : <span className="nexus-badge subdued">Read Only</span>}
                  {selectedCapabilities.deactivate ? <span className="nexus-badge warn">Deactivate</span> : null}
                  {selectedCapabilities.restore ? <span className="nexus-badge info">Restore</span> : null}
                  {selectedCapabilities.delete ? <span className="nexus-badge danger">Delete</span> : null}
                </div>
              </div>

              {schema?.fields ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>Schema Fields</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    {Object.entries(schema.fields).map(([fieldName, field]) => (
                      <label key={fieldName} style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: 'var(--t2)', fontSize: 10 }}>{fieldName}</span>
                        {renderFieldEditor(fieldName, field, formValues[fieldName] ?? '', (name, value) => {
                          setFormValues((current) => ({ ...current, [name]: value }));
                        })}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>JSON Patch Fallback</div>
                <textarea className="nexus-input" value={jsonPatch} onChange={(event) => setJsonPatch(event.target.value)} style={{ minHeight: 104, resize: 'vertical', fontFamily: 'monospace' }} />
                <div style={{ color: 'var(--t2)', fontSize: 10 }}>Use this for fields not covered by the client schema. Provide a partial object, not the full record.</div>
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: 'var(--t2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reason / Audit Note</span>
                <input className="nexus-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why this change is being made" />
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="nexus-btn primary" onClick={submitUpdate} disabled={busyAction === 'update' || !selectedCapabilities.edit}>
                  <Edit3 size={12} />
                  {busyAction === 'update' ? 'Saving...' : 'Save Patch'}
                </button>
                {selectedCapabilities.deactivate ? <button type="button" className="nexus-btn" onClick={() => runDestructive('deactivate')} disabled={Boolean(busyAction)}><Ban size={12} />{busyAction === 'deactivate' ? 'Working...' : 'Deactivate'}</button> : null}
                {selectedCapabilities.restore ? <button type="button" className="nexus-btn" onClick={() => runDestructive('restore')} disabled={Boolean(busyAction)}><ArchiveRestore size={12} />{busyAction === 'restore' ? 'Working...' : 'Restore'}</button> : null}
                {selectedCapabilities.delete ? <button type="button" className="nexus-btn danger" onClick={() => runDestructive('delete')} disabled={Boolean(busyAction)}><Trash2 size={12} />{busyAction === 'delete' ? 'Deleting...' : 'Delete'}</button> : null}
              </div>

              <div style={{ maxHeight: 320, overflow: 'auto', borderTop: '0.5px solid var(--b1)', paddingTop: 10 }}>
                <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Raw Record</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {detailRows.map(([fieldName, value]) => (
                    <div key={fieldName} style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 3 }}>
                      <div style={{ color: 'var(--t2)', fontSize: 10 }}>{fieldName}</div>
                      <div style={{ color: 'var(--t0)', fontSize: 11, marginTop: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '—')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="nexus-card" style={{ padding: 14, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ color: 'var(--t0)', fontSize: 12, fontWeight: 600 }}>Recent Admin Audit Log</div>
            <div style={{ color: 'var(--t2)', fontSize: 10 }}>Every admin mutation and manual job should land here.</div>
          </div>
          <button type="button" className="nexus-btn" onClick={loadActionLog}>
            <RefreshCw size={12} />
            Refresh Log
          </button>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          {actionLog.map((entry) => (
            <div key={entry.id} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 3, display: 'grid', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ color: 'var(--t0)', fontSize: 11, fontWeight: 600 }}>{entry.action_type || 'ADMIN_ACTION'}</div>
                {entry.entity_name && entry.record_id ? (
                  <button type="button" className="nexus-btn" onClick={() => updateSearchParams({ entity: entry.entity_name, record: entry.record_id })} style={{ padding: '4px 8px' }}>
                    <ExternalLink size={11} />
                    Open
                  </button>
                ) : null}
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 10 }}>{entry.entity_name || 'SYSTEM'} · {entry.record_label || entry.record_id || '—'} · {entry.acted_by_callsign || 'UNKNOWN'}</div>
              <div style={{ color: 'var(--t3)', fontSize: 10 }}>{formatTimestamp(entry.created_at)}</div>
            </div>
          ))}
          {actionLog.length === 0 ? <div style={{ color: 'var(--t2)', fontSize: 11 }}>No admin actions recorded yet.</div> : null}
        </div>
      </div>

      <style>{`
        .nexus-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; background: rgba(39,201,106,0.12); color: #27C96A; }
        .nexus-badge.subdued { background: rgba(157,161,205,0.12); color: var(--t2); }
        .nexus-badge.warn { background: rgba(232,160,32,0.12); color: #E8A020; }
        .nexus-badge.info { background: rgba(93,156,236,0.12); color: #5D9CEC; }
        .nexus-badge.danger { background: rgba(224,72,72,0.12); color: #E04848; }
      `}</style>
    </div>
  );
}
