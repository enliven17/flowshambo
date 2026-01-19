'use client';

/**
 * ErrorDisplay Component for FlowShambo
 * 
 * A reusable component for displaying errors with consistent styling,
 * retry functionality, and dismiss capability.
 * 
 * @module components/ErrorDisplay
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { FlowShamboError, ErrorSeverity } from '../lib/errors';

/**
 * Severity configuration for styling
 */
const SEVERITY_CONFIG: Record<ErrorSeverity, {
  bg: string;
  border: string;
  text: string;
  icon: ReactNode;
}> = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-500',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500',
    text: 'text-yellow-500',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    text: 'text-red-500',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    ),
  },
  critical: {
    bg: 'bg-red-700/20',
    border: 'border-red-700',
    text: 'text-red-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
};

/**
 * Props for the ErrorDisplay component
 */
export interface ErrorDisplayProps {
  /** The error to display (can be FlowShamboError or simple string) */
  error: FlowShamboError | string | null;
  /** Callback when the error is dismissed */
  onDismiss?: () => void;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Whether to show the retry button */
  showRetry?: boolean;
  /** Whether retry is currently in progress */
  isRetrying?: boolean;
  /** Auto-dismiss timeout in milliseconds (0 to disable) */
  autoDismissMs?: number;
  /** Custom class name */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Current retry attempt (for progress display) */
  retryAttempt?: number;
  /** Maximum retry attempts (for progress display) */
  maxRetryAttempts?: number;
}

/**
 * Normalizes error input to FlowShamboError format
 */
function normalizeError(error: FlowShamboError | string | null): FlowShamboError | null {
  if (!error) return null;

  if (typeof error === 'string') {
    return {
      code: 'DISPLAY_ERROR',
      category: 'unknown',
      severity: 'error',
      message: error,
      recoverable: true,
      retryable: true,
      timestamp: Date.now(),
    };
  }

  return error;
}

/**
 * ErrorDisplay component for consistent error presentation
 * 
 * Features:
 * - Severity-based styling (info, warning, error, critical)
 * - Retry button with loading state
 * - Auto-dismiss capability
 * - Suggested action display
 * - Compact mode for inline errors
 * 
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={error}
 *   onDismiss={() => clearError()}
 *   onRetry={() => retryOperation()}
 *   showRetry={error?.retryable}
 * />
 * ```
 */
export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  showRetry = false,
  isRetrying = false,
  autoDismissMs = 0,
  className = '',
  compact = false,
  retryAttempt,
  maxRetryAttempts,
}: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);

  const normalizedError = normalizeError(error);

  // Auto-dismiss effect
  useEffect(() => {
    if (!normalizedError || autoDismissMs <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [normalizedError, autoDismissMs, onDismiss]);

  // Reset visibility when error changes
  useEffect(() => {
    if (normalizedError) {
      setIsVisible(true);
    }
  }, [normalizedError?.timestamp]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  if (!normalizedError || !isVisible) {
    return null;
  }

  const config = SEVERITY_CONFIG[normalizedError.severity];
  const showRetryButton = showRetry && normalizedError.retryable && onRetry;
  const showRetryProgress = retryAttempt !== undefined && maxRetryAttempts !== undefined;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border ${config.bg} ${config.border} ${className}`}
        role="alert"
        data-testid="error-display"
        data-severity={normalizedError.severity}
      >
        <span aria-hidden="true">{config.icon}</span>
        <span className={`text-sm flex-1 ${config.text}`}>
          {normalizedError.message}
        </span>
        {showRetryButton && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`px-2 py-1 text-xs bg-transparent border rounded opacity-100 disabled:opacity-50 disabled:cursor-not-allowed ${config.border} ${config.text}`}
            aria-label="Retry"
          >
            {isRetrying ? '...' : 'Retry'}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={`bg-transparent border-none cursor-pointer p-0.5 text-sm leading-none ${config.text}`}
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-6 max-w-md border animate-scale-in ${config.bg} ${config.border} ${className}`}
      role="alert"
      data-testid="error-display"
      data-severity={normalizedError.severity}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden="true">
          {config.icon}
        </span>

        <div className="flex-1">
          {/* Error Title */}
          <p className={`text-base font-semibold mb-1 ${config.text}`}>
            {normalizedError.severity === 'info' ? 'Notice' :
              normalizedError.severity === 'warning' ? 'Warning' :
                normalizedError.severity === 'critical' ? 'Critical Error' : 'Error'}
          </p>

          {/* Error Message */}
          <p className={`text-sm text-white/90 ${normalizedError.suggestedAction ? 'mb-2' : 'mb-3'}`}>
            {normalizedError.message}
          </p>

          {/* Suggested Action */}
          {normalizedError.suggestedAction && (
            <p className="text-sm text-zinc-400 italic mb-3">
              {normalizedError.suggestedAction}
            </p>
          )}

          {/* Retry Progress */}
          {showRetryProgress && isRetrying && (
            <p className="text-xs text-zinc-400 mb-3">
              Retry attempt {retryAttempt} of {maxRetryAttempts}...
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {showRetryButton && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 text-sm font-semibold bg-flow-green text-black rounded-md flex items-center gap-2 hover:bg-flow-green-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Retry operation"
              >
                {isRetrying && (
                  <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                )}
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}

            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-sm font-medium bg-transparent border border-zinc-500 text-white rounded-md hover:border-zinc-300 transition-colors"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Close button (top right) */}
        {onDismiss && !compact && (
          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-300 -mt-1 -mr-1 p-1 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorDisplay;
