'use client';

/**
 * ResultOverlay Component for FlowShambo
 *
 * Displays the game result after simulation completes.
 * Shows win/lose message, payout amount, winning type with emoji,
 * and a "Play Again" button to reset the game.
 *
 * Features:
 * - Win animation: Confetti-like celebration effect with Flow green
 * - Lose animation: Subtle shake effect
 * - Payout display formatted to 4 decimal places
 * - Responsive overlay design
 *
 * @module components/ResultOverlay
 *
 * **Validates: Requirements 6.5, 7.6, 7.7**
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ObjectType } from '../types/game';

/**
 * Flow green color for win styling
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Lose color (muted red)
 */
const LOSE_COLOR = '#FF6B6B';

/**
 * Object display names
 */
const OBJECT_NAMES: Record<ObjectType, string> = {
  rock: 'ROCK',
  paper: 'PAPER',
  scissors: 'SCISSORS',
};

/**
 * Props for the ResultOverlay component
 */
export interface ResultOverlayProps {
  /** The winning object type from the simulation */
  winner: ObjectType;
  /** Whether the player won the bet */
  playerWon: boolean;
  /** The payout amount (0 if lost) */
  payout: number;
  /** Callback when "Play Again" button is clicked */
  onPlayAgain: () => void;
  /** Optional custom class name */
  className?: string;
  /** Whether to show the overlay (for animation control) */
  isVisible?: boolean;
  /** Bet transaction ID */
  betTxId?: string | null;
  /** Reveal transaction ID */
  revealTxId?: string | null;
  /** Settlement transaction ID */
  settleTxId?: string | null;
  /** The bet amount (to display loss) */
  betAmount?: number;
}

/**
 * Confetti particle for win animation
 */
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  opacity: number;
}

/**
 * Confetti colors (Flow green variations and complementary colors)
 */
const CONFETTI_COLORS = [
  FLOW_GREEN,
  '#00D67D',
  '#00FF9D',
  '#FFD700',
  '#FFFFFF',
  '#00BFFF',
];

/**
 * Number of confetti particles
 */
const CONFETTI_COUNT = 50;

/**
 * Animation duration in milliseconds
 */
const ANIMATION_DURATION = 3000;

/**
 * Shake animation duration in milliseconds
 */
const SHAKE_DURATION = 500;

/**
 * Formats a number to 4 decimal places for FLOW display
 */
export function formatPayout(amount: number): string {
  return amount.toFixed(4);
}

/**
 * Generates initial confetti particles
 */
function generateConfetti(): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100, // percentage
      y: -10 - Math.random() * 20, // start above viewport
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 4,
      opacity: 1,
    });
  }

  return particles;
}

/**
 * ResultOverlay component displays the game result with animations
 */
export function ResultOverlay({
  winner,
  playerWon,
  payout,
  onPlayAgain,
  className = '',
  isVisible = true,
  betTxId,
  revealTxId,
  settleTxId,
  betAmount = 0,
}: ResultOverlayProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const getExplorerLink = (txId: string) => `https://testnet.flowscan.io/tx/${txId}`;

  /**
   * Initialize animations based on win/lose state
   */
  useEffect(() => {
    if (!isVisible) {
      setConfetti([]);
      setIsShaking(false);
      setShowContent(false);
      return;
    }

    // Delay content appearance for dramatic effect
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 200);

    if (playerWon) {
      // Start confetti animation for win
      setConfetti(generateConfetti());
    } else {
      // Start shake animation for lose
      setIsShaking(true);
      const shakeTimer = setTimeout(() => {
        setIsShaking(false);
      }, SHAKE_DURATION);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(contentTimer);
      };
    }

    return () => {
      clearTimeout(contentTimer);
    };
  }, [isVisible, playerWon]);

  /**
   * Animate confetti particles
   */
  useEffect(() => {
    if (confetti.length === 0) return;

    const animate = (currentTime: number) => {
      const deltaTime = lastTimeRef.current === 0
        ? 16
        : currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      setConfetti(prev => {
        const updated = prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx * (deltaTime / 16),
          y: particle.y + particle.vy * (deltaTime / 16),
          rotation: particle.rotation + particle.rotationSpeed * (deltaTime / 16),
          vy: particle.vy + 0.1 * (deltaTime / 16), // gravity
          opacity: Math.max(0, particle.opacity - 0.002 * (deltaTime / 16)),
        })).filter(particle => particle.y < 120 && particle.opacity > 0);

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Stop animation after duration
    const stopTimer = setTimeout(() => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setConfetti([]);
    }, ANIMATION_DURATION);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      clearTimeout(stopTimer);
    };
  }, [confetti.length > 0]);

  /**
   * Handle play again click
   */
  const handlePlayAgain = useCallback(() => {
    // Clean up animations
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setConfetti([]);
    setIsShaking(false);
    onPlayAgain();
  }, [onPlayAgain]);

  if (!isVisible) {
    return null;
  }

  const resultColor = playerWon ? 'text-flow-green' : 'text-red-500';
  const borderColor = playerWon ? 'border-flow-green' : 'border-red-500';
  const shadowColor = playerWon ? 'shadow-flow-green/20' : 'shadow-red-500/20';
  const glowColor = playerWon ? 'rgba(0, 239, 139, 0.4)' : 'rgba(255, 107, 107, 0.4)';
  const resultMessage = playerWon ? 'VICTORY' : 'DEFEAT';
  const winnerName = OBJECT_NAMES[winner];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm overflow-hidden ${className}`}
      data-testid="result-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      {/* Confetti particles for win animation */}
      {confetti.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            opacity: particle.opacity,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
          data-testid="confetti-particle"
        />
      ))}

      {/* Result content */}
      <div
        className={`glass-card p-8 md:p-12 rounded-2xl flex flex-col items-center gap-6 max-w-sm md:max-w-md w-[90%] border-2 shadow-2xl transition-all duration-300 ${borderColor} ${shadowColor} ${isShaking ? 'animate-shake' : ''} ${showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
        data-testid="result-content"
      >
        {/* Win/Lose message */}
        <div className="flex flex-col gap-2 w-full text-center">
          <h2
            id="result-title"
            className={`text-4xl md:text-5xl font-black tracking-widest ${resultColor}`}
            style={{
              textShadow: playerWon ? '0 0 20px rgba(0, 239, 139, 0.5)' : 'none',
            }}
            data-testid="result-message"
          >
            {resultMessage}
          </h2>

          <div
            className="text-lg md:text-xl font-bold text-white tracking-widest"
            data-testid="winner-type"
          >
            {winnerName} WINS
          </div>
        </div>

        {/* Payout amount */}
        <div
          className={`flex flex-col items-center gap-1 py-4 px-8 rounded-xl w-full border ${playerWon ? 'bg-flow-green/10 border-flow-green/30' : 'bg-red-500/10 border-red-500/30'}`}
        >
          <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">
            {playerWon ? 'PAYOUT' : 'LOST'}
          </span>
          <span
            className={`text-3xl md:text-4xl font-black ${resultColor}`}
            data-testid="payout-amount"
          >
            {playerWon ? '+' : '-'}{formatPayout(playerWon ? payout : betAmount)} FLOW
          </span>
        </div>

        {/* Transaction Links */}
        {(betTxId || revealTxId || settleTxId) && (
          <div className="flex flex-col gap-2 text-[10px] md:text-xs w-full text-zinc-500 text-center">
            {betTxId && (
              <a href={getExplorerLink(betTxId)} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 border-b border-zinc-700 hover:border-zinc-500 pb-0.5 transition-colors">
                View Bet Transaction
              </a>
            )}
            {revealTxId && (
              <a href={getExplorerLink(revealTxId)} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 border-b border-zinc-700 hover:border-zinc-500 pb-0.5 transition-colors">
                View Reveal Transaction
              </a>
            )}
            {settleTxId && (
              <a href={getExplorerLink(settleTxId)} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 border-b border-zinc-700 hover:border-zinc-500 pb-0.5 transition-colors">
                View Settlement Transaction
              </a>
            )}
          </div>
        )}

        {/* Play Again button */}
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 text-sm md:text-base font-bold text-black bg-flow-green rounded-xl uppercase tracking-widest hover:bg-flow-green-hover hover:scale-[1.02] active:scale-100 transition-all shadow-[0_0_20px_rgba(0,239,139,0.3)] hover:shadow-[0_0_30px_rgba(0,239,139,0.5)]"
          data-testid="play-again-button"
          aria-label="Play Again"
        >
          Play Again
        </button>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default ResultOverlay;

// Export constants for testing
export { FLOW_GREEN, LOSE_COLOR, OBJECT_NAMES, CONFETTI_COLORS };
