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
  const resultMessage = playerWon ? 'VICTORY' : 'DEFEAT';
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
          gap: '20px',
          padding: 'clamp(32px, 5vw, 48px)',
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          border: `2px solid ${resultColor}`,
          boxShadow: `0 0 30px ${resultColor}40`,
          transform: showContent ? 'scale(1)' : 'scale(0.8)',
          opacity: showContent ? 1 : 0,
          transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
          minWidth: 'clamp(280px, 80vw, 400px)',
          maxWidth: '90vw',
          textAlign: 'center',
        }}
        data-testid="result-content"
      >
        {/* Win/Lose message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <h2
            id="result-title"
            style={{
              fontSize: 'clamp(32px, 8vw, 48px)',
              fontWeight: '900',
              color: resultColor,
              margin: 0,
              textShadow: playerWon ? `0 0 20px ${resultColor}` : 'none',
              letterSpacing: '2px',
            }}
            data-testid="result-message"
          >
            {resultMessage}
          </h2>
          
          <div
            style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              color: '#ffffff',
              fontWeight: '600',
              letterSpacing: '1px',
            }}
            data-testid="winner-type"
          >
            {winnerName} WINS
          </div>
        </div>

        {/* Payout amount */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '16px 24px',
            backgroundColor: playerWon ? 'rgba(0, 239, 139, 0.1)' : 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: `1px solid ${resultColor}`,
            width: '100%',
          }}
        >
          <span
            style={{
              fontSize: 'clamp(11px, 2vw, 13px)',
              color: '#888888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600',
            }}
          >
            {playerWon ? 'PAYOUT' : 'LOST'}
          </span>
          <span
            style={{
              fontSize: 'clamp(28px, 6vw, 36px)',
              fontWeight: '900',
              color: resultColor,
            }}
            data-testid="payout-amount"
          >
            {playerWon ? '+' : '-'}{formatPayout(playerWon ? payout : payout || 0)} FLOW
          </span>
        </div>

        {/* Transaction Links */}
        {(betTxId || revealTxId || settleTxId) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'clamp(10px, 1.8vw, 12px)', width: '100%' }}>
            {betTxId && (
              <a href={getExplorerLink(betTxId)} target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none', borderBottom: '1px dotted #666', padding: '4px 0' }}>
                View Bet Transaction
              </a>
            )}
            {revealTxId && (
              <a href={getExplorerLink(revealTxId)} target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none', borderBottom: '1px dotted #666', padding: '4px 0' }}>
                View Reveal Transaction
              </a>
            )}
            {settleTxId && (
              <a href={getExplorerLink(settleTxId)} target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none', borderBottom: '1px dotted #666', padding: '4px 0' }}>
                View Settlement Transaction
              </a>
            )}
          </div>
        )}

        {/* Play Again button */}
        <button
          onClick={handlePlayAgain}
          style={{
            padding: 'clamp(12px, 2.5vw, 16px) clamp(32px, 8vw, 48px)',
            fontSize: 'clamp(14px, 2.5vw, 16px)',
            fontWeight: '700',
            color: '#000000',
            backgroundColor: FLOW_GREEN,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            marginTop: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
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
export { FLOW_GREEN, LOSE_COLOR, OBJECT_NAMES, CONFETTI_COLORS };
