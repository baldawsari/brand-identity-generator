import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GeminiError, getErrorTitle } from '../utils/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static override getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      const err = this.state.error;
      const isGeminiError = err instanceof GeminiError;
      const title = isGeminiError ? getErrorTitle(err) : 'Unexpected Error';
      const message = isGeminiError
        ? err.userMessage
        : 'Something went wrong in the application. Please refresh the page.';

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">{message}</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.resetError}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Reload the entire page
              </button>
            </div>

            {isGeminiError && (err as GeminiError).isRetryable && (
              <p className="mt-4 text-xs text-gray-400">
                This error is usually temporary. Retrying often helps.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for wrapping specific sections (e.g. export tools)
export const withErrorBoundary = <P extends object>(
  ComponentToWrap: React.ComponentType<P>,
  fallback?: (error: Error, reset: () => void) => ReactNode
) => {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <ComponentToWrap {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary;
