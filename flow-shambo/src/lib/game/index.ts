/**
 * Game Module for FlowShambo
 * Exports game completion logic, generation utilities, and related functions
 * 
 * @module game
 */

export {
  checkGameComplete,
  getObjectCounts,
  getWinnerByMajority,
  determineWinner
} from './completion';

export {
  SeededRandom,
  generateObjectsFromSeed,
  DEFAULT_ARENA_CONFIG
} from './generation';
