/**
 * Bet validation module for FlowShambo
 * Validates bet amounts against min/max limits and wallet balance
 * 
 * @module betting/validation
 */

import type { BetValidationResult } from '../../types';

/**
 * Minimum bet amount in FLOW tokens
 * Matches the MIN_BET constant in the FlowShambo Cadence contract
 */
export const MIN_BET = 0.1;

/**
 * Maximum bet amount in FLOW tokens
 * Matches the MAX_BET constant in the FlowShambo Cadence contract
 */
export const MAX_BET = 100.0;

/**
 * Validates a bet amount against min/max limits and wallet balance
 * 
 * Validation rules (from design Properties 1 & 2):
 * - Bet amount must be greater than zero
 * - Bet amount must be less than or equal to wallet balance
 * - Bet amount must be at least MIN_BET
 * - Bet amount must not exceed MAX_BET
 * 
 * @param amount - The bet amount to validate
 * @param balance - The user's current wallet balance
 * @param minBet - Minimum allowed bet amount (defaults to MIN_BET)
 * @param maxBet - Maximum allowed bet amount (defaults to MAX_BET)
 * @returns BetValidationResult with valid flag and error message if invalid
 * 
 * @example
 * ```typescript
 * const result = validateBetAmount(5, 10, 0.1, 100);
 * // { valid: true, errorMessage: null }
 * 
 * const result = validateBetAmount(0, 10, 0.1, 100);
 * // { valid: false, errorMessage: 'Bet amount must be greater than zero' }
 * ```
 * 
 * @validates Requirements 2.4, 2.5
 */
export function validateBetAmount(
  amount: number,
  balance: number,
  minBet: number = MIN_BET,
  maxBet: number = MAX_BET
): BetValidationResult {
  // Property 1: Reject if amount is less than or equal to zero
  if (amount <= 0) {
    return {
      valid: false,
      errorMessage: 'Bet amount must be greater than zero',
    };
  }

  // Property 1: Reject if amount exceeds wallet balance
  if (amount > balance) {
    return {
      valid: false,
      errorMessage: 'Insufficient funds: bet amount exceeds wallet balance',
    };
  }

  // Check against minimum bet limit
  if (amount < minBet) {
    return {
      valid: false,
      errorMessage: `Bet amount must be at least ${minBet} FLOW`,
    };
  }

  // Check against maximum bet limit
  if (amount > maxBet) {
    return {
      valid: false,
      errorMessage: `Bet amount cannot exceed ${maxBet} FLOW`,
    };
  }

  // Property 2: All validations passed - bet is valid
  return {
    valid: true,
    errorMessage: null,
  };
}

/**
 * Checks if a bet amount can create a valid blockchain transaction
 * This is a convenience function that returns a boolean instead of a result object
 * 
 * @param amount - The bet amount to check
 * @param balance - The user's current wallet balance
 * @param minBet - Minimum allowed bet amount (defaults to MIN_BET)
 * @param maxBet - Maximum allowed bet amount (defaults to MAX_BET)
 * @returns true if the bet can create a transaction, false otherwise
 * 
 * @validates Requirements 2.6
 */
export function canCreateBetTransaction(
  amount: number,
  balance: number,
  minBet: number = MIN_BET,
  maxBet: number = MAX_BET
): boolean {
  return validateBetAmount(amount, balance, minBet, maxBet).valid;
}
