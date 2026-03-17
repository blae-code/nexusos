import React from 'react';
import { X } from 'lucide-react';

export default function PriceWatchlist({ watchlist, onSelectCommodity, onRemove }) {
  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--b1)',
        borderRadius: 6,
        padding: '12px 16px',
      }}
    >
      <div
        style={{
          color: 'var(--t2)',
          fontSize: 10,
          letterSpacing: '0.1em',
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        YOUR WATCHLIST
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {watchlist.map((commodity) => (
          <button
            key={commodity.id}
            onClick={() => onSelectCommodity(commodity)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: 'rgba(192,57,43,0.12)',
              border: '0.5px solid rgba(192,57,43,0.3)',
              borderRadius: 4,
              color: 'var(--t0)',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(192,57,43,0.2)';
              e.currentTarget.style.borderColor = 'rgba(192,57,43,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(192,57,43,0.12)';
              e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)';
            }}
          >
            {commodity.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(commodity);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--t1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={10} />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}