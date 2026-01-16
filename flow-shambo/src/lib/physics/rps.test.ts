/**
 * Unit tests for RPS transformation logic
 * Tests the getWinner and resolveRPSCollision functions
 */

import { describe, it, expect } from 'vitest';
import { getWinner, resolveRPSCollision } from './rps';
import type { GameObject, ObjectType } from '../../types/game';

/**
 * Helper function to create a test GameObject
 */
function createGameObject(id: string, type: ObjectType): GameObject {
  return {
    id,
    type,
    x: 0,
    y: 0,
    vx: 1,
    vy: 1,
    radius: 10,
  };
}

describe('getWinner', () => {
  describe('Rock beats Scissors', () => {
    it('should return rock when rock vs scissors', () => {
      expect(getWinner('rock', 'scissors')).toBe('rock');
    });

    it('should return rock when scissors vs rock', () => {
      expect(getWinner('scissors', 'rock')).toBe('rock');
    });
  });

  describe('Scissors beats Paper', () => {
    it('should return scissors when scissors vs paper', () => {
      expect(getWinner('scissors', 'paper')).toBe('scissors');
    });

    it('should return scissors when paper vs scissors', () => {
      expect(getWinner('paper', 'scissors')).toBe('scissors');
    });
  });

  describe('Paper beats Rock', () => {
    it('should return paper when paper vs rock', () => {
      expect(getWinner('paper', 'rock')).toBe('paper');
    });

    it('should return paper when rock vs paper', () => {
      expect(getWinner('rock', 'paper')).toBe('paper');
    });
  });

  describe('Same type - no winner', () => {
    it('should return null when rock vs rock', () => {
      expect(getWinner('rock', 'rock')).toBeNull();
    });

    it('should return null when paper vs paper', () => {
      expect(getWinner('paper', 'paper')).toBeNull();
    });

    it('should return null when scissors vs scissors', () => {
      expect(getWinner('scissors', 'scissors')).toBeNull();
    });
  });
});

describe('resolveRPSCollision', () => {
  it('should transform scissors to rock when rock wins', () => {
    const rock = createGameObject('1', 'rock');
    const scissors = createGameObject('2', 'scissors');
    
    resolveRPSCollision(rock, scissors);
    
    expect(scissors.type).toBe('rock');
    expect(rock.type).toBe('rock'); // Winner unchanged
  });

  it('should transform paper to scissors when scissors wins', () => {
    const scissors = createGameObject('1', 'scissors');
    const paper = createGameObject('2', 'paper');
    
    resolveRPSCollision(scissors, paper);
    
    expect(paper.type).toBe('scissors');
    expect(scissors.type).toBe('scissors'); // Winner unchanged
  });

  it('should transform rock to paper when paper wins', () => {
    const paper = createGameObject('1', 'paper');
    const rock = createGameObject('2', 'rock');
    
    resolveRPSCollision(paper, rock);
    
    expect(rock.type).toBe('paper');
    expect(paper.type).toBe('paper'); // Winner unchanged
  });

  it('should not change other properties of the loser', () => {
    const winner = createGameObject('1', 'rock');
    const loser: GameObject = {
      id: '2',
      type: 'scissors',
      x: 100,
      y: 200,
      vx: 5,
      vy: -3,
      radius: 15,
    };
    
    resolveRPSCollision(winner, loser);
    
    // Type should change
    expect(loser.type).toBe('rock');
    // Other properties should remain unchanged
    expect(loser.id).toBe('2');
    expect(loser.x).toBe(100);
    expect(loser.y).toBe(200);
    expect(loser.vx).toBe(5);
    expect(loser.vy).toBe(-3);
    expect(loser.radius).toBe(15);
  });
});
