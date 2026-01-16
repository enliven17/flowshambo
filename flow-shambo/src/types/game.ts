/**
 * Game-related types for FlowShambo
 * Defines the core game entities and state management types
 */

/**
 * The three object types in the RPS game
 */
export type ObjectType = 'rock' | 'paper' | 'scissors';

/**
 * Represents a single game object in the arena
 * Each object has a type, position, velocity, and size
 */
export interface GameObject {
  /** Unique identifier for the object */
  id: string;
  /** The RPS type of this object */
  type: ObjectType;
  /** X position in the arena */
  x: number;
  /** Y position in the arena */
  y: number;
  /** X velocity (pixels per second) */
  vx: number;
  /** Y velocity (pixels per second) */
  vy: number;
  /** Collision radius of the object */
  radius: number;
}

/**
 * Game phases representing the lifecycle of a single game
 */
export type GamePhase = 'idle' | 'betting' | 'committed' | 'simulating' | 'settled';

/**
 * Complete game state tracking all aspects of the current game
 */
export interface GameState {
  /** Current phase of the game */
  phase: GamePhase;
  /** All objects currently in the arena */
  objects: GameObject[];
  /** Player's prediction (which type will win) */
  prediction: ObjectType | null;
  /** Amount of FLOW tokens bet */
  betAmount: number;
  /** Receipt ID from the blockchain after bet commitment */
  receiptId: string | null;
  /** The winning object type after simulation completes */
  winner: ObjectType | null;
  /** Whether the player won the bet */
  playerWon: boolean | null;
}

/**
 * Configuration for the game arena
 */
export interface ArenaConfig {
  /** Width of the arena in pixels */
  width: number;
  /** Height of the arena in pixels */
  height: number;
  /** Default radius for game objects */
  objectRadius: number;
  /** Number of objects spawned per type (Rock, Paper, Scissors) */
  objectsPerType: number;
}

/**
 * Initial object data returned from the blockchain after reveal
 */
export interface ObjectInit {
  /** Object type: 0=Rock, 1=Paper, 2=Scissors */
  objectType: number;
  /** Initial X position */
  x: number;
  /** Initial Y position */
  y: number;
  /** Initial X velocity */
  vx: number;
  /** Initial Y velocity */
  vy: number;
}

/**
 * Game initialization data returned from the revealGame contract call
 */
export interface GameInitData {
  /** Random seed used for generation (for verification) */
  seed: string;
  /** Array of initial object configurations */
  objects: ObjectInit[];
}

/**
 * Count of objects by type, used for tracking game progress
 */
export type ObjectCounts = Record<ObjectType, number>;

/**
 * Collision event data emitted when two objects collide
 * Used for visual feedback (flash effects, transformation animations)
 * 
 * **Validates: Requirements 7.4, 7.5**
 */
export interface CollisionEvent {
  /** Unique identifier for this collision event */
  id: string;
  /** ID of the first object involved in collision */
  objectAId: string;
  /** ID of the second object involved in collision */
  objectBId: string;
  /** X position of collision point */
  x: number;
  /** Y position of collision point */
  y: number;
  /** Timestamp when collision occurred */
  timestamp: number;
  /** Whether a transformation occurred (different types collided) */
  hasTransformation: boolean;
  /** ID of the object that transformed (loser), null if same types */
  transformedObjectId: string | null;
  /** The new type of the transformed object, null if same types */
  newType: ObjectType | null;
}
