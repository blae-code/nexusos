import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function OcrPreview({ result, onConfirm, onCancel }) {
  const [saving, setSaving] = useState(false);
  const typeLabel = result.screenshot_type?.replace(/_/g, ' ') || 'Unknown';

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Data already auto-populated by ocrExtract for INVENTORY and REFINERY_ORDER
      // Just acknowledge and close
      setSaving(false);
      onConfirm();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg2)',
      border: '0.5px solid var(--b1)',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ color: 'var(--t1)', fontSize: 11, fontWeight: 500 }}>
        OCR EXTRACTION RESULT
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle size={14} style={{ color: 'var(--live)', flexShrink: 0 }} />
        <div>
          <div style={{ color: 'var(--t0)', fontSize: 10 }}>
            {typeLabel} extracted successfully
          </div>
          {result.records_created > 0 && (
            <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2 }}>
              {result.records_created} record{result.records_created !== 1 ? 's' : ''} logged to {result.screenshot_type === 'INVENTORY' ? 'materials' : 'refinery'}
            </div>
          )}
        </div>
      </div>

      {result.confidence != null && (
        <div>
          <div style={{ color: 'var(--t3)', fontSize: 9, marginBottom: 3 }}>OCR CONFIDENCE</div>
          <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.round(result.confidence * 100)}%`,
              height: '100%',
              background: result.confidence >= 0.8 ? 'var(--live)' : 'var(--warn)',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 9, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(result.confidence * 100)}%
          </div>
        </div>
      )}

      {result.notes && (
        <div style={{ color: 'var(--t2)', fontSize: 9, padding: '6px 8px', background: 'var(--bg1)', borderRadius: 4 }}>
          {result.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          className="nexus-btn"
          style={{ flex: 1, padding: '6px 0', fontSize: 10 }}
        >
          DISMISS
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="nexus-btn live-btn"
          style={{ flex: 1, padding: '6px 0', fontSize: 10, opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'CONFIRMING...' : 'DONE'}
        </button>
      </div>
    </div>
  );
}
