/**
 * Unit tests for PhysicsEngine class
 * Tests initialization, stepping, collision handling, and game completion logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsEngine } from './engine';
import type { GameObject, ArenaConfig, CollisionEvent } from '../../types/game';

describe('PhysicsEngine', () => {
  const testArena: ArenaConfig = {
    width: 800,
    height: 600,
    objectRadius: 15,
    objectsPerType: 5
  };

  let engine: PhysicsEngine;

  beforeEach(() => {
    engine = new PhysicsEngine(testArena);
  });

  describe('constructor', () => {
    it('should create engine with default arena config', () => {
      const defaultEngine = new PhysicsEngine();
      const arena = defaultEngine.getArena();
      expect(arena.width).toBe(800);
      expect(arena.height).toBe(600);
    });

    it('should create engine with custom arena config', () => {
      const customArena: ArenaConfig = {
        width: 1000,
        height: 800,
        objectRadius: 20,
        objectsPerType: 10
      };
      const customEngine = new PhysicsEngine(customArena);
      const arena = customEngine.getArena();
      expect(arena.width).toBe(1000);
      expect(arena.height).toBe(800);
    });
  });

  describe('initialize', () => {
    it('should initialize with empty array', () => {
      engine.initialize([]);
      expect(engine.getObjects()).toEqual([]);
    });

    it('should initialize with game objects', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 50, vy: 30, radius: 15 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: -30, vy: 40, radius: 15 }
      ];
      engine.initialize(objects);
      const result = engine.getObjects();
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('rock');
      expect(result[1].type).toBe('paper');
    });

    it('should deep copy objects to prevent external mutations', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 50, vy: 30, radius: 15 }
      ];
      engine.initialize(objects);
      
      // Mutate original
      objects[0].x = 999;
      
      // Engine should have original value
      const result = engine.getObjects();
      expect(result[0].x).toBe(100);
    });
  });

  describe('getObjects', () => {
    it('should return a copy of objects', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 50, vy: 30, radius: 15 }
      ];
      engine.initialize(objects);
      
      const result1 = engine.getObjects();
      result1[0].x = 999;
      
      const result2 = engine.getObjects();
      expect(result2[0].x).toBe(100);
    });
  });

  describe('step', () => {
    it('should update object positions based on velocity', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 100, vy: 50, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.5); // 0.5 seconds
      
      const result = engine.getObjects();
      expect(result[0].x).toBe(150); // 100 + 100 * 0.5
      expect(result[0].y).toBe(125); // 100 + 50 * 0.5
    });

    it('should handle wall collisions on left boundary', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 20, y: 100, vx: -100, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.1); // Move to x = 10, which is < radius (15)
      
      const result = engine.getObjects();
      expect(result[0].x).toBe(15); // Clamped to radius
      expect(result[0].vx).toBe(100); // Velocity negated
    });

    it('should handle wall collisions on right boundary', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 780, y: 100, vx: 100, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.1); // Move to x = 790, which is > width - radius (785)
      
      const result = engine.getObjects();
      expect(result[0].x).toBe(785); // Clamped to width - radius
      expect(result[0].vx).toBe(-100); // Velocity negated
    });

    it('should handle wall collisions on top boundary', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 20, vx: 0, vy: -100, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.1); // Move to y = 10, which is < radius (15)
      
      const result = engine.getObjects();
      expect(result[0].y).toBe(15); // Clamped to radius
      expect(result[0].vy).toBe(100); // Velocity negated
    });

    it('should handle wall collisions on bottom boundary', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 580, vx: 0, vy: 100, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.1); // Move to y = 590, which is > height - radius (585)
      
      const result = engine.getObjects();
      expect(result[0].y).toBe(585); // Clamped to height - radius
      expect(result[0].vy).toBe(-100); // Velocity negated
    });
  });

  describe('object-to-object collisions', () => {
    it('should transform scissors to rock when rock beats scissors', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const result = engine.getObjects();
      expect(result[0].type).toBe('rock');
      expect(result[1].type).toBe('rock'); // Transformed
    });

    it('should transform paper to scissors when scissors beats paper', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'scissors', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'paper', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const result = engine.getObjects();
      expect(result[0].type).toBe('scissors');
      expect(result[1].type).toBe('scissors'); // Transformed
    });

    it('should transform rock to paper when paper beats rock', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'paper', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'rock', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const result = engine.getObjects();
      expect(result[0].type).toBe('paper');
      expect(result[1].type).toBe('paper'); // Transformed
    });

    it('should not transform same-type collisions', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'rock', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const result = engine.getObjects();
      expect(result[0].type).toBe('rock');
      expect(result[1].type).toBe('rock');
    });

    it('should not detect collision when objects are far apart', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 200, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const result = engine.getObjects();
      expect(result[0].type).toBe('rock');
      expect(result[1].type).toBe('scissors'); // Not transformed
    });

    it('should separate colliding objects', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'rock', x: 110, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const result = engine.getObjects();
      const distance = Math.sqrt(
        Math.pow(result[1].x - result[0].x, 2) + 
        Math.pow(result[1].y - result[0].y, 2)
      );
      // Objects should be separated to at least sum of radii
      expect(distance).toBeGreaterThanOrEqual(30);
    });
  });

  describe('isComplete', () => {
    it('should return true when no objects', () => {
      engine.initialize([]);
      expect(engine.isComplete()).toBe(true);
    });

    it('should return true when only one type remains', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'rock', x: 200, y: 200, vx: 0, vy: 0, radius: 15 },
        { id: '3', type: 'rock', x: 300, y: 300, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.isComplete()).toBe(true);
    });

    it('should return false when multiple types exist', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.isComplete()).toBe(false);
    });

    it('should return false when all three types exist', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: 0, vy: 0, radius: 15 },
        { id: '3', type: 'scissors', x: 300, y: 300, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.isComplete()).toBe(false);
    });
  });

  describe('getWinner', () => {
    it('should return null when no objects', () => {
      engine.initialize([]);
      expect(engine.getWinner()).toBeNull();
    });

    it('should return null when game is not complete', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.getWinner()).toBeNull();
    });

    it('should return rock when only rocks remain', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'rock', x: 200, y: 200, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.getWinner()).toBe('rock');
    });

    it('should return paper when only papers remain', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'paper', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.getWinner()).toBe('paper');
    });

    it('should return scissors when only scissors remain', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'scissors', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 200, y: 200, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      expect(engine.getWinner()).toBe('scissors');
    });
  });

  describe('getCounts', () => {
    it('should return zero counts for empty game', () => {
      engine.initialize([]);
      const counts = engine.getCounts();
      expect(counts).toEqual({ rock: 0, paper: 0, scissors: 0 });
    });

    it('should count objects correctly', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'rock', x: 150, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '3', type: 'paper', x: 200, y: 200, vx: 0, vy: 0, radius: 15 },
        { id: '4', type: 'scissors', x: 300, y: 300, vx: 0, vy: 0, radius: 15 },
        { id: '5', type: 'scissors', x: 350, y: 300, vx: 0, vy: 0, radius: 15 },
        { id: '6', type: 'scissors', x: 400, y: 300, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      const counts = engine.getCounts();
      expect(counts).toEqual({ rock: 2, paper: 1, scissors: 3 });
    });

    it('should update counts after transformation', () => {
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      
      const countsBefore = engine.getCounts();
      expect(countsBefore).toEqual({ rock: 1, paper: 0, scissors: 1 });
      
      engine.step(0.016); // Collision should transform scissors to rock
      
      const countsAfter = engine.getCounts();
      expect(countsAfter).toEqual({ rock: 2, paper: 0, scissors: 0 });
    });
  });

  describe('arena configuration', () => {
    it('should get arena configuration', () => {
      const arena = engine.getArena();
      expect(arena).toEqual(testArena);
    });

    it('should return a copy of arena config', () => {
      const arena1 = engine.getArena();
      arena1.width = 9999;
      
      const arena2 = engine.getArena();
      expect(arena2.width).toBe(800);
    });

    it('should set new arena configuration', () => {
      const newArena: ArenaConfig = {
        width: 1200,
        height: 900,
        objectRadius: 25,
        objectsPerType: 8
      };
      engine.setArena(newArena);
      
      const arena = engine.getArena();
      expect(arena).toEqual(newArena);
    });
  });

  describe('simulation scenarios', () => {
    it('should complete simulation when all objects become same type', () => {
      // Set up a scenario where rock will beat scissors
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 50, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 130, y: 100, vx: -50, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      
      expect(engine.isComplete()).toBe(false);
      
      // Run simulation until complete
      for (let i = 0; i < 100 && !engine.isComplete(); i++) {
        engine.step(0.016);
      }
      
      expect(engine.isComplete()).toBe(true);
      expect(engine.getWinner()).toBe('rock');
    });
  });
});

describe('Collision Events', () => {
  const testArena: ArenaConfig = {
    width: 800,
    height: 600,
    objectRadius: 15,
    objectsPerType: 5
  };

  let engine: PhysicsEngine;

  beforeEach(() => {
    engine = new PhysicsEngine(testArena);
  });

  describe('onCollision', () => {
    it('should register collision listener', () => {
      const listener = vi.fn();
      engine.onCollision(listener);
      
      // Set up colliding objects
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = engine.onCollision(listener);
      
      // Unsubscribe
      unsubscribe();
      
      // Set up colliding objects
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      engine.onCollision(listener1);
      engine.onCollision(listener2);
      
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('collision event data', () => {
    it('should emit event with correct collision position', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent).not.toBeNull();
      // Collision point should be midpoint between objects
      expect(receivedEvent!.x).toBe(110); // (100 + 120) / 2
      expect(receivedEvent!.y).toBe(100); // (100 + 100) / 2
    });

    it('should emit event with object IDs', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'obj-1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'obj-2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.objectAId).toBe('obj-1');
      expect(receivedEvent!.objectBId).toBe('obj-2');
    });

    it('should indicate transformation when different types collide', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'obj-1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'obj-2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.hasTransformation).toBe(true);
      expect(receivedEvent!.transformedObjectId).toBe('obj-2'); // scissors loses
      expect(receivedEvent!.newType).toBe('rock');
    });

    it('should not indicate transformation when same types collide', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'obj-1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'obj-2', type: 'rock', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.hasTransformation).toBe(false);
      expect(receivedEvent!.transformedObjectId).toBeNull();
      expect(receivedEvent!.newType).toBeNull();
    });

    it('should have unique collision IDs', () => {
      const events: CollisionEvent[] = [];
      engine.onCollision((event) => {
        events.push(event);
      });
      
      // Set up multiple collisions
      const objects: GameObject[] = [
        { id: 'obj-1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'obj-2', type: 'rock', x: 120, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'obj-3', type: 'rock', x: 100, y: 120, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      // Check that all IDs are unique
      const ids = events.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include timestamp in event', () => {
      let receivedEvent: CollisionEvent | null = null;
      const beforeTime = Date.now();
      
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'obj-1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'obj-2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      const afterTime = Date.now();
      
      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(receivedEvent!.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('clearCollisionListeners', () => {
    it('should remove all listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      engine.onCollision(listener1);
      engine.onCollision(listener2);
      
      engine.clearCollisionListeners();
      
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: '2', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('collision events with RPS rules', () => {
    it('should emit correct transformation for rock vs scissors', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'rock', type: 'rock', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'scissors', type: 'scissors', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent!.hasTransformation).toBe(true);
      expect(receivedEvent!.transformedObjectId).toBe('scissors');
      expect(receivedEvent!.newType).toBe('rock');
    });

    it('should emit correct transformation for scissors vs paper', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'scissors', type: 'scissors', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'paper', type: 'paper', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent!.hasTransformation).toBe(true);
      expect(receivedEvent!.transformedObjectId).toBe('paper');
      expect(receivedEvent!.newType).toBe('scissors');
    });

    it('should emit correct transformation for paper vs rock', () => {
      let receivedEvent: CollisionEvent | null = null;
      engine.onCollision((event) => {
        receivedEvent = event;
      });
      
      const objects: GameObject[] = [
        { id: 'paper', type: 'paper', x: 100, y: 100, vx: 0, vy: 0, radius: 15 },
        { id: 'rock', type: 'rock', x: 120, y: 100, vx: 0, vy: 0, radius: 15 }
      ];
      engine.initialize(objects);
      engine.step(0.016);
      
      expect(receivedEvent!.hasTransformation).toBe(true);
      expect(receivedEvent!.transformedObjectId).toBe('rock');
      expect(receivedEvent!.newType).toBe('paper');
    });
  });
});
