'use client';

import { useMemo } from 'react';
import { useFlowAccount } from '@onflow/react-sdk';

/**
 * Balance hook return type
 */
export interface UseBalanceResult {
  /** The FLOW balance in decimal format (e.g., 10.5 FLOW) */
  balance: number | null;
  /** The raw balance in smallest units (10^-8 FLOW) */
  rawBalance: number | null;
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
 * @param rawBalance - Balance in smallest units (10^-8 FLOW)
 * @returns Balance in decimal FLOW
 */
export function rawBalanceToFlow(rawBalance: number): number {
  return rawBalance / 100_000_000;
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
 * Uses the useFlowAccount hook to fetch account data and extracts
 * the FLOW balance. The balance is automatically converted from
 * the raw format (10^-8 FLOW) to decimal format.
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
  const {
    data: account,
    isLoading,
    isError,
    error,
    refetch,
  } = useFlowAccount({
    address: address ?? undefined,
    query: {
      enabled: !!address,
      staleTime: 10_000, // Consider balance stale after 10 seconds
      refetchInterval: 30_000, // Auto-refetch every 30 seconds
    },
  });

  // Convert raw balance to decimal FLOW
  const balance = useMemo(() => {
    if (account?.balance === undefined || account?.balance === null) return null;
    return rawBalanceToFlow(account.balance);
  }, [account?.balance]);

  const rawBalance = account?.balance ?? null;

  return {
    balance,
    rawBalance,
    isLoading,
    isError,
    error: error ?? null,
    refetch,
  };
}

export default useBalance;
