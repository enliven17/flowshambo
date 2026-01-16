/**
 * Unit tests for collision detection module
 * Tests the getDistance and detectCollision functions
 */

import { describe, it, expect } from 'vitest';
import { getDistance, detectCollision } from './collision';
import type { GameObject } from '../../types/game';

/**
 * Helper to create a minimal GameObject for testing
 */
function createObject(
  id: string,
  x: number,
  y: number,
  radius: number = 10
): GameObject {
  return {
    id,
    type: 'rock',
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
  };
}

describe('getDistance', () => {
  it('should return 0 for objects at the same position', () => {
    const a = createObject('a', 100, 100);
    const b = createObject('b', 100, 100);
    
    expect(getDistance(a, b)).toBe(0);
  });

  it('should calculate horizontal distance correctly', () => {
    const a = createObject('a', 0, 0);
    const b = createObject('b', 10, 0);
    
    expect(getDistance(a, b)).toBe(10);
  });

  it('should calculate vertical distance correctly', () => {
    const a = createObject('a', 0, 0);
    const b = createObject('b', 0, 15);
    
    expect(getDistance(a, b)).toBe(15);
  });

  it('should calculate diagonal distance correctly (3-4-5 triangle)', () => {
    const a = createObject('a', 0, 0);
    const b = createObject('b', 3, 4);
    
    expect(getDistance(a, b)).toBe(5);
  });

  it('should handle negative coordinates', () => {
    const a = createObject('a', -5, -5);
    const b = createObject('b', -5, -10);
    
    expect(getDistance(a, b)).toBe(5);
  });

  it('should be symmetric (distance a to b equals distance b to a)', () => {
    const a = createObject('a', 10, 20);
    const b = createObject('b', 30, 50);
    
    expect(getDistance(a, b)).toBe(getDistance(b, a));
  });
});

describe('detectCollision', () => {
  it('should detect collision when objects overlap completely (same position)', () => {
    const a = createObject('a', 100, 100, 10);
    const b = createObject('b', 100, 100, 10);
    
    expect(detectCollision(a, b)).toBe(true);
  });

  it('should detect collision when objects partially overlap', () => {
    const a = createObject('a', 0, 0, 10);
    const b = createObject('b', 15, 0, 10);
    // Distance is 15, sum of radii is 20, so they overlap
    
    expect(detectCollision(a, b)).toBe(true);
  });

  it('should not detect collision when objects are far apart', () => {
    const a = createObject('a', 0, 0, 10);
    const b = createObject('b', 100, 0, 10);
    // Distance is 100, sum of radii is 20, so no collision
    
    expect(detectCollision(a, b)).toBe(false);
  });

  it('should not detect collision when objects are exactly touching (edge case)', () => {
    const a = createObject('a', 0, 0, 10);
    const b = createObject('b', 20, 0, 10);
    // Distance is 20, sum of radii is 20, distance is NOT less than sum
    
    expect(detectCollision(a, b)).toBe(false);
  });

  it('should detect collision when objects are just barely overlapping', () => {
    const a = createObject('a', 0, 0, 10);
    const b = createObject('b', 19.9, 0, 10);
    // Distance is 19.9, sum of radii is 20, so they overlap
    
    expect(detectCollision(a, b)).toBe(true);
  });

  it('should handle objects with different radii', () => {
    const a = createObject('a', 0, 0, 5);
    const b = createObject('b', 10, 0, 10);
    // Distance is 10, sum of radii is 15, so they overlap
    
    expect(detectCollision(a, b)).toBe(true);
  });

  it('should be symmetric (collision a,b equals collision b,a)', () => {
    const a = createObject('a', 0, 0, 10);
    const b = createObject('b', 15, 0, 10);
    
    expect(detectCollision(a, b)).toBe(detectCollision(b, a));
  });

  it('should handle diagonal collisions', () => {
    const a = createObject('a', 0, 0, 10);
    const b = createObject('b', 10, 10, 10);
    // Distance is sqrt(200) ≈ 14.14, sum of radii is 20, so they overlap
    
    expect(detectCollision(a, b)).toBe(true);
  });

  it('should handle very small radii', () => {
    const a = createObject('a', 0, 0, 0.5);
    const b = createObject('b', 0.8, 0, 0.5);
    // Distance is 0.8, sum of radii is 1.0, so they overlap
    
    expect(detectCollision(a, b)).toBe(true);
  });
});
