/**
 * Tests for useRevealGame hook
 *
 * Tests the game reveal flow including:
 * - Successful game reveal
 * - Transaction confirmation handling
 * - GameInitData parsing from events
 * - Error handling for various failure scenarios
 * - Game state updates on success
 *
 * Requirements: 3.1, 3.6, 4.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRevealGame } from './useRevealGame';
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

/**
 * Create mock GameRevealed event data
 */
function createMockGameRevealedEvent(overrides?: {
  receiptId?: string;
  seed?: string;
  objects?: Array<{
    objectType: string;
    x: string;
    y: string;
    vx: string;
    vy: string;
  }>;
}) {
  const defaultObjects = [
    { objectType: '0', x: '100.0', y: '100.0', vx: '50.0', vy: '30.0' },
    { objectType: '0', x: '200.0', y: '150.0', vx: '-40.0', vy: '20.0' },
    { objectType: '1', x: '300.0', y: '200.0', vx: '30.0', vy: '-50.0' },
    { objectType: '1', x: '400.0', y: '250.0', vx: '-20.0', vy: '-40.0' },
    { objectType: '2', x: '500.0', y: '300.0', vx: '60.0', vy: '10.0' },
    { objectType: '2', x: '600.0', y: '350.0', vx: '-30.0', vy: '45.0' },
  ];

  return {
    type: 'A.0x1234.FlowShambo.GameRevealed',
    data: {
      receiptId: overrides?.receiptId ?? '42',
      seed: overrides?.seed ?? '123456789012345678901234567890',
      objects: overrides?.objects ?? defaultObjects,
    },
  };
}

describe('useRevealGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset game store and set to committed phase (ready for reveal)
    useGameStore.getState().resetGame();
    useGameStore.getState().commitBet('rock', 1.0, '42');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with isRevealing false', () => {
      const { result } = renderHook(() => useRevealGame());

      expect(result.current.isRevealing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.transactionId).toBeNull();
      expect(typeof result.current.revealGame).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('successful game reveal', () => {
    it('should reveal game and update game state on success', async () => {
      const mockTxId = 'mock-reveal-tx-id-123';

      mockMutate.mockResolvedValue(mockTxId);
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        errorMessage: '',
        events: [createMockGameRevealedEvent()],
      });

      const { result } = renderHook(() => useRevealGame());

      let revealResult: unknown;
      await act(async () => {
        revealResult = await result.current.revealGame();
      });

      // Verify transaction was submitted
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockTx).toHaveBeenCalledWith(mockTxId);
      expect(mockOnceSealed).toHaveBeenCalledTimes(1);

      // Verify result contains GameInitData
      expect(revealResult).toEqual({
        seed: '123456789012345678901234567890',
        objects: [
          { objectType: 0, x: 100.0, y: 100.0, vx: 50.0, vy: 30.0 },
          { objectType: 0, x: 200.0, y: 150.0, vx: -40.0, vy: 20.0 },
          { objectType: 1, x: 300.0, y: 200.0, vx: 30.0, vy: -50.0 },
          { objectType: 1, x: 400.0, y: 250.0, vx: -20.0, vy: -40.0 },
          { objectType: 2, x: 500.0, y: 300.0, vx: 60.0, vy: 10.0 },
          { objectType: 2, x: 600.0, y: 350.0, vx: -30.0, vy: 45.0 },
        ],
      });

      // Verify state updates
      expect(result.current.isRevealing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.transactionId).toBe(mockTxId);

      // Verify game store was updated to simulating phase
      const gameState = useGameStore.getState().game;
      expect(gameState.phase).toBe('simulating');
      expect(gameState.objects).toHaveLength(6);
    });

    it('should parse object types correctly', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          createMockGameRevealedEvent({
            objects: [
              { objectType: '0', x: '100.0', y: '100.0', vx: '50.0', vy: '30.0' }, // rock
              { objectType: '1', x: '200.0', y: '200.0', vx: '40.0', vy: '20.0' }, // paper
              { objectType: '2', x: '300.0', y: '300.0', vx: '30.0', vy: '10.0' }, // scissors
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      // Verify game objects have correct types
      const gameState = useGameStore.getState().game;
      expect(gameState.objects[0].type).toBe('rock');
      expect(gameState.objects[1].type).toBe('paper');
      expect(gameState.objects[2].type).toBe('scissors');
    });

    it('should parse negative velocities correctly', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          createMockGameRevealedEvent({
            objects: [
              { objectType: '0', x: '100.0', y: '100.0', vx: '-50.0', vy: '-30.0' },
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useRevealGame());

      let revealResult: { objects: Array<{ vx: number; vy: number }> } | null = null;
      await act(async () => {
        revealResult = await result.current.revealGame() as typeof revealResult;
      });

      expect(revealResult?.objects[0].vx).toBe(-50.0);
      expect(revealResult?.objects[0].vy).toBe(-30.0);
    });

    it('should assign unique IDs to game objects', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [createMockGameRevealedEvent()],
      });

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      const gameState = useGameStore.getState().game;
      const ids = gameState.objects.map((obj) => obj.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('loading state', () => {
    it('should set isRevealing to true while transaction is pending', async () => {
      let resolveTransaction: (value: unknown) => void;
      const transactionPromise = new Promise((resolve) => {
        resolveTransaction = resolve;
      });

      mockMutate.mockReturnValue(transactionPromise);

      const { result } = renderHook(() => useRevealGame());

      // Start the reveal
      let revealPromise: Promise<unknown>;
      act(() => {
        revealPromise = result.current.revealGame();
      });

      // Should be revealing
      await waitFor(() => {
        expect(result.current.isRevealing).toBe(true);
      });

      // Resolve the transaction
      await act(async () => {
        resolveTransaction!('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [createMockGameRevealedEvent()],
        });
        await revealPromise;
      });

      // Should no longer be revealing
      expect(result.current.isRevealing).toBe(false);
    });

    it('should prevent concurrent reveal attempts', async () => {
      let resolveTransaction: (value: unknown) => void;
      mockMutate.mockReturnValue(
        new Promise((resolve) => {
          resolveTransaction = resolve;
        })
      );

      const { result } = renderHook(() => useRevealGame());

      // Start first reveal
      act(() => {
        result.current.revealGame();
      });

      await waitFor(() => {
        expect(result.current.isRevealing).toBe(true);
      });

      // Try to reveal again while first is pending
      let secondResult: unknown;
      await act(async () => {
        secondResult = await result.current.revealGame();
      });

      // Second reveal should return null immediately
      expect(secondResult).toBeNull();
      // Only one mutate call should have been made
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle user rejection', async () => {
      mockMutate.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(() => useRevealGame());

      let revealResult: unknown;
      await act(async () => {
        revealResult = await result.current.revealGame();
      });

      expect(revealResult).toBeNull();
      expect(result.current.error).toBe('Transaction was cancelled');
      expect(result.current.isRevealing).toBe(false);
    });

    it('should handle no receipt found error', async () => {
      mockMutate.mockRejectedValue(new Error('No receipt found in storage'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('No bet found. Please place a bet first.');
    });

    it('should handle already revealed error', async () => {
      mockMutate.mockRejectedValue(new Error('Game has already revealed'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('Game has already been revealed');
    });

    it('should handle reveal too early error', async () => {
      mockMutate.mockRejectedValue(new Error('Cannot reveal in same block'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('Please wait for the next block before revealing');
    });

    it('should handle network error', async () => {
      mockMutate.mockRejectedValue(new Error('Network connection failed'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
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

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('Transaction execution failed');
    });

    it('should handle missing GameRevealed event', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [], // No events
      });

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('Failed to parse game reveal event');
    });

    it('should handle generic errors', async () => {
      mockMutate.mockRejectedValue(new Error('Unknown error occurred'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('Unknown error occurred');
    });

    it('should handle non-Error exceptions', async () => {
      mockMutate.mockRejectedValue('String error');

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      expect(result.current.error).toBe('Failed to reveal game');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockMutate.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
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

      const { result } = renderHook(() => useRevealGame());

      // Start reveal
      act(() => {
        result.current.revealGame();
      });

      // Check loading state
      await waitFor(() => {
        const uiState = useGameStore.getState().ui;
        expect(uiState.loading).toBe(true);
        expect(uiState.loadingType).toBe('revealing-game');
      });

      // Complete transaction
      await act(async () => {
        resolveTransaction!('tx-id');
        mockOnceSealed.mockResolvedValue({
          statusCode: 0,
          events: [createMockGameRevealedEvent()],
        });
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isRevealing).toBe(false);
      });
    });

    it('should update game store error state on failure', async () => {
      mockMutate.mockRejectedValue(new Error('Reveal failed'));

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      const uiState = useGameStore.getState().ui;
      expect(uiState.error).toBe('Reveal failed');
      expect(uiState.loading).toBe(false);
    });

    it('should transition game phase from committed to simulating', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [createMockGameRevealedEvent()],
      });

      // Verify initial phase is committed
      expect(useGameStore.getState().game.phase).toBe('committed');

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      // Verify phase transitioned to simulating
      expect(useGameStore.getState().game.phase).toBe('simulating');
    });

    it('should populate game objects with correct properties', async () => {
      mockMutate.mockResolvedValue('tx-id');
      mockOnceSealed.mockResolvedValue({
        statusCode: 0,
        events: [
          createMockGameRevealedEvent({
            objects: [
              { objectType: '0', x: '150.5', y: '200.25', vx: '45.0', vy: '-35.5' },
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useRevealGame());

      await act(async () => {
        await result.current.revealGame();
      });

      const gameState = useGameStore.getState().game;
      const obj = gameState.objects[0];

      expect(obj.id).toBe('obj-0');
      expect(obj.type).toBe('rock');
      expect(obj.x).toBe(150.5);
      expect(obj.y).toBe(200.25);
      expect(obj.vx).toBe(45.0);
      expect(obj.vy).toBe(-35.5);
      expect(obj.radius).toBe(15); // Default radius
    });
  });
});
