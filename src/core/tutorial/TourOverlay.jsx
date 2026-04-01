/**
 * TourOverlay — Full-screen guided tour overlay with step-by-step navigation.
 * Shows a spotlight effect and contextual card for each tour step.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOUR_STEPS } from './tutorialSteps';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? '#C0392B' : i < current ? '#4A8C5C' : 'rgba(200,170,100,0.15)',
            transition: 'all 250ms ease',
          }}
        />
      ))}
    </div>
  );
}

export default function TourOverlay({ tourStep, onNext, onPrev, onSkip }) {
  const navigate = useNavigate();
  const step = TOUR_STEPS[tourStep];
  const isFirst = tourStep === 0;
  const isLast = tourStep === TOUR_STEPS.length - 1;

  // Navigate to step route if specified
  useEffect(() => {
    if (step?.route) {
      navigate(step.route);
    }
  }, [step?.route, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext();
      if (e.key === 'ArrowLeft' && !isFirst) onPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onSkip, isFirst]);

  if (!step) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'nexus-fade-in 200ms ease-out both',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 8, 10, 0.85)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onSkip}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 480,
          margin: '0 20px',
          background: '#0F0E0C',
          border: '0.5px solid rgba(200,170,100,0.18)',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 120px rgba(192,57,43,0.08)',
          animation: 'step-enter 200ms ease-out both',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, #C0392B ${((tourStep + 1) / TOUR_STEPS.length) * 100}%, rgba(200,170,100,0.1) 0%)`,
          transition: 'background 300ms ease',
        }} />

        {/* Close button */}
        <button
          onClick={onSkip}
          title="Skip tour (Esc)"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: '#5A5850',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E4DC'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; }}
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div style={{ padding: '28px 32px 20px' }}>
          {/* Step counter */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9,
            color: '#5A5850',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            STEP {tourStep + 1} OF {TOUR_STEPS.length}
          </div>

          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              background: 'rgba(192,57,43,0.08)',
              border: '0.5px solid rgba(192,57,43,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}>
              {step.icon}
            </div>
            <div>
              <h3 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: '#E8E4DC',
                letterSpacing: '0.04em',
                margin: 0,
              }}>
                {step.title}
              </h3>
              {step.route && (
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#C8A84B',
                  letterSpacing: '0.1em',
                  marginTop: 2,
                }}>
                  {step.route}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            color: '#9A9488',
            lineHeight: 1.7,
            margin: '0 0 20px',
          }}>
            {step.body}
          </p>

          {/* Dots */}
          <StepDots current={tourStep} total={TOUR_STEPS.length} />
        </div>

        {/* Footer navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderTop: '0.5px solid rgba(200,170,100,0.08)',
          background: 'rgba(200,170,100,0.02)',
        }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: '#5A5850',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              padding: '6px 8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; }}
          >
            SKIP TOUR
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={onPrev}
                title="Previous step (←)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(200,170,100,0.06)',
                  border: '0.5px solid rgba(200,170,100,0.15)',
                  borderRadius: 3,
                  padding: '7px 14px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  color: '#9A9488',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.3)'; e.currentTarget.style.color = '#E8E4DC'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.15)'; e.currentTarget.style.color = '#9A9488'; }}
              >
                <ChevronLeft size={14} />
                BACK
              </button>
            )}
            <button
              onClick={onNext}
              title={isLast ? 'Finish tour' : 'Next step (→)'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: isLast
                  ? 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)'
                  : 'linear-gradient(135deg, rgba(200,170,100,0.12) 0%, rgba(200,170,100,0.06) 100%)',
                border: isLast
                  ? '1px solid rgba(192,57,43,0.5)'
                  : '0.5px solid rgba(200,170,100,0.2)',
                borderRadius: 3,
                padding: '7px 18px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: isLast ? '#F0EDE5' : '#E8E4DC',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 150ms',
                boxShadow: isLast ? '0 4px 16px rgba(192,57,43,0.25)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isLast) {
                  e.currentTarget.style.borderColor = 'rgba(200,170,100,0.4)';
                  e.currentTarget.style.background = 'rgba(200,170,100,0.15)';
                }
              }}
              onMouseLeave={e => {
                if (!isLast) {
                  e.currentTarget.style.borderColor = 'rgba(200,170,100,0.2)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(200,170,100,0.12) 0%, rgba(200,170,100,0.06) 100%)';
                }
              }}
            >
              {isLast ? 'FINISH' : 'NEXT'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes step-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}