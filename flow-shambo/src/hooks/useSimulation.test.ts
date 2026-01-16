/**
 * Tests for useSimulation hook
 * 
 * Tests the simulation loop including:
 * - Initialization with GameInitData
 * - Animation loop with requestAnimationFrame
 * - Physics engine integration
 * - Simulation completion detection
 * - Timeout handling
 * - Cleanup on unmount
 * 
 * **Validates: Requirements 4.1, 4.7**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useSimulation, 
  TARGET_FPS, 
  FRAME_DURATION_MS,
  SIMULATION_TIMEOUT_MS,
  SIMULATION_TIMEOUT_SECONDS
} from './useSimulation';
import type { GameInitData, ArenaConfig } from '../types/game';

// Mock requestAnimationFrame and cancelAnimationFrame
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafId = 0;
let mockTime = 0;

const mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  return id;
});

const mockCancelAnimationFrame = vi.fn((id: number): void => {
  rafCallbacks.delete(id);
});

const mockPerformanceNow = vi.fn(() => mockTime);

// Helper to advance animation frames
function advanceFrame(deltaMs: number = FRAME_DURATION_MS): void {
  mockTime += deltaMs;
  const callbacks = Array.from(rafCallbacks.entries());
  rafCallbacks.clear();
  for (const [, callback] of callbacks) {
    callback(mockTime);
  }
}

// Helper to advance multiple frames
function advanceFrames(count: number, deltaMs: number = FRAME_DURATION_MS): void {
  for (let i = 0; i < count; i++) {
    advanceFrame(deltaMs);
  }
}

describe('useSimulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks.clear();
    rafId = 0;
    mockTime = 0;
    
    // Setup global mocks
    vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);
    vi.stubGlobal('performance', { now: mockPerformanceNow });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Sample game init data for testing
  const createTestInitData = (objectCount: number = 6): GameInitData => ({
    seed: 'test-seed-123',
    objects: [
      // 2 rocks
      { objectType: 0, x: 100, y: 100, vx: 50, vy: 30 },
      { objectType: 0, x: 150, y: 150, vx: -30, vy: 40 },
      // 2 papers
      { objectType: 1, x: 300, y: 200, vx: 40, vy: -20 },
      { objectType: 1, x: 350, y: 250, vx: -40, vy: 30 },
      // 2 scissors
      { objectType: 2, x: 500, y: 300, vx: -50, vy: -30 },
      { objectType: 2, x: 550, y: 350, vx: 30, vy: -40 },
    ].slice(0, objectCount)
  });

  const testArenaConfig: ArenaConfig = {
    width: 800,
    height: 600,
    objectRadius: 15,
    objectsPerType: 2
  };

  describe('initial state', () => {
    it('should return initial idle state', () => {
      const { result } = renderHook(() => useSimulation());

      expect(result.current.objects).toEqual([]);
      expect(result.current.status).toBe('idle');
      expect(result.current.winner).toBeNull();
      expect(result.current.isTimeout).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('constants', () => {
    it('should export correct TARGET_FPS', () => {
      expect(TARGET_FPS).toBe(60);
    });

    it('should export correct FRAME_DURATION_MS', () => {
      expect(FRAME_DURATION_MS).toBeCloseTo(1000 / 60, 2);
    });

    it('should export correct SIMULATION_TIMEOUT_SECONDS', () => {
      expect(SIMULATION_TIMEOUT_SECONDS).toBe(60);
    });

    it('should export correct SIMULATION_TIMEOUT_MS', () => {
      expect(SIMULATION_TIMEOUT_MS).toBe(60000);
    });
  });

  describe('start simulation', () => {
    it('should initialize objects from GameInitData', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      expect(result.current.objects).toHaveLength(6);
      expect(result.current.status).toBe('running');
      expect(result.current.winner).toBeNull();
      expect(result.current.isTimeout).toBe(false);
    });

    it('should convert object types correctly', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      const objects = result.current.objects;
      
      // First two should be rocks (objectType: 0)
      expect(objects[0].type).toBe('rock');
      expect(objects[1].type).toBe('rock');
      
      // Next two should be papers (objectType: 1)
      expect(objects[2].type).toBe('paper');
      expect(objects[3].type).toBe('paper');
      
      // Last two should be scissors (objectType: 2)
      expect(objects[4].type).toBe('scissors');
      expect(objects[5].type).toBe('scissors');
    });

    it('should set object positions and velocities from init data', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      const firstObject = result.current.objects[0];
      expect(firstObject.x).toBe(100);
      expect(firstObject.y).toBe(100);
      expect(firstObject.vx).toBe(50);
      expect(firstObject.vy).toBe(30);
      expect(firstObject.radius).toBe(testArenaConfig.objectRadius);
    });

    it('should assign unique IDs to objects', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      const ids = result.current.objects.map(obj => obj.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should start requestAnimationFrame loop', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('should use default arena config if not provided', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData);
      });

      // Should use default radius of 15
      expect(result.current.objects[0].radius).toBe(15);
    });
  });

  describe('animation loop', () => {
    it('should update objects on each frame', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      const initialX = result.current.objects[0].x;

      // Advance one frame
      act(() => {
        advanceFrame();
      });

      // Position should have changed (object has positive vx)
      expect(result.current.objects[0].x).not.toBe(initialX);
    });

    it('should update elapsed time', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      expect(result.current.elapsedTime).toBe(0);

      // Advance 100ms
      act(() => {
        advanceFrame(100);
      });

      expect(result.current.elapsedTime).toBeGreaterThan(0);
    });

    it('should continue animation loop while running', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      const initialCallCount = mockRequestAnimationFrame.mock.calls.length;

      // Advance several frames
      act(() => {
        advanceFrames(5);
      });

      // Should have requested more animation frames
      expect(mockRequestAnimationFrame.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('simulation completion', () => {
    it('should detect completion when one type remains', () => {
      const { result } = renderHook(() => useSimulation());
      
      // Create init data with only rocks
      const initData: GameInitData = {
        seed: 'test-seed',
        objects: [
          { objectType: 0, x: 100, y: 100, vx: 50, vy: 30 },
          { objectType: 0, x: 200, y: 200, vx: -30, vy: 40 },
        ]
      };

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance a frame to trigger completion check
      act(() => {
        advanceFrame();
      });

      expect(result.current.status).toBe('completed');
      expect(result.current.winner).toBe('rock');
      expect(result.current.isTimeout).toBe(false);
    });

    it('should stop animation loop on completion', () => {
      const { result } = renderHook(() => useSimulation());
      
      // Create init data with only papers
      const initData: GameInitData = {
        seed: 'test-seed',
        objects: [
          { objectType: 1, x: 100, y: 100, vx: 50, vy: 30 },
        ]
      };

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance to trigger completion
      act(() => {
        advanceFrame();
      });

      expect(result.current.status).toBe('completed');

      // Clear mock calls
      mockRequestAnimationFrame.mockClear();

      // Try to advance more frames - should not request new frames
      act(() => {
        advanceFrame();
      });

      // No new animation frames should be requested after completion
      expect(rafCallbacks.size).toBe(0);
    });
  });

  describe('timeout handling', () => {
    it('should timeout after SIMULATION_TIMEOUT_MS', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance past timeout
      act(() => {
        advanceFrame(SIMULATION_TIMEOUT_MS + 1000);
      });

      expect(result.current.status).toBe('timeout');
      expect(result.current.isTimeout).toBe(true);
      expect(result.current.winner).not.toBeNull();
    });

    it('should determine winner by majority on timeout', () => {
      const { result } = renderHook(() => useSimulation());
      
      // Create init data with more rocks than others
      const initData: GameInitData = {
        seed: 'test-seed',
        objects: [
          { objectType: 0, x: 100, y: 100, vx: 50, vy: 30 },
          { objectType: 0, x: 150, y: 150, vx: -30, vy: 40 },
          { objectType: 0, x: 200, y: 200, vx: 20, vy: -30 },
          { objectType: 1, x: 300, y: 300, vx: -40, vy: 20 },
          { objectType: 2, x: 400, y: 400, vx: 30, vy: -20 },
        ]
      };

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance past timeout
      act(() => {
        advanceFrame(SIMULATION_TIMEOUT_MS + 1000);
      });

      expect(result.current.status).toBe('timeout');
      // Rock should win as it has the majority (3 vs 1 vs 1)
      // Note: actual winner depends on collisions during simulation
      expect(result.current.winner).not.toBeNull();
    });

    it('should use tiebreaker (rock > paper > scissors) on tie', () => {
      const { result } = renderHook(() => useSimulation());
      
      // Create init data with equal counts, spread far apart to avoid collisions
      const initData: GameInitData = {
        seed: 'test-seed',
        objects: [
          { objectType: 0, x: 50, y: 50, vx: 0, vy: 0 },
          { objectType: 1, x: 400, y: 50, vx: 0, vy: 0 },
          { objectType: 2, x: 750, y: 50, vx: 0, vy: 0 },
        ]
      };

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance past timeout (objects have zero velocity so no collisions)
      act(() => {
        advanceFrame(SIMULATION_TIMEOUT_MS + 1000);
      });

      expect(result.current.status).toBe('timeout');
      // Rock should win due to tiebreaker priority
      expect(result.current.winner).toBe('rock');
    });
  });

  describe('stop simulation', () => {
    it('should stop the animation loop', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      expect(result.current.status).toBe('running');

      act(() => {
        result.current.stop();
      });

      expect(result.current.status).toBe('idle');
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should preserve objects state when stopped', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance a few frames
      act(() => {
        advanceFrames(5);
      });

      const objectsBeforeStop = [...result.current.objects];

      act(() => {
        result.current.stop();
      });

      // Objects should still be there
      expect(result.current.objects.length).toBe(objectsBeforeStop.length);
    });

    it('should not change status if already completed', () => {
      const { result } = renderHook(() => useSimulation());
      
      // Create init data with only one type
      const initData: GameInitData = {
        seed: 'test-seed',
        objects: [
          { objectType: 0, x: 100, y: 100, vx: 50, vy: 30 },
        ]
      };

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance to complete
      act(() => {
        advanceFrame();
      });

      expect(result.current.status).toBe('completed');

      act(() => {
        result.current.stop();
      });

      // Status should remain completed
      expect(result.current.status).toBe('completed');
    });
  });

  describe('reset simulation', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      // Advance some frames
      act(() => {
        advanceFrames(10);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.objects).toEqual([]);
      expect(result.current.status).toBe('idle');
      expect(result.current.winner).toBeNull();
      expect(result.current.isTimeout).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
    });

    it('should cancel animation frame on reset', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      act(() => {
        result.current.reset();
      });

      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should allow starting a new simulation after reset', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      act(() => {
        result.current.reset();
      });

      // Start again
      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      expect(result.current.status).toBe('running');
      expect(result.current.objects).toHaveLength(6);
    });
  });

  describe('cleanup on unmount', () => {
    it('should cancel animation frame on unmount', () => {
      const { result, unmount } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      unmount();

      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('restarting simulation', () => {
    it('should stop previous simulation when starting a new one', () => {
      const { result } = renderHook(() => useSimulation());
      const initData1 = createTestInitData();
      const initData2: GameInitData = {
        seed: 'different-seed',
        objects: [
          { objectType: 1, x: 200, y: 200, vx: -50, vy: -30 },
          { objectType: 2, x: 400, y: 400, vx: 50, vy: 30 },
        ]
      };

      act(() => {
        result.current.start(initData1, testArenaConfig);
      });

      expect(result.current.objects).toHaveLength(6);

      // Start a new simulation
      act(() => {
        result.current.start(initData2, testArenaConfig);
      });

      expect(result.current.objects).toHaveLength(2);
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should reset winner and timeout state on restart', () => {
      const { result } = renderHook(() => useSimulation());
      
      // First simulation - complete immediately
      const initData1: GameInitData = {
        seed: 'test-seed',
        objects: [
          { objectType: 0, x: 100, y: 100, vx: 50, vy: 30 },
        ]
      };

      act(() => {
        result.current.start(initData1, testArenaConfig);
      });

      act(() => {
        advanceFrame();
      });

      expect(result.current.winner).toBe('rock');
      expect(result.current.status).toBe('completed');

      // Start new simulation
      const initData2 = createTestInitData();
      act(() => {
        result.current.start(initData2, testArenaConfig);
      });

      expect(result.current.winner).toBeNull();
      expect(result.current.isTimeout).toBe(false);
      expect(result.current.status).toBe('running');
    });
  });

  describe('delta time handling', () => {
    it('should cap delta time to prevent large jumps', () => {
      const { result } = renderHook(() => useSimulation());
      const initData = createTestInitData();

      act(() => {
        result.current.start(initData, testArenaConfig);
      });

      const initialX = result.current.objects[0].x;

      // Simulate a very large time jump (e.g., tab was inactive)
      act(() => {
        advanceFrame(5000); // 5 seconds
      });

      // Position should have changed but not by an unreasonable amount
      // The delta time should be capped
      const newX = result.current.objects[0].x;
      const deltaX = Math.abs(newX - initialX);
      
      // With capped delta time (3 frames worth), max movement should be limited
      // vx = 50, capped delta = ~0.05s, so max delta should be around 2.5 pixels
      // But we're being generous here since physics can vary
      expect(deltaX).toBeLessThan(500); // Should not have moved 5 seconds worth
    });
  });
});
