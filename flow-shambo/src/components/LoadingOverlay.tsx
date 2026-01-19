'use client';

import type { LoadingType } from '../types';

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
  /** Optional callback to force cancel (e.g. for stuck states) */
  onCancel?: () => void;
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
 */
export function LoadingOverlay({
  isVisible,
  loadingType,
  customMessage,
  onCancel,
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  const message = customMessage || getLoadingMessage(loadingType);
  const subtitle = getLoadingSubtitle(loadingType);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
    >
      {/* Spinner Container */}
      <div className="flex flex-col items-center gap-6 animate-fade-in p-8 rounded-2xl">
        {/* Flow Green Spinner */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-flow-green/20 border-t-flow-green animate-spin shadow-[0_0_20px_rgba(0,239,139,0.2)]" />
          <div className="absolute inset-0 bg-flow-green/10 rounded-full blur-xl animate-pulse" />
        </div>

        {/* Loading Message */}
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-flow-green animate-pulse drop-shadow-[0_0_10px_rgba(0,239,139,0.3)]">
            {message}
          </p>

          {subtitle && (
            <p className="text-sm text-zinc-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Pulsing dots animation for visual feedback */}
        <div className="flex gap-2" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-flow-green"
              style={{
                animation: `pulse 1.4s ease-in-out ${index * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Force Cancel Button - For stuck states */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 text-xs text-zinc-500 border border-zinc-700 rounded-lg hover:text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900 transition-all"
          >
            Stuck? Force Cancel
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
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
