/**
 * Discord path instruction card — Materials.
 * No closed-over variables — no props.
 */
import React from 'react';
import { MessageSquare } from 'lucide-react';

// ─── Discord path instruction card ────────────────────────────────────────────

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
      <MessageSquare size={13} style={{ color: 'var(--t2)', flexShrink: 0, marginTop: 1 }} />
      <span style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.6 }}>
        Fastest path: drop your screenshot in{' '}
        <span style={{ color: 'var(--t1)' }}>#nexusos-ocr</span> on Discord.
        Herald Bot extracts and posts a confirmation.
      </span>
    </div>
  );
}
