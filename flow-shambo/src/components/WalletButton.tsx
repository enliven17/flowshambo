'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

export interface WalletButtonProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  address?: string | null;
  balance?: number | null;
  error?: string | null;
  isConnecting?: boolean;
}

export function truncateAddress(address: string): string {
  if (!address || address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBalance(balance: number | null): string {
  if (balance === null || balance === undefined) return '0.0000';
  return balance.toFixed(4);
}

export function WalletButton({
  onConnect,
  onDisconnect,
  address: propAddress,
  balance,
  error: propError,
  isConnecting: propIsConnecting,
}: WalletButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const wallet = useWallet();

  const address = propAddress !== undefined ? propAddress : wallet.address;
  const error = propError !== undefined ? propError : wallet.error;
  const isConnecting = propIsConnecting !== undefined ? propIsConnecting : wallet.isConnecting;
  const isConnected = !!address;

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

  // Error state
  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500 rounded-lg px-4 py-2 max-w-xs transition-all hover:bg-red-500/20">
          <span className="text-red-500 text-sm font-medium flex-1">{error}</span>
          <button
            onClick={handleDismissError}
            className="text-red-500 hover:text-red-400 p-1 rounded-md transition-colors"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
        <button
          onClick={handleRetry}
          disabled={isConnecting}
          className="bg-flow-green text-black px-6 py-2 rounded-lg font-bold hover:bg-flow-green-hover disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-flow-green/25"
        >
          {isConnecting ? 'Connecting...' : 'Retry'}
        </button>
      </div>
    );
  }

  // Disconnected state
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="group relative overflow-hidden bg-flow-green text-black px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-base font-bold hover:bg-flow-green-hover disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(0,239,139,0.3)] hover:shadow-[0_0_25px_rgba(0,239,139,0.5)] active:scale-95"
      >
        <span className="relative z-10 flex items-center gap-1 sm:gap-2">
          {isConnecting && (
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          )}
          <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          <span className="sm:hidden">{isConnecting ? 'Connecting...' : 'Connect'}</span>
        </span>
      </button>
    );
  }

  // Connected state
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleDropdown}
        className={`
          flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm
          bg-zinc-900 border transition-all duration-200
          ${showDropdown
            ? 'border-flow-green shadow-[0_0_10px_rgba(0,239,139,0.2)]'
            : 'border-zinc-700 hover:border-flow-green/50 hover:bg-zinc-800'
          }
        `}
      >
        <span className="text-[8px] sm:text-[10px] font-bold text-amber-500 tracking-wider bg-amber-500/10 px-1 sm:px-1.5 py-0.5 rounded">
          TEST
        </span>
        <span className="font-mono text-zinc-300 text-[10px] sm:text-sm">
          {truncateAddress(address)}
        </span>
        <div className="hidden sm:flex px-2 py-0.5 bg-flow-green text-black text-xs font-bold rounded">
          {formatBalance(balance ?? null)} FLOW
        </div>
        <svg
          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 animate-scale-in origin-top-right overflow-hidden">
          <button
            onClick={handleDisconnect}
            className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

export default WalletButton;
