
/**
 * Game Object Generator
 * 
 * Ports the deterministic logic from FlowShambo.cdc to TypeScript
 * to generate the exact same initial game state on the client side
 * using the seed provided by the contract events.
 */

import { ObjectInit, ObjectType } from '../../types/game';

// Game Configuration Constants (must match contract)
const OBJECTS_PER_TYPE = 5;
const ARENA_WIDTH = 800.0;
const ARENA_HEIGHT = 600.0;
const OBJECT_RADIUS = 20.0;
const MIN_VELOCITY = 50.0;
const MAX_VELOCITY = 150.0;

// LCG parameters (must match contract)
// m = 2^31 - 1 (Mersenne prime)
const M = 2147483647n;
const A = 48271n;
const C = 0n;

/**
 * Simple PRNG: Linear Congruential Generator
 * Matches: access(self) fun nextRandom(_ seed: UInt256): UInt256
 */
function nextRandom(seed: bigint): bigint {
    const reducedSeed = seed % M;
    return (A * reducedSeed + C) % M;
}

/**
 * Generate a random number in range [min, max)
 * Matches: access(self) fun randomInRange(seed: UInt256, min: UFix64, max: UFix64): UFix64
 */
function randomInRange(seed: bigint, min: number, max: number): number {
    const range = max - min;
    // Convert seed to a fraction [0, 1)
    // contract uses UFix64(seed % 1000000) / 1000000.0
    const fraction = Number(seed % 1000000n) / 1000000.0;
    return min + (range * fraction);
}

/**
 * Generate a random velocity
 * Matches: access(self) fun randomVelocity(seed: UInt256): Fix64
 */
function randomVelocity(seed: bigint): number {
    const magnitude = randomInRange(seed, MIN_VELOCITY, MAX_VELOCITY);
    const isNegative = (seed % 2n) === 1n;
    return isNegative ? magnitude * -1.0 : magnitude;
}

/**
 * Generate all game objects deterministically from seed
 * Matches: access(self) fun generateObjects(seed: UInt256): [ObjectInit]
 */
export function generateObjects(seedStr: string): ObjectInit[] {
    let currentSeed = BigInt(seedStr);
    const objects: ObjectInit[] = [];
    const positions: [number, number][] = [];

    // Generate objects for each type: 0=Rock, 1=Paper, 2=Scissors
    for (let objectType = 0; objectType < 3; objectType++) {
        for (let count = 0; count < OBJECTS_PER_TYPE; count++) {
            let x = 0;
            let y = 0;
            let validPosition = false;
            let attempts = 0;

            while (!validPosition && attempts < 100) {
                // Generate X
                currentSeed = nextRandom(currentSeed);
                x = randomInRange(currentSeed, OBJECT_RADIUS, ARENA_WIDTH - OBJECT_RADIUS);

                // Generate Y
                currentSeed = nextRandom(currentSeed);
                y = randomInRange(currentSeed, OBJECT_RADIUS, ARENA_HEIGHT - OBJECT_RADIUS);

                // Check for overlaps
                validPosition = true;
                for (const pos of positions) {
                    const dx = x - pos[0];
                    const dy = y - pos[1];
                    const distSquared = dx * dx + dy * dy;
                    const minDist = OBJECT_RADIUS * 2.0;
                    if (distSquared < minDist * minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            positions.push([x, y]);

            // Generate velocities
            currentSeed = nextRandom(currentSeed);
            const vx = randomVelocity(currentSeed);

            currentSeed = nextRandom(currentSeed);
            const vy = randomVelocity(currentSeed);

            objects.push({
                objectType: objectType, // 0, 1, or 2
                x,
                y,
                vx,
                vy
            });
        }
    }

    return objects;
}
