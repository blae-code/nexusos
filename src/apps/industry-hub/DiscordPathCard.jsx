/**
 * OCR path instruction card — Materials.
 * No closed-over variables — no props.
 */
import React from 'react';
import { Upload } from 'lucide-react';

// ─── OCR path instruction card ────────────────────────────────────────────────

export default function DiscordPathCard() {
  return (
    <div style={{
      background: 'var(--bg1)',
      border: '0.5px solid var(--b1)',
      borderRadius: 7,
      padding: 12,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
    }}>
      <Upload size={13} style={{ color: 'var(--t2)', flexShrink: 0, marginTop: 1 }} />
      <span style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
        Fastest path: upload your screenshot directly in the Materials OCR panel.
        NexusOS extracts the data and routes the result into the correct in-app workflow.
      </span>
    </div>
  );
}
