/**
 * Unit tests for physics movement module
 * Tests updatePosition and handleWallCollision functions
 */

import { describe, it, expect } from 'vitest';
import { updatePosition, handleWallCollision } from './movement';
import type { GameObject, ArenaConfig } from '../../types/game';

// Helper to create a test game object
function createObject(overrides: Partial<GameObject> = {}): GameObject {
  return {
    id: '1',
    type: 'rock',
    x: 100,
    y: 100,
    vx: 50,
    vy: 30,
    radius: 10,
    ...overrides,
  };
}

// Standard arena config for tests
const arena: ArenaConfig = {
  width: 800,
  height: 600,
  objectRadius: 10,
  objectsPerType: 5,
};

describe('updatePosition', () => {
  it('should update position based on velocity and time', () => {
    const obj = createObject({ x: 100, y: 100, vx: 50, vy: 30 });
    updatePosition(obj, 1);
    expect(obj.x).toBe(150); // 100 + 50 * 1
    expect(obj.y).toBe(130); // 100 + 30 * 1
  });

  it('should handle fractional delta time', () => {
    const obj = createObject({ x: 100, y: 100, vx: 50, vy: -30 });
    updatePosition(obj, 0.5);
    expect(obj.x).toBe(125); // 100 + 50 * 0.5
    expect(obj.y).toBe(85);  // 100 + (-30) * 0.5
  });

  it('should handle negative velocities', () => {
    const obj = createObject({ x: 200, y: 200, vx: -100, vy: -50 });
    updatePosition(obj, 1);
    expect(obj.x).toBe(100); // 200 + (-100) * 1
    expect(obj.y).toBe(150); // 200 + (-50) * 1
  });

  it('should handle zero velocity', () => {
    const obj = createObject({ x: 100, y: 100, vx: 0, vy: 0 });
    updatePosition(obj, 1);
    expect(obj.x).toBe(100);
    expect(obj.y).toBe(100);
  });

  it('should handle zero delta time', () => {
    const obj = createObject({ x: 100, y: 100, vx: 50, vy: 30 });
    updatePosition(obj, 0);
    expect(obj.x).toBe(100);
    expect(obj.y).toBe(100);
  });

  it('should not modify velocity', () => {
    const obj = createObject({ vx: 50, vy: 30 });
    updatePosition(obj, 1);
    expect(obj.vx).toBe(50);
    expect(obj.vy).toBe(30);
  });
});

describe('handleWallCollision', () => {
  describe('left wall collision', () => {
    it('should reflect velocity when hitting left wall', () => {
      const obj = createObject({ x: 5, y: 100, vx: -50, vy: 30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(10);   // Clamped to radius
      expect(obj.vx).toBe(50);  // Negated
      expect(obj.vy).toBe(30);  // Unchanged
    });

    it('should clamp position to boundary', () => {
      const obj = createObject({ x: -20, y: 100, vx: -50, vy: 0, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(10); // Clamped to radius
    });
  });

  describe('right wall collision', () => {
    it('should reflect velocity when hitting right wall', () => {
      const obj = createObject({ x: 795, y: 100, vx: 50, vy: 30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(790);  // Clamped to width - radius
      expect(obj.vx).toBe(-50); // Negated
      expect(obj.vy).toBe(30);  // Unchanged
    });

    it('should clamp position to boundary', () => {
      const obj = createObject({ x: 850, y: 100, vx: 50, vy: 0, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(790); // Clamped to width - radius
    });
  });

  describe('top wall collision', () => {
    it('should reflect velocity when hitting top wall', () => {
      const obj = createObject({ x: 100, y: 5, vx: 50, vy: -30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.y).toBe(10);   // Clamped to radius
      expect(obj.vy).toBe(30);  // Negated
      expect(obj.vx).toBe(50);  // Unchanged
    });

    it('should clamp position to boundary', () => {
      const obj = createObject({ x: 100, y: -20, vx: 0, vy: -50, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.y).toBe(10); // Clamped to radius
    });
  });

  describe('bottom wall collision', () => {
    it('should reflect velocity when hitting bottom wall', () => {
      const obj = createObject({ x: 100, y: 595, vx: 50, vy: 30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.y).toBe(590);  // Clamped to height - radius
      expect(obj.vy).toBe(-30); // Negated
      expect(obj.vx).toBe(50);  // Unchanged
    });

    it('should clamp position to boundary', () => {
      const obj = createObject({ x: 100, y: 650, vx: 0, vy: 50, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.y).toBe(590); // Clamped to height - radius
    });
  });

  describe('corner collisions', () => {
    it('should handle top-left corner collision', () => {
      const obj = createObject({ x: 5, y: 5, vx: -50, vy: -30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(10);
      expect(obj.vx).toBe(50);  // Both velocities negated
      expect(obj.vy).toBe(30);
    });

    it('should handle bottom-right corner collision', () => {
      const obj = createObject({ x: 795, y: 595, vx: 50, vy: 30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(790);
      expect(obj.y).toBe(590);
      expect(obj.vx).toBe(-50);
      expect(obj.vy).toBe(-30);
    });
  });

  describe('no collision', () => {
    it('should not modify object when within bounds', () => {
      const obj = createObject({ x: 400, y: 300, vx: 50, vy: 30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(400);
      expect(obj.y).toBe(300);
      expect(obj.vx).toBe(50);
      expect(obj.vy).toBe(30);
    });

    it('should not modify object at exact boundary', () => {
      const obj = createObject({ x: 10, y: 10, vx: 50, vy: 30, radius: 10 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(10);
      expect(obj.vx).toBe(50);
      expect(obj.vy).toBe(30);
    });
  });

  describe('different object radii', () => {
    it('should respect object radius for boundary calculation', () => {
      const obj = createObject({ x: 15, y: 100, vx: -50, vy: 0, radius: 20 });
      handleWallCollision(obj, arena);
      expect(obj.x).toBe(20);  // Clamped to radius (20)
      expect(obj.vx).toBe(50); // Negated
    });
  });
});
