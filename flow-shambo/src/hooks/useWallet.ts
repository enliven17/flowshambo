'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFlowCurrentUser } from '@onflow/react-sdk';

/**
 * Wallet connection state
 */
export interface WalletState {
  /** Whether a wallet is currently connected */
  connected: boolean;
  /** The connected wallet address, or null if not connected */
  address: string | null;
  /** Whether the wallet is currently connecting */
  isConnecting: boolean;
  /** Whether the wallet is currently disconnecting */
  isDisconnecting: boolean;
  /** Error message if connection/disconnection failed */
  error: string | null;
}

/**
 * Wallet hook return type
 */
export interface UseWalletResult extends WalletState {
  /** Connect to a Flow wallet via FCL discovery */
  connect: () => Promise<void>;
  /** Disconnect the current wallet */
  disconnect: () => void;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * useWallet hook - Wraps useFlowCurrentUser for wallet connection management
 * 
 * Provides a simplified interface for:
 * - Connecting to Flow wallets via FCL discovery
 * - Disconnecting from wallets
 * - Tracking connection state
 * - Handling connection persistence across page refreshes
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { connected, address, connect, disconnect, isConnecting, error } = useWallet();
 *   
 *   if (!connected) {
 *     return <button onClick={connect} disabled={isConnecting}>Connect Wallet</button>;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Connected: {address}</p>
 *       <button onClick={disconnect}>Disconnect</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @returns {UseWalletResult} Wallet state and actions
 * 
 * Requirements: 1.3, 1.5
 */
export function useWallet(): UseWalletResult {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive connection state from user object
  const connected = !!user?.addr;
  const address = user?.addr ?? null;

  /**
   * Connect to a Flow wallet
   * Initiates FCL wallet discovery and handles the authentication flow
   */
  const connect = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      await authenticate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [authenticate, isConnecting]);

  /**
   * Disconnect the current wallet
   * Clears the FCL session and resets connection state
   */
  const disconnect = useCallback(() => {
    if (isDisconnecting) return;
    
    setIsDisconnecting(true);
    setError(null);
    
    try {
      unauthenticate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      console.error('Wallet disconnection error:', err);
    } finally {
      setIsDisconnecting(false);
    }
  }, [unauthenticate, isDisconnecting]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connected,
    address,
    isConnecting,
    isDisconnecting,
    error,
    connect,
    disconnect,
    clearError,
  };
}

export default useWallet;
