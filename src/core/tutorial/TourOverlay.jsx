/**
 * TourOverlay — Full-screen guided tour overlay with step-by-step navigation.
 * Shows a polished modal card for each tour step with keyboard navigation,
 * animated transitions, and detailed sub-text for each module.
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOUR_STEPS } from './tutorialSteps';
import { ChevronLeft, ChevronRight, X, Keyboard } from 'lucide-react';

function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? '#C0392B' : i < current ? '#4A8C5C' : 'rgba(200,170,100,0.12)',
            transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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
  const prevRouteRef = useRef(null);

  // Navigate to step route if specified and different from previous
  useEffect(() => {
    if (step?.route && step.route !== prevRouteRef.current) {
      navigate(step.route);
    }
    prevRouteRef.current = step?.route || null;
  }, [tourStep, step?.route, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') onNext();
      else if (e.key === 'ArrowLeft' && !isFirst) onPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onSkip, isFirst]);

  if (!step) return null;

  const progressPct = ((tourStep + 1) / TOUR_STEPS.length) * 100;

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
          background: 'rgba(8, 8, 10, 0.88)',
          backdropFilter: 'blur(6px)',
        }}
        onClick={onSkip}
      />

      {/* Card — key forces re-mount for animation */}
      <div
        key={step.id}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 520,
          margin: '0 20px',
          background: 'linear-gradient(180deg, #121110 0%, #0F0E0C 100%)',
          border: '0.5px solid rgba(200,170,100,0.18)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 160px rgba(192,57,43,0.06)',
          animation: 'tour-card-enter 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(200,170,100,0.06)' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #C0392B 0%, #D35400 100%)',
            borderRadius: '0 2px 2px 0',
            transition: 'width 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }} />
        </div>

        {/* Close button */}
        <button
          onClick={onSkip}
          title="Skip tour (Esc)"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(200,170,100,0.04)',
            border: '0.5px solid rgba(200,170,100,0.1)',
            borderRadius: 4,
            color: '#5A5850',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E4DC'; e.currentTarget.style.borderColor = 'rgba(200,170,100,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; e.currentTarget.style.borderColor = 'rgba(200,170,100,0.1)'; }}
        >
          <X size={14} />
        </button>

        {/* Content */}
        <div style={{ padding: '28px 32px 16px' }}>
          {/* Step counter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 18,
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9,
              color: '#C0392B',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}>
              STEP {tourStep + 1} OF {TOUR_STEPS.length}
            </span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(200,170,100,0.08)' }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9,
              color: '#5A5850',
              letterSpacing: '0.1em',
            }}>
              {Math.round(progressPct)}%
            </span>
          </div>

          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: 'rgba(192,57,43,0.06)',
              border: '0.5px solid rgba(192,57,43,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}>
              {step.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 20,
                fontWeight: 600,
                color: '#E8E4DC',
                letterSpacing: '0.03em',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {step.title}
              </h3>
              {step.route && (
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  color: '#C8A84B',
                  letterSpacing: '0.1em',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#C8A84B', opacity: 0.6 }} />
                  {step.route}
                </div>
              )}
            </div>
          </div>

          {/* Primary body */}
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            color: '#B8B0A4',
            lineHeight: 1.7,
            margin: '0 0 12px',
          }}>
            {step.body}
          </p>

          {/* Detail text (new — deeper info per step) */}
          {step.detail && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(200,170,100,0.03)',
              border: '0.5px solid rgba(200,170,100,0.08)',
              borderRadius: 4,
              marginBottom: 16,
            }}>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                color: '#7A7470',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {step.detail}
              </p>
            </div>
          )}

          {/* Dots */}
          <StepDots current={tourStep} total={TOUR_STEPS.length} />
        </div>

        {/* Footer navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px 14px',
          borderTop: '0.5px solid rgba(200,170,100,0.06)',
          background: 'rgba(200,170,100,0.015)',
        }}>
          {/* Left: skip + keyboard hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                padding: '6px 4px',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#9A9488'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5A5850'; }}
            >
              SKIP TOUR
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: 0.4,
            }}>
              <Keyboard size={10} style={{ color: '#5A5850' }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 8,
                color: '#5A5850',
                letterSpacing: '0.06em',
              }}>
                ← → ESC
              </span>
            </div>
          </div>

          {/* Right: nav buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={onPrev}
                title="Previous step (←)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(200,170,100,0.04)',
                  border: '0.5px solid rgba(200,170,100,0.12)',
                  borderRadius: 4,
                  padding: '8px 14px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  color: '#9A9488',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.3)'; e.currentTarget.style.color = '#E8E4DC'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,170,100,0.12)'; e.currentTarget.style.color = '#9A9488'; }}
              >
                <ChevronLeft size={14} />
                BACK
              </button>
            )}
            <button
              onClick={onNext}
              title={isLast ? 'Finish tour (Enter)' : 'Next step (→ or Enter)'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: isLast
                  ? 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)'
                  : 'linear-gradient(135deg, rgba(200,170,100,0.1) 0%, rgba(200,170,100,0.04) 100%)',
                border: isLast
                  ? '1px solid rgba(192,57,43,0.5)'
                  : '0.5px solid rgba(200,170,100,0.18)',
                borderRadius: 4,
                padding: '8px 20px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: isLast ? '#F0EDE5' : '#E8E4DC',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 150ms',
                boxShadow: isLast ? '0 6px 20px rgba(192,57,43,0.3)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isLast) {
                  e.currentTarget.style.borderColor = 'rgba(200,170,100,0.35)';
                  e.currentTarget.style.background = 'rgba(200,170,100,0.12)';
                }
              }}
              onMouseLeave={e => {
                if (!isLast) {
                  e.currentTarget.style.borderColor = 'rgba(200,170,100,0.18)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(200,170,100,0.1) 0%, rgba(200,170,100,0.04) 100%)';
                }
              }}
            >
              {isLast ? '✓ FINISH' : 'NEXT'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tour-card-enter {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}