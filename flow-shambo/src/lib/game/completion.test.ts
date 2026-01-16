/**
 * Unit tests for Game Completion Logic
 * 
 * Tests the checkGameComplete, getWinnerByMajority, and determineWinner functions
 * 
 * @module game/completion.test
 */

import { describe, it, expect } from 'vitest';
import {
  checkGameComplete,
  getObjectCounts,
  getWinnerByMajority,
  determineWinner
} from './completion';
import type { GameObject, ObjectCounts } from '../../types/game';

/**
 * Helper function to create a game object
 */
function createObject(id: string, type: 'rock' | 'paper' | 'scissors'): GameObject {
  return {
    id,
    type,
    x: 100,
    y: 100,
    vx: 50,
    vy: 50,
    radius: 15
  };
}

describe('checkGameComplete', () => {
  describe('game complete scenarios', () => {
    it('should return true when all objects are rocks', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'rock'),
        createObject('3', 'rock')
      ];
      expect(checkGameComplete(objects)).toBe(true);
    });

    it('should return true when all objects are paper', () => {
      const objects: GameObject[] = [
        createObject('1', 'paper'),
        createObject('2', 'paper')
      ];
      expect(checkGameComplete(objects)).toBe(true);
    });

    it('should return true when all objects are scissors', () => {
      const objects: GameObject[] = [
        createObject('1', 'scissors'),
        createObject('2', 'scissors'),
        createObject('3', 'scissors'),
        createObject('4', 'scissors')
      ];
      expect(checkGameComplete(objects)).toBe(true);
    });

    it('should return true when only one object remains', () => {
      const objects: GameObject[] = [createObject('1', 'paper')];
      expect(checkGameComplete(objects)).toBe(true);
    });

    it('should return true when objects array is empty', () => {
      expect(checkGameComplete([])).toBe(true);
    });
  });

  describe('game in progress scenarios', () => {
    it('should return false when rock and paper exist', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'paper')
      ];
      expect(checkGameComplete(objects)).toBe(false);
    });

    it('should return false when rock and scissors exist', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'scissors')
      ];
      expect(checkGameComplete(objects)).toBe(false);
    });

    it('should return false when paper and scissors exist', () => {
      const objects: GameObject[] = [
        createObject('1', 'paper'),
        createObject('2', 'scissors')
      ];
      expect(checkGameComplete(objects)).toBe(false);
    });

    it('should return false when all three types exist', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'paper'),
        createObject('3', 'scissors')
      ];
      expect(checkGameComplete(objects)).toBe(false);
    });

    it('should return false with many objects of multiple types', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'rock'),
        createObject('3', 'rock'),
        createObject('4', 'paper'),
        createObject('5', 'scissors')
      ];
      expect(checkGameComplete(objects)).toBe(false);
    });
  });
});

describe('getObjectCounts', () => {
  it('should count objects correctly', () => {
    const objects: GameObject[] = [
      createObject('1', 'rock'),
      createObject('2', 'rock'),
      createObject('3', 'paper'),
      createObject('4', 'scissors'),
      createObject('5', 'scissors'),
      createObject('6', 'scissors')
    ];
    const counts = getObjectCounts(objects);
    expect(counts).toEqual({ rock: 2, paper: 1, scissors: 3 });
  });

  it('should return zeros for empty array', () => {
    const counts = getObjectCounts([]);
    expect(counts).toEqual({ rock: 0, paper: 0, scissors: 0 });
  });

  it('should handle single type', () => {
    const objects: GameObject[] = [
      createObject('1', 'paper'),
      createObject('2', 'paper')
    ];
    const counts = getObjectCounts(objects);
    expect(counts).toEqual({ rock: 0, paper: 2, scissors: 0 });
  });
});

describe('getWinnerByMajority', () => {
  describe('clear majority scenarios', () => {
    it('should return rock when rock has the most objects', () => {
      const counts: ObjectCounts = { rock: 5, paper: 3, scissors: 2 };
      expect(getWinnerByMajority(counts)).toBe('rock');
    });

    it('should return paper when paper has the most objects', () => {
      const counts: ObjectCounts = { rock: 2, paper: 7, scissors: 1 };
      expect(getWinnerByMajority(counts)).toBe('paper');
    });

    it('should return scissors when scissors has the most objects', () => {
      const counts: ObjectCounts = { rock: 1, paper: 2, scissors: 8 };
      expect(getWinnerByMajority(counts)).toBe('scissors');
    });
  });

  describe('tiebreaker scenarios (Rock > Paper > Scissors)', () => {
    it('should return rock when rock and paper are tied', () => {
      const counts: ObjectCounts = { rock: 5, paper: 5, scissors: 0 };
      expect(getWinnerByMajority(counts)).toBe('rock');
    });

    it('should return rock when rock and scissors are tied', () => {
      const counts: ObjectCounts = { rock: 5, paper: 0, scissors: 5 };
      expect(getWinnerByMajority(counts)).toBe('rock');
    });

    it('should return paper when paper and scissors are tied (rock has fewer)', () => {
      const counts: ObjectCounts = { rock: 2, paper: 5, scissors: 5 };
      expect(getWinnerByMajority(counts)).toBe('paper');
    });

    it('should return rock when all three are tied', () => {
      const counts: ObjectCounts = { rock: 3, paper: 3, scissors: 3 };
      expect(getWinnerByMajority(counts)).toBe('rock');
    });
  });

  describe('edge cases', () => {
    it('should return rock when all counts are zero', () => {
      const counts: ObjectCounts = { rock: 0, paper: 0, scissors: 0 };
      expect(getWinnerByMajority(counts)).toBe('rock');
    });

    it('should return the only type with objects', () => {
      const counts: ObjectCounts = { rock: 0, paper: 0, scissors: 5 };
      expect(getWinnerByMajority(counts)).toBe('scissors');
    });
  });
});

describe('determineWinner', () => {
  describe('game complete (one type remaining)', () => {
    it('should return rock when only rocks remain', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'rock')
      ];
      expect(determineWinner(objects, false)).toBe('rock');
    });

    it('should return paper when only paper remains', () => {
      const objects: GameObject[] = [
        createObject('1', 'paper'),
        createObject('2', 'paper'),
        createObject('3', 'paper')
      ];
      expect(determineWinner(objects, false)).toBe('paper');
    });

    it('should return scissors when only scissors remains', () => {
      const objects: GameObject[] = [createObject('1', 'scissors')];
      expect(determineWinner(objects, false)).toBe('scissors');
    });

    it('should return winner even if isTimeout is true when game is complete', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'rock')
      ];
      expect(determineWinner(objects, true)).toBe('rock');
    });
  });

  describe('timeout scenarios', () => {
    it('should return majority winner on timeout', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'rock'),
        createObject('3', 'rock'),
        createObject('4', 'paper'),
        createObject('5', 'scissors')
      ];
      expect(determineWinner(objects, true)).toBe('rock');
    });

    it('should apply tiebreaker on timeout with tied counts', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'paper'),
        createObject('3', 'scissors')
      ];
      // All tied at 1, rock wins by tiebreaker
      expect(determineWinner(objects, true)).toBe('rock');
    });

    it('should return paper on timeout when paper has majority', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'paper'),
        createObject('3', 'paper'),
        createObject('4', 'paper'),
        createObject('5', 'scissors')
      ];
      expect(determineWinner(objects, true)).toBe('paper');
    });
  });

  describe('game in progress (no timeout)', () => {
    it('should return null when multiple types exist and no timeout', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'paper')
      ];
      expect(determineWinner(objects, false)).toBe(null);
    });

    it('should return null when all three types exist and no timeout', () => {
      const objects: GameObject[] = [
        createObject('1', 'rock'),
        createObject('2', 'paper'),
        createObject('3', 'scissors')
      ];
      expect(determineWinner(objects, false)).toBe(null);
    });
  });

  describe('edge cases', () => {
    it('should return null for empty objects array', () => {
      expect(determineWinner([], false)).toBe(null);
    });

    it('should return null for empty objects array even on timeout', () => {
      expect(determineWinner([], true)).toBe(null);
    });
  });
});
