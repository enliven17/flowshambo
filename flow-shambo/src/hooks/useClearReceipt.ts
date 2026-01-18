'use client';

import { useCallback, useState } from 'react';
import * as fcl from '@onflow/fcl';
import { useGameStore } from '../stores/gameStore';

/**
 * Clear receipt hook return type
 */
export interface UseClearReceiptResult {
    /** Clear the stuck receipt from storage */
    clearReceipt: () => Promise<boolean>;
    /** Whether the transaction is in progress */
    isClearing: boolean;
    /** Error message if clearing failed */
    error: string | null;
    /** Clear error state */
    clearError: () => void;
}

/**
 * Cadence transaction to clear a stuck receipt
 */
const CLEAR_RECEIPT_TRANSACTION = `
import FlowShambo from 0x9d8d1e6cee0341ec

transaction() {
    prepare(signer: auth(LoadValue) &Account) {
        // Try to load and destroy the receipt
        if let receipt <- signer.storage.load<@FlowShambo.Receipt>(
            from: FlowShambo.ReceiptStoragePath
        ) {
            destroy receipt
        }
    }
    execute {
        log("Receipt cleared successfully")
    }
}
`;

/**
 * useClearReceipt hook - Handles clearing stuck game receipts
 */
export function useClearReceipt(): UseClearReceiptResult {
    const [isClearing, setIsClearing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // We might want to reset the game store state too
    const resetGame = useGameStore((state) => state.resetGame);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const clearReceipt = useCallback(async (): Promise<boolean> => {
        if (isClearing) return false;

        setIsClearing(true);
        setError(null);

        try {
            const txId = await fcl.mutate({
                cadence: CLEAR_RECEIPT_TRANSACTION,
                limit: 1000,
            });

            await fcl.tx(txId).onceSealed();

            // Reset local store state as well
            if (resetGame) {
                resetGame();
            }

            setIsClearing(false);
            return true;
        } catch (err) {
            console.error('Failed to clear receipt:', err);
            setError(err instanceof Error ? err.message : 'Failed to clear receipt');
            setIsClearing(false);
            return false;
        }
    }, [isClearing, resetGame]);

    return {
        clearReceipt,
        isClearing,
        error,
        clearError
    };
}

export default useClearReceipt;
