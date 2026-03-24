/**
 * Reusable loading state with contextual message.
 * Replaces ad-hoc loading dots scattered throughout the app.
 */
import React from 'react';

export default function NexusLoadingState({ message = 'LOADING…', size = 'normal' }) {
  const isCompact = size === 'compact';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: isCompact ? 'auto' : '100%', gap: isCompact ? 6 : 12, padding: isCompact ? '20px 0' : 0,
    }}>
      <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      <span style={{ color: 'var(--t3)', fontSize: isCompact ? 9 : 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{message}</span>
    </div>
  );
}