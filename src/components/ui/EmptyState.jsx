/**
 * EmptyState — reusable empty state component for list/table views.
 * Props: { icon: LucideIcon, title, detail, action, actionLabel, actionOnClick }
 */
import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  detail,
  action = false,
  actionLabel = 'Create',
  actionOnClick = null,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 24px',
        minHeight: 180,
        justifyContent: 'center',
      }}
    >
      {Icon && (
        <div style={{ marginBottom: 16 }}>
          <Icon size={40} style={{ color: 'var(--t3)' }} />
        </div>
      )}
      <div style={{
        fontSize: 12,
        color: 'var(--t1)',
        textAlign: 'center',
        marginBottom: 6,
        fontWeight: 500,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 10,
        color: 'var(--t2)',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 1.5,
        marginBottom: action ? 12 : 0,
      }}>
        {detail}
      </div>
      {action && actionOnClick && (
        <button
          onClick={actionOnClick}
          className="nexus-btn"
          style={{ padding: '6px 14px', fontSize: 10 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}