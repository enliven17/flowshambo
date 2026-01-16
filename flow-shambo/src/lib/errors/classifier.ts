/**
 * Error Classifier for FlowShambo
 * 
 * Classifies errors into categories and creates structured error objects
 * with user-friendly messages.
 * 
 * @module lib/errors/classifier
 * 
 * **Validates: Requirements 1.4, 2.8, 6.7**
 */

import {
  FlowShamboError,
  ErrorCategory,
  ErrorSeverity,
  ErrorCode,
  ErrorCodes,
} from './types';

/**
 * Error pattern matchers for classification
 */
interface ErrorPattern {
  patterns: (string | RegExp)[];
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  suggestedAction?: string;
  recoverable: boolean;
  retryable: boolean;
}

/**
 * Error patterns for automatic classification
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Network errors
  {
    patterns: ['network', 'offline', 'ERR_NETWORK', 'net::ERR'],
    code: ErrorCodes.NETWORK_OFFLINE,
    category: 'network',
    severity: 'error',
    message: 'Unable to connect to the network. Please check your internet connection.',
    suggestedAction: 'Check your internet connection and try again.',
    recoverable: true,
    retryable: true,
  },
  {
    patterns: ['timeout', 'ETIMEDOUT', 'ECONNABORTED'],
    code: ErrorCodes.NETWORK_TIMEOUT,
    category: 'network',
    severity: 'warning',
    message: 'The request timed out. The network may be slow.',
    suggestedAction: 'Please wait a moment and try again.',
    recoverable: true,
    retryable: true,
  },
  {
    patterns: ['fetch failed', 'Failed to fetch', 'request failed'],
    code: ErrorCodes.NETWORK_REQUEST_FAILED,
    category: 'network',
    severity: 'error',
    message: 'Failed to connect to the server. Please try again.',
    suggestedAction: 'Check your connection and try again.',
    recoverable: true,
    retryable: true,
  },
  {
    patterns: ['503', '502', '504', 'service unavailable', 'bad gateway'],
    code: ErrorCodes.API_UNAVAILABLE,
    category: 'network',
    severity: 'error',
    message: 'The Flow network is temporarily unavailable. Please try again later.',
    suggestedAction: 'Wait a few minutes and try again.',
    recoverable: true,
    retryable: true,
  },
  
  // Transaction errors
  {
    patterns: ['User rejected', 'user rejected', 'User denied', 'user denied', 'cancelled', 'canceled'],
    code: ErrorCodes.TX_REJECTED,
    category: 'transaction',
    severity: 'info',
    message: 'Transaction was cancelled.',
    suggestedAction: 'You can try again when ready.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['transaction failed', 'execution failed', 'reverted'],
    code: ErrorCodes.TX_FAILED,
    category: 'transaction',
    severity: 'error',
    message: 'The transaction failed to execute.',
    suggestedAction: 'Please try again. If the problem persists, contact support.',
    recoverable: true,
    retryable: true,
  },
  {
    patterns: ['gas', 'computation limit', 'out of gas'],
    code: ErrorCodes.TX_INSUFFICIENT_GAS,
    category: 'transaction',
    severity: 'error',
    message: 'Transaction ran out of gas.',
    suggestedAction: 'Please try again with a simpler transaction.',
    recoverable: true,
    retryable: true,
  },
  
  // Validation errors
  {
    patterns: ['insufficient funds', 'Insufficient', 'not enough balance'],
    code: ErrorCodes.INSUFFICIENT_BALANCE,
    category: 'validation',
    severity: 'warning',
    message: 'Insufficient FLOW balance for this bet.',
    suggestedAction: 'Please enter a smaller bet amount or add more FLOW to your wallet.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['minimum bet', 'MIN_BET', 'below minimum'],
    code: ErrorCodes.BET_BELOW_MINIMUM,
    category: 'validation',
    severity: 'warning',
    message: 'Bet amount is below the minimum.',
    suggestedAction: 'Please enter a higher bet amount.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['maximum bet', 'MAX_BET', 'exceeds maximum'],
    code: ErrorCodes.BET_ABOVE_MAXIMUM,
    category: 'validation',
    severity: 'warning',
    message: 'Bet amount exceeds the maximum.',
    suggestedAction: 'Please enter a lower bet amount.',
    recoverable: true,
    retryable: false,
  },
  
  // Wallet errors
  {
    patterns: ['wallet not connected', 'not authenticated', 'no wallet'],
    code: ErrorCodes.WALLET_NOT_CONNECTED,
    category: 'wallet',
    severity: 'warning',
    message: 'Please connect your wallet first.',
    suggestedAction: 'Click the Connect Wallet button to continue.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['connection failed', 'failed to connect', 'authentication failed'],
    code: ErrorCodes.WALLET_CONNECTION_FAILED,
    category: 'wallet',
    severity: 'error',
    message: 'Failed to connect to your wallet.',
    suggestedAction: 'Please try connecting again.',
    recoverable: true,
    retryable: true,
  },
  
  // Contract errors
  {
    patterns: ['already in progress', 'game in progress'],
    code: ErrorCodes.GAME_ALREADY_IN_PROGRESS,
    category: 'contract',
    severity: 'warning',
    message: 'A game is already in progress.',
    suggestedAction: 'Please complete your current game first.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['No receipt found', 'no receipt', 'receipt not found'],
    code: ErrorCodes.NO_RECEIPT_FOUND,
    category: 'contract',
    severity: 'error',
    message: 'No active game found.',
    suggestedAction: 'Please place a bet to start a new game.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['already revealed', 'game revealed'],
    code: ErrorCodes.GAME_ALREADY_REVEALED,
    category: 'contract',
    severity: 'warning',
    message: 'This game has already been revealed.',
    suggestedAction: 'Continue with the simulation.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['already settled', 'game settled'],
    code: ErrorCodes.GAME_ALREADY_SETTLED,
    category: 'contract',
    severity: 'warning',
    message: 'This game has already been settled.',
    suggestedAction: 'Start a new game to play again.',
    recoverable: true,
    retryable: false,
  },
  {
    patterns: ['too early', 'same block', 'wait for next block'],
    code: ErrorCodes.REVEAL_TOO_EARLY,
    category: 'contract',
    severity: 'info',
    message: 'Please wait for the next block before revealing.',
    suggestedAction: 'Wait a few seconds and try again.',
    recoverable: true,
    retryable: true,
  },
  {
    patterns: ['house balance', 'insufficient house'],
    code: ErrorCodes.INSUFFICIENT_HOUSE_BALANCE,
    category: 'contract',
    severity: 'error',
    message: 'The house cannot cover this bet at the moment.',
    suggestedAction: 'Please try a smaller bet amount.',
    recoverable: true,
    retryable: false,
  },
];

/**
 * Extracts error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Handle FCL error objects
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('errorMessage' in error && typeof (error as { errorMessage: unknown }).errorMessage === 'string') {
      return (error as { errorMessage: string }).errorMessage;
    }
    // Handle nested error objects
    if ('error' in error) {
      return extractErrorMessage((error as { error: unknown }).error);
    }
  }
  return 'An unknown error occurred';
}

/**
 * Classifies an error and returns a structured FlowShamboError
 */
export function classifyError(error: unknown): FlowShamboError {
  const errorMessage = extractErrorMessage(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  // Find matching pattern
  for (const pattern of ERROR_PATTERNS) {
    const matches = pattern.patterns.some((p) => {
      if (typeof p === 'string') {
        return lowerMessage.includes(p.toLowerCase());
      }
      return p.test(errorMessage);
    });
    
    if (matches) {
      return {
        code: pattern.code,
        category: pattern.category,
        severity: pattern.severity,
        message: pattern.message,
        technicalDetails: errorMessage,
        originalError: error,
        recoverable: pattern.recoverable,
        suggestedAction: pattern.suggestedAction,
        retryable: pattern.retryable,
        timestamp: Date.now(),
      };
    }
  }
  
  // Default to unknown error
  return {
    code: ErrorCodes.UNKNOWN_ERROR,
    category: 'unknown',
    severity: 'error',
    message: 'An unexpected error occurred. Please try again.',
    technicalDetails: errorMessage,
    originalError: error,
    recoverable: true,
    suggestedAction: 'Please try again. If the problem persists, refresh the page.',
    retryable: true,
    timestamp: Date.now(),
  };
}

/**
 * Creates a FlowShamboError from a known error code
 */
export function createError(
  code: ErrorCode,
  technicalDetails?: string,
  originalError?: unknown
): FlowShamboError {
  const pattern = ERROR_PATTERNS.find((p) => p.code === code);
  
  if (pattern) {
    return {
      code: pattern.code,
      category: pattern.category,
      severity: pattern.severity,
      message: pattern.message,
      technicalDetails,
      originalError,
      recoverable: pattern.recoverable,
      suggestedAction: pattern.suggestedAction,
      retryable: pattern.retryable,
      timestamp: Date.now(),
    };
  }
  
  // Fallback for unknown codes
  return {
    code,
    category: 'unknown',
    severity: 'error',
    message: 'An error occurred.',
    technicalDetails,
    originalError,
    recoverable: true,
    retryable: true,
    timestamp: Date.now(),
  };
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: FlowShamboError): boolean {
  return error.category === 'network';
}

/**
 * Checks if an error is a transaction error
 */
export function isTransactionError(error: FlowShamboError): boolean {
  return error.category === 'transaction';
}

/**
 * Checks if an error is a validation error
 */
export function isValidationError(error: FlowShamboError): boolean {
  return error.category === 'validation';
}

/**
 * Checks if an error is a wallet error
 */
export function isWalletError(error: FlowShamboError): boolean {
  return error.category === 'wallet';
}

/**
 * Checks if an error is a contract error
 */
export function isContractError(error: FlowShamboError): boolean {
  return error.category === 'contract';
}

/**
 * Checks if an error was caused by user cancellation
 */
export function isUserCancellation(error: FlowShamboError): boolean {
  return error.code === ErrorCodes.TX_REJECTED;
}
