/**
 * Collision detection module for FlowShambo physics engine
 * Implements circle-circle collision detection for game objects
 * 
 * @module physics/collision
 */

import type { GameObject } from '../../types/game';

/**
 * Calculate the Euclidean distance between two game objects
 * 
 * @param a - First game object
 * @param b - Second game object
 * @returns The distance between the centers of the two objects
 */
export function getDistance(a: GameObject, b: GameObject): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Detect if two game objects are colliding using circle-circle collision detection
 * 
 * A collision is detected when the distance between the centers of two objects
 * is less than the sum of their radii.
 * 
 * @param a - First game object
 * @param b - Second game object
 * @returns true if the objects are colliding, false otherwise
 * 
 * @example
 * ```typescript
 * const obj1: GameObject = { id: '1', type: 'rock', x: 0, y: 0, vx: 1, vy: 0, radius: 10 };
 * const obj2: GameObject = { id: '2', type: 'paper', x: 15, y: 0, vx: -1, vy: 0, radius: 10 };
 * detectCollision(obj1, obj2); // true (distance 15 < sum of radii 20)
 * ```
 * 
 * **Validates: Requirements 4.4**
 */
export function detectCollision(a: GameObject, b: GameObject): boolean {
  const distance = getDistance(a, b);
  return distance < (a.radius + b.radius);
}
