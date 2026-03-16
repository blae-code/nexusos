import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary] uncaught render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--bg0)',
            color: 'var(--t0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--bg1)',
              border: '0.5px solid var(--danger-b)',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: 'var(--danger)', fontSize: 10, letterSpacing: '0.14em', marginBottom: 8 }}>
              STARTUP FAILURE
            </div>
            <div style={{ color: 'var(--t0)', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              NexusOS failed to initialize in this runtime.
            </div>
            <div style={{ color: 'var(--t1)', fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>
              The app hit an uncaught client error before the first screen finished rendering. Reload once after deployment.
            </div>
            <div
              style={{
                color: 'var(--t2)',
                fontSize: 10,
                background: 'var(--bg2)',
                border: '0.5px solid var(--b1)',
                borderRadius: 8,
                padding: '10px 12px',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || 'Unknown client error'}
            </div>
            <button
              type="button"
              className="nexus-btn nexus-btn-solid"
              style={{ marginTop: 14 }}
              onClick={() => window.location.reload()}
            >
              RELOAD
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
