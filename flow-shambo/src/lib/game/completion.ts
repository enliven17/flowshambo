/**
 * Game Completion Logic for FlowShambo
 * Handles game completion detection and winner determination
 * 
 * @module game/completion
 */

import type { GameObject, ObjectType, ObjectCounts } from '../../types/game';

/**
 * Tiebreaker priority for determining winner when counts are equal
 * Rock > Paper > Scissors (deterministic ordering)
 * 
 * **Validates: Requirements 5.6**
 */
const TIEBREAKER_PRIORITY: ObjectType[] = ['rock', 'paper', 'scissors'];

/**
 * Check if the game is complete
 * 
 * A game is complete when all remaining objects are of the same type.
 * While objects of multiple types exist, the simulation should continue.
 * 
 * @param objects - Array of game objects currently in the arena
 * @returns true if only one type remains (or no objects), false otherwise
 * 
 * @example
 * ```typescript
 * // All rocks - game complete
 * checkGameComplete([
 *   { id: '1', type: 'rock', x: 0, y: 0, vx: 0, vy: 0, radius: 15 },
 *   { id: '2', type: 'rock', x: 50, y: 50, vx: 0, vy: 0, radius: 15 }
 * ]); // returns true
 * 
 * // Mixed types - game continues
 * checkGameComplete([
 *   { id: '1', type: 'rock', x: 0, y: 0, vx: 0, vy: 0, radius: 15 },
 *   { id: '2', type: 'paper', x: 50, y: 50, vx: 0, vy: 0, radius: 15 }
 * ]); // returns false
 * ```
 * 
 * **Validates: Requirements 5.3, 5.4**
 */
export function checkGameComplete(objects: GameObject[]): boolean {
  // Empty array means game is complete (edge case)
  if (objects.length === 0) {
    return true;
  }

  // Count unique types present
  const uniqueTypes = new Set<ObjectType>();
  for (const obj of objects) {
    uniqueTypes.add(obj.type);
  }

  // Game is complete if only one type remains
  return uniqueTypes.size <= 1;
}

/**
 * Get the count of each object type from an array of objects
 * 
 * @param objects - Array of game objects
 * @returns Object counts for rock, paper, and scissors
 * 
 * @example
 * ```typescript
 * const counts = getObjectCounts(objects);
 * // { rock: 5, paper: 3, scissors: 2 }
 * ```
 */
export function getObjectCounts(objects: GameObject[]): ObjectCounts {
  const counts: ObjectCounts = {
    rock: 0,
    paper: 0,
    scissors: 0
  };

  for (const obj of objects) {
    counts[obj.type]++;
  }

  return counts;
}

/**
 * Get the winner by majority count with deterministic tiebreaker
 * 
 * For timeout scenarios, the winning type is the type with the highest object count.
 * In case of a tie, a deterministic tiebreaker is applied: Rock > Paper > Scissors.
 * 
 * @param counts - Object counts for each type
 * @returns The winning object type based on majority count
 * 
 * @example
 * ```typescript
 * // Clear majority
 * getWinnerByMajority({ rock: 5, paper: 3, scissors: 2 }); // returns 'rock'
 * 
 * // Tie between rock and paper - rock wins (tiebreaker)
 * getWinnerByMajority({ rock: 5, paper: 5, scissors: 0 }); // returns 'rock'
 * 
 * // Three-way tie - rock wins (tiebreaker)
 * getWinnerByMajority({ rock: 3, paper: 3, scissors: 3 }); // returns 'rock'
 * ```
 * 
 * **Validates: Requirements 5.6**
 */
export function getWinnerByMajority(counts: ObjectCounts): ObjectType {
  let maxCount = -1;
  let winner: ObjectType = 'rock'; // Default to rock (highest priority in tiebreaker)

  // Iterate in tiebreaker priority order
  // This ensures that in case of a tie, the type with higher priority wins
  for (const type of TIEBREAKER_PRIORITY) {
    if (counts[type] > maxCount) {
      maxCount = counts[type];
      winner = type;
    }
  }

  return winner;
}

/**
 * Determine the winner of a game
 * 
 * This is the main function to determine the winner based on the current game state.
 * 
 * - If the game is complete (one type remaining), returns that type
 * - If timeout is true, returns the winner by majority count with tiebreaker
 * - If the game is not complete and not timed out, returns null
 * 
 * @param objects - Array of game objects currently in the arena
 * @param isTimeout - Whether the game has exceeded maximum duration
 * @returns The winning object type, or null if game is still in progress
 * 
 * @example
 * ```typescript
 * // Game complete - one type remaining
 * determineWinner(allRockObjects, false); // returns 'rock'
 * 
 * // Timeout - determine by majority
 * determineWinner(mixedObjects, true); // returns type with most objects
 * 
 * // Game in progress
 * determineWinner(mixedObjects, false); // returns null
 * ```
 * 
 * **Validates: Requirements 5.3, 5.4, 5.5, 5.6**
 */
export function determineWinner(objects: GameObject[], isTimeout: boolean): ObjectType | null {
  // Handle empty objects array
  if (objects.length === 0) {
    // No objects means no winner
    return null;
  }

  // Check if game is naturally complete (one type remaining)
  if (checkGameComplete(objects)) {
    // Return the type of the first object (all objects have the same type)
    return objects[0].type;
  }

  // If timeout, determine winner by majority
  if (isTimeout) {
    const counts = getObjectCounts(objects);
    return getWinnerByMajority(counts);
  }

  // Game is still in progress
  return null;
}
