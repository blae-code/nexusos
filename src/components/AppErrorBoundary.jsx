import React from 'react';

function classifyError(message) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch')) {
    return { type: 'NETWORK', title: 'Connection Issue', advice: 'Check your internet connection. If the problem persists, the server may be temporarily unavailable.' };
  }
  if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403')) {
    return { type: 'AUTH', title: 'Access Denied', advice: 'Your session may have expired. Try signing out and back in. If the issue persists, contact a Pioneer.' };
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return { type: 'MISSING', title: 'Resource Not Found', advice: 'The requested data or page could not be found. It may have been removed or moved.' };
  }
  return { type: 'UNKNOWN', title: 'Unexpected Error', advice: 'Something went wrong. Try reloading or navigating to a different section.' };
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch() {
    // error already captured in getDerivedStateFromError
  }

  render() {
    if (this.state.error) {
      const errorInfo = classifyError(this.state.error?.message);

      // compact=true — used inside the shell to catch per-module crashes.
      if (this.props.compact) {
        return (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--t0)' }}>
            <div style={{ color: 'var(--danger)', fontSize: 10, letterSpacing: '0.14em' }}>
              MODULE FAULT · {errorInfo.type}
            </div>
            <div style={{ color: 'var(--t0)', fontSize: 13, fontWeight: 600 }}>
              {errorInfo.title}
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6 }}>
              {errorInfo.advice}
            </div>
            <div style={{
              color: 'var(--t2)', fontSize: 10, background: 'var(--bg2)',
              border: '0.5px solid var(--b1)', borderRadius: 6,
              padding: '8px 10px', wordBreak: 'break-word',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="nexus-btn nexus-btn-solid"
                onClick={() => this.setState({ error: null })}
              >
                RETRY
              </button>
              <button
                type="button"
                className="nexus-btn"
                onClick={() => window.location.assign('/app/industry')}
              >
                GO TO INDUSTRY HUB
              </button>
              <button
                type="button"
                className="nexus-btn"
                onClick={() => window.location.reload()}
              >
                RELOAD PAGE
              </button>
            </div>
          </div>
        );
      }

      // Full-screen fallback — catastrophic startup failure.
      return (
        <div style={{
          minHeight: '100vh', background: 'var(--bg0)', color: 'var(--t0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            width: '100%', maxWidth: 520, background: 'var(--bg1)',
            border: '0.5px solid var(--danger-b)', borderRadius: 12, padding: 20,
          }}>
            <div style={{ color: 'var(--danger)', fontSize: 10, letterSpacing: '0.14em', marginBottom: 8 }}>
              STARTUP FAILURE · {errorInfo.type}
            </div>
            <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              {errorInfo.title}
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>
              {errorInfo.advice}
            </div>
            <div style={{
              color: 'var(--t2)', fontSize: 10, background: 'var(--bg2)',
              border: '0.5px solid var(--b1)', borderRadius: 8,
              padding: '10px 12px', wordBreak: 'break-word',
            }}>
              {this.state.error?.message || 'Unknown client error'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="nexus-btn nexus-btn-solid"
                onClick={() => window.location.reload()}
              >
                RELOAD
              </button>
              <button
                type="button"
                className="nexus-btn"
                onClick={() => window.location.assign('/')}
              >
                RETURN TO ACCESS GATE
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}