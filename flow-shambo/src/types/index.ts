/**
 * Barrel export for all FlowShambo types
 */

// Game types
export type {
  ObjectType,
  GameObject,
  GamePhase,
  GameState,
  ArenaConfig,
  ObjectInit,
  GameInitData,
  ObjectCounts,
} from './game';

// Wallet types
export type {
  WalletState,
  FlowUser,
  TransactionStatus,
  TransactionResult,
  BetCommitmentResult,
} from './wallet';

// UI types
export type {
  UIState,
  LoadingType,
  BetValidationResult,
  ErrorDisplayProps,
  GameResultDisplay,
  AnimationState,
} from './ui';
