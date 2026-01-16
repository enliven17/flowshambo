/**
 * UI state types for FlowShambo
 * Defines types for UI state management and user interactions
 */

/**
 * UI loading and error state
 */
export interface UIState {
  /** Whether a blocking operation is in progress */
  loading: boolean;
  /** Current error message to display (null if no error) */
  error: string | null;
  /** Type of loading operation for specific UI feedback */
  loadingType: LoadingType | null;
}

/**
 * Types of loading operations for specific UI feedback
 */
export type LoadingType = 
  | 'wallet-connecting'
  | 'placing-bet'
  | 'revealing-game'
  | 'settling-game'
  | 'fetching-balance';

/**
 * Validation result for bet amounts
 */
export interface BetValidationResult {
  /** Whether the bet amount is valid */
  valid: boolean;
  /** Error message if invalid */
  errorMessage: string | null;
}

/**
 * Props for error display components
 */
export interface ErrorDisplayProps {
  /** Error message to display */
  message: string;
  /** Callback to dismiss the error */
  onDismiss: () => void;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Callback for retry action */
  onRetry?: () => void;
}

/**
 * Result overlay display data
 */
export interface GameResultDisplay {
  /** The winning object type */
  winner: string;
  /** Whether the player won */
  playerWon: boolean;
  /** Payout amount (0 if lost) */
  payout: number;
  /** Original bet amount */
  betAmount: number;
  /** Player's prediction */
  prediction: string;
}

/**
 * Animation state for game objects
 */
export interface AnimationState {
  /** Whether an animation is currently playing */
  isAnimating: boolean;
  /** Type of animation */
  animationType: 'collision' | 'transformation' | 'win' | 'lose' | null;
  /** ID of the object being animated (if applicable) */
  targetObjectId: string | null;
}
