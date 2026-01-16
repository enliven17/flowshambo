/**
 * Game State Store for FlowShambo
 * Manages wallet state, game state, and UI state using Zustand
 * Implements state transitions: idle → betting → committed → simulating → settled
 */

import { create } from 'zustand';
import type {
  ObjectType,
  GameObject,
  GamePhase,
  GameState,
  WalletState,
  UIState,
  LoadingType,
} from '../types';

/**
 * Complete store interface for FlowShambo game state management
 */
export interface GameStore {
  // Wallet state
  wallet: WalletState;

  // Game state
  game: GameState;

  // UI state
  ui: UIState;

  // Wallet actions
  setWalletConnected: (address: string, balance: number) => void;
  setWalletDisconnected: () => void;
  updateBalance: (balance: number) => void;

  // Game state actions
  setPhase: (phase: GamePhase) => void;
  setPrediction: (prediction: ObjectType) => void;
  setBetAmount: (amount: number) => void;
  setReceiptId: (receiptId: string) => void;
  setObjects: (objects: GameObject[]) => void;
  updateObject: (id: string, updates: Partial<GameObject>) => void;
  setWinner: (winner: ObjectType, playerWon: boolean) => void;
  resetGame: () => void;

  // UI state actions
  setLoading: (loading: boolean, loadingType?: LoadingType | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // High-level game flow actions
  startBetting: () => void;
  commitBet: (prediction: ObjectType, amount: number, receiptId: string) => void;
  startSimulation: (objects: GameObject[]) => void;
  settleGame: (winner: ObjectType, playerWon: boolean) => void;
}

/**
 * Initial wallet state
 */
const initialWalletState: WalletState = {
  connected: false,
  address: null,
  balance: 0,
};

/**
 * Initial game state
 */
const initialGameState: GameState = {
  phase: 'idle',
  objects: [],
  prediction: null,
  betAmount: 0,
  receiptId: null,
  winner: null,
  playerWon: null,
};

/**
 * Initial UI state
 */
const initialUIState: UIState = {
  loading: false,
  error: null,
  loadingType: null,
};

/**
 * Create the game store with Zustand
 */
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  wallet: initialWalletState,
  game: initialGameState,
  ui: initialUIState,

  // Wallet actions
  setWalletConnected: (address: string, balance: number) =>
    set({
      wallet: {
        connected: true,
        address,
        balance,
      },
    }),

  setWalletDisconnected: () =>
    set({
      wallet: initialWalletState,
      // Also reset game state when wallet disconnects
      game: initialGameState,
    }),

  updateBalance: (balance: number) =>
    set((state) => ({
      wallet: {
        ...state.wallet,
        balance,
      },
    })),

  // Game state actions
  setPhase: (phase: GamePhase) =>
    set((state) => ({
      game: {
        ...state.game,
        phase,
      },
    })),

  setPrediction: (prediction: ObjectType) =>
    set((state) => ({
      game: {
        ...state.game,
        prediction,
      },
    })),

  setBetAmount: (amount: number) =>
    set((state) => ({
      game: {
        ...state.game,
        betAmount: amount,
      },
    })),

  setReceiptId: (receiptId: string) =>
    set((state) => ({
      game: {
        ...state.game,
        receiptId,
      },
    })),

  setObjects: (objects: GameObject[]) =>
    set((state) => ({
      game: {
        ...state.game,
        objects,
      },
    })),

  updateObject: (id: string, updates: Partial<GameObject>) =>
    set((state) => ({
      game: {
        ...state.game,
        objects: state.game.objects.map((obj) =>
          obj.id === id ? { ...obj, ...updates } : obj
        ),
      },
    })),

  setWinner: (winner: ObjectType, playerWon: boolean) =>
    set((state) => ({
      game: {
        ...state.game,
        winner,
        playerWon,
      },
    })),

  resetGame: () =>
    set((state) => ({
      game: {
        ...initialGameState,
        // Keep the phase as idle (ready for new game)
        phase: 'idle',
      },
      ui: initialUIState,
    })),

  // UI state actions
  setLoading: (loading: boolean, loadingType: LoadingType | null = null) =>
    set({
      ui: {
        loading,
        loadingType: loading ? loadingType : null,
        error: null, // Clear error when starting a new loading operation
      },
    }),

  setError: (error: string | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        loading: false,
        loadingType: null,
        error,
      },
    })),

  clearError: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        error: null,
      },
    })),

  // High-level game flow actions

  /**
   * Transition from idle to betting phase
   * Called when user is ready to place a bet
   */
  startBetting: () => {
    const { wallet } = get();
    if (!wallet.connected) {
      set((state) => ({
        ui: {
          ...state.ui,
          error: 'Please connect your wallet first',
        },
      }));
      return;
    }
    set((state) => ({
      game: {
        ...initialGameState,
        phase: 'betting',
      },
    }));
  },

  /**
   * Transition from betting to committed phase
   * Called after bet transaction is confirmed on-chain
   */
  commitBet: (prediction: ObjectType, amount: number, receiptId: string) =>
    set((state) => ({
      game: {
        ...state.game,
        phase: 'committed',
        prediction,
        betAmount: amount,
        receiptId,
      },
      ui: {
        ...state.ui,
        loading: false,
        loadingType: null,
      },
    })),

  /**
   * Transition from committed to simulating phase
   * Called after reveal transaction returns initial objects
   */
  startSimulation: (objects: GameObject[]) =>
    set((state) => ({
      game: {
        ...state.game,
        phase: 'simulating',
        objects,
      },
      ui: {
        ...state.ui,
        loading: false,
        loadingType: null,
      },
    })),

  /**
   * Transition from simulating to settled phase
   * Called after simulation completes and settlement is confirmed
   */
  settleGame: (winner: ObjectType, playerWon: boolean) =>
    set((state) => ({
      game: {
        ...state.game,
        phase: 'settled',
        winner,
        playerWon,
      },
      ui: {
        ...state.ui,
        loading: false,
        loadingType: null,
      },
    })),
}));

/**
 * Selector hooks for common state slices
 */

/**
 * Select wallet state
 */
export const useWalletState = () => useGameStore((state) => state.wallet);

/**
 * Select game state
 */
export const useGameState = () => useGameStore((state) => state.game);

/**
 * Select UI state
 */
export const useUIState = () => useGameStore((state) => state.ui);

/**
 * Select current game phase
 */
export const useGamePhase = () => useGameStore((state) => state.game.phase);

/**
 * Select whether wallet is connected
 */
export const useIsWalletConnected = () =>
  useGameStore((state) => state.wallet.connected);

/**
 * Select whether game is in progress (not idle or settled)
 */
export const useIsGameInProgress = () =>
  useGameStore((state) => {
    const phase = state.game.phase;
    return phase !== 'idle' && phase !== 'settled';
  });

/**
 * Helper to check if a phase transition is valid
 */
export function isValidPhaseTransition(
  currentPhase: GamePhase,
  nextPhase: GamePhase
): boolean {
  const validTransitions: Record<GamePhase, GamePhase[]> = {
    idle: ['betting'],
    betting: ['committed', 'idle'], // Can cancel and go back to idle
    committed: ['simulating'],
    simulating: ['settled'],
    settled: ['idle'], // Reset to start new game
  };

  return validTransitions[currentPhase]?.includes(nextPhase) ?? false;
}

/**
 * Get the display name for a game phase
 */
export function getPhaseDisplayName(phase: GamePhase): string {
  const displayNames: Record<GamePhase, string> = {
    idle: 'Ready to Play',
    betting: 'Place Your Bet',
    committed: 'Bet Confirmed',
    simulating: 'Simulation Running',
    settled: 'Game Complete',
  };

  return displayNames[phase];
}
