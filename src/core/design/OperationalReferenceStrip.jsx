import React from 'react';

const TONE_STYLES = {
  live: { color: 'var(--live)', background: 'rgba(74,232,48,0.14)', borderColor: 'rgba(74,232,48,0.28)' },
  info: { color: 'var(--info)', background: 'rgba(93,156,236,0.16)', borderColor: 'rgba(93,156,236,0.28)' },
  warn: { color: 'var(--warn)', background: 'rgba(243,156,18,0.16)', borderColor: 'rgba(243,156,18,0.28)' },
  danger: { color: 'var(--danger)', background: 'rgba(192,57,43,0.14)', borderColor: 'rgba(192,57,43,0.28)' },
  neutral: { color: 'var(--t2)', background: 'var(--bg2)', borderColor: 'var(--b1)' },
};

function toneStyle(tone) {
  return TONE_STYLES[tone] || TONE_STYLES.neutral;
}

export function RuntimeStatePill({ label, tone = 'neutral' }) {
  const style = toneStyle(tone);
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 999,
        border: `0.5px solid ${style.borderColor}`,
        background: style.background,
        color: style.color,
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

export default function OperationalReferenceStrip({
  sectionLabel = 'REFERENCE',
  title,
  description,
  notes = [],
  actions = [],
  statusPills = [],
}) {
  return (
    <div className="nexus-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="nexus-section-header">{sectionLabel}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 920 }}>
          {title ? <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 600 }}>{title}</div> : null}
          {description ? (
            <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.7, marginTop: title ? 6 : 0 }}>
              {description}
            </div>
          ) : null}
        </div>

        {statusPills.length ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
            {statusPills.map((pill) => (
              <RuntimeStatePill key={`${pill.label}-${pill.tone || 'neutral'}`} label={pill.label} tone={pill.tone} />
            ))}
          </div>
        ) : null}
      </div>

      {notes.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {notes.map((note) => (
            <div key={note.label} className="nexus-card-2" style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 110, padding: '16px' }}>
              <div style={{ color: 'var(--t3)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{note.label}</div>
              <div style={{ color: note.color || 'var(--t0)', fontSize: 12, fontWeight: 600 }}>{note.value}</div>
              <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.55 }}>{note.detail}</div>
            </div>
          ))}
        </div>
      ) : null}

      {actions.length ? (
        <div className="nexus-card-2" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px 16px' }}>
          {actions.map((action) => {
            const style = toneStyle(action.tone || 'neutral');
            return (
              <button
                key={action.label}
                type="button"
                className="nexus-btn"
                onClick={action.onClick}
                disabled={Boolean(action.disabled)}
                style={{
                  background: action.tone ? style.background : undefined,
                  borderColor: action.tone ? style.borderColor : undefined,
                  color: action.tone ? style.color : undefined,
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
