/**
 * Custom hooks for FlowShambo
 * 
 * This module exports wallet, balance, betting, reveal, simulation, and settlement hooks that wrap
 * the @onflow/react-sdk for easier use in the application.
 */

export { useWallet, type WalletState, type UseWalletResult } from './useWallet';
export { useBalance, type UseBalanceResult, rawBalanceToFlow, flowToRawBalance } from './useBalance';
export { usePlaceBet, type UsePlaceBetResult } from './usePlaceBet';
export { useRevealGame, type UseRevealGameResult } from './useRevealGame';
export { 
  useSimulation, 
  type UseSimulationResult, 
  type SimulationStatus,
  TARGET_FPS,
  FRAME_DURATION_MS,
  SIMULATION_TIMEOUT_SECONDS,
  SIMULATION_TIMEOUT_MS
} from './useSimulation';
export { 
  useSettleGame, 
  type UseSettleGameResult, 
  type SettlementResult 
} from './useSettleGame';
