/**
 * useSimulation Hook for FlowShambo
 * 
 * Manages the physics simulation loop using requestAnimationFrame for smooth 60fps animation.
 * Integrates PhysicsEngine with the render loop and handles simulation completion.
 * 
 * @module hooks/useSimulation
 * 
 * **Validates: Requirements 4.1, 4.7, 7.4, 7.5**
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { PhysicsEngine } from '../lib/physics/engine';
import type { GameObject, ArenaConfig, ObjectType, GameInitData, ObjectInit, CollisionEvent } from '../types/game';

/**
 * Target frames per second for the simulation
 */
export const TARGET_FPS = 60;

/**
 * Target frame duration in milliseconds
 */
export const FRAME_DURATION_MS = 1000 / TARGET_FPS;

/**
 * Maximum simulation duration in seconds (60 seconds timeout)
 */
export const SIMULATION_TIMEOUT_SECONDS = 60;

/**
 * Maximum simulation duration in milliseconds
 */
export const SIMULATION_TIMEOUT_MS = SIMULATION_TIMEOUT_SECONDS * 1000;

/**
 * Simulation status
 */
export type SimulationStatus = 'idle' | 'running' | 'completed' | 'timeout';

/**
 * Result returned by the useSimulation hook
 */
export interface UseSimulationResult {
  /** Current game objects state */
  objects: GameObject[];
  /** Current simulation status */
  status: SimulationStatus;
  /** The winning type when simulation completes */
  winner: ObjectType | null;
  /** Whether simulation completed due to timeout */
  isTimeout: boolean;
  /** Start the simulation with initial game data */
  start: (initData: GameInitData, arenaConfig?: ArenaConfig) => void;
  /** Stop the simulation */
  stop: () => void;
  /** Reset the simulation to idle state */
  reset: () => void;
  /** Current elapsed time in milliseconds */
  elapsedTime: number;
  /** Recent collision events for visual feedback (cleared after each frame) */
  collisionEvents: CollisionEvent[];
}

/**
 * Default arena configuration
 * Must match the dimensions passed to Arena component
 */
const DEFAULT_ARENA_CONFIG: ArenaConfig = {
  width: 800,
  height: 500,
  objectRadius: 15,
  objectsPerType: 5
};

/**
 * Convert ObjectInit from blockchain to GameObject
 */
function objectInitToGameObject(init: ObjectInit, index: number, radius: number): GameObject {
  const typeMap: Record<number, ObjectType> = {
    0: 'rock',
    1: 'paper',
    2: 'scissors'
  };

  return {
    id: `obj-${index}`,
    type: typeMap[init.objectType] ?? 'rock',
    x: init.x,
    y: init.y,
    vx: init.vx,
    vy: init.vy,
    radius
  };
}

/**
 * useSimulation Hook
 * 
 * Manages the physics simulation for FlowShambo game.
 * Uses requestAnimationFrame for smooth 60fps animation and integrates
 * with PhysicsEngine for collision detection and RPS transformations.
 * 
 * Features:
 * - Smooth 60fps animation using requestAnimationFrame
 * - Automatic simulation completion detection (one type remaining)
 * - Timeout handling (60 seconds max duration)
 * - Proper cleanup on unmount
 * - Collision event tracking for visual feedback
 * 
 * @returns UseSimulationResult with objects state and control functions
 * 
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { objects, status, winner, collisionEvents, start, stop, reset } = useSimulation();
 * 
 *   const handleStart = () => {
 *     start(gameInitData);
 *   };
 * 
 *   return (
 *     <div>
 *       <Arena objects={objects} collisionEvents={collisionEvents} />
 *       {status === 'completed' && <div>Winner: {winner}</div>}
 *       <button onClick={handleStart}>Start</button>
 *       <button onClick={stop}>Stop</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * **Validates: Requirements 4.1, 4.7, 7.4, 7.5**
 */
export function useSimulation(): UseSimulationResult {
  // State
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [winner, setWinner] = useState<ObjectType | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [collisionEvents, setCollisionEvents] = useState<CollisionEvent[]>([]);

  // Refs for animation loop
  const engineRef = useRef<PhysicsEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  // Ref to collect collision events during a frame
  const frameCollisionEventsRef = useRef<CollisionEvent[]>([]);

  /**
   * Animation loop using requestAnimationFrame
   */
  const animate = useCallback((currentTime: number) => {
    if (!isRunningRef.current || !engineRef.current) {
      return;
    }

    // Calculate delta time in seconds
    const deltaTime = lastTimeRef.current === 0
      ? FRAME_DURATION_MS / 1000
      : (currentTime - lastTimeRef.current) / 1000;

    lastTimeRef.current = currentTime;

    // Calculate elapsed time
    const elapsed = currentTime - startTimeRef.current;

    // Check for timeout
    if (elapsed >= SIMULATION_TIMEOUT_MS) {
      // Timeout - determine winner by majority
      const engine = engineRef.current;
      const counts = engine.getCounts();

      // Find type with highest count (with tiebreaker: rock > paper > scissors)
      let maxCount = -1;
      let timeoutWinner: ObjectType = 'rock';
      const priority: ObjectType[] = ['rock', 'paper', 'scissors'];

      for (const type of priority) {
        if (counts[type] > maxCount) {
          maxCount = counts[type];
          timeoutWinner = type;
        }
      }

      setWinner(timeoutWinner);
      setIsTimeout(true);
      setStatus('timeout');
      isRunningRef.current = false;
      return;
    }

    // Clear collision events from previous frame
    frameCollisionEventsRef.current = [];

    // Step the physics engine
    // Cap delta time to prevent large jumps (e.g., when tab is inactive)
    const cappedDeltaTime = Math.min(deltaTime, FRAME_DURATION_MS * 3 / 1000);

    // Restore normal speed (1.0)
    engineRef.current.step(cappedDeltaTime);

    // Update collision events state with events from this frame
    if (frameCollisionEventsRef.current.length > 0) {
      setCollisionEvents([...frameCollisionEventsRef.current]);
    } else {
      // Clear collision events if none occurred this frame
      // Optimization: Only update state if it wasn't already empty to prevent re-renders
      setCollisionEvents(prev => prev.length > 0 ? [] : prev);
    }

    // Update objects state for rendering
    const currentObjects = engineRef.current.getObjects();
    setObjects(currentObjects);

    // Check for simulation completion
    if (engineRef.current.isComplete()) {
      const simulationWinner = engineRef.current.getWinner();
      setWinner(simulationWinner);
      setStatus('completed');
      isRunningRef.current = false;
      return;
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  /**
   * Start the simulation with initial game data
   */
  const start = useCallback((initData: GameInitData, arenaConfig: ArenaConfig = DEFAULT_ARENA_CONFIG) => {
    // Stop any existing simulation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Convert ObjectInit array to GameObject array
    const gameObjects = initData.objects.map((init, index) =>
      objectInitToGameObject(init, index, arenaConfig.objectRadius)
    );

    // Initialize physics engine
    const engine = new PhysicsEngine(arenaConfig);
    engine.initialize(gameObjects);

    // Set up collision event listener for visual feedback
    engine.onCollision((event: CollisionEvent) => {
      frameCollisionEventsRef.current.push(event);
    });

    engineRef.current = engine;

    // Reset state
    setObjects(gameObjects);
    setStatus('running');
    setWinner(null);
    setIsTimeout(false);
    setElapsedTime(0);
    setCollisionEvents([]);

    // Reset timing refs
    lastTimeRef.current = 0;
    startTimeRef.current = performance.now();
    isRunningRef.current = true;
    frameCollisionEventsRef.current = [];

    // Start animation loop
    // Clear any previous frame to avoid duplicates
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // We pass the animate function by reference, relying on the fact that
    // it's a stable callback or we use the closure.
    // However, to fix the 'Maximum update depth exceeded' error, we
    // should avoid 'animate' depending on state that changes frequently
    // or triggering re-renders that re-create 'animate'.
    //
    // Current 'animate' has [] dependency, which is good.
    // The issue might be that 'start' depends on 'animate', and 'start' is called
    // in effects elsewhere?
    //
    // Actually, 'animate' calls setObjects, setElapsedTime, setCollisionEvents.
    // These trigger re-renders.
    //
    // Let's ensure requestAnimationFrame uses the ref to the function.

    const loop = (time: number) => {
      animate(time);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [animate]);

  /**
   * Stop the simulation
   */
  const stop = useCallback(() => {
    isRunningRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (status === 'running') {
      setStatus('idle');
    }
  }, [status]);

  /**
   * Reset the simulation to idle state
   */
  const reset = useCallback(() => {
    // Stop animation
    isRunningRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear collision listeners from engine
    if (engineRef.current) {
      engineRef.current.clearCollisionListeners();
    }

    // Clear engine
    engineRef.current = null;

    // Reset all state
    setObjects([]);
    setStatus('idle');
    setWinner(null);
    setIsTimeout(false);
    setElapsedTime(0);
    setCollisionEvents([]);
    lastTimeRef.current = 0;
    startTimeRef.current = 0;
    frameCollisionEventsRef.current = [];
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isRunningRef.current = false;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    objects,
    status,
    winner,
    isTimeout,
    start,
    stop,
    reset,
    elapsedTime,
    collisionEvents
  };
}

export default useSimulation;
