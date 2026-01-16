/**
 * Tests for useSettleGame hook
 *
 * Tests the game settlement flow including:
 * - Successful game settlement
 * - Transaction confirmation handling
 * - GameSettled event parsing
 * - Payout calculation and transfer
 * - Error handling for various failure scenarios
 * - Game state updates on success
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettleGame, type SettlementResult } from './useSettleGame';
import { useGameStore } from '../stores/gameStore';
import { PAYOUT_MULTIPLIER } from '../lib/betting/settlement';

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

/**
 * Create mock GameSettled event data
 */
function createMockGameSettledEvent(overrides?: {
  receiptId?: string;
  winningType?: string;
  playerWon?: boolean;
  payout?: string;
}) {
  return {
    type: 'A.0x1234.FlowShambo.GameSettled',
    data: {
      receiptId: overrides?.receiptId ?? '42',
      winningType: overrides?.winningType ?? '0',
      playerWon: overrides?.playerWon ?? true,
      payout: overrides?.payout ?? '25.00000000',
    },
  };
}

describe('useSettleGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset game store and set to simulating phase with a bet
    useGameStore.getState().resetGame();
    useGameStore.getState().commitBet('rock', 10.0, '42');
    useGameStore.getState().startSimulation([
      { id: 'obj-0', type: 'rock', x: 100, y: 100, vx: 50, vy: 30, radius: 15 },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with isSettling false', () => {
      const { result } = renderHook(() => useSettleGame());

      expect(result.current.isSettling).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.transactionId).toBeNull();
      expect(result.current.settlementResult).toBeNull();
      expect(typeof result.current.settleGame).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('successful game settlement', () => {
    it('should settle game and update game state on win', async () => {
      const mockTxId = 'mock-settle-tx-id-123';

      mockMutate.mockResolvedValue(mockTxId);
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        errorMessage: '',
        events: [
          createMockGameSettledEvent({
            playerWon: true,
            payout: '25.00000000',
          }),
        ],
      });

      const { result } = renderHook(() => useSettleGame());

      let settleResult: unknown;
      await act(async () => {
        settleResult = await result.current.settleGame('rock');
      });

      // Verify transaction was submitted
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockTx).toHaveBeenCalledWith(mockTxId);
      expect(mockOnceSealed).toHaveBeenCalledTimes(1);

      // Verify result
      expect(settleResult).toEqual({
        playerWon: true,
        payout: 25.0,
        winningType: 'rock',
        transactionId: mockTxId,
      });

      // Verify state updates
      expect(result.current.isSettling).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.transactionId).toBe(mockTxId);
      expect(result.current.settlementResult).toEqual({
        playerWon: true,
        payout: 25.0,
        winningType: 'rock',
        transactionId: mockTxId,
      });

      // Verify game store was updated to settled phase
      const gameState = useGameStore.getState().game;
      expect(gameState.phase).toBe('settled');
      expect(gameState.winner).toBe('rock');
      expect(gameState.playerWon).toBe(true);
    });

    it('should settle game and update game state on loss', async () => {
      const mockTxId = 'mock-settle-tx-id-456';

      mockMutate.mockResolvedValue(mockTxId);
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        errorMessage: '',
        events: [
          createMockGameSettledEvent({
            winningType: '1', // paper
            playerWon: false,
            payout: '0.00000000',
          }),
        ],
      });

      const { result } = renderHook(() => useSettleGame());

      let settleResult: unknown;
      await act(async () => {
        settleResult = await result.current.settleGame('paper'); // Player bet rock, paper won
      });

      // Verify result
      expect(settleResult).toEqual({
        playerWon: false,
        payout: 0,
        winningType: 'paper',
        transactionId: mockTxId,
      });

      // Verify game store was updated
      const gameState = useGameStore.getState().game;
      expect(gameState.phase).toBe('settled');
      expect(gameState.winner).toBe('paper');
      expect(gameState.playerWon).toBe(false);
    });

    it('should calculate payout correctly when event is missing', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [], // No events
      });

      // Set up a bet with known values
      useGameStore.getState().resetGame();
      useGameStore.getState().commitBet('rock', 10.0, '42');
      useGameStore.getState().startSimulation([]);

      const { result } = renderHook(() => useSettleGame());

      let settleResult: SettlementResult | null = null;
      await act(async () => {
        settleResult = await result.current.settleGame('rock');
      });

      // Should calculate payout based on bet amount and multiplier
      expect(settleResult).not.toBeNull();
      expect(settleResult!.playerWon).toBe(true);
      expect(settleResult!.payout).toBe(10.0 * PAYOUT_MULTIPLIER);
    });

    it('should handle all winning types correctly', async () => {
      const winningTypes = ['rock', 'paper', 'scissors'] as const;
      const typeValues = { rock: 0, paper: 1, scissors: 2 };

      for (const winningType of winningTypes) {
        vi.clearAllMocks();
        mockMutate.mockResolvedValue('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [
            createMockGameSettledEvent({
              winningType: typeValues[winningType].toString(),
            }),
          ],
        });

        const { result } = renderHook(() => useSettleGame());

        await act(async () => {
          await result.current.settleGame(winningType);
        });

        // Verify the correct type value was sent
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.any(Function),
          })
        );
      }
    });
  });

  describe('loading state', () => {
    it('should set isSettling to true while transaction is pending', async () => {
      let resolveTransaction: (value: unknown) => void;
      const transactionPromise = new Promise((resolve) => {
        resolveTransaction = resolve;
      });

      mockMutate.mockReturnValue(transactionPromise);

      const { result } = renderHook(() => useSettleGame());

      // Start the settlement
      let settlePromise: Promise<unknown>;
      act(() => {
        settlePromise = result.current.settleGame('rock');
      });

      // Should be settling
      await waitFor(() => {
        expect(result.current.isSettling).toBe(true);
      });

      // Resolve the transaction
      await act(async () => {
        resolveTransaction!('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [createMockGameSettledEvent()],
        });
        await settlePromise;
      });

      // Should no longer be settling
      expect(result.current.isSettling).toBe(false);
    });

    it('should prevent concurrent settlement attempts', async () => {
      let resolveTransaction: (value: unknown) => void;
      mockMutate.mockReturnValue(
        new Promise((resolve) => {
          resolveTransaction = resolve;
        })
      );

      const { result } = renderHook(() => useSettleGame());

      // Start first settlement
      act(() => {
        result.current.settleGame('rock');
      });

      await waitFor(() => {
        expect(result.current.isSettling).toBe(true);
      });

      // Try to settle again while first is pending
      let secondResult: unknown;
      await act(async () => {
        secondResult = await result.current.settleGame('rock');
      });

      // Second settlement should return null immediately
      expect(secondResult).toBeNull();
      // Only one mutate call should have been made
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle user rejection', async () => {
      mockMutate.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(() => useSettleGame());

      let settleResult: unknown;
      await act(async () => {
        settleResult = await result.current.settleGame('rock');
      });

      expect(settleResult).toBeNull();
      expect(result.current.error).toBe('Transaction was cancelled');
      expect(result.current.isSettling).toBe(false);
    });

    it('should handle no receipt found error', async () => {
      mockMutate.mockRejectedValue(new Error('No receipt found in storage'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('No game found to settle. Please start a new game.');
    });

    it('should handle not revealed error', async () => {
      mockMutate.mockRejectedValue(new Error('Game has not revealed yet'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('Game has not been revealed yet');
    });

    it('should handle already settled error', async () => {
      mockMutate.mockRejectedValue(new Error('Game has already settled'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('Game has already been settled');
    });

    it('should handle network error', async () => {
      mockMutate.mockRejectedValue(new Error('Network connection failed'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('Network error. Please try again.');
    });

    it('should handle transaction failure with statusCode', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 1,
        errorMessage: 'Transaction execution failed',
        events: [],
      });

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('Transaction execution failed');
    });

    it('should handle generic errors', async () => {
      mockMutate.mockRejectedValue(new Error('Unknown error occurred'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('Unknown error occurred');
    });

    it('should handle non-Error exceptions', async () => {
      mockMutate.mockRejectedValue('String error');

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      expect(result.current.error).toBe('Failed to settle game');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockMutate.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
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

      const { result } = renderHook(() => useSettleGame());

      // Start settlement
      act(() => {
        result.current.settleGame('rock');
      });

      // Check loading state
      await waitFor(() => {
        const uiState = useGameStore.getState().ui;
        expect(uiState.loading).toBe(true);
        expect(uiState.loadingType).toBe('settling-game');
      });

      // Complete transaction
      await act(async () => {
        resolveTransaction!('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [createMockGameSettledEvent()],
        });
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isSettling).toBe(false);
      });
    });

    it('should update game store error state on failure', async () => {
      mockMutate.mockRejectedValue(new Error('Settlement failed'));

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      const uiState = useGameStore.getState().ui;
      expect(uiState.error).toBe('Settlement failed');
      expect(uiState.loading).toBe(false);
    });

    it('should transition game phase from simulating to settled', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [createMockGameSettledEvent()],
      });

      // Verify initial phase is simulating
      expect(useGameStore.getState().game.phase).toBe('simulating');

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('rock');
      });

      // Verify phase transitioned to settled
      expect(useGameStore.getState().game.phase).toBe('settled');
    });

    it('should set winner and playerWon in game store', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          createMockGameSettledEvent({
            winningType: '2', // scissors
            playerWon: false,
            payout: '0.00000000',
          }),
        ],
      });

      const { result } = renderHook(() => useSettleGame());

      await act(async () => {
        await result.current.settleGame('scissors');
      });

      const gameState = useGameStore.getState().game;
      expect(gameState.winner).toBe('scissors');
      // Player bet rock, scissors won, so player lost
      expect(gameState.playerWon).toBe(false);
    });
  });

  describe('payout calculation', () => {
    it('should return correct payout for winning bet', async () => {
      // Set up a winning scenario
      useGameStore.getState().resetGame();
      useGameStore.getState().commitBet('rock', 10.0, '42');
      useGameStore.getState().startSimulation([]);

      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          createMockGameSettledEvent({
            winningType: '0', // rock
            playerWon: true,
            payout: '25.00000000', // 10 * 2.5
          }),
        ],
      });

      const { result } = renderHook(() => useSettleGame());

      let settleResult: SettlementResult | null = null;
      await act(async () => {
        settleResult = await result.current.settleGame('rock');
      });

      expect(settleResult).not.toBeNull();
      expect(settleResult!.payout).toBe(25.0);
    });

    it('should return zero payout for losing bet', async () => {
      // Set up a losing scenario
      useGameStore.getState().resetGame();
      useGameStore.getState().commitBet('rock', 10.0, '42');
      useGameStore.getState().startSimulation([]);

      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          createMockGameSettledEvent({
            winningType: '1', // paper
            playerWon: false,
            payout: '0.00000000',
          }),
        ],
      });

      const { result } = renderHook(() => useSettleGame());

      let settleResult: SettlementResult | null = null;
      await act(async () => {
        settleResult = await result.current.settleGame('paper');
      });

      expect(settleResult).not.toBeNull();
      expect(settleResult!.payout).toBe(0);
    });
  });
});
