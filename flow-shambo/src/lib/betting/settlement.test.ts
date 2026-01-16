/**
 * Unit tests for settlement calculation module
 * Tests payout calculation based on game outcomes
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePayout,
  didPlayerWin,
  calculateSettlement,
  PAYOUT_MULTIPLIER,
} from './settlement';
import type { ObjectType } from '../../types';

describe('settlement', () => {
  describe('PAYOUT_MULTIPLIER', () => {
    it('should be 2.5 to match the contract', () => {
      expect(PAYOUT_MULTIPLIER).toBe(2.5);
    });
  });

  describe('didPlayerWin', () => {
    it('should return true when prediction matches winner', () => {
      expect(didPlayerWin('rock', 'rock')).toBe(true);
      expect(didPlayerWin('paper', 'paper')).toBe(true);
      expect(didPlayerWin('scissors', 'scissors')).toBe(true);
    });

    it('should return false when prediction does not match winner', () => {
      expect(didPlayerWin('rock', 'paper')).toBe(false);
      expect(didPlayerWin('rock', 'scissors')).toBe(false);
      expect(didPlayerWin('paper', 'rock')).toBe(false);
      expect(didPlayerWin('paper', 'scissors')).toBe(false);
      expect(didPlayerWin('scissors', 'rock')).toBe(false);
      expect(didPlayerWin('scissors', 'paper')).toBe(false);
    });
  });

  describe('calculatePayout', () => {
    describe('winning cases', () => {
      it('should return bet * multiplier when prediction matches winner', () => {
        expect(calculatePayout(10, 'rock', 'rock')).toBe(25);
        expect(calculatePayout(10, 'paper', 'paper')).toBe(25);
        expect(calculatePayout(10, 'scissors', 'scissors')).toBe(25);
      });

      it('should handle various bet amounts correctly', () => {
        expect(calculatePayout(1, 'rock', 'rock')).toBe(2.5);
        expect(calculatePayout(0.1, 'rock', 'rock')).toBeCloseTo(0.25);
        expect(calculatePayout(100, 'rock', 'rock')).toBe(250);
        expect(calculatePayout(50.5, 'paper', 'paper')).toBe(126.25);
      });
    });

    describe('losing cases', () => {
      it('should return 0 when prediction does not match winner', () => {
        expect(calculatePayout(10, 'rock', 'paper')).toBe(0);
        expect(calculatePayout(10, 'rock', 'scissors')).toBe(0);
        expect(calculatePayout(10, 'paper', 'rock')).toBe(0);
        expect(calculatePayout(10, 'paper', 'scissors')).toBe(0);
        expect(calculatePayout(10, 'scissors', 'rock')).toBe(0);
        expect(calculatePayout(10, 'scissors', 'paper')).toBe(0);
      });

      it('should return 0 regardless of bet amount when losing', () => {
        expect(calculatePayout(1, 'rock', 'paper')).toBe(0);
        expect(calculatePayout(100, 'rock', 'paper')).toBe(0);
        expect(calculatePayout(0.1, 'rock', 'paper')).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle zero bet amount', () => {
        expect(calculatePayout(0, 'rock', 'rock')).toBe(0);
        expect(calculatePayout(0, 'rock', 'paper')).toBe(0);
      });
    });
  });

  describe('calculateSettlement', () => {
    it('should return correct settlement for winning bet', () => {
      const result = calculateSettlement(10, 'rock', 'rock');
      expect(result.playerWon).toBe(true);
      expect(result.payout).toBe(25);
      expect(result.profit).toBe(15); // 25 - 10
    });

    it('should return correct settlement for losing bet', () => {
      const result = calculateSettlement(10, 'rock', 'paper');
      expect(result.playerWon).toBe(false);
      expect(result.payout).toBe(0);
      expect(result.profit).toBe(-10); // 0 - 10
    });

    it('should calculate profit correctly for various amounts', () => {
      // Winning: profit = (bet * 2.5) - bet = bet * 1.5
      const win = calculateSettlement(20, 'scissors', 'scissors');
      expect(win.profit).toBe(30); // 50 - 20

      // Losing: profit = 0 - bet = -bet
      const loss = calculateSettlement(20, 'scissors', 'rock');
      expect(loss.profit).toBe(-20);
    });

    it('should handle all prediction/winner combinations', () => {
      const types: ObjectType[] = ['rock', 'paper', 'scissors'];
      
      for (const prediction of types) {
        for (const winner of types) {
          const result = calculateSettlement(10, prediction, winner);
          
          if (prediction === winner) {
            expect(result.playerWon).toBe(true);
            expect(result.payout).toBe(25);
            expect(result.profit).toBe(15);
          } else {
            expect(result.playerWon).toBe(false);
            expect(result.payout).toBe(0);
            expect(result.profit).toBe(-10);
          }
        }
      }
    });
  });
});
