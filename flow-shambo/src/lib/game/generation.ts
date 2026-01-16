/**
 * Deterministic Object Generation Module for FlowShambo
 * 
 * Generates game objects from a seed using a seeded PRNG (Linear Congruential Generator).
 * Ensures deterministic, reproducible object configurations for verifiable fairness.
 * 
 * @module generation
 */

import type { GameObject, ArenaConfig, ObjectType } from '../../types';

/**
 * Seeded Pseudo-Random Number Generator using Linear Congruential Generator (LCG)
 * 
 * Uses the same parameters as the MINSTD generator:
 * - Multiplier (a): 48271
 * - Modulus (m): 2^31 - 1 (2147483647)
 * - Increment (c): 0
 * 
 * Formula: next = (a * current) mod m
 */
export class SeededRandom {
  private state: bigint;
  
  // LCG parameters (MINSTD)
  private static readonly MULTIPLIER = BigInt(48271);
  private static readonly MODULUS = BigInt(2147483647); // 2^31 - 1
  
  /**
   * Creates a new SeededRandom instance
   * @param seed - The initial seed value (bigint or string representation)
   */
  constructor(seed: bigint | string) {
    // Convert string to bigint if needed
    const seedValue = typeof seed === 'string' ? BigInt(seed) : seed;
    
    // Ensure seed is positive and within modulus range
    // Use absolute value and mod to get a valid starting state
    let normalizedSeed = seedValue % SeededRandom.MODULUS;
    if (normalizedSeed < BigInt(0)) {
      normalizedSeed = -normalizedSeed;
    }
    // Ensure non-zero seed (LCG with 0 seed stays at 0)
    this.state = normalizedSeed === BigInt(0) ? BigInt(1) : normalizedSeed;
  }
  
  /**
   * Generates the next random number in the sequence
   * @returns A number between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    this.state = (SeededRandom.MULTIPLIER * this.state) % SeededRandom.MODULUS;
    return Number(this.state) / Number(SeededRandom.MODULUS);
  }
  
  /**
   * Generates a random number within a range
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns A number between min and max
   */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  /**
   * Generates a random integer within a range
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns An integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max));
  }
}

/**
 * Object types in order for deterministic generation
 */
const OBJECT_TYPES: ObjectType[] = ['rock', 'paper', 'scissors'];

/**
 * Velocity configuration for object generation
 */
const VELOCITY_CONFIG = {
  minSpeed: 50,   // Minimum speed in pixels per second
  maxSpeed: 150,  // Maximum speed in pixels per second
};

/**
 * Calculates the distance between two points
 */
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if a position overlaps with any existing objects
 * @param x - X coordinate to check
 * @param y - Y coordinate to check
 * @param radius - Radius of the new object
 * @param existingObjects - Array of existing objects to check against
 * @returns true if the position overlaps with any existing object
 */
function hasOverlap(
  x: number,
  y: number,
  radius: number,
  existingObjects: GameObject[]
): boolean {
  for (const obj of existingObjects) {
    const distance = getDistance(x, y, obj.x, obj.y);
    const minDistance = radius + obj.radius;
    if (distance < minDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a valid position within bounds that doesn't overlap with existing objects
 * @param rng - Seeded random number generator
 * @param config - Arena configuration
 * @param radius - Object radius
 * @param existingObjects - Existing objects to avoid overlapping
 * @param maxAttempts - Maximum attempts to find a valid position
 * @returns A valid {x, y} position or null if no valid position found
 */
function generateValidPosition(
  rng: SeededRandom,
  config: ArenaConfig,
  radius: number,
  existingObjects: GameObject[],
  maxAttempts: number = 100
): { x: number; y: number } | null {
  // Calculate valid bounds (position must keep object fully within arena)
  const minX = radius;
  const maxX = config.width - radius;
  const minY = radius;
  const maxY = config.height - radius;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = rng.nextRange(minX, maxX);
    const y = rng.nextRange(minY, maxY);
    
    if (!hasOverlap(x, y, radius, existingObjects)) {
      return { x, y };
    }
  }
  
  return null;
}

/**
 * Generates a random velocity vector
 * @param rng - Seeded random number generator
 * @returns Velocity components {vx, vy}
 */
function generateVelocity(rng: SeededRandom): { vx: number; vy: number } {
  // Generate random angle (0 to 2π)
  const angle = rng.nextRange(0, 2 * Math.PI);
  
  // Generate random speed within configured range
  const speed = rng.nextRange(VELOCITY_CONFIG.minSpeed, VELOCITY_CONFIG.maxSpeed);
  
  // Convert polar to cartesian
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  
  return { vx, vy };
}

/**
 * Generates game objects deterministically from a seed
 * 
 * This function creates a set of game objects with positions and velocities
 * derived from the provided seed. The same seed will always produce the
 * same object configuration.
 * 
 * Properties guaranteed:
 * - Deterministic: Same seed produces identical results
 * - Bounded: All positions are within arena bounds (accounting for radius)
 * - Non-overlapping: No two objects spawn at overlapping positions
 * 
 * @param seed - Random seed (bigint or string representation)
 * @param config - Arena configuration
 * @returns Array of generated game objects
 * @throws Error if unable to place all objects without overlap
 */
export function generateObjectsFromSeed(
  seed: bigint | string,
  config: ArenaConfig
): GameObject[] {
  const rng = new SeededRandom(seed);
  const objects: GameObject[] = [];
  
  const totalObjects = config.objectsPerType * OBJECT_TYPES.length;
  let objectId = 0;
  
  // Generate objects for each type
  for (const type of OBJECT_TYPES) {
    for (let i = 0; i < config.objectsPerType; i++) {
      // Generate a valid non-overlapping position
      const position = generateValidPosition(
        rng,
        config,
        config.objectRadius,
        objects
      );
      
      if (position === null) {
        throw new Error(
          `Unable to place object ${objectId + 1} of ${totalObjects} without overlap. ` +
          `Arena may be too small for the number of objects.`
        );
      }
      
      // Generate velocity
      const velocity = generateVelocity(rng);
      
      // Create the game object
      const gameObject: GameObject = {
        id: `obj-${objectId}`,
        type,
        x: position.x,
        y: position.y,
        vx: velocity.vx,
        vy: velocity.vy,
        radius: config.objectRadius,
      };
      
      objects.push(gameObject);
      objectId++;
    }
  }
  
  return objects;
}

/**
 * Default arena configuration matching the design spec
 */
export const DEFAULT_ARENA_CONFIG: ArenaConfig = {
  width: 800,
  height: 600,
  objectRadius: 15,
  objectsPerType: 5,
};
