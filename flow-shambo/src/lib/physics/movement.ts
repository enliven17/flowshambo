/**
 * Physics movement module for FlowShambo
 * Handles object position updates and wall collision/bounce mechanics
 * 
 * @module physics/movement
 */

import type { GameObject, ArenaConfig } from '../../types/game';

/**
 * Update an object's position based on its velocity and elapsed time
 * 
 * Implements linear motion: new position = old position + velocity * time
 * This function mutates the object in place for performance.
 * 
 * @param object - The game object to update (mutated in place)
 * @param deltaTime - Time elapsed in seconds
 * 
 * @example
 * ```typescript
 * const obj: GameObject = { id: '1', type: 'rock', x: 100, y: 100, vx: 50, vy: -30, radius: 10 };
 * updatePosition(obj, 0.5); // After 0.5 seconds
 * // obj.x is now 125 (100 + 50 * 0.5)
 * // obj.y is now 85 (100 + (-30) * 0.5)
 * ```
 * 
 * **Validates: Requirements 4.2**
 * **Property 6: Physics Movement Correctness**
 */
export function updatePosition(object: GameObject, deltaTime: number): void {
  object.x = object.x + object.vx * deltaTime;
  object.y = object.y + object.vy * deltaTime;
}

/**
 * Handle wall collisions by reflecting velocity and clamping position
 * 
 * When an object reaches an arena boundary:
 * - The velocity component perpendicular to that boundary is negated
 * - The parallel component remains unchanged
 * - The position is clamped to stay within bounds
 * 
 * Specifically:
 * - Hitting left wall (x < radius): negate vx, clamp x to radius
 * - Hitting right wall (x > width - radius): negate vx, clamp x to width - radius
 * - Hitting top wall (y < radius): negate vy, clamp y to radius
 * - Hitting bottom wall (y > height - radius): negate vy, clamp y to height - radius
 * 
 * @param object - The game object to check and update (mutated in place)
 * @param arena - The arena configuration with dimensions
 * 
 * @example
 * ```typescript
 * const arena: ArenaConfig = { width: 800, height: 600, objectRadius: 10, objectsPerType: 5 };
 * const obj: GameObject = { id: '1', type: 'rock', x: -5, y: 100, vx: -50, vy: 30, radius: 10 };
 * handleWallCollision(obj, arena);
 * // obj.x is now 10 (clamped to radius)
 * // obj.vx is now 50 (negated)
 * // obj.vy remains 30 (unchanged)
 * ```
 * 
 * **Validates: Requirements 4.3**
 * **Property 7: Wall Bounce Reflection**
 */
export function handleWallCollision(object: GameObject, arena: ArenaConfig): boolean {
  const minX = object.radius;
  const maxX = arena.width - object.radius;
  const minY = object.radius;
  const maxY = arena.height - object.radius;

  let collided = false;

  // Check left wall collision
  if (object.x <= minX) {
    object.x = minX;
    // Only bounce if moving towards wall
    if (object.vx < 0) {
      object.vx = -object.vx;
      collided = true;
    }
  }
  // Check right wall collision
  else if (object.x >= maxX) {
    object.x = maxX;
    // Only bounce if moving towards wall
    if (object.vx > 0) {
      object.vx = -object.vx;
      collided = true;
    }
  }

  // Check top wall collision
  if (object.y <= minY) {
    object.y = minY;
    // Only bounce if moving towards wall
    if (object.vy < 0) {
      object.vy = -object.vy;
      collided = true;
    }
  }
  // Check bottom wall collision
  else if (object.y >= maxY) {
    object.y = maxY;
    // Only bounce if moving towards wall
    if (object.vy > 0) {
      object.vy = -object.vy;
      collided = true;
    }
  }

  return collided;
}
