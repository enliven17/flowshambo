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
import type { FlowShamboError, ErrorSeverity } from '../lib/errors';

/**
 * Flow green color
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Error colors by severity
 */
const SEVERITY_COLORS: Record<ErrorSeverity, { bg: string; border: string; text: string }> = {
  info: {
    bg: 'rgba(0, 191, 255, 0.1)',
    border: '#00BFFF',
    text: '#00BFFF',
  },
  warning: {
    bg: 'rgba(255, 193, 7, 0.1)',
    border: '#FFC107',
    text: '#FFC107',
  },
  error: {
    bg: 'rgba(255, 107, 107, 0.1)',
    border: '#FF6B6B',
    text: '#FF6B6B',
  },
  critical: {
    bg: 'rgba(220, 53, 69, 0.15)',
    border: '#DC3545',
    text: '#DC3545',
  },
};

/**
 * Icons by severity
 */
const SEVERITY_ICONS: Record<ErrorSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨',
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
  
  const colors = SEVERITY_COLORS[normalizedError.severity];
  const icon = SEVERITY_ICONS[normalizedError.severity];
  const showRetryButton = showRetry && normalizedError.retryable && onRetry;
  const showRetryProgress = retryAttempt !== undefined && maxRetryAttempts !== undefined;
  
  if (compact) {
    return (
      <div
        className={`error-display error-display--compact ${className}`}
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: colors.bg,
          borderRadius: '6px',
          border: `1px solid ${colors.border}`,
        }}
        data-testid="error-display"
        data-severity={normalizedError.severity}
      >
        <span aria-hidden="true">{icon}</span>
        <span
          style={{
            color: colors.text,
            fontSize: '13px',
            flex: 1,
          }}
        >
          {normalizedError.message}
        </span>
        {showRetryButton && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text,
              fontSize: '12px',
              padding: '4px 8px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.6 : 1,
            }}
            aria-label="Retry"
          >
            {isRetrying ? '...' : 'Retry'}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.text,
              cursor: 'pointer',
              padding: '2px',
              fontSize: '14px',
              lineHeight: 1,
            }}
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
      className={`error-display ${className}`}
      role="alert"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '400px',
      }}
      data-testid="error-display"
      data-severity={normalizedError.severity}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        
        <div style={{ flex: 1 }}>
          {/* Error Title */}
          <p
            style={{
              color: colors.text,
              fontSize: '15px',
              fontWeight: '600',
              margin: 0,
              marginBottom: '6px',
            }}
          >
            {normalizedError.severity === 'info' ? 'Notice' : 
             normalizedError.severity === 'warning' ? 'Warning' :
             normalizedError.severity === 'critical' ? 'Critical Error' : 'Error'}
          </p>
          
          {/* Error Message */}
          <p
            style={{
              color: '#ffffff',
              fontSize: '14px',
              margin: 0,
              marginBottom: normalizedError.suggestedAction ? '8px' : '12px',
              opacity: 0.9,
            }}
          >
            {normalizedError.message}
          </p>
          
          {/* Suggested Action */}
          {normalizedError.suggestedAction && (
            <p
              style={{
                color: '#888888',
                fontSize: '13px',
                margin: 0,
                marginBottom: '12px',
                fontStyle: 'italic',
              }}
            >
              {normalizedError.suggestedAction}
            </p>
          )}
          
          {/* Retry Progress */}
          {showRetryProgress && isRetrying && (
            <p
              style={{
                color: '#888888',
                fontSize: '12px',
                margin: 0,
                marginBottom: '12px',
              }}
            >
              Retry attempt {retryAttempt} of {maxRetryAttempts}...
            </p>
          )}
          
          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            {showRetryButton && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: FLOW_GREEN,
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  opacity: isRetrying ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                aria-label="Retry operation"
              >
                {isRetrying && (
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #000000',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                    aria-hidden="true"
                  />
                )}
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={handleDismiss}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #666666',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                }}
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        
        {/* Close button (top right) */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#666666',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '18px',
              lineHeight: 1,
              marginTop: '-4px',
              marginRight: '-4px',
            }}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
      
      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ErrorDisplay;
