/**
 * Error Handling Module for FlowShambo
 * 
 * Provides centralized error handling utilities including:
 * - Error type classification
 * - User-friendly error message mapping
 * - Retry logic with exponential backoff
 * 
 * @module lib/errors
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

// Export types
export type {
  ErrorCategory,
  ErrorSeverity,
  ErrorCode,
  FlowShamboError,
  RetryConfig,
  RetryResult,
} from './types';

export { ErrorCodes, DEFAULT_RETRY_CONFIG } from './types';

// Export classifier functions
export {
  classifyError,
  createError,
  extractErrorMessage,
  isNetworkError,
  isTransactionError,
  isValidationError,
  isWalletError,
  isContractError,
  isUserCancellation,
} from './classifier';

// Export retry functions
export {
  calculateBackoffDelay,
  delay,
  withRetry,
  withRetryProgress,
  createRetryWrapper,
  retryNetworkOperation,
  retryTransaction,
} from './retry';

export type { RetryProgressCallback } from './retry';
