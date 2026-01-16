/**
 * Physics Engine for FlowShambo
 * Manages the physics simulation including object movement, collisions, and RPS transformations
 * 
 * @module physics/engine
 */

import type { GameObject, ArenaConfig, ObjectType, ObjectCounts, CollisionEvent } from '../../types/game';
import { detectCollision } from './collision';
import { getWinner, resolveRPSCollision } from './rps';
import { updatePosition, handleWallCollision } from './movement';

/**
 * Default arena configuration
 */
const DEFAULT_ARENA_CONFIG: ArenaConfig = {
  width: 800,
  height: 600,
  objectRadius: 15,
  objectsPerType: 5
};

/**
 * Callback type for collision event listeners
 */
export type CollisionEventListener = (event: CollisionEvent) => void;

/**
 * PhysicsEngine class that manages the game simulation
 * 
 * Handles:
 * - Object movement with constant velocity
 * - Wall collision with velocity reflection (DVD screensaver effect)
 * - Object-to-object collision detection
 * - RPS transformation rules
 * - Collision event emission for visual feedback
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.8, 7.4, 7.5**
 */
export class PhysicsEngine {
  private objects: GameObject[] = [];
  private arena: ArenaConfig;
  private collisionListeners: CollisionEventListener[] = [];
  private collisionIdCounter: number = 0;

  /**
   * Create a new PhysicsEngine instance
   * 
   * @param arena - Arena configuration (optional, uses defaults if not provided)
   */
  constructor(arena: ArenaConfig = DEFAULT_ARENA_CONFIG) {
    this.arena = arena;
  }

  /**
   * Initialize the physics engine with game objects
   * 
   * @param objects - Array of game objects to simulate
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * engine.initialize([
   *   { id: '1', type: 'rock', x: 100, y: 100, vx: 50, vy: 30, radius: 15 },
   *   { id: '2', type: 'paper', x: 200, y: 200, vx: -30, vy: 40, radius: 15 }
   * ]);
   * ```
   */
  initialize(objects: GameObject[]): void {
    // Deep copy objects to avoid external mutations
    this.objects = objects.map(obj => ({ ...obj }));
    // Reset collision counter
    this.collisionIdCounter = 0;
  }

  /**
   * Add a collision event listener
   * 
   * @param listener - Callback function to be called when collisions occur
   * @returns A function to remove the listener
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * const removeListener = engine.onCollision((event) => {
   *   console.log('Collision at', event.x, event.y);
   *   if (event.hasTransformation) {
   *     console.log('Object transformed to', event.newType);
   *   }
   * });
   * // Later: removeListener();
   * ```
   * 
   * **Validates: Requirements 7.4, 7.5**
   */
  onCollision(listener: CollisionEventListener): () => void {
    this.collisionListeners.push(listener);
    return () => {
      const index = this.collisionListeners.indexOf(listener);
      if (index !== -1) {
        this.collisionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit a collision event to all listeners
   */
  private emitCollisionEvent(event: CollisionEvent): void {
    for (const listener of this.collisionListeners) {
      listener(event);
    }
  }

  /**
   * Clear all collision event listeners
   */
  clearCollisionListeners(): void {
    this.collisionListeners = [];
  }

  /**
   * Advance the simulation by one frame
   * 
   * This method:
   * 1. Updates all object positions based on velocity and deltaTime
   * 2. Handles wall collisions (bouncing)
   * 3. Detects object-to-object collisions
   * 4. Applies RPS transformation rules to colliding objects
   * 
   * @param deltaTime - Time elapsed since last frame in seconds
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * engine.initialize(objects);
   * engine.step(1/60); // Advance by one frame at 60 FPS
   * ```
   * 
   * **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
   */
  step(deltaTime: number): void {
    // Step 1: Update positions for all objects
    for (const obj of this.objects) {
      updatePosition(obj, deltaTime);
    }

    // Step 2: Handle wall collisions for all objects
    for (const obj of this.objects) {
      handleWallCollision(obj, this.arena);
    }

    // Step 3: Detect and resolve object-to-object collisions
    this.handleObjectCollisions();
  }

  /**
   * Handle collisions between all pairs of objects
   * Applies RPS transformation rules when objects of different types collide
   * Emits collision events for visual feedback
   * 
   * **Validates: Requirements 7.4, 7.5**
   */
  private handleObjectCollisions(): void {
    const n = this.objects.length;
    
    // Check all pairs of objects for collisions
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const objA = this.objects[i];
        const objB = this.objects[j];

        // Check if objects are colliding
        if (detectCollision(objA, objB)) {
          // Calculate collision point (midpoint between centers)
          const collisionX = (objA.x + objB.x) / 2;
          const collisionY = (objA.y + objB.y) / 2;
          
          // Determine winner based on RPS rules
          const winnerType = getWinner(objA.type, objB.type);
          
          // Track transformation info for event
          let transformedObjectId: string | null = null;
          let newType: ObjectType | null = null;
          
          // If there's a winner (different types), transform the loser
          if (winnerType !== null) {
            if (objA.type === winnerType) {
              // objA wins, objB transforms
              transformedObjectId = objB.id;
              newType = objA.type;
              resolveRPSCollision(objA, objB);
            } else {
              // objB wins, objA transforms
              transformedObjectId = objA.id;
              newType = objB.type;
              resolveRPSCollision(objB, objA);
            }
          }
          
          // Emit collision event for visual feedback
          const collisionEvent: CollisionEvent = {
            id: `collision-${this.collisionIdCounter++}`,
            objectAId: objA.id,
            objectBId: objB.id,
            x: collisionX,
            y: collisionY,
            timestamp: Date.now(),
            hasTransformation: winnerType !== null,
            transformedObjectId,
            newType
          };
          this.emitCollisionEvent(collisionEvent);
          
          // Separate colliding objects to prevent repeated collisions
          this.separateObjects(objA, objB);
        }
      }
    }
  }

  /**
   * Separate two colliding objects by pushing them apart
   * This prevents objects from getting stuck together
   */
  private separateObjects(objA: GameObject, objB: GameObject): void {
    const dx = objB.x - objA.x;
    const dy = objB.y - objA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Avoid division by zero
    if (distance === 0) {
      // Objects are at exact same position, push apart in random direction
      objA.x -= 1;
      objB.x += 1;
      return;
    }

    const overlap = (objA.radius + objB.radius) - distance;
    
    if (overlap > 0) {
      // Normalize direction vector
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Push each object apart by half the overlap
      const pushDistance = overlap / 2 + 0.1; // Small extra to ensure separation
      objA.x -= nx * pushDistance;
      objA.y -= ny * pushDistance;
      objB.x += nx * pushDistance;
      objB.y += ny * pushDistance;
    }
  }

  /**
   * Get the current state of all game objects
   * 
   * @returns A copy of the current objects array
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * engine.initialize(objects);
   * engine.step(0.016);
   * const currentObjects = engine.getObjects();
   * ```
   */
  getObjects(): GameObject[] {
    // Return a copy to prevent external mutations
    return this.objects.map(obj => ({ ...obj }));
  }

  /**
   * Check if the simulation is complete
   * 
   * The simulation is complete when only one object type remains
   * 
   * @returns true if only one type remains, false otherwise
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * engine.initialize(objects);
   * while (!engine.isComplete()) {
   *   engine.step(0.016);
   * }
   * ```
   * 
   * **Validates: Requirements 5.3, 5.4**
   */
  isComplete(): boolean {
    if (this.objects.length === 0) {
      return true;
    }

    const counts = this.getCounts();
    const typesWithObjects = Object.values(counts).filter(count => count > 0).length;
    
    return typesWithObjects <= 1;
  }

  /**
   * Get the winning object type
   * 
   * @returns The winning type if simulation is complete, null otherwise
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * engine.initialize(objects);
   * // ... run simulation ...
   * if (engine.isComplete()) {
   *   const winner = engine.getWinner(); // 'rock', 'paper', or 'scissors'
   * }
   * ```
   * 
   * **Validates: Requirements 5.5**
   */
  getWinner(): ObjectType | null {
    if (!this.isComplete()) {
      return null;
    }

    if (this.objects.length === 0) {
      return null;
    }

    // Return the type of the first object (all remaining objects have the same type)
    return this.objects[0].type;
  }

  /**
   * Get the count of each object type
   * 
   * @returns An object with counts for rock, paper, and scissors
   * 
   * @example
   * ```typescript
   * const engine = new PhysicsEngine();
   * engine.initialize(objects);
   * const counts = engine.getCounts();
   * // { rock: 5, paper: 3, scissors: 7 }
   * ```
   * 
   * **Validates: Requirements 5.1**
   */
  getCounts(): ObjectCounts {
    const counts: ObjectCounts = {
      rock: 0,
      paper: 0,
      scissors: 0
    };

    for (const obj of this.objects) {
      counts[obj.type]++;
    }

    return counts;
  }

  /**
   * Get the current arena configuration
   * 
   * @returns The arena configuration
   */
  getArena(): ArenaConfig {
    return { ...this.arena };
  }

  /**
   * Set a new arena configuration
   * 
   * @param arena - New arena configuration
   */
  setArena(arena: ArenaConfig): void {
    this.arena = { ...arena };
  }
}
