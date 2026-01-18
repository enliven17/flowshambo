'use client';

import { useState, useEffect, useCallback } from 'react';
import * as fcl from '@onflow/fcl';

/**
 * Balance hook return type
 */
export interface UseBalanceResult {
  /** The FLOW balance in decimal format (e.g., 10.5 FLOW) */
  balance: number | null;
  /** The raw balance in smallest units (10^-8 FLOW) */
  rawBalance: string | null;
  /** Whether the balance is currently loading */
  isLoading: boolean;
  /** Whether there was an error fetching the balance */
  isError: boolean;
  /** Error object if fetch failed */
  error: Error | null;
  /** Refetch the balance */
  refetch: () => void;
}

/**
 * Converts raw FLOW balance (in 10^-8 units) to decimal FLOW
 * 
 * @param rawBalance - Balance in smallest units (10^-8 FLOW) as string
 * @returns Balance in decimal FLOW
 */
export function rawBalanceToFlow(rawBalance: string): number {
  const balanceNum = parseFloat(rawBalance);
  return balanceNum / 100_000_000;
}

/**
 * Converts decimal FLOW to raw balance (in 10^-8 units)
 * 
 * @param flowBalance - Balance in decimal FLOW
 * @returns Balance in smallest units (10^-8 FLOW)
 */
export function flowToRawBalance(flowBalance: number): number {
  return Math.floor(flowBalance * 100_000_000);
}

/**
 * useBalance hook - Fetches FLOW balance for a given address
 * 
 * Uses FCL to query account data and extracts the FLOW balance.
 * The balance is automatically converted from the raw format (10^-8 FLOW) to decimal format.
 * 
 * @example
 * ```tsx
 * function BalanceDisplay({ address }: { address: string }) {
 *   const { balance, isLoading, isError, refetch } = useBalance(address);
 *   
 *   if (isLoading) return <span>Loading...</span>;
 *   if (isError) return <span>Error loading balance</span>;
 *   
 *   return (
 *     <div>
 *       <span>{balance?.toFixed(4)} FLOW</span>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @param address - Flow wallet address to fetch balance for
 * @returns {UseBalanceResult} Balance state and actions
 * 
 * Requirements: 1.3
 */
export function useBalance(address: string | null | undefined): UseBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [rawBalance, setRawBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      setRawBalance(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Query account using FCL
      const account = await fcl.account(address);
      
      if (account && account.balance !== undefined) {
        const rawBal = account.balance.toString();
        setRawBalance(rawBal);
        setBalance(rawBalanceToFlow(rawBal));
      } else {
        setBalance(null);
        setRawBalance(null);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch balance'));
      setBalance(null);
      setRawBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch balance on mount and when address changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refetch every 30 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 30_000);

    return () => clearInterval(interval);
  }, [address, fetchBalance]);

  return {
    balance,
    rawBalance,
    isLoading,
    isError,
    error,
    refetch: fetchBalance,
  };
}

export default useBalance;
