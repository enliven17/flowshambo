import { useCallback, useState } from 'react';
import * as fcl from '@onflow/fcl';
import { useGameStore } from '../stores/gameStore';
import { generateObjects } from '../lib/game/generator';
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
 * Parse GameRevealed event and generate objects locally
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
    objectCount: string;
  };

  const seed = eventData.seed.toString();

  // Generate objects locally using the seed from the event
  // This matches the deterministic logic on the contract
  const objects = generateObjects(seed);

  return {
    seed,
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
 */
export function useRevealGame(): UseRevealGameResult {
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Get game store actions
  const startSimulation = useGameStore((state) => state.startSimulation);
  const setLoading = useGameStore((state) => state.setLoading);
  const setStoreError = useGameStore((state) => state.setError);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const revealGame = useCallback(async (): Promise<GameInitData | null> => {
    if (isRevealing) {
      return null;
    }

    setIsRevealing(true);
    setError(null);
    setTransactionId(null);
    setLoading(true, 'revealing-game');

    try {
      const txId = await fcl.mutate({
        cadence: REVEAL_GAME_TRANSACTION,
        args: () => [],
        limit: 1000,
      });

      setTransactionId(txId);

      const txResult = await fcl.tx(txId).onceSealed();

      if (txResult.statusCode !== 0) {
        throw new Error(txResult.errorMessage || 'Transaction failed');
      }

      const gameInitData = parseGameRevealedEvent(txResult.events || []);

      if (!gameInitData) {
        throw new Error('Failed to parse game reveal event');
      }

      const gameObjects = gameInitData.objects.map((init, index) =>
        objectInitToGameObject(init, index)
      );

      startSimulation(gameObjects);

      // Save transaction ID to store
      if (txId) {
        useGameStore.getState().setRevealTransactionId(txId);
      }

      setIsRevealing(false);
      setLoading(false);

      return gameInitData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reveal game';

      let userFriendlyMessage = errorMessage;

      if (errorMessage.includes('User rejected')) {
        userFriendlyMessage = 'Transaction was cancelled';
      } else if (errorMessage.includes('No receipt found')) {
        userFriendlyMessage = 'No bet found. Please place a bet first.';
      } else if (errorMessage.includes('already revealed')) {
        userFriendlyMessage = 'Game has already been revealed';
      } else if (errorMessage.includes('too early') || errorMessage.includes('same block')) {
        userFriendlyMessage = 'Please wait for the next block before revealing';
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
