/**
 * WizardStepIndicator — Horizontal pipeline with glowing nodes and labels.
 * Accepts a `steps` prop so the wizard can vary the step count by op type.
 */
import React from 'react';

const DEFAULT_STEPS = [
  { id: 0, label: 'TYPE' },
  { id: 1, label: 'BRIEFING' },
  { id: 2, label: 'CREW' },
  { id: 3, label: 'TIMELINE' },
  { id: 4, label: 'REVIEW' },
];

export default function WizardStepIndicator({ currentStep, onStepClick, steps = DEFAULT_STEPS }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: '16px 24px',
    }}>
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const isFuture = i > currentStep;

        const nodeColor = isDone ? '#4A8C5C' : isActive ? '#C0392B' : '#2A2A28';
        const labelColor = isDone ? '#4A8C5C' : isActive ? '#E8E4DC' : '#3A3830';

        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div style={{
                width: 40, height: 2,
                background: isDone ? '#4A8C5C' : isActive ? 'linear-gradient(90deg, #4A8C5C, #C0392B)' : '#1A1A18',
                transition: 'background 400ms',
                flexShrink: 0,
              }} />
            )}

            <button
              type="button"
              onClick={() => onStepClick(i)}
              disabled={isFuture && i > currentStep + 1}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none',
                cursor: isFuture && i > currentStep + 1 ? 'not-allowed' : 'pointer',
                padding: '0 4px',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: isActive ? 14 : 10,
                height: isActive ? 14 : 10,
                borderRadius: '50%',
                background: nodeColor,
                boxShadow: isActive ? '0 0 12px rgba(192,57,43,0.5)' : isDone ? '0 0 8px rgba(74,140,92,0.3)' : 'none',
                transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                animation: isActive ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
                color: labelColor, letterSpacing: '0.18em', textTransform: 'uppercase',
                transition: 'color 300ms',
                whiteSpace: 'nowrap',
              }}>{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}