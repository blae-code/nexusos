import React from 'react';

export default function NexusCompass({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="9" fill="none" stroke="#4a5070" strokeWidth="0.8" />
      <circle cx="11" cy="11" r="5" fill="none" stroke="#4a5070" strokeWidth="0.5" strokeDasharray="2.5 1.5" />
      <circle cx="11" cy="11" r="1.5" fill="#7a8098" />
      <line x1="11" y1="2" x2="11" y2="6" stroke="#9096a8" strokeWidth="1.2" />
      <polygon points="11,7 12.6,10.5 9.4,10.5" fill="#9096a8" />
      <line x1="11" y1="16" x2="11" y2="20" stroke="#4a5070" strokeWidth="0.8" />
      <line x1="2" y1="11" x2="6" y2="11" stroke="#4a5070" strokeWidth="0.8" />
      <line x1="16" y1="11" x2="20" y2="11" stroke="#4a5070" strokeWidth="0.8" />
    </svg>
  );
}
