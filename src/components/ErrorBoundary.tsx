import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    // Error log removed for security;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
          <div className="max-w-md text-center space-y-3">
            <div className="text-2xl font-semibold">Ha ocurrido un error</div>
            <p className="text-gray-300">Intenta recargar la página. Si el problema persiste, contacta al administrador.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


