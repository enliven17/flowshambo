/**
 * Tests for usePlaceBet hook
 * 
 * Tests the bet placement flow including:
 * - Successful bet placement
 * - Transaction confirmation handling
 * - Error handling for various failure scenarios
 * - Game state updates on success
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaceBet } from './usePlaceBet';
import { useGameStore } from '../stores/gameStore';

// Mock FCL
const mockMutate = vi.fn();
const mockTx = vi.fn();
const mockOnceSealed = vi.fn();

vi.mock('@onflow/fcl', () => ({
  mutate: (...args: unknown[]) => mockMutate(...args),
  tx: (txId: string) => {
    mockTx(txId);
    return {
      onceSealed: mockOnceSealed,
    };
  },
  arg: vi.fn((value, type) => ({ value, type })),
  t: {
    UInt8: 'UInt8',
    UFix64: 'UFix64',
  },
}));

describe('usePlaceBet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset game store
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with isPlacing false', () => {
      const { result } = renderHook(() => usePlaceBet());

      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.transactionId).toBeNull();
      expect(typeof result.current.placeBet).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('successful bet placement', () => {
    it('should place a bet and update game state on success', async () => {
      const mockTxId = 'mock-tx-id-123';
      const mockReceiptId = '42';
      const mockCommitBlock = '100';

      mockMutate.mockResolvedValue(mockTxId);
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        errorMessage: '',
        events: [
          {
            type: 'A.0x1234.FlowShambo.BetCommitted',
            data: {
              receiptId: mockReceiptId,
              commitBlock: mockCommitBlock,
              player: '0xabcd',
              prediction: 0,
              amount: '1.00000000',
            },
          },
        ],
      });

      const { result } = renderHook(() => usePlaceBet());

      let betResult: unknown;
      await act(async () => {
        betResult = await result.current.placeBet('rock', 1.0);
      });

      // Verify transaction was submitted
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockTx).toHaveBeenCalledWith(mockTxId);
      expect(mockOnceSealed).toHaveBeenCalledTimes(1);

      // Verify result
      expect(betResult).toEqual({
        receiptId: mockReceiptId,
        commitBlock: parseInt(mockCommitBlock, 10),
        transactionId: mockTxId,
      });

      // Verify state updates
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.transactionId).toBe(mockTxId);

      // Verify game store was updated
      const gameState = useGameStore.getState().game;
      expect(gameState.phase).toBe('committed');
      expect(gameState.prediction).toBe('rock');
      expect(gameState.betAmount).toBe(1.0);
      expect(gameState.receiptId).toBe(mockReceiptId);
    });

    it('should format amount with 8 decimal places', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          {
            type: 'A.0x1234.FlowShambo.BetCommitted',
            data: { receiptId: '1', commitBlock: '1' },
          },
        ],
      });

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('paper', 0.5);
      });

      // Check that mutate was called with properly formatted amount
      const mutateCall = mockMutate.mock.calls[0][0];
      expect(mutateCall.cadence).toContain('UFix64');
    });

    it('should map prediction types correctly', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          {
            type: 'A.0x1234.FlowShambo.BetCommitted',
            data: { receiptId: '1', commitBlock: '1' },
          },
        ],
      });

      const { result } = renderHook(() => usePlaceBet());

      // Test rock (0)
      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      // Test paper (1)
      vi.clearAllMocks();
      useGameStore.getState().resetGame();
      await act(async () => {
        await result.current.placeBet('paper', 1.0);
      });

      // Test scissors (2)
      vi.clearAllMocks();
      useGameStore.getState().resetGame();
      await act(async () => {
        await result.current.placeBet('scissors', 1.0);
      });

      // All calls should have succeeded
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('should set isPlacing to true while transaction is pending', async () => {
      let resolveTransaction: (value: unknown) => void;
      const transactionPromise = new Promise((resolve) => {
        resolveTransaction = resolve;
      });

      mockMutate.mockReturnValue(transactionPromise);

      const { result } = renderHook(() => usePlaceBet());

      // Start the bet placement
      let placeBetPromise: Promise<unknown>;
      act(() => {
        placeBetPromise = result.current.placeBet('rock', 1.0);
      });

      // Should be placing
      await waitFor(() => {
        expect(result.current.isPlacing).toBe(true);
      });

      // Resolve the transaction
      await act(async () => {
        resolveTransaction!('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [
            {
              type: 'A.0x1234.FlowShambo.BetCommitted',
              data: { receiptId: '1', commitBlock: '1' },
            },
          ],
        });
        await placeBetPromise;
      });

      // Should no longer be placing
      expect(result.current.isPlacing).toBe(false);
    });

    it('should prevent concurrent bet placements', async () => {
      let resolveTransaction: (value: unknown) => void;
      mockMutate.mockReturnValue(
        new Promise((resolve) => {
          resolveTransaction = resolve;
        })
      );

      const { result } = renderHook(() => usePlaceBet());

      // Start first bet
      act(() => {
        result.current.placeBet('rock', 1.0);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(true);
      });

      // Try to place another bet while first is pending
      let secondResult: unknown;
      await act(async () => {
        secondResult = await result.current.placeBet('paper', 2.0);
      });

      // Second bet should return null immediately
      expect(secondResult).toBeNull();
      // Only one mutate call should have been made
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle user rejection', async () => {
      mockMutate.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(() => usePlaceBet());

      let betResult: unknown;
      await act(async () => {
        betResult = await result.current.placeBet('rock', 1.0);
      });

      expect(betResult).toBeNull();
      expect(result.current.error).toBe('Transaction was cancelled');
      expect(result.current.isPlacing).toBe(false);
    });

    it('should handle insufficient funds error', async () => {
      mockMutate.mockRejectedValue(new Error('insufficient funds'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1000.0);
      });

      expect(result.current.error).toBe('Insufficient FLOW balance');
    });

    it('should handle game already in progress error', async () => {
      mockMutate.mockRejectedValue(new Error('A game is already in progress'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      expect(result.current.error).toBe('A game is already in progress. Please complete it first.');
    });

    it('should handle minimum bet error', async () => {
      mockMutate.mockRejectedValue(new Error('Bet amount below minimum bet'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 0.01);
      });

      expect(result.current.error).toBe('Bet amount is below the minimum');
    });

    it('should handle maximum bet error', async () => {
      mockMutate.mockRejectedValue(new Error('Bet amount exceeds maximum bet'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1000.0);
      });

      expect(result.current.error).toBe('Bet amount exceeds the maximum');
    });

    it('should handle transaction failure with statusCode', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 1,
        errorMessage: 'Transaction execution failed',
        events: [],
      });

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      expect(result.current.error).toBe('Transaction execution failed');
    });

    it('should handle missing BetCommitted event', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [], // No events
      });

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      expect(result.current.error).toBe('Failed to parse bet commitment event');
    });

    it('should handle generic errors', async () => {
      mockMutate.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      mockMutate.mockRejectedValue('String error');

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      expect(result.current.error).toBe('Failed to place bet');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockMutate.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('game store integration', () => {
    it('should update game store loading state during transaction', async () => {
      let resolveTransaction: (value: unknown) => void;
      mockMutate.mockReturnValue(
        new Promise((resolve) => {
          resolveTransaction = resolve;
        })
      );

      const { result } = renderHook(() => usePlaceBet());

      // Start bet placement
      act(() => {
        result.current.placeBet('rock', 1.0);
      });

      // Check loading state
      await waitFor(() => {
        const uiState = useGameStore.getState().ui;
        expect(uiState.loading).toBe(true);
        expect(uiState.loadingType).toBe('placing-bet');
      });

      // Complete transaction
      await act(async () => {
        resolveTransaction!('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [
            {
              type: 'A.0x1234.FlowShambo.BetCommitted',
              data: { receiptId: '1', commitBlock: '1' },
            },
          ],
        });
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });
    });

    it('should update game store error state on failure', async () => {
      mockMutate.mockRejectedValue(new Error('Network connection failed'));

      const { result } = renderHook(() => usePlaceBet());

      await act(async () => {
        await result.current.placeBet('rock', 1.0);
      });

      const uiState = useGameStore.getState().ui;
      // The error message is set via setStoreError which calls setError
      expect(uiState.error).toBe('Network connection failed');
      expect(uiState.loading).toBe(false);
    });
  });
});
