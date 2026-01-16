/**
 * Physics module for FlowShambo
 * Exports collision detection, RPS transformation, movement, physics engine, and utilities
 */

export { detectCollision, getDistance } from './collision';
export { getWinner, resolveRPSCollision } from './rps';
export { updatePosition, handleWallCollision } from './movement';
export { PhysicsEngine } from './engine';
