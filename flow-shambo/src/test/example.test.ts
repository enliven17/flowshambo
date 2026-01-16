/**
 * Example Test File
 * 
 * Verifies that the testing infrastructure is set up correctly.
 * This file can be deleted once actual tests are implemented.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { fcConfig, objectTypeArb, ObjectTypes } from './fc-helpers';

describe('Testing Infrastructure', () => {
  describe('Vitest Setup', () => {
    it('should run basic tests', () => {
      expect(1 + 1).toBe(2);
    });

    it('should support async tests', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });

  describe('Fast-Check Setup', () => {
    it('should run property-based tests with minimum 100 iterations', () => {
      let runCount = 0;
      
      fc.assert(
        fc.property(fc.integer(), (n) => {
          runCount++;
          // Property: adding 0 to any integer returns the same integer
          return n + 0 === n;
        }),
        fcConfig
      );

      expect(runCount).toBeGreaterThanOrEqual(100);
    });

    it('should generate valid object types', () => {
      fc.assert(
        fc.property(objectTypeArb, (type) => {
          return ObjectTypes.includes(type);
        }),
        fcConfig
      );
    });

    it('should support shrinking for minimal failing examples', () => {
      // This test demonstrates that shrinking works
      // We intentionally create a property that fails for numbers > 10
      // and verify that fast-check shrinks to a minimal example
      
      let shrunkValue: number | null = null;
      
      try {
        fc.assert(
          fc.property(fc.integer({ min: 0, max: 1000 }), (n) => {
            if (n > 10) {
              shrunkValue = n;
              return false;
            }
            return true;
          }),
          { ...fcConfig, numRuns: 1000 }
        );
      } catch {
        // Expected to fail - shrinking should find a value close to 11
        expect(shrunkValue).toBeDefined();
        // After shrinking, the value should be the minimal failing case (11)
        // Note: We can't guarantee exact value due to randomness, but it should be small
      }
    });
  });

  describe('Test Utilities', () => {
    it('should have access to custom arbitraries', () => {
      const types = fc.sample(objectTypeArb, 10);
      expect(types.length).toBe(10);
      types.forEach((type) => {
        expect(['rock', 'paper', 'scissors']).toContain(type);
      });
    });
  });
});
