import React, { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/SessionContext';

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
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
      }}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i < currentStep ? 5 : i === currentStep ? 8 : 5,
            height: i < currentStep ? 5 : i === currentStep ? 8 : 5,
            borderRadius: '50%',
            background: i < currentStep ? 'var(--live)' : i === currentStep ? 'var(--acc)' : 'var(--b2)',
            transition: 'width 200ms ease, height 200ms ease, background 200ms ease',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

function Step1Welcome({ callsign, onContinue }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 28, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.15em', marginBottom: 16 }}>
          {callsign}
        </div>
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.7 }}>
          Welcome to NexusOS. This is Redscar Nomads' operational coordination platform. It helps us plan missions, track resources, and stay organized across the verse.
        </div>
      </div>
      <button
        onClick={onContinue}
        style={{
          padding: '10px 24px',
          background: 'var(--bg3)',
          border: '0.5px solid var(--b2)',
          borderRadius: 6,
          color: 'var(--t0)',
          fontSize: 11,
          letterSpacing: '0.12em',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        CONTINUE
      </button>
    </div>
  );
}

function Step2HowItWorks({ onContinue }) {
  const bullets = [
    'Coordinates ops and tracks org resources like blueprints, materials, and inventory.',
    "Does not read Discord messages or act on your behalf — it's a separate system.",
    'All data is private to Redscar Nomads and never shared with external parties.',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8 }}>
        <div style={{ marginBottom: 20, color: 'var(--t0)', fontWeight: 500 }}>What NexusOS Does</div>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {bullets.map((bullet, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 12,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--acc)',
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onContinue}
        style={{
          padding: '10px 24px',
          background: 'var(--bg3)',
          border: '0.5px solid var(--b2)',
          borderRadius: 6,
          color: 'var(--t0)',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          background: 'var(--bg2)',
          border: '0.5px solid var(--b1)',
          borderRadius: 6,
          padding: 16,
          overflow: 'auto',
          fontSize: 10,
          color: 'var(--t1)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}
      >
        {PRIVACY_DISCLOSURE}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          background: 'var(--b1)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--live)',
            width: `${scrollPercent}%`,
            transition: 'width 0.2s',
          }}
        />
      </div>

      <button
        onClick={onContinue}
        disabled={scrollPercent < 100}
        style={{
          padding: '10px 24px',
          background: scrollPercent < 100 ? 'var(--bg2)' : 'var(--bg3)',
          border: `0.5px solid ${scrollPercent < 100 ? 'var(--b1)' : 'var(--b2)'}`,
          borderRadius: 6,
          color: scrollPercent < 100 ? 'var(--t2)' : 'var(--t0)',
          fontSize: 11,
          letterSpacing: '0.12em',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: scrollPercent < 100 ? 'not-allowed' : 'pointer',
          alignSelf: 'center',
          opacity: scrollPercent < 100 ? 0.5 : 1,
          transition: 'all 0.12s',
        }}
      >
        CONTINUE
      </button>
    </div>
  );
}

function Step4Consent({ onComplete }) {
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = consent1 && consent2;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await base44.auth.updateMe({
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Consent 1 */}
        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            cursor: 'pointer',
            padding: 10,
            borderRadius: 4,
            background: 'var(--bg2)',
            border: `0.5px solid ${consent1 ? 'var(--b2)' : 'var(--b1)'}`,
            transition: 'border-color 0.12s',
          }}
        >
          <input
            type="checkbox"
            checked={consent1}
            onChange={(e) => setConsent1(e.target.checked)}
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              cursor: 'pointer',
              accentColor: 'var(--live)',
              marginTop: 2,
            }}
          />
          <span style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.5 }}>
            I have read and agree to the NexusOS data disclosure
          </span>
        </label>

        {/* Consent 2 */}
        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            cursor: 'pointer',
            padding: 10,
            borderRadius: 4,
            background: 'var(--bg2)',
            border: `0.5px solid ${consent2 ? 'var(--b2)' : 'var(--b1)'}`,
            transition: 'border-color 0.12s',
          }}
        >
          <input
            type="checkbox"
            checked={consent2}
            onChange={(e) => setConsent2(e.target.checked)}
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              cursor: 'pointer',
              accentColor: 'var(--live)',
              marginTop: 2,
            }}
          />
          <span style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.5 }}>
            I understand that my Redscar roles determine my access level within NexusOS
          </span>
        </label>

        {/* AI Features Toggle */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: 10,
            borderRadius: 4,
            background: 'var(--bg2)',
            border: '0.5px solid var(--b1)',
          }}
        >
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              cursor: 'pointer',
              accentColor: 'var(--acc)',
            }}
          />
          <span style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.5, flex: 1 }}>
            Enable AI-assisted features (tactical briefings, route optimization, patch analysis)
          </span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{
          padding: '10px 24px',
          background: canSubmit && !submitting ? 'var(--bg3)' : 'var(--bg2)',
          border: `0.5px solid ${canSubmit && !submitting ? 'var(--b2)' : 'var(--b1)'}`,
          borderRadius: 6,
          color: canSubmit && !submitting ? 'var(--t0)' : 'var(--t2)',
          fontSize: 11,
          letterSpacing: '0.12em',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          opacity: canSubmit ? 1 : 0.5,
          transition: 'all 0.12s',
        }}
      >
        {submitting ? 'ENTERING NEXUSOS...' : 'ENTER NEXUSOS'}
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
        background: 'var(--bg0)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <StepIndicator currentStep={step} totalSteps={4} />

        <div
          style={{
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {step === 0 && (
            <Step1Welcome callsign={user.callsign} onContinue={() => setStep(1)} />
          )}
          {step === 1 && <Step2HowItWorks onContinue={() => setStep(2)} />}
          {step === 2 && <Step3Privacy onContinue={() => setStep(3)} />}
          {step === 3 && <Step4Consent onComplete={handleComplete} />}
        </div>
      </div>
    </div>
  );
}