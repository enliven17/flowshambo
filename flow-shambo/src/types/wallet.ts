/**
 * Wallet-related types for FlowShambo
 * Defines types for Flow wallet connection and state
 */

/**
 * Represents the current state of the wallet connection
 */
export interface WalletState {
  /** Whether a wallet is currently connected */
  connected: boolean;
  /** The connected wallet's Flow address (null if not connected) */
  address: string | null;
  /** The wallet's FLOW token balance */
  balance: number;
}

/**
 * Flow user object returned from FCL
 */
export interface FlowUser {
  /** Whether the user is logged in */
  loggedIn: boolean;
  /** The user's Flow address */
  addr: string | null;
}

/**
 * Transaction status from FCL
 */
export type TransactionStatus = 
  | 'unknown'
  | 'pending'
  | 'finalized'
  | 'executed'
  | 'sealed'
  | 'expired';

/**
 * Result of a transaction submission
 */
export interface TransactionResult {
  /** Transaction ID on the blockchain */
  transactionId: string;
  /** Current status of the transaction */
  status: TransactionStatus;
  /** Error message if transaction failed */
  error?: string;
}

/**
 * Bet commitment result from the blockchain
 */
export interface BetCommitmentResult {
  /** Receipt ID for the bet */
  receiptId: string;
  /** Block number where the bet was committed */
  commitBlock: number;
  /** Transaction ID */
  transactionId: string;
}
