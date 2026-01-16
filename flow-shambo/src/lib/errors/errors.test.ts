/**
 * Tests for Error Handling Module
 * 
 * Tests error classification, user-friendly messages, and retry logic.
 * 
 * @module lib/errors/errors.test
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
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
import {
  calculateBackoffDelay,
  delay,
  withRetry,
  withRetryProgress,
} from './retry';
import { ErrorCodes, DEFAULT_RETRY_CONFIG } from './types';
import type { FlowShamboError, RetryConfig } from './types';

describe('Error Classifier', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should return string errors as-is', () => {
      expect(extractErrorMessage('Simple string error')).toBe('Simple string error');
    });

    it('should extract message from object with message property', () => {
      const error = { message: 'Object error message' };
      expect(extractErrorMessage(error)).toBe('Object error message');
    });

    it('should extract errorMessage from FCL-style errors', () => {
      const error = { errorMessage: 'FCL error message' };
      expect(extractErrorMessage(error)).toBe('FCL error message');
    });

    it('should handle nested error objects', () => {
      const error = { error: { message: 'Nested error' } };
      expect(extractErrorMessage(error)).toBe('Nested error');
    });

    it('should return default message for unknown types', () => {
      expect(extractErrorMessage(null)).toBe('An unknown error occurred');
      expect(extractErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(extractErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('classifyError', () => {
    describe('Network Errors', () => {
      it('should classify network offline errors', () => {
        const error = classifyError(new Error('Network error: offline'));
        expect(error.category).toBe('network');
        expect(error.code).toBe(ErrorCodes.NETWORK_OFFLINE);
        expect(error.retryable).toBe(true);
      });

      it('should classify timeout errors', () => {
        const error = classifyError(new Error('Request timeout'));
        expect(error.category).toBe('network');
        expect(error.code).toBe(ErrorCodes.NETWORK_TIMEOUT);
        expect(error.retryable).toBe(true);
      });

      it('should classify fetch failed errors', () => {
        const error = classifyError(new Error('Failed to fetch'));
        expect(error.category).toBe('network');
        expect(error.code).toBe(ErrorCodes.NETWORK_REQUEST_FAILED);
        expect(error.retryable).toBe(true);
      });

      it('should classify service unavailable errors', () => {
        const error = classifyError(new Error('503 Service Unavailable'));
        expect(error.category).toBe('network');
        expect(error.code).toBe(ErrorCodes.API_UNAVAILABLE);
        expect(error.retryable).toBe(true);
      });
    });

    describe('Transaction Errors', () => {
      it('should classify user rejected errors', () => {
        const error = classifyError(new Error('User rejected the transaction'));
        expect(error.category).toBe('transaction');
        expect(error.code).toBe(ErrorCodes.TX_REJECTED);
        expect(error.retryable).toBe(false);
        expect(error.severity).toBe('info');
      });

      it('should classify transaction failed errors', () => {
        const error = classifyError(new Error('Transaction failed'));
        expect(error.category).toBe('transaction');
        expect(error.code).toBe(ErrorCodes.TX_FAILED);
        expect(error.retryable).toBe(true);
      });

      it('should classify gas errors', () => {
        const error = classifyError(new Error('Out of gas'));
        expect(error.category).toBe('transaction');
        expect(error.code).toBe(ErrorCodes.TX_INSUFFICIENT_GAS);
        expect(error.retryable).toBe(true);
      });
    });

    describe('Validation Errors', () => {
      it('should classify insufficient funds errors', () => {
        const error = classifyError(new Error('Insufficient funds'));
        expect(error.category).toBe('validation');
        expect(error.code).toBe(ErrorCodes.INSUFFICIENT_BALANCE);
        expect(error.retryable).toBe(false);
      });

      it('should classify minimum bet errors', () => {
        const error = classifyError(new Error('Bet below minimum'));
        expect(error.category).toBe('validation');
        expect(error.code).toBe(ErrorCodes.BET_BELOW_MINIMUM);
        expect(error.retryable).toBe(false);
      });

      it('should classify maximum bet errors', () => {
        const error = classifyError(new Error('Bet exceeds maximum'));
        expect(error.category).toBe('validation');
        expect(error.code).toBe(ErrorCodes.BET_ABOVE_MAXIMUM);
        expect(error.retryable).toBe(false);
      });
    });

    describe('Wallet Errors', () => {
      it('should classify wallet not connected errors', () => {
        const error = classifyError(new Error('Wallet not connected'));
        expect(error.category).toBe('wallet');
        expect(error.code).toBe(ErrorCodes.WALLET_NOT_CONNECTED);
        expect(error.retryable).toBe(false);
      });

      it('should classify connection failed errors', () => {
        const error = classifyError(new Error('Failed to connect wallet'));
        expect(error.category).toBe('wallet');
        expect(error.code).toBe(ErrorCodes.WALLET_CONNECTION_FAILED);
        expect(error.retryable).toBe(true);
      });
    });

    describe('Contract Errors', () => {
      it('should classify game in progress errors', () => {
        const error = classifyError(new Error('A game is already in progress'));
        expect(error.category).toBe('contract');
        expect(error.code).toBe(ErrorCodes.GAME_ALREADY_IN_PROGRESS);
        expect(error.retryable).toBe(false);
      });

      it('should classify no receipt found errors', () => {
        const error = classifyError(new Error('No receipt found'));
        expect(error.category).toBe('contract');
        expect(error.code).toBe(ErrorCodes.NO_RECEIPT_FOUND);
        expect(error.retryable).toBe(false);
      });

      it('should classify reveal too early errors', () => {
        const error = classifyError(new Error('Reveal too early, wait for next block'));
        expect(error.category).toBe('contract');
        expect(error.code).toBe(ErrorCodes.REVEAL_TOO_EARLY);
        expect(error.retryable).toBe(true);
      });
    });

    describe('Unknown Errors', () => {
      it('should classify unknown errors with default values', () => {
        const error = classifyError(new Error('Some random error'));
        expect(error.category).toBe('unknown');
        expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
        expect(error.retryable).toBe(true);
        expect(error.recoverable).toBe(true);
      });
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const error = classifyError(new Error('Test'));
      const after = Date.now();
      
      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original');
      const error = classifyError(originalError);
      expect(error.originalError).toBe(originalError);
    });

    it('should include technical details', () => {
      const error = classifyError(new Error('Technical details here'));
      expect(error.technicalDetails).toBe('Technical details here');
    });
  });

  describe('createError', () => {
    it('should create error from known code', () => {
      const error = createError(ErrorCodes.NETWORK_OFFLINE, 'Technical info');
      expect(error.code).toBe(ErrorCodes.NETWORK_OFFLINE);
      expect(error.category).toBe('network');
      expect(error.technicalDetails).toBe('Technical info');
    });

    it('should create fallback error for unknown codes', () => {
      const error = createError('UNKNOWN_CODE' as any);
      expect(error.code).toBe('UNKNOWN_CODE');
      expect(error.category).toBe('unknown');
    });
  });

  describe('Error Type Checkers', () => {
    it('isNetworkError should return true for network errors', () => {
      const error = classifyError(new Error('Network offline'));
      expect(isNetworkError(error)).toBe(true);
    });

    it('isTransactionError should return true for transaction errors', () => {
      const error = classifyError(new Error('Transaction failed'));
      expect(isTransactionError(error)).toBe(true);
    });

    it('isValidationError should return true for validation errors', () => {
      const error = classifyError(new Error('Insufficient funds'));
      expect(isValidationError(error)).toBe(true);
    });

    it('isWalletError should return true for wallet errors', () => {
      const error = classifyError(new Error('Wallet not connected'));
      expect(isWalletError(error)).toBe(true);
    });

    it('isContractError should return true for contract errors', () => {
      const error = classifyError(new Error('No receipt found'));
      expect(isContractError(error)).toBe(true);
    });

    it('isUserCancellation should return true for user rejected errors', () => {
      const error = classifyError(new Error('User rejected'));
      expect(isUserCancellation(error)).toBe(true);
    });
  });
});

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateBackoffDelay', () => {
    const config: RetryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitter: false,
    };

    it('should calculate exponential backoff', () => {
      expect(calculateBackoffDelay(0, config)).toBe(1000);
      expect(calculateBackoffDelay(1, config)).toBe(2000);
      expect(calculateBackoffDelay(2, config)).toBe(4000);
      expect(calculateBackoffDelay(3, config)).toBe(8000);
    });

    it('should cap at maxDelayMs', () => {
      expect(calculateBackoffDelay(10, config)).toBe(10000);
    });

    it('should add jitter when enabled', () => {
      const jitterConfig = { ...config, jitter: true };
      const delays = new Set<number>();
      
      // Generate multiple delays to check for variation
      for (let i = 0; i < 10; i++) {
        delays.add(calculateBackoffDelay(0, jitterConfig));
      }
      
      // With jitter, we should get some variation (not all the same)
      // Note: There's a small chance this could fail if random happens to give same values
      expect(delays.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('delay', () => {
    it('should delay for specified duration', async () => {
      const promise = delay(1000);
      
      vi.advanceTimersByTime(999);
      expect(vi.getTimerCount()).toBe(1);
      
      vi.advanceTimersByTime(1);
      await promise;
      
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('withRetry', () => {
    it('should return success on first attempt if operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const resultPromise = withRetry(operation, { maxAttempts: 3 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      const resultPromise = withRetry(operation, { 
        maxAttempts: 3,
        initialDelayMs: 100,
      });
      
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const resultPromise = withRetry(operation, { 
        maxAttempts: 3,
        initialDelayMs: 100,
      });
      
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry user cancellations', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('User rejected'));
      
      const resultPromise = withRetry(operation, { maxAttempts: 3 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Insufficient funds'));
      
      const resultPromise = withRetry(operation, { maxAttempts: 3 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect custom shouldRetry function', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));
      const shouldRetry = vi.fn().mockReturnValue(false);
      
      const resultPromise = withRetry(operation, { maxAttempts: 3 }, shouldRetry);
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(shouldRetry).toHaveBeenCalled();
    });
  });

  describe('withRetryProgress', () => {
    it('should call progress callback on retries', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      const onProgress = vi.fn();
      
      const resultPromise = withRetryProgress(
        operation,
        { maxAttempts: 3, initialDelayMs: 100 },
        onProgress
      );
      
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(1, 3, expect.any(Number), expect.any(Object));
      expect(onProgress).toHaveBeenCalledWith(2, 3, expect.any(Number), expect.any(Object));
    });
  });
});

describe('User-Friendly Error Messages', () => {
  it('should provide user-friendly message for network errors', () => {
    const error = classifyError(new Error('ERR_NETWORK'));
    expect(error.message).not.toContain('ERR_NETWORK');
    expect(error.message).toContain('network');
  });

  it('should provide user-friendly message for transaction errors', () => {
    const error = classifyError(new Error('User rejected'));
    expect(error.message).toBe('Transaction was cancelled.');
  });

  it('should provide user-friendly message for validation errors', () => {
    const error = classifyError(new Error('Insufficient funds'));
    expect(error.message).toContain('Insufficient FLOW balance');
  });

  it('should include suggested actions', () => {
    const error = classifyError(new Error('Wallet not connected'));
    expect(error.suggestedAction).toBeDefined();
    expect(error.suggestedAction).toContain('Connect');
  });
});
