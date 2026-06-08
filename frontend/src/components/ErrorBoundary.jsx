import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error: this.state.error, reset: () => this.reset() })
          : fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <p className="text-gray-500 mb-3">Something went wrong in this section.</p>
          <button
            onClick={() => this.reset()}
            className="btn-secondary text-sm"
          >
            Try again
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-4 p-2 bg-gray-100 text-xs overflow-auto text-left max-w-lg">
              {this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
