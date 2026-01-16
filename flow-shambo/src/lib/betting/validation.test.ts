/**
 * Unit tests for bet validation module
 * Tests validateBetAmount and canCreateBetTransaction functions
 * 
 * @validates Requirements 2.4, 2.5, 2.6
 */

import { describe, it, expect } from 'vitest';
import {
  validateBetAmount,
  canCreateBetTransaction,
  MIN_BET,
  MAX_BET,
} from './validation';

describe('validateBetAmount', () => {
  describe('zero and negative amounts (Requirement 2.5)', () => {
    it('should reject zero bet amount', () => {
      const result = validateBetAmount(0, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Bet amount must be greater than zero');
    });

    it('should reject negative bet amount', () => {
      const result = validateBetAmount(-5, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Bet amount must be greater than zero');
    });

    it('should reject very small negative amount', () => {
      const result = validateBetAmount(-0.001, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Bet amount must be greater than zero');
    });
  });

  describe('insufficient balance (Requirement 2.4)', () => {
    it('should reject bet exceeding wallet balance', () => {
      const result = validateBetAmount(50, 10, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Insufficient funds: bet amount exceeds wallet balance');
    });

    it('should reject bet when balance is zero', () => {
      const result = validateBetAmount(1, 0, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Insufficient funds: bet amount exceeds wallet balance');
    });

    it('should reject bet slightly exceeding balance', () => {
      const result = validateBetAmount(10.01, 10, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Insufficient funds: bet amount exceeds wallet balance');
    });
  });

  describe('minimum bet validation', () => {
    it('should reject bet below minimum', () => {
      const result = validateBetAmount(0.05, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe(`Bet amount must be at least ${MIN_BET} FLOW`);
    });

    it('should accept bet at exactly minimum', () => {
      const result = validateBetAmount(MIN_BET, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should accept bet just above minimum', () => {
      const result = validateBetAmount(MIN_BET + 0.01, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('maximum bet validation', () => {
    it('should reject bet above maximum', () => {
      const result = validateBetAmount(150, 200, MIN_BET, MAX_BET);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe(`Bet amount cannot exceed ${MAX_BET} FLOW`);
    });

    it('should accept bet at exactly maximum', () => {
      const result = validateBetAmount(MAX_BET, 200, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should accept bet just below maximum', () => {
      const result = validateBetAmount(MAX_BET - 0.01, 200, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('valid bets (Requirement 2.6)', () => {
    it('should accept valid bet within all limits', () => {
      const result = validateBetAmount(5, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should accept bet equal to wallet balance', () => {
      const result = validateBetAmount(50, 50, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should accept bet with custom min/max limits', () => {
      const result = validateBetAmount(5, 100, 1, 50);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very small valid amounts', () => {
      const result = validateBetAmount(0.1, 100, 0.1, 100);
      expect(result.valid).toBe(true);
    });

    it('should handle floating point precision', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      const result = validateBetAmount(0.3, 100, MIN_BET, MAX_BET);
      expect(result.valid).toBe(true);
    });

    it('should use default min/max when not provided', () => {
      const result = validateBetAmount(5, 100);
      expect(result.valid).toBe(true);
    });
  });
});

describe('canCreateBetTransaction', () => {
  it('should return true for valid bet', () => {
    expect(canCreateBetTransaction(5, 100, MIN_BET, MAX_BET)).toBe(true);
  });

  it('should return false for zero amount', () => {
    expect(canCreateBetTransaction(0, 100, MIN_BET, MAX_BET)).toBe(false);
  });

  it('should return false for negative amount', () => {
    expect(canCreateBetTransaction(-5, 100, MIN_BET, MAX_BET)).toBe(false);
  });

  it('should return false for amount exceeding balance', () => {
    expect(canCreateBetTransaction(150, 100, MIN_BET, MAX_BET)).toBe(false);
  });

  it('should return false for amount below minimum', () => {
    expect(canCreateBetTransaction(0.05, 100, MIN_BET, MAX_BET)).toBe(false);
  });

  it('should return false for amount above maximum', () => {
    expect(canCreateBetTransaction(150, 200, MIN_BET, MAX_BET)).toBe(false);
  });

  it('should use default min/max when not provided', () => {
    expect(canCreateBetTransaction(5, 100)).toBe(true);
  });
});

describe('constants', () => {
  it('should have MIN_BET matching contract value', () => {
    expect(MIN_BET).toBe(0.1);
  });

  it('should have MAX_BET matching contract value', () => {
    expect(MAX_BET).toBe(100.0);
  });
});
