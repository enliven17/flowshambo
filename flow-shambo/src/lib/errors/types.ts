/**
 * Error Types for FlowShambo
 * 
 * Defines error classification and types for comprehensive error handling.
 * 
 * @module lib/errors/types
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'network'      // Network connectivity issues
  | 'transaction'  // Blockchain transaction failures
  | 'validation'   // Input validation errors
  | 'wallet'       // Wallet connection/authentication errors
  | 'contract'     // Smart contract errors
  | 'unknown';     // Unclassified errors

/**
 * Error severity levels
 */
export type ErrorSeverity = 
  | 'info'     // Informational, no action needed
  | 'warning'  // Warning, may need attention
  | 'error'    // Error, action required
  | 'critical'; // Critical, immediate action required

/**
 * Structured error object for FlowShambo
 */
export interface FlowShamboError {
  /** Unique error code for identification */
  code: string;
  /** Error category for classification */
  category: ErrorCategory;
  /** Severity level */
  severity: ErrorSeverity;
  /** User-friendly error message */
  message: string;
  /** Technical details (for logging) */
  technicalDetails?: string;
  /** Original error object */
  originalError?: Error | unknown;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Suggested action for the user */
  suggestedAction?: string;
  /** Whether retry is recommended */
  retryable: boolean;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Error codes for common error scenarios
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_REQUEST_FAILED: 'NETWORK_REQUEST_FAILED',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  
  // Transaction errors
  TX_REJECTED: 'TX_REJECTED',
  TX_FAILED: 'TX_FAILED',
  TX_TIMEOUT: 'TX_TIMEOUT',
  TX_INSUFFICIENT_GAS: 'TX_INSUFFICIENT_GAS',
  
  // Validation errors
  INVALID_BET_AMOUNT: 'INVALID_BET_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_PREDICTION: 'INVALID_PREDICTION',
  BET_BELOW_MINIMUM: 'BET_BELOW_MINIMUM',
  BET_ABOVE_MAXIMUM: 'BET_ABOVE_MAXIMUM',
  
  // Wallet errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
  WALLET_DISCONNECTED: 'WALLET_DISCONNECTED',
  WALLET_REJECTED: 'WALLET_REJECTED',
  
  // Contract errors
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  GAME_ALREADY_IN_PROGRESS: 'GAME_ALREADY_IN_PROGRESS',
  NO_RECEIPT_FOUND: 'NO_RECEIPT_FOUND',
  GAME_ALREADY_REVEALED: 'GAME_ALREADY_REVEALED',
  GAME_ALREADY_SETTLED: 'GAME_ALREADY_SETTLED',
  REVEAL_TOO_EARLY: 'REVEAL_TOO_EARLY',
  INSUFFICIENT_HOUSE_BALANCE: 'INSUFFICIENT_HOUSE_BALANCE',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Retry configuration for error recovery
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to add jitter to delays */
  jitter: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result if successful */
  data?: T;
  /** The error if failed */
  error?: FlowShamboError;
  /** Number of attempts made */
  attempts: number;
}
