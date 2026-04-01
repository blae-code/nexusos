import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { withAppBase } from '@/core/data/app-base-path';
import { authApi } from '@/core/data/auth-api';
import { useSession } from '@/core/data/SessionContext';

const PRIVACY_DISCLOSURE = `NexusOS Privacy & Data Usage Disclosure

Last Updated: 2026-03-23

NexusOS is a private operational coordination platform built exclusively for Redscar Nomads members. This disclosure outlines how member data is collected, stored, and used within the system.

1. DATA COLLECTION
NexusOS collects and stores the following information:
- Issued username, mutable callsign, and auth key (hashed)
- Rank and role assignments managed by org leadership
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

function normalizePostOnboardingDestination(rawDestination) {
  if (!rawDestination) return '/app/industry';
  if (!rawDestination.startsWith('/app') || rawDestination.startsWith('//')) return '/app/industry';
  return rawDestination;
}

/* ── Step Indicator ───────────────────────────────────────────────────── */

function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', paddingTop: 16 }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ width: 16, height: 1, background: i <= currentStep ? 'rgba(192,57,43,0.3)' : '#5A5850', transition: 'background 300ms' }} />}
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: i < currentStep ? '#4A8C5C' : i === currentStep ? '#C0392B' : 'transparent',
            border: i > currentStep ? '1px solid #5A5850' : 'none',
            transition: 'all 300ms',
          }} />
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── CTA Button ───────────────────────────────────────────────────────── */

function ContinueButton({ onClick, disabled, loading, label = 'CONTINUE', finalStyle }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: finalStyle ? '14px 28px' : '12px 28px',
        fontSize: finalStyle ? 13 : 12,
        letterSpacing: '0.14em',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'center',
        background: disabled
          ? 'linear-gradient(135deg, #4A4238 0%, #3A3530 100%)'
          : finalStyle
            ? 'linear-gradient(135deg, #C0392B 0%, #A03220 100%)'
            : hover
              ? 'linear-gradient(135deg, rgba(200,170,100,0.15) 0%, rgba(200,170,100,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(200,170,100,0.10) 0%, rgba(200,170,100,0.04) 100%)',
        border: disabled
          ? '1px solid rgba(200,170,100,0.15)'
          : finalStyle
            ? '1px solid rgba(192,57,43,0.6)'
            : '0.5px solid rgba(200,170,100,0.2)',
        color: disabled ? '#5A5850' : '#F0EDE5',
        borderRadius: 3,
        boxShadow: disabled ? 'none' : finalStyle ? '0 8px 24px rgba(192,57,43,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {loading ? 'PLEASE WAIT…' : label}
      {!loading && !disabled && <span style={{ display: 'inline-block', transform: hover ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 150ms' }}>→</span>}
    </button>
  );
}

/* ── Step 1: Welcome ──────────────────────────────────────────────────── */

function Step1Welcome({ callsign, onContinue }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Welcome,</div>
        <div style={{ fontSize: 26, color: 'var(--t0)', fontWeight: 500, letterSpacing: '0.05em' }}>{callsign}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          This is Redscar Nomads' operational coordination platform. It helps us plan missions, track resources, and stay organized across the verse.
        </div>
      </div>
      <ContinueButton onClick={onContinue} finalStyle />
    </div>
  );
}

/* ── Step 2: How It Works ─────────────────────────────────────────────── */

function Step2HowItWorks({ onContinue }) {
  const bullets = [
    { text: 'Industry Hub — Material tracking, refinery management, crafting queue, blueprint registry, and market prices.', color: '#C8A84B' },
    { text: 'Ops Board — Plan, schedule, and run live operations with crew coordination and financial wrap-ups.', color: '#C0392B' },
    { text: 'Scout Intel — Log and share deposit locations, plan mining routes, and track discoveries.', color: '#7AAECC' },
    { text: 'Armory & Fleet — Manage org ships, equipment checkouts, and fleet readiness.', color: '#2edb7a' },
    { text: 'Your data is private to Redscar Nomads. Pioneer rank grants admin access. Your callsign can be changed anytime in Settings.', color: '#9A9488' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>How It Works</div>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bullets.map((bullet, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: bullet.color, marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6, maxWidth: 360 }}>{bullet.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

/* ── Step 3: Install PWA Tips ─────────────────────────────────────────── */

function StepInstallPWA({ onContinue }) {
  const tips = [
    { icon: '📲', title: 'Install as an App', text: 'When prompted by your browser, tap "Install" or "Add to Home Screen" to pin NexusOS. On desktop Chrome, look for the install icon in the address bar.' },
    { icon: '🖥️', title: 'Use in Fullscreen', text: 'For the best experience — especially during live ops — run NexusOS in fullscreen mode (F11 on desktop or launch from home screen on mobile).' },
    { icon: '🔄', title: 'Always Up to Date', text: 'The app updates automatically in the background. No app store downloads required — just open it and you\'re always on the latest version.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Recommended Setup</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'var(--bg2, #1a1a18)', border: '0.5px solid var(--b1, rgba(200,170,100,0.12))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14,
              }}>{tip.icon}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 12, color: 'var(--t0)', fontWeight: 600 }}>{tip.title}</span>
                <span style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6 }}>{tip.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

/* ── Step 4: Privacy + Consent (combined — eliminates dead-end) ───────── */

function StepPrivacyConsent({ user, onComplete }) {
  const scrollRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Track scroll progress — mark as scrolled if text fits without scroll OR user scrolled to end
  const checkScroll = useCallback(() => {
    if (scrolledToEnd) return;
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, scrollTop, clientHeight } = el;
    const totalScroll = scrollHeight - clientHeight;
    // If content fits without scrollbar, immediately mark as scrolled
    if (totalScroll <= 2) {
      setScrolledToEnd(true);
      return;
    }
    // Otherwise require ~95% scroll
    if (scrollTop / totalScroll >= 0.95) {
      setScrolledToEnd(true);
    }
  }, [scrolledToEnd]);

  // Check on mount in case content fits without scrollbar
  useEffect(() => {
    // Small delay for layout to settle
    const t = setTimeout(checkScroll, 100);
    return () => clearTimeout(t);
  }, [checkScroll]);

  const canSubmit = scrolledToEnd && consent1 && consent2;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await authApi.completeOnboarding({
        consentGiven: true,
        aiEnabled,
        consentVersion: '1.0',
      });
      if (res?.error) {
        console.error('[Onboarding] completeOnboarding error:', res);
        setErrorMsg(`Failed to complete onboarding: ${res.error}. Please try again.`);
        setSubmitting(false);
        return;
      }
      onComplete();
    } catch (err) {
      console.error('[Onboarding] completeOnboarding exception:', err);
      setErrorMsg('Connection error — check your internet and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 540, width: '100%', margin: '0 auto' }}>
      <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Privacy Disclosure & Consent
      </div>

      {/* Privacy text */}
      <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{
            maxHeight: 240,
            background: 'var(--bg1, #0F0E0C)',
            border: '0.5px solid var(--b1, rgba(200,170,100,0.12))',
            borderRadius: 4,
            padding: 16,
            overflowY: 'auto',
            fontSize: 11,
            color: 'var(--t2)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}
        >
          {PRIVACY_DISCLOSURE}
        </div>

        {/* Scroll hint — only shows if not yet scrolled and content overflows */}
        {!scrolledToEnd && (
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 40,
            background: 'linear-gradient(transparent, rgba(15,14,12,0.95))',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 6, pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              ↓ SCROLL TO CONTINUE
            </span>
          </div>
        )}
      </div>

      {/* Consent checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: scrolledToEnd ? 1 : 0.4, transition: 'opacity 300ms', pointerEvents: scrolledToEnd ? 'auto' : 'none' }}>
        <ConsentCheckbox
          checked={consent1}
          onChange={setConsent1}
          label="I have read and agree to the NexusOS data disclosure"
        />
        <ConsentCheckbox
          checked={consent2}
          onChange={setConsent2}
          label="I understand that my assigned rank determines my access level within NexusOS"
        />

        {/* AI toggle */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 4 }}>
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            style={{
              width: 32, height: 18, borderRadius: 9,
              background: aiEnabled ? 'var(--acc, #C8A84B)' : 'var(--bg3, #1C1A16)',
              border: `0.5px solid ${aiEnabled ? 'var(--acc, #C8A84B)' : 'var(--b2, #38322A)'}`,
              cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0, marginTop: 3,
            }}
          >
            <div style={{
              position: 'absolute', top: 1, left: aiEnabled ? 16 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--bg0, #0A0908)', transition: 'left 200ms',
            }} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 1 }}>
            <span style={{ color: 'var(--t1)', fontSize: 11 }}>Enable AI-assisted features</span>
            <span style={{ color: 'var(--t3)', fontSize: 9 }}>Helps surface insights and recommendations. Can be changed later in Settings.</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <ContinueButton
        onClick={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
        label={submitting ? 'ENTERING NEXUSOS…' : 'ENTER NEXUSOS'}
        finalStyle
      />

      {errorMsg && (
        <div style={{
          padding: '8px 12px', borderRadius: 3,
          background: 'rgba(192,57,43,0.08)', border: '0.5px solid rgba(192,57,43,0.25)',
          color: '#C0392B', fontSize: 10, textAlign: 'center',
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

/* ── Consent Checkbox ─────────────────────────────────────────────────── */

function ConsentCheckbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
      <div style={{
        width: 16, height: 16, flexShrink: 0,
        background: checked ? 'var(--bg3, #1C1A16)' : 'var(--bg2, #151310)',
        border: `0.5px solid ${checked ? 'var(--acc, #C8A84B)' : 'var(--b2, #38322A)'}`,
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms',
      }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="var(--acc, #C8A84B)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }} />
      <span style={{ color: 'var(--t1)', fontSize: 11 }}>{label}</span>
    </label>
  );
}

/* ── Main Onboarding Page ─────────────────────────────────────────────── */

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const location = useLocation();
  const { user, loading, refreshSession } = useSession();
  const [step, setStep] = useState(0);

  const postOnboardingDestination = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return normalizePostOnboardingDestination(searchParams.get('redirect_to'));
  }, [location.search]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0A0908' }}>
        <div className="nexus-loading-dots" style={{ color: 'var(--t1)' }}><span /><span /><span /></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.onboarding_complete) {
    return <Navigate to={postOnboardingDestination} replace />;
  }

  const handleComplete = async () => {
    // Refresh session to pick up onboarding_complete flag, then redirect
    try {
      await refreshSession();
    } catch { /* best-effort */ }
    window.location.href = withAppBase(postOnboardingDestination);
  };

  return (
    <div style={{
      background: 'radial-gradient(ellipse 150% 100% at 50% 0%, rgba(139,40,40,0.12) 0%, transparent 50%), linear-gradient(180deg, #0A0908 0%, #12090D 100%)',
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(192,57,43,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes step-enter {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', zIndex: 1 }}>
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        <div key={step} style={{ animation: 'step-enter 200ms ease-out both', minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {step === 0 && <Step1Welcome callsign={user.callsign} onContinue={() => setStep(1)} />}
          {step === 1 && <Step2HowItWorks onContinue={() => setStep(2)} />}
          {step === 2 && <StepInstallPWA onContinue={() => setStep(3)} />}
          {step === 3 && <StepPrivacyConsent user={user} onComplete={handleComplete} />}
        </div>

        {/* Back button — visible on steps 1-2 */}
        {step > 0 && step < 3 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              alignSelf: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.1em',
              padding: '4px 8px', transition: 'color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; }}
          >
            ← BACK
          </button>
        )}
      </div>
    </div>
  );
}