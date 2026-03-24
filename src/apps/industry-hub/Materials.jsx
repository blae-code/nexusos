/**
 * Materials tab — Industry Hub
 * Full sortable/filterable material stockpile table with OCR upload flow.
 * Props: { materials: Material[], onRefresh: () => void }
 */
import React, { useState, useRef } from 'react';
import { base44 } from '@/core/data/base44Client';
import { nexusWriteApi } from '@/core/data/nexus-write-api';
import { isT2Eligible, qualityPercentFromRecord, qualityScoreFromPercent } from '@/core/data/quality';
import { Upload, ChevronDown, ChevronUp, Search, X, Check } from 'lucide-react';
import { MaterialStatusPill } from '@/apps/industry-hub/IndustryVisuals';
import NexusToken from '@/core/design/NexusToken';
import { materialToken } from '@/core/data/tokenMap';
import {
  TH, T2Badge,
  SortableColHeader, StaticColHeader,
} from './MaterialTablePrimitives';
import EditRow from './MaterialEditRow';
import OCRReviewTable from './OCRReviewTable';
import MaterialContextPanel from '@/components/industry/MaterialContextPanel';

// ─── Shared style constants ────────────────────────────────────────────────────

/** @type {import('react').CSSProperties} */
const TD = { padding: '6px 12px' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Maps material_type to tokenMap category shape
function matCategory(type) {
  if (type === 'SALVAGE') return 'salvage';
  if (type === 'CRAFTED') return 'general';
  return 'ore'; // RAW, REFINED
}

// Maps material fields to tokenMap status colour
function matStatus(m) {
  if (m.t2_eligible) return 'CRAFT-READY';
  if ((m.material_type || '') === 'RAW') return 'REFINE FIRST';
  if (m.material_type) return 'BELOW T2';
  return 'neutral';
}

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// ─── Main Materials component ──────────────────────────────────────────────────

export default function Materials({ materials, onRefresh }) {
  // ── Filter + sort state ───────────────────────────────
  const [qualityMin,    setQualityMin]    = useState(0);
  const [typeFilter,    setTypeFilter]    = useState('ALL');
  const [statusFilter,  setStatusFilter]  = useState('ALL');
  const [search,        setSearch]        = useState('');
  const [sortBy,        setSortBy]        = useState('quality_pct');
  const [sortDir,       setSortDir]       = useState('desc');

  // ── Inline edit / archive / context state ─────────────
  const [editingId,         setEditingId]         = useState(null);
  const [archiveConfirmId,  setArchiveConfirmId]  = useState(null);
  const [contextId,         setContextId]         = useState(null);

  // ── Upload zone state ─────────────────────────────────
  const [uploadOpen,    setUploadOpen]    = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [ocrState,      setOcrState]      = useState(null); // null|'INVENTORY_REVIEW'|'MINING_SCAN'|'SUCCESS'|'ERROR'
  const [reviewItems,   setReviewItems]   = useState([]);
  const [reviewChecked, setReviewChecked] = useState({});
  const [confirming,    setConfirming]    = useState(false);

  const fileInputRef = useRef(null);

  // ── Filter & sort ─────────────────────────────────────

  const filtered = materials
    .filter(m => qualityPercentFromRecord(m) >= qualityMin)
    .filter(m => typeFilter === 'ALL' || m.material_type === typeFilter)
    .filter(m => {
      if (statusFilter === 'ALL')          return true;
      if (statusFilter === 'CRAFT-READY')  return !!m.t2_eligible;
      if (statusFilter === 'BELOW T2')     return !m.t2_eligible && m.material_type !== 'RAW';
      if (statusFilter === 'REFINE FIRST') return m.material_type === 'RAW';
      return true;
    })
    .filter(m => !search.trim() || (m.material_name || '').toLowerCase().includes(search.trim().toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const av = sortBy === 'logged_at'
      ? new Date(a.logged_at || 0).getTime()
      : sortBy === 'quality_pct'
        ? qualityPercentFromRecord(a)
        : (a[sortBy] ?? 0);
    const bv = sortBy === 'logged_at'
      ? new Date(b.logged_at || 0).getTime()
      : sortBy === 'quality_pct'
        ? qualityPercentFromRecord(b)
        : (b[sortBy] ?? 0);
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const hasFilters = qualityMin > 0 || typeFilter !== 'ALL' || statusFilter !== 'ALL' || search.trim();

  function clearFilters() {
    setQualityMin(0);
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearch('');
  }

  // ── OCR upload ────────────────────────────────────────

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) { setOcrState('ERROR'); return; }

    setUploading(true);
    setOcrState(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // POST to ocrExtract — the canonical OCR pipeline function
      const result = await base44.functions.invoke('ocrExtract', {
        file_url,
        source_type: 'OCR_UPLOAD',
      });

      const data       = result?.data || result || {};
      const screenType = data?.screenshot_type
        || data?.pending_confirmation?.screenshot_type;
      // Items may come from direct response or pending_confirmation
      const items      = data?.items
        || data?.pending_confirmation?.extracted_data?.items
        || [];

      if (screenType === 'MINING_SCAN') {
        // Scout deposit detected — redirect suggestion, not an error
        setOcrState('MINING_SCAN');
      } else if (items.length > 0) {
        // Show review table — user edits qty/quality then confirms
        setReviewItems(items.map((item, i) => ({ ...item, _idx: i })));
        setReviewChecked(Object.fromEntries(items.map((_, i) => [i, true])));
        setOcrState('INVENTORY_REVIEW');
      } else {
        // ocrExtract wrote directly (INVENTORY path) — refresh and confirm
        setOcrState('SUCCESS');
        onRefresh();
      }
    } catch {
      setOcrState('ERROR');
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // Bulk-create confirmed items via Material entity
  const handleConfirmOCR = async () => {
    setConfirming(true);
    const toCreate = reviewItems.filter((_, i) => reviewChecked[i]);
    try {
      await nexusWriteApi.createMaterial({
        materials: toCreate.map((item) => {
          const qualityPct = parseFloat(item.quality_pct) || 0;
          return {
            material_name:  item.material_name,
            material_type:  item.material_type || 'RAW',
            quantity_scu:   parseFloat(item.quantity_scu) || 0,
            quality_score:  qualityScoreFromPercent(qualityPct),
            quality_pct:    qualityPct,
            source_type:    'OCR_UPLOAD',
          };
        }),
      });
      setOcrState('SUCCESS');
      setReviewItems([]);
      onRefresh();
    } catch {
      // confirm create failed
    }
    setConfirming(false);
  };

  const dismissOCR = () => { setOcrState(null); setReviewItems([]); setReviewChecked({}); };

  // ── Archive (delete) ──────────────────────────────────

  const handleArchive = async (id) => {
    await base44.entities.Material.delete(id);
    setArchiveConfirmId(null);
    onRefresh();
  };

  // ── Render ────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Filters bar ──────────────────────────────────── */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '0.5px solid var(--b1)',
        display: 'flex', flexDirection: 'column', gap: 8,
        flexShrink: 0,
        background: 'var(--bg1)',
      }}>
        {/* Row 1: search + type chips + status chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* Search input */}
          <div style={{ position: 'relative', minWidth: 180 }}>
            <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search materials..."
              style={{
                background: 'var(--bg2)', border: '0.5px solid var(--b2)',
                color: 'var(--t0)', fontFamily: 'inherit', fontSize: 11,
                padding: '5px 10px 5px 26px', borderRadius: 3, outline: 'none', width: '100%',
              }}
            />
          </div>

          {/* Type chips */}
          <div style={{ display: 'flex', gap: 3 }}>
            {['ALL', 'RAW', 'REFINED', 'SALVAGE', 'CRAFTED'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="nexus-btn"
                style={{
                  padding: '3px 9px', fontSize: 9,
                  background:  typeFilter === t ? 'var(--bg4)' : 'var(--bg2)',
                  borderColor: typeFilter === t ? 'var(--b3)'  : 'var(--b1)',
                  color:       typeFilter === t ? 'var(--t0)'  : 'var(--t2)',
                }}
              >{t}</button>
            ))}
          </div>

          {/* Status chips */}
          <div style={{ display: 'flex', gap: 3 }}>
            {[
              { id: 'ALL',          label: 'ALL' },
              { id: 'CRAFT-READY',  label: 'CRAFT-READY' },
              { id: 'BELOW T2',     label: 'BELOW T2' },
              { id: 'REFINE FIRST', label: 'REFINE FIRST' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className="nexus-btn"
                style={{
                  padding: '3px 9px', fontSize: 9,
                  background:  statusFilter === s.id ? 'var(--bg4)' : 'var(--bg2)',
                  borderColor: statusFilter === s.id ? 'var(--b3)'  : 'var(--b1)',
                  color:       statusFilter === s.id ? 'var(--t0)'  : 'var(--t2)',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* Row 2: quality slider + T2 preset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--t2)', fontSize: 10 }}>MIN QUALITY</span>
          <input
            type="range" min={0} max={100}
            value={qualityMin}
            onChange={e => setQualityMin(Number(e.target.value))}
            style={{ accentColor: 'var(--acc)', width: 120 }}
          />
          <span style={{ color: 'var(--t0)', fontSize: 11, minWidth: 28 }}>{qualityMin}%</span>
          {/* T2 PRESET sets slider to exactly 80 */}
          <button
            onClick={() => setQualityMin(80)}
            className="nexus-btn"
            style={{
              padding: '3px 9px', fontSize: 9,
              borderColor: qualityMin === 80 ? 'rgba(var(--live-rgb), 0.4)' : 'var(--b1)',
              color:       qualityMin === 80 ? 'var(--live)'           : 'var(--t1)',
            }}
          >T2 PRESET</button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 10, fontFamily: 'inherit' }}
            >
              Clear filters ×
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable content ───────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Screenshot upload zone (collapsible) ─────── */}
        <div style={{ border: '0.5px solid var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
          {/* Toggle header */}
          <button
            onClick={() => setUploadOpen(v => !v)}
            style={{
              width: '100%', background: uploadOpen ? 'var(--bg2)' : 'var(--bg1)',
              border: 'none',
              borderBottom: uploadOpen ? '0.5px solid var(--b1)' : 'none',
              color: 'var(--t1)', fontFamily: 'inherit', fontSize: 11,
              padding: '9px 14px', textAlign: 'left', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Upload size={12} style={{ color: 'var(--t2)' }} />
            Log materials via screenshot
            {uploadOpen
              ? <ChevronUp   size={12} style={{ marginLeft: 'auto', color: 'var(--t2)' }} />
              : <ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--t2)' }} />
            }
          </button>

          {uploadOpen && (
            <div style={{ background: 'var(--bg1)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Drop zone — shown when idle */}
              {!ocrState && !uploading && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `0.5px dashed ${dragOver ? 'var(--acc2)' : 'var(--b2)'}`,
                    borderRadius: 3,
                    background: dragOver ? 'var(--bg2)' : 'transparent',
                    minHeight: 120,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  <Upload size={18} style={{ color: 'var(--t2)' }} />
                  <span style={{ color: 'var(--t1)', fontSize: 12 }}>Drop screenshot here or click to upload</span>
                  <span style={{ color: 'var(--t2)', fontSize: 10 }}>image/*, max 10 MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { processFile(e.target.files[0]); e.target.value = ''; }}
                  />
                </div>
              )}

              {/* Processing indicator */}
              {uploading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 80, color: 'var(--t1)', fontSize: 12 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid var(--b3)', borderTopColor: 'var(--acc2)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Extracting data...
                </div>
              )}

              {/* MINING_SCAN — redirect suggestion (not an error) */}
              {ocrState === 'MINING_SCAN' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', background: 'var(--bg2)',
                  border: '0.5px solid var(--b2)', borderRadius: 3,
                }}>
                  <span style={{ color: 'var(--t1)', fontSize: 12, flex: 1 }}>
                    Scout deposit detected — log this in Scout Intel instead?
                  </span>
                  <a href="/app/scout" style={{ color: 'var(--info)', fontSize: 11, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Scout Intel →
                  </a>
                  <button onClick={dismissOCR} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2 }}>
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* INVENTORY review table */}
              {ocrState === 'INVENTORY_REVIEW' && (
                <OCRReviewTable
                  items={reviewItems}
                  checked={reviewChecked}
                  setChecked={setReviewChecked}
                  setItems={setReviewItems}
                  onConfirm={handleConfirmOCR}
                  onDismiss={dismissOCR}
                  confirming={confirming}
                />
              )}

              {/* Success */}
              {ocrState === 'SUCCESS' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', color: 'var(--live)', fontSize: 12 }}>
                  <Check size={13} />
                  Materials logged successfully.
                  <button onClick={dismissOCR} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, marginLeft: 'auto' }}>
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Error */}
              {ocrState === 'ERROR' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 12 }}>
                  Extraction failed — check the screenshot and try again.
                  <button onClick={dismissOCR} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, marginLeft: 'auto' }}>
                    <X size={11} />
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
        {/* ── Full materials table ──────────────────────── */}
        <div style={{ border: '0.5px solid var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <StaticColHeader label="" />
                <StaticColHeader label="MATERIAL" title="Material name" />
                <StaticColHeader label="TYPE"     title="Material category — ore, salvage, fuel, etc." />
                <SortableColHeader col="quality_pct"  label="QUALITY"  title="Quality percentage (0–100%). ≥80% meets T2 crafting requirements. Click to sort." sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableColHeader col="quantity_scu" label="SCU"      title="Current stock in Standard Cargo Units. Click to sort." sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <StaticColHeader label="T2"     title="Tier 2 eligibility — T2 materials can craft high-end components. T1 is lower tier." />
                <StaticColHeader label="STATUS" title="Crafting status: CRAFT-READY, BELOW T2, REFINE FIRST, or T1 ONLY" />
                <SortableColHeader col="logged_at"    label="LOGGED"   title="When this stock entry was last recorded. Click to sort." sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <StaticColHeader label="ACTIONS" right />
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const qualityPct = qualityPercentFromRecord(m);
                // Inline edit row
                if (editingId === m.id) {
                  return (
                    <EditRow
                      key={m.id}
                      material={m}
                      onSave={() => { setEditingId(null); onRefresh(); }}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }

                const isArchiveConfirm = archiveConfirmId === m.id;

                return (
                  <React.Fragment key={m.id}>
                    <tr
                      style={{ borderBottom: '0.5px solid var(--b0)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Icon */}
                      <td style={{ padding: '8px 8px 8px 12px', width: 36 }}>
                        <NexusToken src={materialToken(matCategory(m.material_type), matStatus(m))} size={24} alt={m.material_type} />
                      </td>

                      {/* Material name + source */}
                      <td style={{ padding: '8px 12px', maxWidth: 200, cursor: 'pointer' }}
                        onClick={() => setContextId(contextId === m.id ? null : m.id)}
                      >
                        <div style={{ color: 'var(--t0)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {m.material_name}
                          <span style={{ color: contextId === m.id ? 'var(--acc2)' : 'var(--t3)', fontSize: 8, flexShrink: 0 }}>
                            {contextId === m.id ? '▲' : '▼'}
                          </span>
                        </div>
                        {m.source_type && (
                          <div style={{ color: 'var(--t2)', fontSize: 10 }}>
                            {m.source_type.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>

                      {/* Type tag */}
                      <td style={{ padding: '8px 12px' }}>
                        <span className="nexus-tag" style={{ color: 'var(--t1)', borderColor: 'var(--b2)', background: 'var(--bg3)' }}>
                          {m.material_type}
                        </span>
                      </td>

                      {/* Quality bar (3px) + % label */}
                      <td style={{ padding: '8px 12px', minWidth: 110 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="nexus-bar-bg" style={{ flex: 1 }}>
                            <div className="nexus-bar-fill" style={{ width: `${qualityPct}%`, background: 'var(--acc2)' }} />
                          </div>
                          <span style={{ color: 'var(--t1)', fontSize: 11, minWidth: 28, textAlign: 'right' }}>
                            {qualityPct.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Qty SCU */}
                      <td style={{ padding: '8px 12px', color: 'var(--t0)', fontSize: 12 }}>
                        {(m.quantity_scu || 0).toFixed(1)}
                      </td>

                      {/* T2 eligibility badge */}
                      <td style={{ padding: '8px 12px' }}>
                        <T2Badge t2_eligible={isT2Eligible(m) || !!m.t2_eligible} />
                      </td>

                      {/* Status flag */}
                      <td style={{ padding: '8px 12px' }}>
                        <MaterialStatusPill material={m} />
                      </td>

                      {/* Logged by + relative timestamp */}
                      <td style={{ padding: '8px 12px' }}>
                        {m.logged_by_callsign && (
                          <div style={{ color: 'var(--t1)', fontSize: 11 }}>{m.logged_by_callsign}</div>
                        )}
                        <div style={{ color: 'var(--t2)', fontSize: 10 }}>{relativeTime(m.logged_at)}</div>
                      </td>

                      {/* Actions: Edit | Archive */}
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {isArchiveConfirm ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleArchive(m.id)}
                              className="nexus-btn"
                              style={{ padding: '2px 7px', fontSize: 9, background: 'rgba(var(--danger-rgb), 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            >CONFIRM</button>
                            <button
                              onClick={() => setArchiveConfirmId(null)}
                              className="nexus-btn"
                              style={{ padding: '2px 7px', fontSize: 9 }}
                            >CANCEL</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => { setEditingId(m.id); setArchiveConfirmId(null); }}
                              className="nexus-btn"
                              style={{ padding: '2px 7px', fontSize: 9 }}
                            >EDIT</button>
                            <button
                              onClick={() => { setArchiveConfirmId(m.id); setEditingId(null); }}
                              className="nexus-btn"
                              style={{ padding: '2px 7px', fontSize: 9, color: 'var(--t2)' }}
                            >ARCHIVE</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {contextId === m.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <MaterialContextPanel
                            materialName={m.material_name}
                            onClose={() => setContextId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Empty state */}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--t2)', fontSize: 11, fontStyle: 'italic' }}>
                      No materials match this filter
                    </div>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--info)', fontSize: 11, fontFamily: 'inherit', marginTop: 6, display: 'block', margin: '6px auto 0' }}
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
