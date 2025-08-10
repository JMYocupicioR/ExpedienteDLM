import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error | null;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Optionally force reload to recover from fatal runtime errors in dev
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      // In dev, a hard reload is often the fastest recovery
      location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--app-gradient)', color: 'var(--text-primary)' }}>
          <div className="max-w-lg w-full bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Ocurrió un error</h2>
            <p className="text-gray-300 mb-4">Se produjo un problema al renderizar la interfaz.</p>
            {this.state.error && (
              <pre className="text-left text-xs bg-gray-900 p-3 rounded-md overflow-auto max-h-40 border border-gray-700 mb-4">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


