'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

/**
 * Props for the WalletButton component
 */
export interface WalletButtonProps {
  /** Callback when wallet connects successfully */
  onConnect?: () => void;
  /** Callback when wallet disconnects */
  onDisconnect?: () => void;
  /** Connected wallet address (optional, uses hook if not provided) */
  address?: string | null;
  /** Wallet FLOW balance (optional) */
  balance?: number | null;
  /** Error message to display (optional, uses hook if not provided) */
  error?: string | null;
  /** Whether the wallet is connecting (optional, uses hook if not provided) */
  isConnecting?: boolean;
}

/**
 * Flow green color used throughout the component
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Error red color for error states
 */
const ERROR_RED = '#ff6b6b';

/**
 * Truncates a Flow address for display
 * Example: 0x1234567890abcdef -> 0x1234...cdef
 */
export function truncateAddress(address: string): string {
  if (!address || address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a FLOW balance for display
 * Shows up to 4 decimal places
 */
export function formatBalance(balance: number | null): string {
  if (balance === null || balance === undefined) return '0.0000';
  return balance.toFixed(4);
}

/**
 * WalletButton component for Flow wallet connection
 * 
 * Displays a connect button when disconnected, and shows the
 * wallet address and balance when connected with a disconnect option.
 * 
 * Features:
 * - Loading state during connection
 * - Error display with retry button
 * - Auto-dismiss errors after 5 seconds
 * 
 * Uses Flow's green color scheme (#00EF8B) for styling.
 * 
 * @example
 * ```tsx
 * <WalletButton 
 *   onConnect={() => console.log('Connected!')}
 *   onDisconnect={() => console.log('Disconnected!')}
 *   balance={10.5}
 * />
 * ```
 * 
 * Requirements: 1.4
 */
export function WalletButton({
  onConnect,
  onDisconnect,
  address: propAddress,
  balance,
  error: propError,
  isConnecting: propIsConnecting,
}: WalletButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Use useWallet hook for authentication with error handling
  const wallet = useWallet();
  
  // Use prop values if provided, otherwise use hook values
  const address = propAddress !== undefined ? propAddress : wallet.address;
  const error = propError !== undefined ? propError : wallet.error;
  const isConnecting = propIsConnecting !== undefined ? propIsConnecting : wallet.isConnecting;
  const isConnected = !!address;

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error && propError === undefined) {
      const timer = setTimeout(() => {
        wallet.clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, propError, wallet]);

  const handleConnect = async () => {
    await wallet.connect();
    if (wallet.connected) {
      onConnect?.();
    }
  };

  const handleRetry = async () => {
    wallet.clearError();
    await handleConnect();
  };

  const handleDismissError = () => {
    wallet.clearError();
  };

  const handleDisconnect = () => {
    wallet.disconnect();
    setShowDropdown(false);
    onDisconnect?.();
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Error state - show error message with retry button
  if (error && !isConnected) {
    return (
      <div
        className="wallet-button-error-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          className="wallet-error-message"
          role="alert"
          style={{
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            border: `1px solid ${ERROR_RED}`,
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '300px',
          }}
        >
          <span
            style={{
              color: ERROR_RED,
              fontSize: '14px',
              flex: 1,
            }}
          >
            {error}
          </span>
          <button
            onClick={handleDismissError}
            className="error-dismiss-button"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: ERROR_RED,
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
              lineHeight: 1,
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
        <button
          onClick={handleRetry}
          disabled={isConnecting}
          className="wallet-button wallet-button--retry"
          style={{
            backgroundColor: FLOW_GREEN,
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            opacity: isConnecting ? 0.7 : 1,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isConnecting) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = isConnecting ? '0.7' : '1';
          }}
          aria-label="Retry wallet connection"
        >
          {isConnecting ? 'Connecting...' : 'Retry Connection'}
        </button>
      </div>
    );
  }

  // Disconnected state - show connect button with loading state
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="wallet-button wallet-button--connect"
        style={{
          backgroundColor: FLOW_GREEN,
          color: '#000000',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          opacity: isConnecting ? 0.7 : 1,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          if (!isConnecting) {
            e.currentTarget.style.opacity = '0.9';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = isConnecting ? '0.7' : '1';
        }}
        aria-label={isConnecting ? 'Connecting wallet' : 'Connect wallet'}
        aria-busy={isConnecting}
      >
        {isConnecting && (
          <span
            className="loading-spinner"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid #000000',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  // Connected state - show address, balance, and disconnect option
  return (
    <div 
      className="wallet-button-container"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        onClick={toggleDropdown}
        className="wallet-button wallet-button--connected"
        style={{
          backgroundColor: 'transparent',
          color: FLOW_GREEN,
          border: `2px solid ${FLOW_GREEN}`,
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 239, 139, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-expanded={showDropdown}
        aria-haspopup="true"
        aria-label={`Wallet ${truncateAddress(address)}`}
      >
        <span 
          className="network-indicator"
          style={{ 
            color: '#ffa500',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          TESTNET
        </span>
        <span 
          className="wallet-address"
          style={{ fontFamily: 'monospace' }}
        >
          {truncateAddress(address)}
        </span>
        <span 
          className="wallet-balance"
          style={{ 
            color: '#ffffff',
            backgroundColor: FLOW_GREEN,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {formatBalance(balance ?? null)} FLOW
        </span>
        <span 
          className="dropdown-arrow"
          style={{
            marginLeft: '4px',
            transition: 'transform 0.2s ease',
            transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {showDropdown && (
        <div
          className="wallet-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '8px',
            backgroundColor: '#1a1a1a',
            border: `1px solid ${FLOW_GREEN}`,
            borderRadius: '8px',
            overflow: 'hidden',
            minWidth: '160px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            onClick={handleDisconnect}
            className="disconnect-button"
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: '#ff6b6b',
              border: 'none',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default WalletButton;
