import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class CollectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('Collection Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    // Reload the entire app as a last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-background-secondary rounded-lg border border-border">
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>

            {/* Error Message */}
            <h3 className="text-lg font-semibold text-text mb-2">
              Collections Error
            </h3>
            <p className="text-text-secondary mb-6">
              Something went wrong with the collections feature. This might be due to corrupted data or a temporary issue.
            </p>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-text-tertiary hover:text-text-secondary">
                  Show Error Details
                </summary>
                <div className="mt-2 p-3 bg-background-tertiary rounded text-xs font-mono text-text-secondary overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-background-tertiary hover:bg-background-quaternary text-text-secondary rounded-lg transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withCollectionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <CollectionErrorBoundary fallback={fallback}>
        <Component {...props} />
      </CollectionErrorBoundary>
    );
  };
}

// Hook for error reporting
export function useCollectionErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Collection Error${context ? ` (${context})` : ''}:`, error);
    
    // You could integrate with error reporting services here
    // e.g., Sentry, LogRocket, etc.
    
    // For now, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.group('Collection Error Details');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('Context:', context);
      console.groupEnd();
    }
  }, []);

  return { handleError };
}