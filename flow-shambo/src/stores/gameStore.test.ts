/**
 * Tests for GameStore
 * Validates state management and transitions for FlowShambo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  isValidPhaseTransition,
  getPhaseDisplayName,
} from './gameStore';
import type { GameObject, GamePhase } from '../types';

describe('GameStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useGameStore.setState({
      wallet: {
        connected: false,
        address: null,
        balance: 0,
      },
      game: {
        phase: 'idle',
        objects: [],
        prediction: null,
        betAmount: 0,
        receiptId: null,
        winner: null,
        playerWon: null,
      },
      ui: {
        loading: false,
        error: null,
        loadingType: null,
      },
    });
  });

  describe('Wallet State', () => {
    it('should set wallet connected with address and balance', () => {
      const store = useGameStore.getState();
      store.setWalletConnected('0x1234', 100);

      const state = useGameStore.getState();
      expect(state.wallet.connected).toBe(true);
      expect(state.wallet.address).toBe('0x1234');
      expect(state.wallet.balance).toBe(100);
    });

    it('should set wallet disconnected and reset game state', () => {
      const store = useGameStore.getState();
      // First connect
      store.setWalletConnected('0x1234', 100);
      store.setPrediction('rock');
      store.setBetAmount(10);

      // Then disconnect
      store.setWalletDisconnected();

      const state = useGameStore.getState();
      expect(state.wallet.connected).toBe(false);
      expect(state.wallet.address).toBeNull();
      expect(state.wallet.balance).toBe(0);
      // Game state should be reset
      expect(state.game.prediction).toBeNull();
      expect(state.game.betAmount).toBe(0);
    });

    it('should update balance', () => {
      const store = useGameStore.getState();
      store.setWalletConnected('0x1234', 100);
      store.updateBalance(150);

      const state = useGameStore.getState();
      expect(state.wallet.balance).toBe(150);
    });
  });

  describe('Game State', () => {
    it('should set game phase', () => {
      const store = useGameStore.getState();
      store.setPhase('betting');

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('betting');
    });

    it('should set prediction', () => {
      const store = useGameStore.getState();
      store.setPrediction('rock');

      const state = useGameStore.getState();
      expect(state.game.prediction).toBe('rock');
    });

    it('should set bet amount', () => {
      const store = useGameStore.getState();
      store.setBetAmount(50);

      const state = useGameStore.getState();
      expect(state.game.betAmount).toBe(50);
    });

    it('should set receipt ID', () => {
      const store = useGameStore.getState();
      store.setReceiptId('receipt-123');

      const state = useGameStore.getState();
      expect(state.game.receiptId).toBe('receipt-123');
    });

    it('should set objects', () => {
      const store = useGameStore.getState();
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 5, vy: 5, radius: 20 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: -5, vy: 5, radius: 20 },
      ];
      store.setObjects(objects);

      const state = useGameStore.getState();
      expect(state.game.objects).toHaveLength(2);
      expect(state.game.objects[0].type).toBe('rock');
      expect(state.game.objects[1].type).toBe('paper');
    });

    it('should update a specific object', () => {
      const store = useGameStore.getState();
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 5, vy: 5, radius: 20 },
        { id: '2', type: 'paper', x: 200, y: 200, vx: -5, vy: 5, radius: 20 },
      ];
      store.setObjects(objects);
      store.updateObject('1', { type: 'scissors', x: 150 });

      const state = useGameStore.getState();
      expect(state.game.objects[0].type).toBe('scissors');
      expect(state.game.objects[0].x).toBe(150);
      // Other properties should remain unchanged
      expect(state.game.objects[0].y).toBe(100);
      // Second object should be unchanged
      expect(state.game.objects[1].type).toBe('paper');
    });

    it('should set winner and playerWon', () => {
      const store = useGameStore.getState();
      store.setWinner('rock', true);

      const state = useGameStore.getState();
      expect(state.game.winner).toBe('rock');
      expect(state.game.playerWon).toBe(true);
    });

    it('should reset game state', () => {
      const store = useGameStore.getState();
      // Set up some game state
      store.setPhase('simulating');
      store.setPrediction('rock');
      store.setBetAmount(50);
      store.setReceiptId('receipt-123');
      store.setWinner('paper', false);

      // Reset
      store.resetGame();

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('idle');
      expect(state.game.prediction).toBeNull();
      expect(state.game.betAmount).toBe(0);
      expect(state.game.receiptId).toBeNull();
      expect(state.game.winner).toBeNull();
      expect(state.game.playerWon).toBeNull();
      expect(state.game.objects).toHaveLength(0);
    });
  });

  describe('UI State', () => {
    it('should set loading state with type', () => {
      const store = useGameStore.getState();
      store.setLoading(true, 'placing-bet');

      const state = useGameStore.getState();
      expect(state.ui.loading).toBe(true);
      expect(state.ui.loadingType).toBe('placing-bet');
    });

    it('should clear loading type when loading is false', () => {
      const store = useGameStore.getState();
      store.setLoading(true, 'placing-bet');
      store.setLoading(false);

      const state = useGameStore.getState();
      expect(state.ui.loading).toBe(false);
      expect(state.ui.loadingType).toBeNull();
    });

    it('should clear error when starting loading', () => {
      const store = useGameStore.getState();
      store.setError('Some error');
      store.setLoading(true, 'placing-bet');

      const state = useGameStore.getState();
      expect(state.ui.error).toBeNull();
    });

    it('should set error and clear loading', () => {
      const store = useGameStore.getState();
      store.setLoading(true, 'placing-bet');
      store.setError('Transaction failed');

      const state = useGameStore.getState();
      expect(state.ui.error).toBe('Transaction failed');
      expect(state.ui.loading).toBe(false);
      expect(state.ui.loadingType).toBeNull();
    });

    it('should clear error', () => {
      const store = useGameStore.getState();
      store.setError('Some error');
      store.clearError();

      const state = useGameStore.getState();
      expect(state.ui.error).toBeNull();
    });
  });

  describe('High-Level Game Flow Actions', () => {
    it('should start betting when wallet is connected', () => {
      const store = useGameStore.getState();
      store.setWalletConnected('0x1234', 100);
      store.startBetting();

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('betting');
    });

    it('should set error when starting betting without wallet', () => {
      const store = useGameStore.getState();
      store.startBetting();

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('idle');
      expect(state.ui.error).toBe('Please connect your wallet first');
    });

    it('should commit bet and transition to committed phase', () => {
      const store = useGameStore.getState();
      store.setWalletConnected('0x1234', 100);
      store.startBetting();
      store.setLoading(true, 'placing-bet');
      store.commitBet('rock', 50, 'receipt-123');

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('committed');
      expect(state.game.prediction).toBe('rock');
      expect(state.game.betAmount).toBe(50);
      expect(state.game.receiptId).toBe('receipt-123');
      expect(state.ui.loading).toBe(false);
    });

    it('should start simulation with objects', () => {
      const store = useGameStore.getState();
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 5, vy: 5, radius: 20 },
      ];
      store.setPhase('committed');
      store.setLoading(true, 'revealing-game');
      store.startSimulation(objects);

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('simulating');
      expect(state.game.objects).toHaveLength(1);
      expect(state.ui.loading).toBe(false);
    });

    it('should settle game with winner', () => {
      const store = useGameStore.getState();
      store.setPhase('simulating');
      store.setPrediction('rock');
      store.setLoading(true, 'settling-game');
      store.settleGame('rock', true);

      const state = useGameStore.getState();
      expect(state.game.phase).toBe('settled');
      expect(state.game.winner).toBe('rock');
      expect(state.game.playerWon).toBe(true);
      expect(state.ui.loading).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should follow complete game flow: idle → betting → committed → simulating → settled', () => {
      const store = useGameStore.getState();

      // Connect wallet
      store.setWalletConnected('0x1234', 100);
      expect(useGameStore.getState().game.phase).toBe('idle');

      // Start betting
      store.startBetting();
      expect(useGameStore.getState().game.phase).toBe('betting');

      // Commit bet
      store.commitBet('scissors', 25, 'receipt-456');
      expect(useGameStore.getState().game.phase).toBe('committed');

      // Start simulation
      const objects: GameObject[] = [
        { id: '1', type: 'rock', x: 100, y: 100, vx: 5, vy: 5, radius: 20 },
        { id: '2', type: 'scissors', x: 200, y: 200, vx: -5, vy: 5, radius: 20 },
      ];
      store.startSimulation(objects);
      expect(useGameStore.getState().game.phase).toBe('simulating');

      // Settle game
      store.settleGame('rock', false);
      expect(useGameStore.getState().game.phase).toBe('settled');
      expect(useGameStore.getState().game.playerWon).toBe(false);

      // Reset for new game
      store.resetGame();
      expect(useGameStore.getState().game.phase).toBe('idle');
    });
  });
});

describe('isValidPhaseTransition', () => {
  it('should allow idle → betting', () => {
    expect(isValidPhaseTransition('idle', 'betting')).toBe(true);
  });

  it('should allow betting → committed', () => {
    expect(isValidPhaseTransition('betting', 'committed')).toBe(true);
  });

  it('should allow betting → idle (cancel)', () => {
    expect(isValidPhaseTransition('betting', 'idle')).toBe(true);
  });

  it('should allow committed → simulating', () => {
    expect(isValidPhaseTransition('committed', 'simulating')).toBe(true);
  });

  it('should allow simulating → settled', () => {
    expect(isValidPhaseTransition('simulating', 'settled')).toBe(true);
  });

  it('should allow settled → idle (new game)', () => {
    expect(isValidPhaseTransition('settled', 'idle')).toBe(true);
  });

  it('should not allow skipping phases', () => {
    expect(isValidPhaseTransition('idle', 'simulating')).toBe(false);
    expect(isValidPhaseTransition('betting', 'settled')).toBe(false);
    expect(isValidPhaseTransition('committed', 'settled')).toBe(false);
  });

  it('should not allow going backwards (except betting → idle)', () => {
    expect(isValidPhaseTransition('committed', 'betting')).toBe(false);
    expect(isValidPhaseTransition('simulating', 'committed')).toBe(false);
    expect(isValidPhaseTransition('settled', 'simulating')).toBe(false);
  });
});

describe('getPhaseDisplayName', () => {
  it('should return correct display names for all phases', () => {
    const phases: GamePhase[] = ['idle', 'betting', 'committed', 'simulating', 'settled'];
    const expectedNames = [
      'Ready to Play',
      'Place Your Bet',
      'Bet Confirmed',
      'Simulation Running',
      'Game Complete',
    ];

    phases.forEach((phase, index) => {
      expect(getPhaseDisplayName(phase)).toBe(expectedNames[index]);
    });
  });
});
