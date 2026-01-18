'use client';

import { useCallback, useState } from 'react';
import * as fcl from '@onflow/fcl';
import { useGameStore } from '../stores/gameStore';
import type { GameInitData, ObjectInit, GameObject, ObjectType } from '../types';

/**
 * Reveal game hook return type
 */
export interface UseRevealGameResult {
  /** Reveal the game and get initial object positions */
  revealGame: () => Promise<GameInitData | null>;
  /** Whether a reveal transaction is currently in progress */
  isRevealing: boolean;
  /** Error message if reveal failed */
  error: string | null;
  /** Clear any error state */
  clearError: () => void;
  /** Transaction ID of the current/last transaction */
  transactionId: string | null;
}

/**
 * Cadence transaction code for revealing a game
 * This transaction calls the FlowShambo contract's revealGame function
 * and emits the GameRevealed event with initial object positions
 */
const REVEAL_GAME_TRANSACTION = `
import FlowShambo from 0x9d8d1e6cee0341ec

transaction() {
    
    let receipt: &FlowShambo.Receipt
    
    prepare(signer: auth(BorrowValue) &Account) {
        self.receipt = signer.storage.borrow<&FlowShambo.Receipt>(
            from: FlowShambo.ReceiptStoragePath
        ) ?? panic("No receipt found in storage. Did you commit a bet first?")
    }
    
    execute {
        let gameData = FlowShambo.revealGame(receipt: self.receipt)
    }
}
`;

/**
 * Parse GameRevealed event from transaction result to extract GameInitData
 */
function parseGameRevealedEvent(
  events: Array<{ type: string; data: Record<string, unknown> }>
): GameInitData | null {
  const gameRevealedEvent = events.find((event) =>
    event.type.includes('FlowShambo.GameRevealed')
  );

  if (!gameRevealedEvent) {
    return null;
  }

  const eventData = gameRevealedEvent.data as {
    receiptId: string;
    seed: string;
    objects: Array<{
      objectType: string;
      x: string;
      y: string;
      vx: string;
      vy: string;
    }>;
  };

  // Parse objects from event data
  const objects: ObjectInit[] = (eventData.objects || []).map((obj) => ({
    objectType: parseInt(obj.objectType, 10),
    x: parseFloat(obj.x),
    y: parseFloat(obj.y),
    vx: parseFloat(obj.vx),
    vy: parseFloat(obj.vy),
  }));

  return {
    seed: eventData.seed.toString(),
    objects,
  };
}

/**
 * Convert ObjectInit from blockchain to GameObject
 */
function objectInitToGameObject(init: ObjectInit, index: number, radius: number = 15): GameObject {
  const typeMap: Record<number, ObjectType> = {
    0: 'rock',
    1: 'paper',
    2: 'scissors',
  };

  return {
    id: `obj-${index}`,
    type: typeMap[init.objectType] ?? 'rock',
    x: init.x,
    y: init.y,
    vx: init.vx,
    vy: init.vy,
    radius,
  };
}

/**
 * useRevealGame hook - Handles game reveal transactions on Flow blockchain
 *
 * This hook provides functionality to:
 * - Submit a reveal transaction to the FlowShambo contract
 * - Parse the GameRevealed event to extract initial object positions
 * - Update game state to 'simulating' phase on success
 * - Handle errors and provide retry capability
 *
 * The reveal transaction is Phase 2 of the commit-reveal scheme:
 * 1. User commits a bet (Phase 1 - handled by usePlaceBet)
 * 2. Wait for at least 1 block
 * 3. Reveal the game to get random initial positions (Phase 2 - this hook)
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { revealGame, isRevealing, error, clearError } = useRevealGame();
 *   const { start: startSimulation } = useSimulation();
 *
 *   const handleReveal = async () => {
 *     const initData = await revealGame();
 *     if (initData) {
 *       startSimulation(initData);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleReveal} disabled={isRevealing}>
 *       {isRevealing ? 'Revealing...' : 'Start Game'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @returns {UseRevealGameResult} Reveal state and actions
 *
 * Requirements: 3.1, 3.6, 4.1
 */
export function useRevealGame(): UseRevealGameResult {
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Get game store actions
  const startSimulation = useGameStore((state) => state.startSimulation);
  const setLoading = useGameStore((state) => state.setLoading);
  const setStoreError = useGameStore((state) => state.setError);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reveal the game and get initial object positions
   *
   * @returns The game initialization data, or null if the transaction failed
   */
  const revealGame = useCallback(async (): Promise<GameInitData | null> => {
    if (isRevealing) {
      return null;
    }

    setIsRevealing(true);
    setError(null);
    setTransactionId(null);
    setLoading(true, 'revealing-game');

    try {
      // Submit the reveal transaction
      const txId = await fcl.mutate({
        cadence: REVEAL_GAME_TRANSACTION,
        args: () => [],
        limit: 1000, // Gas limit
      });

      setTransactionId(txId);

      // Wait for transaction to be sealed
      const txResult = await fcl.tx(txId).onceSealed();

      // Check for transaction errors
      if (txResult.statusCode !== 0) {
        const errorMessage = txResult.errorMessage || 'Transaction failed';
        throw new Error(errorMessage);
      }

      // Parse the GameRevealed event to get initial positions
      const gameInitData = parseGameRevealedEvent(txResult.events || []);

      if (!gameInitData) {
        throw new Error('Failed to parse game reveal event');
      }

      // Convert ObjectInit to GameObject for the store
      const gameObjects = gameInitData.objects.map((init, index) =>
        objectInitToGameObject(init, index)
      );

      // Update game store to simulating phase with objects
      startSimulation(gameObjects);

      setIsRevealing(false);
      setLoading(false);

      return gameInitData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reveal game';

      // Handle specific error cases
      let userFriendlyMessage = errorMessage;

      if (errorMessage.includes('User rejected')) {
        userFriendlyMessage = 'Transaction was cancelled';
      } else if (errorMessage.includes('No receipt found')) {
        userFriendlyMessage = 'No bet found. Please place a bet first.';
      } else if (errorMessage.includes('already revealed')) {
        userFriendlyMessage = 'Game has already been revealed';
      } else if (errorMessage.includes('too early') || errorMessage.includes('same block')) {
        userFriendlyMessage = 'Please wait for the next block before revealing';
      } else if (errorMessage.includes('Network') || errorMessage.includes('network')) {
        userFriendlyMessage = 'Network error. Please try again.';
      }

      setError(userFriendlyMessage);
      setStoreError(userFriendlyMessage);
      setIsRevealing(false);

      console.error('Game reveal error:', err);
      return null;
    }
  }, [isRevealing, startSimulation, setLoading, setStoreError]);

  return {
    revealGame,
    isRevealing,
    error,
    clearError,
    transactionId,
  };
}

export default useRevealGame;
