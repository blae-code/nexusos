import React from 'react';
import { X } from 'lucide-react';

export default function ResponsiveDetailPanel({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <span style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 500, letterSpacing: '0.08em' }}>
          {title}
        </span>
        <button className="detail-panel-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div style={{ padding: '0' }}>
        {children}
      </div>
    </div>
  );
}