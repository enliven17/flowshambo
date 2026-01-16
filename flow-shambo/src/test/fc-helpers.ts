/**
 * Fast-Check Helpers for Property-Based Testing
 * 
 * Configuration and custom arbitraries for FlowShambo property tests.
 * 
 * Property Test Configuration (from design.md):
 * - Minimum iterations: 100
 * - Seed logging for reproducibility
 * - Shrinking enabled for minimal failing examples
 */

import * as fc from 'fast-check';

/**
 * Default fast-check configuration for FlowShambo property tests
 * Ensures minimum 100 iterations with seed logging
 */
export const fcConfig: fc.Parameters<unknown> = {
  numRuns: 100,
  verbose: fc.VerbosityLevel.VeryVerbose,
  // Shrinking is enabled by default in fast-check
};

/**
 * Object types in the game
 */
export const ObjectTypes = ['rock', 'paper', 'scissors'] as const;
export type ObjectType = typeof ObjectTypes[number];

/**
 * Arbitrary for generating valid object types
 */
export const objectTypeArb = fc.constantFrom<ObjectType>(...ObjectTypes);

/**
 * Arena configuration constants
 */
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;
export const OBJECT_RADIUS = 20;
export const MIN_VELOCITY = -5;
export const MAX_VELOCITY = 5;

/**
 * Arbitrary for generating valid X positions within arena bounds
 */
export const validXPositionArb = fc.float({
  min: Math.fround(OBJECT_RADIUS),
  max: Math.fround(ARENA_WIDTH - OBJECT_RADIUS),
  noNaN: true,
});

/**
 * Arbitrary for generating valid Y positions within arena bounds
 */
export const validYPositionArb = fc.float({
  min: Math.fround(OBJECT_RADIUS),
  max: Math.fround(ARENA_HEIGHT - OBJECT_RADIUS),
  noNaN: true,
});

/**
 * Arbitrary for generating velocity components
 */
export const velocityArb = fc.float({
  min: Math.fround(MIN_VELOCITY),
  max: Math.fround(MAX_VELOCITY),
  noNaN: true,
});

/**
 * Arbitrary for generating a valid game object
 */
export interface GameObjectArb {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const gameObjectArb: fc.Arbitrary<GameObjectArb> = fc.record({
  id: fc.uuid(),
  type: objectTypeArb,
  x: validXPositionArb,
  y: validYPositionArb,
  vx: velocityArb,
  vy: velocityArb,
  radius: fc.constant(OBJECT_RADIUS),
});

/**
 * Arbitrary for generating a pair of game objects
 */
export const gameObjectPairArb = fc.tuple(gameObjectArb, gameObjectArb);

/**
 * Arbitrary for generating valid bet amounts
 */
export const MIN_BET = 0.1;
export const MAX_BET = 100;

export const validBetAmountArb = fc.float({
  min: Math.fround(MIN_BET),
  max: Math.fround(MAX_BET),
  noNaN: true,
});

/**
 * Arbitrary for generating wallet balances
 */
export const walletBalanceArb = fc.float({
  min: Math.fround(0),
  max: Math.fround(1000),
  noNaN: true,
});

/**
 * Arbitrary for generating bet amount and balance pairs
 */
export const betAndBalanceArb = fc.record({
  betAmount: fc.float({ min: Math.fround(-10), max: Math.fround(200), noNaN: true }),
  walletBalance: walletBalanceArb,
});

/**
 * Arbitrary for generating random seeds (UInt256 represented as bigint)
 */
export const seedArb = fc.bigInt({ min: BigInt(0), max: BigInt(2) ** BigInt(256) - BigInt(1) });

/**
 * Arbitrary for generating time deltas (in seconds)
 */
export const timeDeltaArb = fc.float({
  min: Math.fround(0.001),
  max: Math.fround(0.1),
  noNaN: true,
});

/**
 * Arbitrary for generating payout multipliers
 */
export const payoutMultiplierArb = fc.float({
  min: Math.fround(1.5),
  max: Math.fround(3.0),
  noNaN: true,
});

/**
 * Helper to run a property test with standard configuration
 */
export function runProperty<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void
): void {
  fc.assert(
    fc.property(arbitrary, predicate),
    { ...fcConfig, seed: Date.now() }
  );
}

/**
 * Helper to create a seeded property test for reproducibility
 */
export function runSeededProperty<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void,
  seed: number
): void {
  fc.assert(
    fc.property(arbitrary, predicate),
    { ...fcConfig, seed }
  );
}
