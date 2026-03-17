import React from 'react';

export default function DataErrorState({ message, onRetry }) {
  return (
    <div
      style={{
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        border: '0.5px solid var(--warn-b)',
        borderRadius: 6,
        background: 'var(--warn-bg)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--warn)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: 'var(--warn)',
          fontFamily: 'var(--font)',
          lineHeight: 1.4,
          minWidth: 0,
          flex: 1,
        }}
      >
        {message}
      </span>
      {typeof onRetry === 'function' ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--acc)',
            fontSize: 10,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
