import React, { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/core/data/base44Client';
import { useSession } from '@/core/data/SessionContext';

const PRIVACY_DISCLOSURE = `NexusOS Privacy & Data Usage Disclosure

Last Updated: 2026-03-16

NexusOS is a private operational coordination platform built exclusively for Redscar Nomads members. This disclosure outlines how member data is collected, stored, and used within the system.

1. DATA COLLECTION
NexusOS collects and stores the following information:
- Discord user ID and callsign (server nickname)
- Rank and role assignments synchronized from Discord
- Operational participation and session logs
- Resource tracking and inventory data
- Communication preferences and consent records

2. DATA USAGE
Data is used solely to:
- Coordinate operational activities
- Track organization resources and inventory
- Generate session reports and debrief summaries
- Manage member access and permissions
- Improve platform functionality and user experience

3. DATA SHARING
NexusOS data is private to Redscar Nomads. Data is never:
- Shared with external parties
- Sold or monetized
- Used for marketing or analytics outside the organization
- Accessible to non-members

4. AI FEATURES
Optional AI-assisted features (tactical briefings, patch analysis, route optimization) process your operational data locally within the platform. This data is not sent to external AI providers unless explicitly enabled. Disabling AI features does not limit access to core platform functionality.

5. DATA RETENTION
Operational logs and resource data are retained indefinitely. Members may request data removal by contacting org leadership.

6. MEMBER RIGHTS
Members retain full control of their data and may revoke platform access at any time. Upon removal from the organization, access is terminated within 24 hours.

7. SECURITY
Data is stored securely with access limited to system administrators. Platform communications use encrypted connections.

By continuing, you acknowledge that you have read and understood this disclosure.`;

function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
      }}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === currentStep ? 28 : 8,
            height: 8,
            borderRadius: '3px',
            background: i < currentStep 
              ? 'linear-gradient(135deg, #C0392B, #A03220)' 
              : i === currentStep 
              ? 'linear-gradient(135deg, #C8A84B, #A08030)' 
              : 'rgba(200, 170, 100, 0.15)',
            transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            flexShrink: 0,
            boxShadow: i === currentStep ? '0 4px 12px rgba(200, 168, 75, 0.3)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

function Step1Welcome({ callsign, onContinue }) {
  const [arrowShift, setArrowShift] = useState(false);
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        textAlign: 'center',
        animation: 'onboarding-fade-in 200ms ease-out both',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
          Welcome,
        </div>
        <div style={{ fontSize: 26, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.05em', fontFamily: 'inherit' }}>
          {callsign}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto', fontFamily: 'inherit' }}>
          This is Redscar Nomads' operational coordination platform. It helps us plan missions, track resources, and stay organized across the verse.
        </div>
      </div>
      <button
        onClick={onContinue}
        onMouseEnter={() => setArrowShift(true)}
        onMouseLeave={() => setArrowShift(false)}
        className="nexus-btn primary"
        style={{
          padding: '12px 28px',
          fontSize: 12,
          letterSpacing: '0.14em',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)',
          border: '1px solid rgba(192, 57, 43, 0.6)',
          color: '#F0EDE5',
          borderRadius: '3px',
          boxShadow: '0 8px 24px rgba(192, 57, 43, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        onMouseEnter2={() => {}}
        onMouseLeave2={() => {}}
      >
        CONTINUE
        <span style={{ display: 'inline-block', transform: arrowShift ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 150ms ease' }}>
          →
        </span>
      </button>
    </div>
  );
}

function Step2HowItWorks({ onContinue }) {
  const bullets = [
    'Coordinates ops and tracks org resources across Industry, Scout Intel, and the Op Board.',
    'Does not read your Discord messages or act on your behalf in any way.',
    'All data is private to Redscar Nomads and is never shared outside the org.',
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        animation: 'onboarding-fade-in 200ms ease-out both',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
          How It Works
        </div>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bullets.map((bullet, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--acc)',
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6, maxWidth: 360, fontFamily: 'inherit' }}>
                {bullet}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onContinue}
        className="nexus-btn primary"
        style={{
          padding: '10px 24px',
          fontSize: 11,
          letterSpacing: '0.12em',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
          alignSelf: 'center',
        }}
      >
        CONTINUE
      </button>
    </div>
  );
}

function Step3Privacy({ onContinue }) {
  const [scrollPercent, setScrollPercent] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
    const totalScroll = scrollHeight - clientHeight;
    const percent = totalScroll > 0 ? Math.min(100, (scrollTop / totalScroll) * 100) : 100;
    setScrollPercent(percent);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'onboarding-fade-in 200ms ease-out both' }}>
      <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
        Privacy Disclosure
      </div>

      <div
        style={{
          position: 'relative',
          maxHeight: 320,
          overflow: 'hidden',
          borderRadius: 3,
        }}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            maxHeight: 320,
            background: 'var(--bg1)',
            border: '0.5px solid var(--b1)',
            borderRadius: 3,
            padding: 16,
            overflowY: 'auto',
            fontSize: 11,
            color: 'var(--t2)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
          }}
        >
          {PRIVACY_DISCLOSURE}
        </div>

        {/* Progress bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--b1)',
            borderRadius: '0 0 3px 3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--acc)',
              width: `${scrollPercent}%`,
              transition: 'width 100ms ease',
            }}
          />
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={scrollPercent < 100}
        className="nexus-btn primary"
        style={{
          padding: '10px 24px',
          fontSize: 11,
          letterSpacing: '0.12em',
          fontWeight: 500,
          fontFamily: 'inherit',
          alignSelf: 'center',
          opacity: scrollPercent < 100 ? 0.4 : 1,
          cursor: scrollPercent < 100 ? 'not-allowed' : 'pointer',
          pointerEvents: scrollPercent < 100 ? 'none' : 'auto',
          transition: 'opacity 100ms ease',
        }}
      >
        CONTINUE
      </button>
    </div>
  );
}

function Step4Consent({ user, onComplete }) {
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = consent1 && consent2;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      // base44.auth.updateMe() only works for email/password (Base44 native) accounts.
      // Discord SSO members must be updated via the NexusUser entity directly.
      await base44.entities.NexusUser.update(user.id, {
        consent_given: true,
        consent_timestamp: now,
        consent_version: '1.0',
        ai_features_enabled: aiEnabled,
        onboarding_complete: true,
      });
      onComplete();
    } catch (err) {
      console.warn('[Onboarding] submission failed:', err);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'onboarding-fade-in 200ms ease-out both' }}>
      <style>{`
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(var(--acc-rgb), 0.6); }
          100% { box-shadow: 0 0 0 6px rgba(var(--acc-rgb), 0); }
        }
        @keyframes dash-draw {
          from { stroke-dashoffset: 14; }
          to { stroke-dashoffset: 0; }
        }
        .consent-button-pulse {
          animation: pulse-border 600ms ease-out 1;
        }
      `}</style>

      <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
        Consent & Preferences
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Consent 1 */}
        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              background: consent1 ? 'var(--bg3)' : 'var(--bg2)',
              border: `0.5px solid ${consent1 ? 'var(--acc)' : 'var(--b2)'}`,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
          >
            {consent1 && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 8l4 4 6-6"
                  stroke="var(--acc)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 14,
                    strokeDashoffset: 0,
                    animation: 'dash-draw 200ms ease-out forwards',
                  }}
                />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={consent1}
            onChange={(e) => setConsent1(e.target.checked)}
            style={{ display: 'none' }}
          />
          <span style={{ color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit' }}>
            I have read and agree to the NexusOS data disclosure
          </span>
        </label>

        {/* Consent 2 */}
        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              background: consent2 ? 'var(--bg3)' : 'var(--bg2)',
              border: `0.5px solid ${consent2 ? 'var(--acc)' : 'var(--b2)'}`,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
          >
            {consent2 && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 8l4 4 6-6"
                  stroke="var(--acc)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 14,
                    strokeDashoffset: 0,
                    animation: 'dash-draw 200ms ease-out forwards',
                  }}
                />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={consent2}
            onChange={(e) => setConsent2(e.target.checked)}
            style={{ display: 'none' }}
          />
          <span style={{ color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit' }}>
            I understand that my Redscar roles determine my access level within NexusOS
          </span>
        </label>

        {/* AI Features Toggle */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            marginTop: 6,
          }}
        >
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            style={{
              width: 32,
              height: 18,
              borderRadius: 9,
              background: aiEnabled ? 'var(--acc)' : 'var(--bg3)',
              border: `0.5px solid ${aiEnabled ? 'var(--acc)' : 'var(--b2)'}`,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 200ms ease',
              flexShrink: 0,
              marginTop: 3,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 1,
                left: aiEnabled ? 16 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'var(--bg0)',
                transition: 'left 200ms ease',
              }}
            />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
            <span style={{ color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit' }}>
              Enable AI-assisted features
            </span>
            <span style={{ color: 'var(--t3)', fontSize: 9, fontFamily: 'inherit' }}>
              Helps surface insights and recommendations across the platform.
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className={`nexus-btn primary ${canSubmit && !submitting ? 'consent-button-pulse' : ''}`}
        style={{
          width: '100%',
          padding: '14px 24px',
          fontSize: 13,
          letterSpacing: '0.16em',
          fontWeight: 600,
          fontFamily: 'inherit',
          background: canSubmit && !submitting ? 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)' : 'linear-gradient(135deg, #4A4238 0%, #3A3530 100%)',
          border: `1px solid ${canSubmit && !submitting ? 'rgba(192, 57, 43, 0.6)' : 'rgba(200, 170, 100, 0.15)'}`,
          color: '#F0EDE5',
          borderRadius: '3px',
          cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          boxShadow: canSubmit && !submitting 
            ? '0 8px 24px rgba(192, 57, 43, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : 'none',
          opacity: canSubmit && !submitting ? 1 : 0.5,
          pointerEvents: canSubmit && !submitting ? 'auto' : 'none',
          transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {submitting ? 'ENTERING NEXUSOS...' : 'ENTER NEXUSOS →'}
      </button>
    </div>
  );
}

export default function Onboarding() {
  const { user, loading } = useSession();
  const [step, setStep] = useState(0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="nexus-loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.onboarding_complete) {
    return <Navigate to="/app/industry" replace />;
  }

  const handleComplete = () => {
    window.location.href = '/app/industry';
  };

  return (
    <div
      style={{
        background: `
          radial-gradient(ellipse 150% 100% at 50% 0%, rgba(139,40,40,0.12) 0%, transparent 50%),
          linear-gradient(180deg, #0A0908 0%, #12090D 100%)
        `,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '300px',
          background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(192,57,43,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <style>{`
        @keyframes step-enter {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes step-exit {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-12px);
          }
        }
        .step-container {
          animation: step-enter 150ms ease-out both;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <StepIndicator currentStep={step} totalSteps={4} />

        <div className="step-container">
          {step === 0 && (
            <Step1Welcome callsign={user.callsign} onContinue={() => setStep(1)} />
          )}
          {step === 1 && <Step2HowItWorks onContinue={() => setStep(2)} />}
          {step === 2 && <Step3Privacy onContinue={() => setStep(3)} />}
          {step === 3 && <Step4Consent user={user} onComplete={handleComplete} />}
        </div>
      </div>
    </div>
  );
}