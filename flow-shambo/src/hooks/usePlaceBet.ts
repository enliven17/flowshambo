'use client';

import { useCallback, useState } from 'react';
import * as fcl from '@onflow/fcl';
import { useGameStore } from '../stores/gameStore';
import type { ObjectType, BetCommitmentResult } from '../types';

/**
 * Maps ObjectType to Cadence UInt8 prediction value
 */
const PREDICTION_MAP: Record<ObjectType, number> = {
  rock: 0,
  paper: 1,
  scissors: 2,
};

/**
 * Place bet hook return type
 */
export interface UsePlaceBetResult {
  /** Place a bet with the given prediction and amount */
  placeBet: (prediction: ObjectType, amount: number) => Promise<BetCommitmentResult | null>;
  /** Whether a bet transaction is currently in progress */
  isPlacing: boolean;
  /** Error message if bet placement failed */
  error: string | null;
  /** Clear any error state */
  clearError: () => void;
  /** Transaction ID of the current/last transaction */
  transactionId: string | null;
}

/**
 * Cadence transaction code for committing a bet
 * This transaction calls the FlowShambo contract's commitBet function
 */
const COMMIT_BET_TRANSACTION = `
import "FungibleToken"
import "FlowToken"
import "FlowShambo"

transaction(prediction: UInt8, amount: UFix64) {
    
    let playerVault: @{FungibleToken.Vault}
    let playerAddress: Address
    let signerRef: auth(SaveValue, LoadValue) &Account
    
    prepare(signer: auth(BorrowValue, SaveValue, LoadValue) &Account) {
        self.playerAddress = signer.address
        self.signerRef = signer
        
        if signer.storage.type(at: FlowShambo.ReceiptStoragePath) != nil {
            panic("A game is already in progress. Please complete or cancel it first.")
        }
        
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault from storage")
        
        self.playerVault <- vaultRef.withdraw(amount: amount)
    }
    
    execute {
        let receipt <- FlowShambo.commitBet(
            player: self.playerAddress,
            prediction: prediction,
            bet: <-self.playerVault
        )
        
        self.signerRef.storage.save(<-receipt, to: FlowShambo.ReceiptStoragePath)
    }
}
`;

/**
 * Parse BetCommitted event from transaction result
 */
function parseBetCommittedEvent(events: Array<{ type: string; data: Record<string, unknown> }>): BetCommitmentResult | null {
  const betCommittedEvent = events.find((event) => 
    event.type.includes('FlowShambo.BetCommitted')
  );

  if (!betCommittedEvent) {
    return null;
  }

  const { receiptId, commitBlock } = betCommittedEvent.data as {
    receiptId: string;
    commitBlock: string;
  };

  return {
    receiptId: receiptId.toString(),
    commitBlock: parseInt(commitBlock.toString(), 10),
    transactionId: '', // Will be set by caller
  };
}

/**
 * usePlaceBet hook - Handles bet placement transactions on Flow blockchain
 * 
 * This hook provides functionality to:
 * - Submit a bet transaction to the FlowShambo contract
 * - Handle transaction confirmation and status updates
 * - Update game state on successful bet commitment
 * - Handle errors and provide retry capability
 * 
 * @example
 * ```tsx
 * function BettingComponent() {
 *   const { placeBet, isPlacing, error, clearError } = usePlaceBet();
 *   
 *   const handleBet = async () => {
 *     const result = await placeBet('rock', 1.0);
 *     if (result) {
 *       console.log('Bet placed! Receipt ID:', result.receiptId);
 *     }
 *   };
 *   
 *   return (
 *     <button onClick={handleBet} disabled={isPlacing}>
 *       {isPlacing ? 'Placing bet...' : 'Place Bet'}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @returns {UsePlaceBetResult} Bet placement state and actions
 * 
 * Requirements: 2.6, 2.7
 */
export function usePlaceBet(): UsePlaceBetResult {
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Get game store actions
  const commitBet = useGameStore((state) => state.commitBet);
  const setLoading = useGameStore((state) => state.setLoading);
  const setStoreError = useGameStore((state) => state.setError);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Place a bet on the blockchain
   * 
   * @param prediction - The player's prediction (rock, paper, or scissors)
   * @param amount - The amount of FLOW tokens to bet
   * @returns The bet commitment result, or null if the transaction failed
   */
  const placeBet = useCallback(
    async (prediction: ObjectType, amount: number): Promise<BetCommitmentResult | null> => {
      if (isPlacing) {
        return null;
      }

      setIsPlacing(true);
      setError(null);
      setTransactionId(null);
      setLoading(true, 'placing-bet');

      try {
        // Convert prediction to Cadence UInt8
        const predictionValue = PREDICTION_MAP[prediction];

        // Format amount as UFix64 string (8 decimal places)
        const amountString = amount.toFixed(8);

        // Submit the transaction
        const txId = await fcl.mutate({
          cadence: COMMIT_BET_TRANSACTION,
          args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
            arg(predictionValue, t.UInt8),
            arg(amountString, t.UFix64),
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

        // Parse the BetCommitted event to get receipt details
        const betResult = parseBetCommittedEvent(txResult.events || []);

        if (!betResult) {
          throw new Error('Failed to parse bet commitment event');
        }

        // Add transaction ID to result
        betResult.transactionId = txId;

        // Update game store with committed bet
        commitBet(prediction, amount, betResult.receiptId);

        setIsPlacing(false);
        setLoading(false);

        return betResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to place bet';
        
        // Handle specific error cases
        let userFriendlyMessage = errorMessage;
        
        if (errorMessage.includes('User rejected')) {
          userFriendlyMessage = 'Transaction was cancelled';
        } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient')) {
          userFriendlyMessage = 'Insufficient FLOW balance';
        } else if (errorMessage.includes('already in progress')) {
          userFriendlyMessage = 'A game is already in progress. Please complete it first.';
        } else if (errorMessage.includes('minimum bet') || errorMessage.includes('MIN_BET')) {
          userFriendlyMessage = 'Bet amount is below the minimum';
        } else if (errorMessage.includes('maximum bet') || errorMessage.includes('MAX_BET')) {
          userFriendlyMessage = 'Bet amount exceeds the maximum';
        }

        setError(userFriendlyMessage);
        setStoreError(userFriendlyMessage); // This also sets loading to false
        setIsPlacing(false);
        // Note: Don't call setLoading(false) here as setStoreError already handles it

        console.error('Bet placement error:', err);
        return null;
      }
    },
    [isPlacing, commitBet, setLoading, setStoreError]
  );

  return {
    placeBet,
    isPlacing,
    error,
    clearError,
    transactionId,
  };
}

export default usePlaceBet;
