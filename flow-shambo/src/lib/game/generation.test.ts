/**
 * Unit tests for the generation module
 * Tests deterministic object generation from seed
 */

import { describe, it, expect } from 'vitest';
import {
  SeededRandom,
  generateObjectsFromSeed,
  DEFAULT_ARENA_CONFIG,
} from './generation';
import type { ArenaConfig } from '../../types';

describe('SeededRandom', () => {
  describe('constructor', () => {
    it('should accept bigint seed', () => {
      const rng = new SeededRandom(BigInt(12345));
      expect(rng.next()).toBeGreaterThanOrEqual(0);
      expect(rng.next()).toBeLessThan(1);
    });

    it('should accept string seed', () => {
      const rng = new SeededRandom('12345');
      expect(rng.next()).toBeGreaterThanOrEqual(0);
      expect(rng.next()).toBeLessThan(1);
    });

    it('should handle zero seed by using 1', () => {
      const rng = new SeededRandom(BigInt(0));
      // Should not throw and should produce valid output
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });

    it('should handle negative seed', () => {
      const rng = new SeededRandom(BigInt(-12345));
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  describe('determinism', () => {
    it('should produce the same sequence for the same seed', () => {
      const rng1 = new SeededRandom(BigInt(42));
      const rng2 = new SeededRandom(BigInt(42));

      for (let i = 0; i < 10; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new SeededRandom(BigInt(42));
      const rng2 = new SeededRandom(BigInt(43));

      // At least one value should differ in the first 10
      const values1 = Array.from({ length: 10 }, () => rng1.next());
      const values2 = Array.from({ length: 10 }, () => rng2.next());

      const allSame = values1.every((v, i) => v === values2[i]);
      expect(allSame).toBe(false);
    });
  });

  describe('nextRange', () => {
    it('should produce values within the specified range', () => {
      const rng = new SeededRandom(BigInt(12345));
      for (let i = 0; i < 100; i++) {
        const value = rng.nextRange(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      }
    });
  });

  describe('nextInt', () => {
    it('should produce integers within the specified range', () => {
      const rng = new SeededRandom(BigInt(12345));
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(0, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
      }
    });
  });
});

describe('generateObjectsFromSeed', () => {
  const config: ArenaConfig = {
    width: 800,
    height: 600,
    objectRadius: 15,
    objectsPerType: 5,
  };

  describe('determinism', () => {
    it('should produce identical objects for the same seed', () => {
      const seed = BigInt(12345);
      const objects1 = generateObjectsFromSeed(seed, config);
      const objects2 = generateObjectsFromSeed(seed, config);

      expect(objects1).toEqual(objects2);
    });

    it('should produce different objects for different seeds', () => {
      const objects1 = generateObjectsFromSeed(BigInt(12345), config);
      const objects2 = generateObjectsFromSeed(BigInt(54321), config);

      // Objects should differ (at least positions/velocities)
      const positionsMatch = objects1.every(
        (obj, i) => obj.x === objects2[i].x && obj.y === objects2[i].y
      );
      expect(positionsMatch).toBe(false);
    });
  });

  describe('object count', () => {
    it('should generate correct number of objects', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);
      expect(objects.length).toBe(config.objectsPerType * 3); // 3 types
    });

    it('should generate equal objects per type', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);
      
      const rockCount = objects.filter(o => o.type === 'rock').length;
      const paperCount = objects.filter(o => o.type === 'paper').length;
      const scissorsCount = objects.filter(o => o.type === 'scissors').length;

      expect(rockCount).toBe(config.objectsPerType);
      expect(paperCount).toBe(config.objectsPerType);
      expect(scissorsCount).toBe(config.objectsPerType);
    });
  });

  describe('position bounds', () => {
    it('should generate positions within arena bounds', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);

      for (const obj of objects) {
        // Position must keep object fully within arena
        expect(obj.x).toBeGreaterThanOrEqual(obj.radius);
        expect(obj.x).toBeLessThanOrEqual(config.width - obj.radius);
        expect(obj.y).toBeGreaterThanOrEqual(obj.radius);
        expect(obj.y).toBeLessThanOrEqual(config.height - obj.radius);
      }
    });
  });

  describe('no overlapping positions', () => {
    it('should not generate overlapping objects', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);

      // Check all pairs for overlap
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const a = objects[i];
          const b = objects[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = a.radius + b.radius;

          expect(distance).toBeGreaterThanOrEqual(minDistance);
        }
      }
    });
  });

  describe('velocity generation', () => {
    it('should generate non-zero velocities', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);

      for (const obj of objects) {
        const speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
        expect(speed).toBeGreaterThan(0);
      }
    });

    it('should generate velocities within expected range', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);
      const minSpeed = 50;
      const maxSpeed = 150;

      for (const obj of objects) {
        const speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
        expect(speed).toBeGreaterThanOrEqual(minSpeed);
        expect(speed).toBeLessThanOrEqual(maxSpeed);
      }
    });
  });

  describe('object properties', () => {
    it('should assign unique IDs to each object', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);
      const ids = objects.map(o => o.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(objects.length);
    });

    it('should assign correct radius to each object', () => {
      const objects = generateObjectsFromSeed(BigInt(12345), config);

      for (const obj of objects) {
        expect(obj.radius).toBe(config.objectRadius);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle string seed', () => {
      const objects = generateObjectsFromSeed('12345', config);
      expect(objects.length).toBe(config.objectsPerType * 3);
    });

    it('should handle large seed values', () => {
      const largeSeed = BigInt('123456789012345678901234567890');
      const objects = generateObjectsFromSeed(largeSeed, config);
      expect(objects.length).toBe(config.objectsPerType * 3);
    });
  });
});

describe('DEFAULT_ARENA_CONFIG', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_ARENA_CONFIG.width).toBe(800);
    expect(DEFAULT_ARENA_CONFIG.height).toBe(600);
    expect(DEFAULT_ARENA_CONFIG.objectRadius).toBeGreaterThan(0);
    expect(DEFAULT_ARENA_CONFIG.objectsPerType).toBeGreaterThan(0);
  });
});
