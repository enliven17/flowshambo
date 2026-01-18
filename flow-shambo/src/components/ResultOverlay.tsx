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
 * Object emojis by type
 */
const OBJECT_EMOJIS: Record<ObjectType, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

/**
 * Object display names
 */
const OBJECT_NAMES: Record<ObjectType, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
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

  const resultColor = playerWon ? FLOW_GREEN : LOSE_COLOR;
  const resultMessage = playerWon ? 'You Won!' : 'You Lost';
  const emoji = OBJECT_EMOJIS[winner];
  const winnerName = OBJECT_NAMES[winner];

  return (
    <div
      className={`result-overlay ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
      data-testid="result-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      {/* Confetti particles for win animation */}
      {confetti.map(particle => (
        <div
          key={particle.id}
          className="confetti-particle"
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            opacity: particle.opacity,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            pointerEvents: 'none',
          }}
          data-testid="confetti-particle"
        />
      ))}

      {/* Result content */}
      <div
        className={`result-content ${isShaking ? 'shake' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          padding: '48px',
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          border: `3px solid ${resultColor}`,
          boxShadow: `0 0 40px ${resultColor}40`,
          transform: showContent ? 'scale(1)' : 'scale(0.8)',
          opacity: showContent ? 1 : 0,
          transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
          minWidth: '320px',
          textAlign: 'center',
        }}
        data-testid="result-content"
      >
        {/* Win/Lose message */}
        <h2
          id="result-title"
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: resultColor,
            margin: 0,
            textShadow: playerWon ? `0 0 20px ${resultColor}` : 'none',
          }}
          data-testid="result-message"
        >
          {resultMessage}
        </h2>

        {/* Winning type with emoji */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '64px',
              animation: playerWon ? 'bounce 0.6s ease-in-out infinite' : 'none',
            }}
            data-testid="winner-emoji"
            role="img"
            aria-label={winnerName}
          >
            {emoji}
          </span>
          <span
            style={{
              fontSize: '24px',
              color: '#ffffff',
              fontWeight: '500',
            }}
            data-testid="winner-type"
          >
            {winnerName} Wins!
          </span>
        </div>

        {/* Payout amount */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              color: '#888888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {playerWon ? 'Payout' : 'Lost'}
          </span>
          <span
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: playerWon ? FLOW_GREEN : '#ffffff',
            }}
            data-testid="payout-amount"
          >
            {playerWon ? '+' : ''}{formatPayout(payout)} FLOW
          </span>
        </div>

        {/* Transaction Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', fontSize: '14px' }}>
          {betTxId && (
            <a href={getExplorerLink(betTxId)} target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'none', borderBottom: '1px dotted #888' }}>
              View Bet Transaction
            </a>
          )}
          {revealTxId && (
            <a href={getExplorerLink(revealTxId)} target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'none', borderBottom: '1px dotted #888' }}>
              View Reveal (Randomness)
            </a>
          )}
          {settleTxId && (
            <a href={getExplorerLink(settleTxId)} target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'none', borderBottom: '1px dotted #888' }}>
              View Payout Transaction
            </a>
          )}
        </div>


        {/* Play Again button */}
        <button
          onClick={handlePlayAgain}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#000000',
            backgroundColor: FLOW_GREEN,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            marginTop: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = `0 0 20px ${FLOW_GREEN}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
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
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

export default ResultOverlay;

// Export constants for testing
export { FLOW_GREEN, LOSE_COLOR, OBJECT_EMOJIS, OBJECT_NAMES, CONFETTI_COLORS };
