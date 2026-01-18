'use client';

/**
 * useSettleGame Hook for FlowShambo
 *
 * Handles game settlement after simulation completes.
 * Calls the settleGame transaction on the FlowShambo contract
 * and processes the payout result.
 *
 * @module hooks/useSettleGame
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**
 */

import { useCallback, useState } from 'react';
import * as fcl from '@onflow/fcl';
import { useGameStore } from '../stores/gameStore';
import { calculatePayout, PAYOUT_MULTIPLIER } from '../lib/betting/settlement';
import type { ObjectType } from '../types';

/**
 * Maps ObjectType to Cadence UInt8 value
 */
const OBJECT_TYPE_MAP: Record<ObjectType, number> = {
  rock: 0,
  paper: 1,
  scissors: 2,
};

/**
 * Settlement result returned from the hook
 */
export interface SettlementResult {
  /** Whether the player won the bet */
  playerWon: boolean;
  /** The payout amount (0 if lost) */
  payout: number;
  /** The winning object type */
  winningType: ObjectType;
  /** Transaction ID */
  transactionId: string;
}

/**
 * Return type for the useSettleGame hook
 */
export interface UseSettleGameResult {
  /** Settle the game with the winning type */
  settleGame: (winningType: ObjectType) => Promise<SettlementResult | null>;
  /** Whether a settlement transaction is currently in progress */
  isSettling: boolean;
  /** Error message if settlement failed */
  error: string | null;
  /** Clear any error state */
  clearError: () => void;
  /** Transaction ID of the current/last transaction */
  transactionId: string | null;
  /** The last settlement result */
  settlementResult: SettlementResult | null;
}

/**
 * Cadence transaction code for settling a game
 * This transaction calls the FlowShambo contract's settleGame function
 * and handles payout transfer to the player's wallet
 */
const SETTLE_GAME_TRANSACTION = `
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868
import FlowShambo from 0x9d8d1e6cee0341ec

transaction(winningType: UInt8) {
    
    let receipt: @FlowShambo.Receipt
    let playerVaultRef: &{FungibleToken.Receiver}
    
    prepare(signer: auth(LoadValue, BorrowValue) &Account) {
        self.receipt <- signer.storage.load<@FlowShambo.Receipt>(
            from: FlowShambo.ReceiptStoragePath
        ) ?? panic("No receipt found in storage. Did you commit and reveal first?")
        
        self.playerVaultRef = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault receiver")
    }
    
    execute {
        let payout <- FlowShambo.settleGame(
            receipt: <-self.receipt,
            winningType: winningType
        )
        
        self.playerVaultRef.deposit(from: <-payout)
    }
}
`;

/**
 * Parse GameSettled event from transaction result
 */
function parseGameSettledEvent(
  events: Array<{ type: string; data: Record<string, unknown> }>
): { playerWon: boolean; payout: number } | null {
  const gameSettledEvent = events.find((event) =>
    event.type.includes('FlowShambo.GameSettled')
  );

  if (!gameSettledEvent) {
    return null;
  }

  const eventData = gameSettledEvent.data as {
    receiptId: string;
    winningType: string;
    playerWon: boolean;
    payout: string;
  };

  return {
    playerWon: eventData.playerWon,
    payout: parseFloat(eventData.payout),
  };
}

/**
 * useSettleGame hook - Handles game settlement transactions on Flow blockchain
 *
 * This hook provides functionality to:
 * - Submit a settlement transaction to the FlowShambo contract
 * - Parse the GameSettled event to extract settlement result
 * - Handle payout transfer to the player's wallet
 * - Update game state to 'settled' phase on success
 * - Handle errors and provide retry capability
 *
 * The settlement transaction is Phase 3 of the game flow:
 * 1. User commits a bet (Phase 1 - handled by usePlaceBet)
 * 2. Reveal the game to get random initial positions (Phase 2 - handled by useRevealGame)
 * 3. Run physics simulation (handled by useSimulation)
 * 4. Settle the game with the winning type (Phase 3 - this hook)
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { settleGame, isSettling, error, settlementResult } = useSettleGame();
 *   const { status, winner } = useSimulation();
 *
 *   useEffect(() => {
 *     if (status === 'completed' && winner) {
 *       settleGame(winner);
 *     }
 *   }, [status, winner, settleGame]);
 *
 *   return (
 *     <div>
 *       {isSettling && <div>Settling game...</div>}
 *       {settlementResult && (
 *         <div>
 *           {settlementResult.playerWon ? 'You won!' : 'You lost!'}
 *           Payout: {settlementResult.payout} FLOW
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {UseSettleGameResult} Settlement state and actions
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**
 */
export function useSettleGame(): UseSettleGameResult {
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);

  // Get game store state and actions
  const settleGameStore = useGameStore((state) => state.settleGame);
  const setLoading = useGameStore((state) => state.setLoading);
  const setStoreError = useGameStore((state) => state.setError);
  const prediction = useGameStore((state) => state.game.prediction);
  const betAmount = useGameStore((state) => state.game.betAmount);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Settle the game with the winning type
   *
   * @param winningType - The winning object type from the simulation
   * @returns The settlement result, or null if the transaction failed
   */
  const settleGame = useCallback(
    async (winningType: ObjectType): Promise<SettlementResult | null> => {
      if (isSettling) {
        return null;
      }

      setIsSettling(true);
      setError(null);
      setTransactionId(null);
      setSettlementResult(null);
      setLoading(true, 'settling-game');

      try {
        // Convert winning type to Cadence UInt8
        const winningTypeValue = OBJECT_TYPE_MAP[winningType];

        // Submit the settlement transaction
        const txId = await fcl.mutate({
          cadence: SETTLE_GAME_TRANSACTION,
          args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
            arg(winningTypeValue, t.UInt8),
          ],
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

        // Parse the GameSettled event to get settlement result
        const eventResult = parseGameSettledEvent(txResult.events || []);

        // Determine if player won based on prediction
        const playerWon = prediction === winningType;

        // Calculate expected payout (for verification/fallback)
        const expectedPayout = prediction
          ? calculatePayout(betAmount, prediction, winningType)
          : 0;

        // Use event data if available, otherwise use calculated values
        const payout = eventResult?.payout ?? expectedPayout;

        const result: SettlementResult = {
          playerWon,
          payout,
          winningType,
          transactionId: txId,
        };

        setSettlementResult(result);

        // Update game store to settled phase
        settleGameStore(winningType, playerWon);

        setIsSettling(false);
        setLoading(false);

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to settle game';

        // Handle specific error cases
        let userFriendlyMessage = errorMessage;

        if (errorMessage.includes('User rejected')) {
          userFriendlyMessage = 'Transaction was cancelled';
        } else if (errorMessage.includes('No receipt found')) {
          userFriendlyMessage = 'No game found to settle. Please start a new game.';
        } else if (errorMessage.includes('not revealed')) {
          userFriendlyMessage = 'Game has not been revealed yet';
        } else if (errorMessage.includes('already settled')) {
          userFriendlyMessage = 'Game has already been settled';
        } else if (errorMessage.includes('Network') || errorMessage.includes('network')) {
          userFriendlyMessage = 'Network error. Please try again.';
        }

        setError(userFriendlyMessage);
        setStoreError(userFriendlyMessage);
        setIsSettling(false);

        console.error('Game settlement error:', err);
        return null;
      }
    },
    [isSettling, prediction, betAmount, settleGameStore, setLoading, setStoreError]
  );

  return {
    settleGame,
    isSettling,
    error,
    clearError,
    transactionId,
    settlementResult,
  };
}

export default useSettleGame;
