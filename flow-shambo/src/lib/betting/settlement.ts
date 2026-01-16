/**
 * Settlement calculation module for FlowShambo
 * Handles payout calculation based on game outcome
 * 
 * @module betting/settlement
 */

import type { ObjectType } from '../../types';

/**
 * Payout multiplier for winning bets
 * Matches the PAYOUT_MULTIPLIER constant in the FlowShambo Cadence contract
 * 
 * When a player wins, they receive their bet amount multiplied by this value.
 * For example, a 10 FLOW bet with a 2.5x multiplier returns 25 FLOW.
 */
export const PAYOUT_MULTIPLIER = 2.5;

/**
 * Determines if the player won based on their prediction and the winning type
 * 
 * @param prediction - The player's predicted winning type
 * @param winner - The actual winning type from the game
 * @returns true if the prediction matches the winner, false otherwise
 * 
 * @example
 * ```typescript
 * didPlayerWin('rock', 'rock');    // true
 * didPlayerWin('rock', 'paper');   // false
 * didPlayerWin('scissors', 'scissors'); // true
 * ```
 * 
 * @validates Requirements 6.1
 */
export function didPlayerWin(prediction: ObjectType, winner: ObjectType): boolean {
  return prediction === winner;
}

/**
 * Calculates the payout for a completed game
 * 
 * Settlement rules (from design Property 14):
 * - If prediction equals winner: payout = betAmount * PAYOUT_MULTIPLIER
 * - If prediction does not equal winner: payout = 0 (bet is forfeited)
 * 
 * @param betAmount - The amount of FLOW tokens bet
 * @param prediction - The player's predicted winning type
 * @param winner - The actual winning type from the game
 * @returns The payout amount (0 if lost, betAmount * PAYOUT_MULTIPLIER if won)
 * 
 * @example
 * ```typescript
 * // Player wins with 10 FLOW bet
 * calculatePayout(10, 'rock', 'rock');    // 25 (10 * 2.5)
 * 
 * // Player loses with 10 FLOW bet
 * calculatePayout(10, 'rock', 'paper');   // 0
 * 
 * // Edge case: zero bet
 * calculatePayout(0, 'rock', 'rock');     // 0
 * ```
 * 
 * @validates Requirements 6.1, 6.2, 6.4
 */
export function calculatePayout(
  betAmount: number,
  prediction: ObjectType,
  winner: ObjectType
): number {
  // Property 14: If prediction equals winner, payout = bet * multiplier
  if (didPlayerWin(prediction, winner)) {
    return betAmount * PAYOUT_MULTIPLIER;
  }
  
  // Property 14: If prediction does not equal winner, payout = 0
  return 0;
}

/**
 * Calculates the settlement result with detailed information
 * 
 * @param betAmount - The amount of FLOW tokens bet
 * @param prediction - The player's predicted winning type
 * @param winner - The actual winning type from the game
 * @returns Settlement result object with win status, payout, and profit/loss
 * 
 * @example
 * ```typescript
 * const result = calculateSettlement(10, 'rock', 'rock');
 * // { playerWon: true, payout: 25, profit: 15 }
 * 
 * const result = calculateSettlement(10, 'rock', 'paper');
 * // { playerWon: false, payout: 0, profit: -10 }
 * ```
 */
export interface SettlementResult {
  /** Whether the player won the bet */
  playerWon: boolean;
  /** The payout amount (0 if lost) */
  payout: number;
  /** Net profit/loss (payout - betAmount) */
  profit: number;
}

export function calculateSettlement(
  betAmount: number,
  prediction: ObjectType,
  winner: ObjectType
): SettlementResult {
  const playerWon = didPlayerWin(prediction, winner);
  const payout = calculatePayout(betAmount, prediction, winner);
  const profit = payout - betAmount;
  
  return {
    playerWon,
    payout,
    profit,
  };
}
