/**
 * OcrUploadPanel — Screenshot OCR extraction for industry screens
 * Handles: inventory, refinery orders, transactions, mining scans
 * Auto-populates Material + RefineryOrder tables; flags ambiguous results for confirmation.
 */
import React, { useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/core/data/base44Client';

const TYPE_LABELS = {
  INVENTORY: 'Inventory',
  REFINERY_ORDER: 'Refinery Order',
  TRANSACTION: 'Transaction',
  MINING_SCAN: 'Mining Scan',
  CRAFT_QUEUE: 'Craft Queue',
  SHIP_STATUS: 'Ship Status',
};

const TYPE_HINT = {
  INVENTORY: 'Materials auto-logged to stockpile',
  REFINERY_ORDER: 'Order auto-logged to refinery tracker',
  TRANSACTION: 'Sale/expense auto-logged to coffer',
  MINING_SCAN: 'Review deposit details before logging',
  CRAFT_QUEUE: 'Review craft items before confirming',
  SHIP_STATUS: 'Review ship component state',
};

// ─── Confidence bar ──────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? 'var(--live)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ color, fontSize: 9, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

// ─── Extracted item row ───────────────────────────────────────────────────────
function ItemRow({ item, index, onChange, onRemove }) {
  const fields = Object.entries(item).filter(([k]) => !k.startsWith('_'));
  return (
    <div style={{
      background: 'var(--bg2)', border: '0.5px solid var(--b1)', borderRadius: 6,
      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--t2)', fontSize: 9, letterSpacing: '0.1em' }}>ITEM {index + 1}</span>
        <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 2 }}>
          <X size={11} />
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {fields.map(([key, val]) => (
          <div key={key} style={{ flex: '1 1 140px', minWidth: 0 }}>
            <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</div>
            <input
              style={{
                width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--b2)',
                borderRadius: 4, color: 'var(--t0)', fontFamily: 'inherit', fontSize: 10,
                padding: '4px 7px', outline: 'none',
              }}
              value={val ?? ''}
              onChange={e => onChange(index, key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mining scan confirmation ─────────────────────────────────────────────────
function MiningScanConfirm({ data, callsign, discordId, onConfirm, onDismiss }) {
  const [form, setForm] = useState({
    material_name: data.material_name || '',
    system_name: data.system_name || '',
    location_detail: data.location_detail || '',
    quality_pct: data.quality_pct || '',
    volume_estimate: data.volume_estimate || 'MEDIUM',
    risk_level: data.risk_level || 'MEDIUM',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleConfirm = async () => {
    setSaving(true);
    await base44.entities.ScoutDeposit.create({
      ...form,
      quality_pct: form.quality_pct ? Number(form.quality_pct) : undefined,
      reported_by: discordId || '',
      reported_by_callsign: callsign || '',
      reported_at: new Date().toISOString(),
    });
    setSaving(false);
    onConfirm();
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--b2)',
    borderRadius: 4, color: 'var(--t0)', fontFamily: 'inherit', fontSize: 10,
    padding: '5px 8px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: 'var(--warn)', fontSize: 9, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 5 }}>
        <AlertTriangle size={11} /> MINING SCAN — CONFIRM BEFORE LOGGING
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['MATERIAL', 'material_name'], ['SYSTEM', 'system_name'],
          ['LOCATION', 'location_detail'], ['QUALITY %', 'quality_pct'],
        ].map(([label, key]) => (
          <div key={key}>
            <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3 }}>{label}</div>
            <input style={inputStyle} value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3 }}>VOLUME</div>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.volume_estimate} onChange={e => set('volume_estimate', e.target.value)}>
            {['SMALL','MEDIUM','LARGE','MASSIVE'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3 }}>RISK</div>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.risk_level} onChange={e => set('risk_level', e.target.value)}>
            {['LOW','MEDIUM','HIGH','EXTREME'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3 }}>NOTES</div>
        <input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional context…" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDismiss} className="nexus-btn" style={{ padding: '6px 14px', fontSize: 9 }}>DISCARD</button>
        <button
          onClick={handleConfirm}
          disabled={saving || !form.material_name}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
            background: 'rgba(var(--live-rgb), 0.08)', border: '0.5px solid rgba(var(--live-rgb), 0.3)', color: 'var(--live)',
            opacity: saving || !form.material_name ? 0.5 : 1,
          }}
        >
          {saving ? 'LOGGING…' : '✓ LOG DEPOSIT'}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OcrUploadPanel({ callsign, discordId, onComplete }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState('idle'); // idle | uploading | processing | confirm | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  const reset = () => {
    setState('idle');
    setResult(null);
    setError('');
    setPendingItems([]);
    setPreviewUrl(null);
  };

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Only image files are supported');
      setState('error');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setState('uploading');
    setError('');

    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setState('processing');

    // Call OCR extract function
    const response = await base44.functions.invoke('ocrExtract', {
      file_url,
      source_type: 'OCR_UPLOAD',
      discord_id: discordId || '',
      callsign: callsign || '',
    });

    const data = response.data;

    if (!data || data.error) {
      setError(data?.error || 'Extraction failed');
      setState('error');
      return;
    }

    setResult(data);

    // Items requiring confirmation
    if (['MINING_SCAN', 'CRAFT_QUEUE', 'SHIP_STATUS'].includes(data.screenshot_type)) {
      const items = data.screenshot_type === 'CRAFT_QUEUE'
        ? (data.pending_confirmation || [])
        : [data.pending_confirmation].filter(Boolean);
      setPendingItems(items);
      setState('confirm');
    } else {
      setState('done');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleItemChange = (index, key, value) => {
    setPendingItems(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };

  const handleItemRemove = (index) => {
    setPendingItems(items => items.filter((_, i) => i !== index));
  };

  const handleDone = () => {
    reset();
    onComplete?.();
  };

  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--b1)', borderRadius: 8,
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 300,
    }}>
      {/* Drop zone — shown only in idle/error state */}
      {(state === 'idle' || state === 'error') && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `0.5px dashed ${dragging ? 'var(--acc2)' : 'var(--b2)'}`,
              borderRadius: 6,
              padding: '18px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              background: dragging ? 'var(--bg3)' : 'var(--bg2)',
              transition: 'background 0.12s, border-color 0.12s',
            }}
          >
            <Upload size={18} style={{ color: 'var(--t2)' }} />
            <span style={{ color: 'var(--t1)', fontSize: 10, letterSpacing: '0.08em' }}>DROP SCREENSHOT OR CLICK TO UPLOAD</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>Inventory · Refinery · Transaction · Mining Scan</span>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          {state === 'error' && (
            <div style={{ color: 'var(--danger)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={11} /> {error}
            </div>
          )}
        </>
      )}

      {/* Processing states */}
      {(state === 'uploading' || state === 'processing') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 5, opacity: 0.7 }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="nexus-loading-dots"><span /><span /><span /></div>
            <span style={{ color: 'var(--t1)', fontSize: 10 }}>
              {state === 'uploading' ? 'Uploading screenshot…' : 'Extracting data…'}
            </span>
          </div>
        </div>
      )}

      {/* Confirmation state — mining scan / craft queue */}
      {state === 'confirm' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 5, opacity: 0.6 }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--t0)', fontSize: 10 }}>{TYPE_LABELS[result.screenshot_type]}</span>
            {result.confidence != null && <ConfidenceBar value={result.confidence} />}
          </div>

          {result.screenshot_type === 'MINING_SCAN' && (
            <MiningScanConfirm
              data={result.pending_confirmation || {}}
              callsign={callsign}
              discordId={discordId}
              onConfirm={handleDone}
              onDismiss={reset}
            />
          )}

          {result.screenshot_type === 'CRAFT_QUEUE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--warn)', fontSize: 9, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={11} /> CRAFT QUEUE — REVIEW ITEMS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {pendingItems.map((item, i) => (
                  <ItemRow key={i} item={item} index={i} onChange={handleItemChange} onRemove={handleItemRemove} />
                ))}
              </div>
              {result.notes && <div style={{ color: 'var(--t2)', fontSize: 9 }}>{result.notes}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={reset} className="nexus-btn" style={{ padding: '6px 14px', fontSize: 9 }}>DISCARD</button>
                <button onClick={handleDone} style={{
                  flex: 1, padding: '6px 0', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                  background: 'rgba(var(--live-rgb), 0.08)', border: '0.5px solid rgba(var(--live-rgb), 0.3)', color: 'var(--live)',
                }}>
                  ACKNOWLEDGED
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success state */}
      {state === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 5, opacity: 0.5 }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} style={{ color: 'var(--live)', flexShrink: 0 }} />
            <div>
              <div style={{ color: 'var(--t0)', fontSize: 10 }}>
                {TYPE_LABELS[result.screenshot_type]} extracted
                {result.records_created > 0 && ` — ${result.records_created} record${result.records_created > 1 ? 's' : ''} logged`}
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
                {TYPE_HINT[result.screenshot_type]}
              </div>
            </div>
          </div>
          {result.confidence != null && (
            <div>
              <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3 }}>OCR CONFIDENCE</div>
              <ConfidenceBar value={result.confidence} />
            </div>
          )}
          {result.notes && (
            <div style={{ color: 'var(--t2)', fontSize: 9, padding: '6px 8px', background: 'var(--bg2)', borderRadius: 4 }}>
              {result.notes}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={reset} className="nexus-btn" style={{ flex: 1, padding: '6px 0', fontSize: 9, justifyContent: 'center' }}>
              UPLOAD ANOTHER
            </button>
            <button onClick={handleDone} style={{
              flex: 1, padding: '6px 0', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
              background: 'var(--bg3)', border: '0.5px solid var(--b2)', color: 'var(--t1)',
            }}>
              DONE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}