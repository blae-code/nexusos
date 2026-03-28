/**
 * PresenceDot — tiny online/offline indicator.
 * Online = seen within last 5 minutes.
 */
import React from 'react';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export default function PresenceDot({ lastSeenAt, size = 6, style }) {
  const online = isOnline(lastSeenAt);

  return (
    <span
      title={online ? 'Online' : 'Offline'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: online ? '#4A8C5C' : '#3A3530',
        flexShrink: 0,
        display: 'inline-block',
        ...(online ? { animation: 'pulse-dot 2.5s ease-in-out infinite' } : {}),
        ...style,
      }}
    />
  );
}