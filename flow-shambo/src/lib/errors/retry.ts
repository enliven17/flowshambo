/**
 * Retry Logic for FlowShambo
 * 
 * Implements exponential backoff retry logic for recoverable errors.
 * 
 * @module lib/errors/retry
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

import {
  FlowShamboError,
  RetryConfig,
  RetryResult,
  DEFAULT_RETRY_CONFIG,
} from './types';
import { classifyError, isUserCancellation } from './classifier';

/**
 * Calculates the delay for a retry attempt using exponential backoff
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Calculate base delay with exponential backoff
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  
  // Cap at maximum delay
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
  
  // Add jitter if enabled (±25% of delay)
  if (config.jitter) {
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, Math.round(cappedDelay + jitter));
  }
  
  return Math.round(cappedDelay);
}

/**
 * Delays execution for a specified duration
 * 
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an async operation with retry logic
 * 
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param shouldRetry - Optional function to determine if retry should occur
 * @returns RetryResult with success status and data or error
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await fcl.mutate({ ... }),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * 
 * if (result.success) {
 *   console.log('Transaction succeeded:', result.data);
 * } else {
 *   console.error('All retries failed:', result.error);
 * }
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry?: (error: FlowShamboError, attempt: number) => boolean
): Promise<RetryResult<T>> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: FlowShamboError | undefined;
  
  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = classifyError(error);
      
      // Don't retry user cancellations
      if (isUserCancellation(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
        };
      }
      
      // Check if error is retryable
      if (!lastError.retryable) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
        };
      }
      
      // Check custom retry condition
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
        };
      }
      
      // Don't delay after the last attempt
      if (attempt < fullConfig.maxAttempts - 1) {
        const delayMs = calculateBackoffDelay(attempt, fullConfig);
        await delay(delayMs);
      }
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxAttempts,
  };
}

/**
 * Creates a retry wrapper for a specific operation type
 * 
 * @param config - Default retry configuration for this wrapper
 * @returns A function that wraps operations with retry logic
 * 
 * @example
 * ```typescript
 * const retryTransaction = createRetryWrapper({ maxAttempts: 3 });
 * 
 * const result = await retryTransaction(async () => {
 *   return await fcl.mutate({ ... });
 * });
 * ```
 */
export function createRetryWrapper(config: Partial<RetryConfig> = {}) {
  return async function <T>(
    operation: () => Promise<T>,
    overrideConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    return withRetry(operation, { ...config, ...overrideConfig });
  };
}

/**
 * Pre-configured retry wrapper for network operations
 * Uses longer delays and more attempts for network issues
 */
export const retryNetworkOperation = createRetryWrapper({
  maxAttempts: 3,
  initialDelayMs: 2000,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
  jitter: true,
});

/**
 * Pre-configured retry wrapper for transaction operations
 * Uses moderate delays for blockchain transactions
 */
export const retryTransaction = createRetryWrapper({
  maxAttempts: 2,
  initialDelayMs: 1500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
});

/**
 * Callback type for retry progress updates
 */
export type RetryProgressCallback = (
  attempt: number,
  maxAttempts: number,
  delayMs: number,
  error: FlowShamboError
) => void;

/**
 * Executes an operation with retry logic and progress callbacks
 * 
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param onProgress - Callback for retry progress updates
 * @returns RetryResult with success status and data or error
 */
export async function withRetryProgress<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onProgress?: RetryProgressCallback
): Promise<RetryResult<T>> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: FlowShamboError | undefined;
  
  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = classifyError(error);
      
      // Don't retry user cancellations or non-retryable errors
      if (isUserCancellation(lastError) || !lastError.retryable) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
        };
      }
      
      // Calculate delay and notify progress
      if (attempt < fullConfig.maxAttempts - 1) {
        const delayMs = calculateBackoffDelay(attempt, fullConfig);
        
        if (onProgress) {
          onProgress(attempt + 1, fullConfig.maxAttempts, delayMs, lastError);
        }
        
        await delay(delayMs);
      }
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxAttempts,
  };
}
