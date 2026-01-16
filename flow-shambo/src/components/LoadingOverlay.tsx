'use client';

import type { LoadingType } from '../types';

/**
 * Flow green color used for the spinner
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Props for the LoadingOverlay component
 */
export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Type of loading operation for specific messaging */
  loadingType: LoadingType | null;
  /** Optional custom message to display */
  customMessage?: string;
}

/**
 * Get the display message for a loading type
 */
export function getLoadingMessage(loadingType: LoadingType | null): string {
  if (!loadingType) {
    return 'Loading...';
  }

  const messages: Record<LoadingType, string> = {
    'wallet-connecting': 'Connecting wallet...',
    'placing-bet': 'Placing your bet...',
    'revealing-game': 'Revealing game...',
    'settling-game': 'Settling game...',
    'fetching-balance': 'Fetching balance...',
  };

  return messages[loadingType] || 'Loading...';
}

/**
 * Get the subtitle message for a loading type
 */
export function getLoadingSubtitle(loadingType: LoadingType | null): string | null {
  if (!loadingType) {
    return null;
  }

  const subtitles: Partial<Record<LoadingType, string>> = {
    'placing-bet': 'Please confirm the transaction in your wallet',
    'revealing-game': 'Generating random positions from blockchain',
    'settling-game': 'Recording result on-chain',
  };

  return subtitles[loadingType] || null;
}

/**
 * LoadingOverlay component for full-screen loading states during transactions
 * 
 * Displays a centered loading spinner with Flow green color and
 * appropriate messaging based on the current loading operation.
 * 
 * Features:
 * - Full-screen overlay with semi-transparent background
 * - Animated Flow green spinner
 * - Context-aware loading messages
 * - Subtitle with additional context for transactions
 * 
 * @example
 * ```tsx
 * <LoadingOverlay
 *   isVisible={isLoading}
 *   loadingType="placing-bet"
 * />
 * ```
 * 
 * Requirements: 2.7
 */
export function LoadingOverlay({
  isVisible,
  loadingType,
  customMessage,
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  const message = customMessage || getLoadingMessage(loadingType);
  const subtitle = getLoadingSubtitle(loadingType);

  return (
    <div
      className="loading-overlay"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      {/* Spinner Container */}
      <div
        className="loading-spinner-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* Flow Green Spinner */}
        <div
          className="loading-spinner"
          style={{
            width: '64px',
            height: '64px',
            border: `4px solid rgba(0, 239, 139, 0.2)`,
            borderTopColor: FLOW_GREEN,
            borderRadius: '50%',
            animation: 'loading-spin 1s linear infinite',
          }}
          aria-hidden="true"
        />

        {/* Loading Message */}
        <div
          className="loading-message"
          style={{
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: FLOW_GREEN,
              fontSize: '20px',
              fontWeight: '600',
              margin: 0,
              marginBottom: subtitle ? '8px' : 0,
            }}
          >
            {message}
          </p>
          
          {subtitle && (
            <p
              className="loading-subtitle"
              style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '400',
                margin: 0,
                opacity: 0.8,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Pulsing dots animation for visual feedback */}
        <div
          className="loading-dots"
          style={{
            display: 'flex',
            gap: '8px',
          }}
          aria-hidden="true"
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: FLOW_GREEN,
                borderRadius: '50%',
                animation: `loading-pulse 1.4s ease-in-out ${index * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes loading-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes loading-pulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingOverlay;
