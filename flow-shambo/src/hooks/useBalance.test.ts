/**
 * useBalance Hook Tests
 * 
 * Tests for the useBalance hook covering:
 * - Balance fetching
 * - Balance conversion
 * - Loading and error states
 * - Refetch functionality
 * 
 * Requirements: 1.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBalance, rawBalanceToFlow, flowToRawBalance } from './useBalance';

// Mock account data
let mockAccountData: { balance: number } | null = null;
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();

vi.mock('@onflow/react-sdk', () => ({
  useFlowAccount: ({ address, query }: { address?: string; query?: { enabled?: boolean } }) => ({
    data: query?.enabled !== false ? mockAccountData : null,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    refetch: mockRefetch,
  }),
}));

describe('useBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountData = null;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
  });

  describe('Balance Fetching', () => {
    it('should return null balance when no address is provided', () => {
      const { result } = renderHook(() => useBalance(null));
      
      expect(result.current.balance).toBeNull();
      expect(result.current.rawBalance).toBeNull();
    });

    it('should return null balance when address is undefined', () => {
      const { result } = renderHook(() => useBalance(undefined));
      
      expect(result.current.balance).toBeNull();
      expect(result.current.rawBalance).toBeNull();
    });

    it('should return converted balance when account data is available', () => {
      // 10 FLOW = 1,000,000,000 raw units (10^8)
      mockAccountData = { balance: 1_000_000_000 };
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.balance).toBe(10);
      expect(result.current.rawBalance).toBe(1_000_000_000);
    });

    it('should handle fractional balances correctly', () => {
      // 10.5 FLOW = 1,050,000,000 raw units
      mockAccountData = { balance: 1_050_000_000 };
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.balance).toBe(10.5);
    });

    it('should handle very small balances', () => {
      // 0.00000001 FLOW = 1 raw unit
      mockAccountData = { balance: 1 };
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.balance).toBe(0.00000001);
    });

    it('should handle zero balance', () => {
      mockAccountData = { balance: 0 };
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.balance).toBe(0);
      expect(result.current.rawBalance).toBe(0);
    });
  });

  describe('Loading State', () => {
    it('should return isLoading true when fetching', () => {
      mockIsLoading = true;
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading false when fetch completes', () => {
      mockIsLoading = false;
      mockAccountData = { balance: 1_000_000_000 };
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error State', () => {
    it('should return error when fetch fails', () => {
      mockIsError = true;
      mockError = new Error('Network error');
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should return null error when fetch succeeds', () => {
      mockAccountData = { balance: 1_000_000_000 };
      
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Refetch', () => {
    it('should expose refetch function', () => {
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should call underlying refetch when invoked', () => {
      const { result } = renderHook(() => useBalance('0x1234567890abcdef'));
      
      result.current.refetch();
      
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('rawBalanceToFlow', () => {
  it('should convert raw balance to FLOW correctly', () => {
    expect(rawBalanceToFlow(100_000_000)).toBe(1);
    expect(rawBalanceToFlow(1_000_000_000)).toBe(10);
    expect(rawBalanceToFlow(50_000_000)).toBe(0.5);
    expect(rawBalanceToFlow(1)).toBe(0.00000001);
    expect(rawBalanceToFlow(0)).toBe(0);
  });

  it('should handle large balances', () => {
    // 1 million FLOW
    expect(rawBalanceToFlow(100_000_000_000_000)).toBe(1_000_000);
  });
});

describe('flowToRawBalance', () => {
  it('should convert FLOW to raw balance correctly', () => {
    expect(flowToRawBalance(1)).toBe(100_000_000);
    expect(flowToRawBalance(10)).toBe(1_000_000_000);
    expect(flowToRawBalance(0.5)).toBe(50_000_000);
    expect(flowToRawBalance(0)).toBe(0);
  });

  it('should floor fractional raw units', () => {
    // 0.000000001 FLOW would be 0.1 raw units, should floor to 0
    expect(flowToRawBalance(0.000000001)).toBe(0);
    // 0.000000015 FLOW would be 1.5 raw units, should floor to 1
    expect(flowToRawBalance(0.000000015)).toBe(1);
  });

  it('should handle large balances', () => {
    // 1 million FLOW
    expect(flowToRawBalance(1_000_000)).toBe(100_000_000_000_000);
  });
});
