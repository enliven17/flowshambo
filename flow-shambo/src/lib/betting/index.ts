/**
 * Betting module for FlowShambo
 * Provides bet validation and settlement functionality
 * 
 * @module betting
 */

// Validation exports
export {
  validateBetAmount,
  canCreateBetTransaction,
  MIN_BET,
  MAX_BET,
} from './validation';

// Settlement exports
export {
  calculatePayout,
  didPlayerWin,
  calculateSettlement,
  PAYOUT_MULTIPLIER,
  type SettlementResult,
} from './settlement';
