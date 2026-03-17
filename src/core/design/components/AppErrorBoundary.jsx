import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message ? String(error.message) : 'The app could not finish rendering this section.',
    };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
      return;
    }

    console.error('[AppErrorBoundary]', error, errorInfo);
  }

  handleRetry() {
    this.setState({
      hasError: false,
      message: '',
    });

    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'var(--bg1)',
            border: '0.5px solid var(--danger-b)',
            borderRadius: 6,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '0.5px solid var(--danger-b)',
                background: 'var(--danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)',
                fontSize: 11,
                lineHeight: 1,
              }}
            >
              !
            </span>
            <span style={{ fontSize: 12, color: 'var(--t1)', fontFamily: 'var(--font)' }}>
              Something went wrong
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.6, fontFamily: 'var(--font)' }}>
            {this.state.message || 'The app could not finish rendering this section. Try reloading the view.'}
          </div>
          <div>
            <button type="button" className="nexus-btn primary" onClick={this.handleRetry}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
}
