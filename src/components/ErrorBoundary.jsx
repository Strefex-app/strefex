import { Component } from 'react'
import { captureException } from '../config/sentry'

/**
 * Catches rendering errors anywhere in the child tree.
 * Reports to Sentry and shows a friendly fallback UI.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    captureException(error, { componentStack: errorInfo?.componentStack })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '50vh', padding: 32, textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: '#e74c3c', marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 style={{ margin: '0 0 8px', color: '#333', fontSize: 20 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14, maxWidth: 400 }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px', border: 'none', borderRadius: 8,
              background: 'linear-gradient(135deg, #000222, #000888)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 8,
              fontSize: 12, color: '#c0392b', maxWidth: '100%', overflow: 'auto', textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
