/**
 * RPS (Rock-Paper-Scissors) transformation logic for FlowShambo
 * Implements the classic RPS rules for determining winners and transforming objects
 * 
 * @module physics/rps
 */

import type { GameObject, ObjectType } from '../../types/game';

/**
 * Determine the winner between two object types based on RPS rules
 * 
 * Rules:
 * - Rock beats Scissors
 * - Scissors beats Paper
 * - Paper beats Rock
 * - Same types result in no winner (null)
 * 
 * @param a - First object type
 * @param b - Second object type
 * @returns The winning type, or null if same type (no transformation)
 * 
 * @example
 * ```typescript
 * getWinner('rock', 'scissors'); // 'rock'
 * getWinner('scissors', 'paper'); // 'scissors'
 * getWinner('paper', 'rock'); // 'paper'
 * getWinner('rock', 'rock'); // null
 * ```
 * 
 * **Validates: Requirements 4.5**
 */
export function getWinner(a: ObjectType, b: ObjectType): ObjectType | null {
  // Same type, no transformation
  if (a === b) return null;
  
  // Rock beats Scissors
  if (a === 'rock' && b === 'scissors') return 'rock';
  if (b === 'rock' && a === 'scissors') return 'rock';
  
  // Scissors beats Paper
  if (a === 'scissors' && b === 'paper') return 'scissors';
  if (b === 'scissors' && a === 'paper') return 'scissors';
  
  // Paper beats Rock
  if (a === 'paper' && b === 'rock') return 'paper';
  if (b === 'paper' && a === 'rock') return 'paper';
  
  return null;
}

/**
 * Resolve an RPS collision by transforming the loser to the winner's type
 * 
 * When two objects of different types collide, the losing object transforms
 * to match the winning object's type. This mutates the loser object directly.
 * 
 * @param winner - The winning game object (its type determines the transformation)
 * @param loser - The losing game object (will be transformed to winner's type)
 * 
 * @example
 * ```typescript
 * const rock: GameObject = { id: '1', type: 'rock', x: 0, y: 0, vx: 1, vy: 0, radius: 10 };
 * const scissors: GameObject = { id: '2', type: 'scissors', x: 15, y: 0, vx: -1, vy: 0, radius: 10 };
 * resolveRPSCollision(rock, scissors);
 * // scissors.type is now 'rock'
 * ```
 * 
 * **Validates: Requirements 4.5**
 */
export function resolveRPSCollision(
  winner: GameObject,
  loser: GameObject
): void {
  // Loser transforms to winner's type
  loser.type = winner.type;
}
